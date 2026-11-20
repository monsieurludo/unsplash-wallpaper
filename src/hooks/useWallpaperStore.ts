import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CURATED_TOPICS,
  type AppSettings,
  type FavoriteCategory,
  type FavoriteImage,
  type MediaType,
  type SortOrder,
  type UiState,
  type UnsplashTopic,
  type WallpaperItem,
} from '../types/wallpaper';
import {
  exportConfigJson,
  importConfigJson,
  loadFavoriteCategories,
  loadFavoriteImages,
  loadSettings,
  saveFavoriteCategories,
  saveFavoriteImages,
  saveSettings,
  SchedulerLogger,
} from '../services/storage';
import {
  fetchEditorialTopics,
  fetchTopicPhotos,
  rotateWallpaper,
  searchUnsplashPhotos,
  triggerUnsplashDownloadPing,
  UnsplashRateLimitException,
} from '../services/wallpaperService';

interface CachedDetail {
  photos: WallpaperItem[];
  page: number;
  hasMore: boolean;
}

export function useWallpaperStore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('photos');
  const [activeMode, setActiveMode] = useState<{ type: 'topic' | 'search'; key: string; title: string }>({
    type: 'topic',
    key: 'wallpapers',
    title: 'Wallpapers',
  });
  const [exploreState, setExploreState] = useState<UiState<WallpaperItem[]>>({ status: 'idle' });
  const [topics, setTopics] = useState<UnsplashTopic[]>(CURATED_TOPICS);

  const [favoriteCategories, setFavoriteCategories] = useState<FavoriteCategory[]>(() =>
    loadFavoriteCategories()
  );
  const [favoriteImages, setFavoriteImages] = useState<FavoriteImage[]>(() => loadFavoriteImages());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Detail Browser state (supports both topic slug or keyword search)
  const [detailTarget, setDetailTarget] = useState<{
    type: 'topic' | 'search';
    key: string;
    title: string;
    mediaType?: MediaType;
  } | null>(null);
  const [detailSort, setDetailSort] = useState<SortOrder>('latest');
  const [detailPhotos, setDetailPhotos] = useState<WallpaperItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailHasMore, setDetailHasMore] = useState(true);

  const detailPageRef = useRef(1);
  const detailHasMoreRef = useRef(true);
  const detailLoadingRef = useRef(false);
  const detailCacheRef = useRef<Map<string, CachedDetail>>(new Map());

  // Rotation & feedback
  const [isRotating, setIsRotating] = useState(false);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(() => SchedulerLogger.getLogs());

  const refreshLogs = useCallback(() => {
    setLogs(SchedulerLogger.getLogs());
  }, []);

  const clearUiMessage = useCallback(() => setUiMessage(null), []);

  // Theme application on <html>
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const shouldBeDark =
        settings.themePreference === 2 ||
        (settings.themePreference === 0 && mediaQuery.matches);
      root.classList.toggle('dark', shouldBeDark);
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [settings.themePreference]);

  // Load topic feed (always sorted by latest published)
  const selectTopic = useCallback(
    async (slug: string, title?: string, mediaOverride?: MediaType, allowLandscapeOverride?: boolean) => {
      const targetMedia = mediaOverride ?? mediaType;
      const allowLand = allowLandscapeOverride ?? settings.allowLandscape;
      const topicTitle =
        title || topics.find((t) => t.slug === slug)?.title || slug;
      setActiveMode({ type: 'topic', key: slug, title: topicTitle });
      setExploreState({ status: 'loading' });

      try {
        const result = await fetchTopicPhotos(slug, 1, 'latest', targetMedia, allowLand);
        if (result.photos.length === 0) {
          setExploreState({
            status: 'error',
            message: `No Pixel 9 quality ${targetMedia} found in "${topicTitle}".`,
          });
        } else {
          setExploreState({ status: 'success', data: result.photos });
        }
      } catch (err) {
        if (err instanceof UnsplashRateLimitException) {
          setExploreState({ status: 'error', message: err.message });
        } else {
          const msg = err instanceof Error ? err.message : `Failed to load ${topicTitle}.`;
          setExploreState({ status: 'error', message: msg });
        }
      }
    },
    [topics, mediaType, settings.allowLandscape]
  );

  // Keyword search (always sorted by latest published)
  const searchPhotos = useCallback(
    async (keyword: string, mediaOverride?: MediaType, allowLandscapeOverride?: boolean) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;
      const targetMedia = mediaOverride ?? mediaType;
      const allowLand = allowLandscapeOverride ?? settings.allowLandscape;
      setActiveMode({ type: 'search', key: trimmed, title: trimmed });
      setExploreState({ status: 'loading' });

      try {
        const result = await searchUnsplashPhotos(trimmed, 1, 'latest', targetMedia, allowLand);
        if (result.photos.length === 0) {
          setExploreState({
            status: 'error',
            message: `No Pixel 9 quality ${targetMedia} found for "${trimmed}". Try another keyword.`,
          });
        } else {
          setExploreState({ status: 'success', data: result.photos });
        }
      } catch (err) {
        if (err instanceof UnsplashRateLimitException) {
          setExploreState({ status: 'error', message: err.message });
        } else {
          const msg = err instanceof Error ? err.message : `Search failed for "${trimmed}".`;
          setExploreState({ status: 'error', message: msg });
        }
      }
    },
    [mediaType, settings.allowLandscape]
  );

  const changeMediaType = useCallback(
    (nextMedia: MediaType) => {
      if (nextMedia === mediaType) return;
      setMediaType(nextMedia);
      if (activeMode.type === 'search') {
        void searchPhotos(activeMode.key, nextMedia);
      } else {
        void selectTopic(activeMode.key, activeMode.title, nextMedia);
      }
    },
    [mediaType, activeMode, searchPhotos, selectTopic]
  );

  // Initial Home Feed
  useEffect(() => {
    void selectTopic('wallpapers', 'Wallpapers', 'photos', settings.allowLandscape);
    void fetchEditorialTopics().then((loaded) => {
      if (loaded.length > 0) setTopics(loaded);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search input (550ms) when user types a query; revert to default wallpapers topic when cleared
  const isInitialMountRef = useRef(true);
  const skipNextDebounceRef = useRef(false);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false;
      return;
    }

    const trimmed = searchQuery.trim();
    const timer = window.setTimeout(() => {
      if (trimmed.length > 0) {
        void searchPhotos(trimmed);
      } else {
        void selectTopic('wallpapers', 'Wallpapers');
      }
    }, 550);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const selectFavoriteOnExplore = useCallback(
    (cat: FavoriteCategory) => {
      const targetMedia = cat.mediaType ?? mediaType;
      if (targetMedia !== mediaType) {
        setMediaType(targetMedia);
      }
      if (cat.type === 'search') {
        if (searchQuery !== cat.slug) {
          skipNextDebounceRef.current = true;
          setSearchQuery(cat.slug);
        }
        void searchPhotos(cat.slug, targetMedia);
      } else {
        if (searchQuery !== '') {
          skipNextDebounceRef.current = true;
          setSearchQuery('');
        }
        void selectTopic(cat.slug, cat.title, targetMedia);
      }
    },
    [mediaType, searchQuery, searchPhotos, selectTopic]
  );

  const updateCategoryMediaType = useCallback((cat: FavoriteCategory, nextMedia: MediaType) => {
    const type = cat.type ?? 'topic';
    const keyLower = cat.slug.toLowerCase();
    setFavoriteCategories((prev) => {
      const next = prev.map((item) =>
        (item.type ?? 'topic') === type && item.slug.toLowerCase() === keyLower
          ? { ...item, mediaType: nextMedia }
          : item
      );
      saveFavoriteCategories(next);
      return next;
    });
  }, []);

  // Favorite Topics & Search Words CRUD
  const toggleCategoryFavorite = useCallback(
    (
      slug: string,
      title: string,
      isCurrentlyFav: boolean,
      type: 'topic' | 'search' = 'topic',
      mediaOverride?: MediaType
    ) => {
      const cleanSlug = slug.trim();
      const keyLower = cleanSlug.toLowerCase();
      const favMedia = mediaOverride ?? mediaType;
      setFavoriteCategories((prev) => {
        const matches = (c: FavoriteCategory) =>
          (c.type ?? 'topic') === type && c.slug.toLowerCase() === keyLower;
        const next = isCurrentlyFav
          ? prev.filter((c) => !matches(c))
          : [
              {
                slug: cleanSlug,
                title: title.trim(),
                type,
                mediaType: favMedia,
                addedAt: Date.now(),
              },
              ...prev.filter((c) => !matches(c)),
            ];
        saveFavoriteCategories(next);
        return next;
      });
      setUiMessage(
        isCurrentlyFav
          ? `Removed "${title}" from favorites.`
          : `Saved "${title}" to favorite ${type === 'search' ? 'searches' : 'topics'}.`
      );
    },
    [mediaType]
  );

  // Favorite Images CRUD (persisting all mapped Unsplash fields locally)
  const toggleImageFavorite = useCallback((photo: WallpaperItem, isCurrentlyFav: boolean) => {
    setFavoriteImages((prev) => {
      const next = isCurrentlyFav
        ? prev.filter((img) => img.id !== photo.id)
        : [
            {
              id: photo.id,
              title: photo.title,
              category: photo.category,
              previewUrl: photo.previewUrl,
              fullUrl: photo.fullUrl,
              width: photo.width,
              height: photo.height,
              blurHash: photo.blurHash,
              authorName: photo.authorName,
              authorUrl: photo.authorUrl,
              downloadLocationUrl: photo.downloadLocationUrl,
              addedAt: Date.now(),
            },
            ...prev.filter((img) => img.id !== photo.id),
          ];
      saveFavoriteImages(next);
      return next;
    });
    setUiMessage(isCurrentlyFav ? 'Image removed from favorites.' : 'Saved image to favorites!');
  }, []);

  const toggleFavImageFavorite = useCallback((image: FavoriteImage, isCurrentlyFav: boolean) => {
    setFavoriteImages((prev) => {
      const next = isCurrentlyFav
        ? prev.filter((img) => img.id !== image.id)
        : [image, ...prev.filter((img) => img.id !== image.id)];
      saveFavoriteImages(next);
      return next;
    });
    setUiMessage(isCurrentlyFav ? 'Image removed from favorites.' : 'Saved image to favorites!');
  }, []);

  const toggleCurrentWallpaperFavorite = useCallback(
    (url: string, isCurrentlyFav: boolean) => {
      if (!url) return;
      setFavoriteImages((prev) => {
        if (isCurrentlyFav) {
          const next = prev.filter((img) => img.fullUrl !== url && img.previewUrl !== url);
          saveFavoriteImages(next);
          return next;
        }
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
          hash = (hash * 31 + url.charCodeAt(i)) | 0;
        }
        const next: FavoriteImage[] = [
          {
            id: `auto_${hash}`,
            title: 'Auto-Rotated Wallpaper',
            category: settings.currentWallpaperCategory || 'wallpapers',
            previewUrl: url,
            fullUrl: url,
            width: 1080,
            height: 1920,
            blurHash: null,
            authorName: 'Unsplash Creator',
            authorUrl: 'https://unsplash.com',
            downloadLocationUrl: '',
            addedAt: Date.now(),
          },
          ...prev,
        ];
        saveFavoriteImages(next);
        return next;
      });
      setUiMessage(isCurrentlyFav ? 'Image removed from favorites.' : 'Saved image to favorites!');
    },
    [settings.currentWallpaperCategory]
  );

  // Settings update
  const updateSettings = useCallback(
    (newSettings: AppSettings) => {
      const landscapeChanged = settings.allowLandscape !== newSettings.allowLandscape;
      setSettings((prev) => {
        saveSettings(newSettings);
        if (prev.isRotationEnabled !== newSettings.isRotationEnabled) {
          SchedulerLogger.log(
            newSettings.isRotationEnabled
              ? `Automatic rotation enabled (every ${newSettings.intervalHours}h).`
              : 'Automatic rotation disabled. Scheduled task cancelled.'
          );
          refreshLogs();
        }
        return newSettings;
      });
      if (landscapeChanged) {
        detailCacheRef.current.clear();
        if (activeMode.type === 'search') {
          void searchPhotos(activeMode.key, mediaType, newSettings.allowLandscape);
        } else {
          void selectTopic(activeMode.key, activeMode.title, mediaType, newSettings.allowLandscape);
        }
      }
    },
    [refreshLogs, settings.allowLandscape, activeMode, mediaType, searchPhotos, selectTopic]
  );

  const setCurrentWallpaper = useCallback(
    (photo: WallpaperItem, targetLabel?: string) => {
      if (!photo.fullUrl) return;
      triggerUnsplashDownloadPing(photo.downloadLocationUrl);
      setSettings((prev) => {
        const existingHistory = prev.historyUrls.split(',').filter(Boolean);
        const newHistory = [
          photo.fullUrl,
          ...existingHistory.filter((u) => u !== photo.fullUrl),
        ].slice(0, 10);
        const next: AppSettings = {
          ...prev,
          currentWallpaperUrl: photo.fullUrl,
          currentWallpaperCategory: photo.category,
          lastUpdateTime: Date.now(),
          historyUrls: newHistory.join(','),
        };
        saveSettings(next);
        return next;
      });
      SchedulerLogger.log(
        `Manually applied wallpaper by ${photo.authorName}${targetLabel ? ` (${targetLabel})` : ''}.`
      );
      refreshLogs();
    },
    [refreshLogs]
  );

  const triggerImmediateRotation = useCallback(async () => {
    if (isRotating) return;
    setIsRotating(true);
    setUiMessage('Rotating wallpaper...');

    const result = await rotateWallpaper();
    setSettings(result.updatedSettings);
    refreshLogs();
    setIsRotating(false);

    if (result.success) {
      setUiMessage('Wallpaper updated successfully!');
    } else if (result.rateLimited) {
      setUiMessage('Unsplash API rate limit reached (50 requests/hour). Try again shortly.');
    } else {
      setUiMessage('Could not update. Verify your connection and wallpaper source!');
    }
  }, [isRotating, refreshLogs]);

  const blockCurrentWallpaper = useCallback(() => {
    const currentUrl = settings.currentWallpaperUrl;
    if (!currentUrl) return;
    const blocked = settings.blockedUrls.split(',').filter(Boolean);
    if (!blocked.includes(currentUrl)) {
      blocked.push(currentUrl);
    }
    const nextSettings: AppSettings = {
      ...settings,
      blockedUrls: blocked.join(','),
    };
    saveSettings(nextSettings);
    setSettings(nextSettings);
    setUiMessage('Wallpaper skipped and added to bin.');
    void triggerImmediateRotation();
  }, [settings, triggerImmediateRotation]);

  // Background rotation scheduler loop while web app is open
  useEffect(() => {
    if (!settings.isRotationEnabled) return;

    const checkDue = () => {
      const s = loadSettings();
      if (!s.isRotationEnabled || isRotating) return;

      if (s.onlyWifi) {
        const nav = navigator as Navigator & { connection?: { type?: string } };
        if (nav.connection?.type === 'cellular') return;
      }

      const now = Date.now();
      let isDue = false;

      if (s.preferredScheduleHour >= 0 && s.preferredScheduleHour <= 23) {
        const target = new Date();
        target.setHours(s.preferredScheduleHour, s.preferredScheduleMinute, 0, 0);
        if (now >= target.getTime() && s.lastUpdateTime < target.getTime()) {
          isDue = true;
        }
      } else {
        const intervalMs = s.intervalHours * 3600 * 1000;
        if (s.lastUpdateTime > 0 && now - s.lastUpdateTime >= intervalMs) {
          isDue = true;
        }
      }

      if (isDue) {
        void triggerImmediateRotation();
      }
    };

    const id = window.setInterval(checkDue, 30_000);
    return () => window.clearInterval(id);
  }, [
    settings.isRotationEnabled,
    settings.intervalHours,
    settings.preferredScheduleHour,
    settings.preferredScheduleMinute,
    settings.onlyWifi,
    isRotating,
    triggerImmediateRotation,
  ]);

  // Detail grid loading + pagination
  const loadMoreDetailPhotos = useCallback(
    async (
      targetOverride?: { type: 'topic' | 'search'; key: string; title: string; mediaType?: MediaType },
      sortOverride?: SortOrder,
      reset = false
    ) => {
      const target = targetOverride ?? detailTarget;
      const sort = sortOverride ?? detailSort;
      if (!target) return;
      if (detailLoadingRef.current) return;
      if (!reset && !detailHasMoreRef.current) return;

      const targetMedia = target.mediaType ?? mediaType;
      const nextPage = reset ? 1 : detailPageRef.current + 1;
      detailLoadingRef.current = true;
      setDetailLoading(true);
      setDetailError(null);

      try {
        const result =
          target.type === 'topic'
            ? await fetchTopicPhotos(target.key, nextPage, sort, targetMedia, settings.allowLandscape)
            : await searchUnsplashPhotos(target.key, nextPage, sort, targetMedia, settings.allowLandscape);

        detailPageRef.current = result.page;
        detailHasMoreRef.current = result.hasMore;
        setDetailHasMore(result.hasMore);

        setDetailPhotos((prev) => {
          const base = reset ? [] : prev;
          const combined = [...base, ...result.photos];
          const seen = new Set<string>();
          const deduped = combined.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
          if (deduped.length > 0) {
            detailCacheRef.current.set(`${target.type}:${target.key}:${targetMedia}:${settings.allowLandscape}|${sort}`, {
              photos: deduped,
              page: result.page,
              hasMore: result.hasMore,
            });
          }
          return deduped;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed loading wallpapers';
        setDetailError(msg);
      } finally {
        detailLoadingRef.current = false;
        setDetailLoading(false);
      }
    },
    [detailTarget, detailSort, mediaType, settings.allowLandscape]
  );

  const loadDetailForSort = useCallback(
    (
      target: { type: 'topic' | 'search'; key: string; title: string; mediaType?: MediaType },
      sort: SortOrder
    ) => {
      const targetMedia = target.mediaType ?? mediaType;
      const cached = detailCacheRef.current.get(
        `${target.type}:${target.key}:${targetMedia}:${settings.allowLandscape}|${sort}`
      );
      if (cached) {
        setDetailPhotos(cached.photos);
        detailPageRef.current = cached.page;
        detailHasMoreRef.current = cached.hasMore;
        setDetailHasMore(cached.hasMore);
        return;
      }
      setDetailPhotos([]);
      detailPageRef.current = 1;
      detailHasMoreRef.current = true;
      setDetailHasMore(true);
      void loadMoreDetailPhotos(target, sort, true);
    },
    [loadMoreDetailPhotos, mediaType, settings.allowLandscape]
  );

  const enterCategoryDetail = useCallback(
    (target: { type: 'topic' | 'search'; key: string; title: string; mediaType?: MediaType }) => {
      const targetMedia = target.mediaType ?? mediaType;
      const resolvedTarget = { ...target, mediaType: targetMedia };
      setDetailTarget(resolvedTarget);
      setDetailSort('latest');
      setDetailError(null);

      if (
        exploreState.status === 'success' &&
        activeMode.type === target.type &&
        activeMode.key.toLowerCase() === target.key.toLowerCase() &&
        targetMedia === mediaType
      ) {
        detailCacheRef.current.set(
          `${target.type}:${target.key}:${targetMedia}:${settings.allowLandscape}|latest`,
          {
            photos: exploreState.data,
            page: 1,
            hasMore: exploreState.data.length >= 30 || targetMedia === 'illustrations',
          }
        );
      }

      loadDetailForSort(resolvedTarget, 'latest');
    },
    [exploreState, activeMode, loadDetailForSort, mediaType, settings.allowLandscape]
  );

  const exitCategoryDetail = useCallback(() => {
    setDetailTarget(null);
    setDetailPhotos([]);
  }, []);

  const changeDetailSort = useCallback(
    (sort: SortOrder) => {
      if (!detailTarget || detailSort === sort) return;
      setDetailSort(sort);
      setDetailError(null);
      loadDetailForSort(detailTarget, sort);
    },
    [detailTarget, detailSort, loadDetailForSort]
  );

  const changeDetailMediaType = useCallback(
    (nextMedia: MediaType) => {
      if (!detailTarget) return;
      const currentMedia = detailTarget.mediaType ?? mediaType;
      if (currentMedia === nextMedia) return;
      const nextTarget = { ...detailTarget, mediaType: nextMedia };
      setDetailTarget(nextTarget);
      setDetailError(null);
      loadDetailForSort(nextTarget, detailSort);
    },
    [detailTarget, detailSort, mediaType, loadDetailForSort]
  );

  const refreshDetail = useCallback(() => {
    if (!detailTarget) return;
    const targetMedia = detailTarget.mediaType ?? mediaType;
    detailCacheRef.current.delete(
      `${detailTarget.type}:${detailTarget.key}:${targetMedia}:${settings.allowLandscape}|${detailSort}`
    );
    setDetailError(null);
    loadDetailForSort(detailTarget, detailSort);
  }, [detailTarget, detailSort, loadDetailForSort, mediaType, settings.allowLandscape]);

  const clearLogs = useCallback(() => {
    SchedulerLogger.clearLogs();
    refreshLogs();
  }, [refreshLogs]);

  const exportBackup = useCallback(() => exportConfigJson(), []);

  const importBackup = useCallback(
    (jsonString: string): boolean => {
      const ok = importConfigJson(jsonString);
      if (ok) {
        setSettings(loadSettings());
        setFavoriteCategories(loadFavoriteCategories());
        setFavoriteImages(loadFavoriteImages());
        SchedulerLogger.log('Restored configuration from backup file.');
        refreshLogs();
      }
      return ok;
    },
    [refreshLogs]
  );

  return {
    searchQuery,
    setSearchQuery,
    mediaType,
    changeMediaType,
    activeMode,
    exploreState,
    topics,
    selectTopic,
    searchPhotos,
    favoriteCategories,
    favoriteImages,
    toggleCategoryFavorite,
    selectFavoriteOnExplore,
    updateCategoryMediaType,
    toggleImageFavorite,
    toggleFavImageFavorite,
    toggleCurrentWallpaperFavorite,
    settings,
    updateSettings,
    setCurrentWallpaper,
    isRotating,
    triggerImmediateRotation,
    blockCurrentWallpaper,
    detailTarget,
    detailSort,
    detailPhotos,
    detailLoading,
    detailError,
    detailHasMore,
    enterCategoryDetail,
    exitCategoryDetail,
    setDetailSort: changeDetailSort,
    changeDetailMediaType,
    refreshDetail,
    loadMoreDetailPhotos: () => loadMoreDetailPhotos(undefined, undefined, false),
    uiMessage,
    clearUiMessage,
    logs,
    clearLogs,
    exportBackup,
    importBackup,
  };
}
