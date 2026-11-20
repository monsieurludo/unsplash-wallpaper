import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type FavoriteCategory,
  type FavoriteImage,
} from '../types/wallpaper';

const KEYS = {
  CATEGORIES: 'uw_favorite_categories',
  IMAGES: 'uw_favorite_images',
  SETTINGS: 'uw_settings',
  LOGS: 'uw_scheduler_logs',
} as const;

const MAX_LOGS = 25;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadFavoriteCategories(): FavoriteCategory[] {
  const list = safeParse<FavoriteCategory[]>(localStorage.getItem(KEYS.CATEGORIES), []);
  return [...list].sort((a, b) => b.addedAt - a.addedAt);
}

export function saveFavoriteCategories(list: FavoriteCategory[]): void {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(list));
}

export function loadFavoriteImages(): FavoriteImage[] {
  const list = safeParse<FavoriteImage[]>(localStorage.getItem(KEYS.IMAGES), []);
  return [...list].sort((a, b) => b.addedAt - a.addedAt);
}

export function saveFavoriteImages(list: FavoriteImage[]): void {
  localStorage.setItem(KEYS.IMAGES, JSON.stringify(list));
}

export function loadSettings(): AppSettings {
  const saved = safeParse<Partial<AppSettings>>(localStorage.getItem(KEYS.SETTINGS), {});
  return { ...DEFAULT_SETTINGS, ...saved, id: 1 };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export const SchedulerLogger = {
  log(message: string): void {
    const currentLogs = this.getLogs();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
      now.getMinutes()
    )}:${pad(now.getSeconds())}`;
    const formatted = `[${timestamp}] ${message}`;
    const updated = [formatted, ...currentLogs].slice(0, MAX_LOGS);
    localStorage.setItem(KEYS.LOGS, JSON.stringify(updated));
  },

  getLogs(): string[] {
    return safeParse<string[]>(localStorage.getItem(KEYS.LOGS), []);
  },

  clearLogs(): void {
    localStorage.removeItem(KEYS.LOGS);
  },
};

export function exportConfigJson(): string {
  const settingsObj = loadSettings();
  const categories = loadFavoriteCategories();
  const images = loadFavoriteImages();

  const payload = {
    settings: {
      isRotationEnabled: settingsObj.isRotationEnabled,
      intervalHours: settingsObj.intervalHours,
      onlyWifi: settingsObj.onlyWifi,
      onlyLightBackgrounds: settingsObj.onlyLightBackgrounds,
      allowLandscape: settingsObj.allowLandscape,
      wallpaperTarget: settingsObj.wallpaperTarget,
      themePreference: settingsObj.themePreference,
      wallpaperSource: settingsObj.wallpaperSource,
      historyUrls: settingsObj.historyUrls,
      blockedUrls: settingsObj.blockedUrls,
      preferredScheduleHour: settingsObj.preferredScheduleHour,
      preferredScheduleMinute: settingsObj.preferredScheduleMinute,
    },
    favoriteCategories: categories.map((c) => ({
      slug: c.slug,
      title: c.title,
      type: c.type ?? 'topic',
      mediaType: c.mediaType ?? 'photos',
      addedAt: c.addedAt,
    })),
    favoriteImages: images.map((img) => ({
      id: img.id,
      title: img.title,
      category: img.category,
      previewUrl: img.previewUrl,
      fullUrl: img.fullUrl,
      width: img.width,
      height: img.height,
      blurHash: img.blurHash,
      authorName: img.authorName,
      authorUrl: img.authorUrl,
      downloadLocationUrl: img.downloadLocationUrl,
      addedAt: img.addedAt,
    })),
  };

  return JSON.stringify(payload, null, 4);
}

export function importConfigJson(jsonString: string): boolean {
  try {
    const root = JSON.parse(jsonString) as {
      settings?: Partial<AppSettings>;
      favoriteCategories?: Array<Partial<FavoriteCategory>>;
      favoriteImages?: Array<
        Partial<FavoriteImage> & { url?: string; thumbnailUrl?: string; subreddit?: string }
      >;
    };

    if (!root || typeof root !== 'object') return false;

    if (root.settings && typeof root.settings === 'object') {
      const current = loadSettings();
      const imported: AppSettings = {
        ...current,
        id: 1,
        isRotationEnabled:
          typeof root.settings.isRotationEnabled === 'boolean'
            ? root.settings.isRotationEnabled
            : current.isRotationEnabled,
        intervalHours:
          typeof root.settings.intervalHours === 'number'
            ? root.settings.intervalHours
            : current.intervalHours,
        onlyWifi:
          typeof root.settings.onlyWifi === 'boolean'
            ? root.settings.onlyWifi
            : current.onlyWifi,
        onlyLightBackgrounds:
          typeof root.settings.onlyLightBackgrounds === 'boolean'
            ? root.settings.onlyLightBackgrounds
            : current.onlyLightBackgrounds,
        allowLandscape:
          typeof root.settings.allowLandscape === 'boolean'
            ? root.settings.allowLandscape
            : current.allowLandscape,
        wallpaperTarget:
          typeof root.settings.wallpaperTarget === 'number'
            ? root.settings.wallpaperTarget
            : current.wallpaperTarget,
        themePreference:
          typeof root.settings.themePreference === 'number'
            ? root.settings.themePreference
            : current.themePreference,
        wallpaperSource:
          typeof root.settings.wallpaperSource === 'number'
            ? root.settings.wallpaperSource
            : current.wallpaperSource,
        historyUrls:
          typeof root.settings.historyUrls === 'string'
            ? root.settings.historyUrls
            : current.historyUrls,
        blockedUrls:
          typeof root.settings.blockedUrls === 'string'
            ? root.settings.blockedUrls
            : current.blockedUrls,
        preferredScheduleHour:
          typeof root.settings.preferredScheduleHour === 'number'
            ? root.settings.preferredScheduleHour
            : current.preferredScheduleHour,
        preferredScheduleMinute:
          typeof root.settings.preferredScheduleMinute === 'number'
            ? root.settings.preferredScheduleMinute
            : current.preferredScheduleMinute,
      };
      saveSettings(imported);
    }

    if (Array.isArray(root.favoriteCategories)) {
      const existing = loadFavoriteCategories();
      const map = new Map<string, FavoriteCategory>(existing.map((c) => [c.slug, c]));
      for (const item of root.favoriteCategories) {
        if (item.slug && item.title) {
          const slug = item.slug.trim();
          map.set(`${item.type ?? 'topic'}:${slug.toLowerCase()}`, {
            slug,
            title: item.title.trim(),
            type: item.type === 'search' ? 'search' : 'topic',
            mediaType: item.mediaType === 'illustrations' ? 'illustrations' : 'photos',
            addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
          });
        }
      }
      saveFavoriteCategories(Array.from(map.values()));
    }

    if (Array.isArray(root.favoriteImages)) {
      const existing = loadFavoriteImages();
      const map = new Map<string, FavoriteImage>(existing.map((img) => [img.id, img]));
      for (const item of root.favoriteImages) {
        const fullUrl = item.fullUrl || item.url;
        const previewUrl = item.previewUrl || item.thumbnailUrl || fullUrl;
        if (item.id && fullUrl) {
          map.set(item.id, {
            id: item.id,
            title: item.title ?? '',
            category: item.category ?? item.subreddit ?? 'wallpapers',
            previewUrl: previewUrl ?? fullUrl,
            fullUrl,
            width: typeof item.width === 'number' ? item.width : 1080,
            height: typeof item.height === 'number' ? item.height : 1920,
            blurHash: item.blurHash ?? null,
            authorName: item.authorName ?? 'Unsplash Creator',
            authorUrl: item.authorUrl ?? 'https://unsplash.com',
            downloadLocationUrl: item.downloadLocationUrl ?? '',
            addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
          });
        }
      }
      saveFavoriteImages(Array.from(map.values()));
    }

    return true;
  } catch {
    return false;
  }
}
