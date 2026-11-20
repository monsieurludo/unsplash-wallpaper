import {
  CURATED_TOPICS,
  PIXEL_9_MIN_HEIGHT,
  PIXEL_9_MIN_WIDTH,
  type AppSettings,
  type MediaType,
  type SortOrder,
  type UnsplashTopic,
  type WallpaperItem,
  type WallpaperPage,
} from '../types/wallpaper';
import {
  loadFavoriteCategories,
  loadFavoriteImages,
  loadSettings,
  saveSettings,
  SchedulerLogger,
} from './storage';

export function isPixel9WallpaperQuality(
  photo: Pick<WallpaperItem, 'width' | 'height'>,
  allowLandscape = true
): boolean {
  if (!Number.isFinite(photo.width) || !Number.isFinite(photo.height)) return false;
  if (photo.width < PIXEL_9_MIN_WIDTH || photo.height < PIXEL_9_MIN_HEIGHT) return false;
  return allowLandscape ? true : photo.height > photo.width;
}

export class UnsplashRateLimitException extends Error {
  constructor(message = 'Unsplash API rate limit reached (50 requests/hour). Please try again shortly.') {
    super(message);
    this.name = 'UnsplashRateLimitException';
  }
}

async function parseApiJson<T>(response: Response, fallbackError: string): Promise<T> {
  const rawText = await response.text();
  let parsed: unknown = null;
  if (rawText.trim().length > 0) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const looksLikeHtml = rawText.trimStart().startsWith('<');
      throw new Error(
        looksLikeHtml
          ? `${fallbackError} (Server returned HTML instead of JSON — please refresh the page or check the server).`
          : `${fallbackError} (Unexpected non-JSON response).`
      );
    }
  }

  if (!response.ok) {
    const errMsg =
      parsed && typeof parsed === 'object' && 'error' in parsed && typeof (parsed as { error?: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : fallbackError;
    throw new Error(errMsg);
  }

  if (parsed === null) {
    throw new Error(`${fallbackError} (Empty response from server).`);
  }

  return parsed as T;
}

export async function fetchEditorialTopics(): Promise<UnsplashTopic[]> {
  try {
    const res = await fetch('/api/unsplash/topics');
    if (!res.ok) return CURATED_TOPICS;
    const data = await parseApiJson<{ topics?: UnsplashTopic[] }>(res, 'Failed to load topics.');
    return data.topics && data.topics.length > 0 ? data.topics : CURATED_TOPICS;
  } catch {
    return CURATED_TOPICS;
  }
}

export async function fetchTopicPhotos(
  slug: string,
  page = 1,
  orderBy: SortOrder = 'latest',
  mediaType: MediaType = 'photos',
  allowLandscape = true
): Promise<WallpaperPage> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return { photos: [], page: 1, hasMore: false };

  const params = new URLSearchParams({
    page: String(page),
    order_by: orderBy,
    media_type: mediaType,
    allow_landscape: String(allowLandscape),
  });
  const response = await fetch(
    `/api/unsplash/topics/${encodeURIComponent(cleanSlug)}/photos?${params.toString()}`
  );

  if (response.status === 403 || response.status === 429) {
    throw new UnsplashRateLimitException();
  }
  if (response.status === 404) {
    throw new Error(`Topic "${cleanSlug}" was not found.`);
  }

  const data = await parseApiJson<WallpaperPage>(response, `Failed to load "${cleanSlug}".`);
  return {
    ...data,
    photos: (data.photos ?? []).filter((p) => isPixel9WallpaperQuality(p, allowLandscape)),
  };
}

export async function searchUnsplashPhotos(
  query: string,
  page = 1,
  orderBy: SortOrder = 'latest',
  mediaType: MediaType = 'photos',
  allowLandscape = true
): Promise<WallpaperPage> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { photos: [], page: 1, hasMore: false };

  const params = new URLSearchParams({
    query: cleanQuery,
    page: String(page),
    order_by: orderBy === 'popular' ? 'relevant' : 'latest',
    media_type: mediaType,
    allow_landscape: String(allowLandscape),
  });
  const response = await fetch(`/api/unsplash/search?${params.toString()}`);

  if (response.status === 403 || response.status === 429) {
    throw new UnsplashRateLimitException();
  }

  const data = await parseApiJson<WallpaperPage>(response, `Search failed for "${cleanQuery}".`);
  return {
    ...data,
    photos: (data.photos ?? []).filter((p) => isPixel9WallpaperQuality(p, allowLandscape)),
  };
}

/**
 * Fires a non-blocking asynchronous ping to Unsplash's download_location endpoint
 * as required by Unsplash API guidelines whenever a user downloads or applies a photo.
 */
export function triggerUnsplashDownloadPing(downloadLocationUrl?: string): void {
  if (!downloadLocationUrl) return;
  void fetch(`/api/unsplash/download?url=${encodeURIComponent(downloadLocationUrl)}`).catch(() => {
    // Non-blocking background ping
  });
}

function toCanvasLoadUrl(url: string): string {
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = toCanvasLoadUrl(url);
  });
}

/**
 * Computes W3C relative luminance over a 16x16 downscaled canvas sample.
 * Returns true if average luminance >= 0.45 and fewer than 140/256 pixels are dark.
 */
export async function isLightImage(url: string): Promise<boolean> {
  try {
    const img = await loadHtmlImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;

    ctx.drawImage(img, 0, 0, 16, 16);
    const { data } = ctx.getImageData(0, 0, 16, 16);

    let darkCount = 0;
    let totalLuma = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalLuma += luma;
      if (luma < 0.45) {
        darkCount++;
      }
    }

    const avgLuma = totalLuma / 256;
    return avgLuma >= 0.45 && darkCount < 140;
  } catch {
    return false;
  }
}

export async function scaleAndCenterCropBlob(
  url: string,
  targetWidth = PIXEL_9_MIN_WIDTH,
  targetHeight = PIXEL_9_MIN_HEIGHT
): Promise<Blob | null> {
  try {
    const img = await loadHtmlImage(url);
    const sourceWidth = img.naturalWidth;
    const sourceHeight = img.naturalHeight;
    if (!sourceWidth || !sourceHeight) return null;

    const targetRatio = targetWidth / targetHeight;
    const sourceRatio = sourceWidth / sourceHeight;

    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    let cropX = 0;
    let cropY = 0;

    if (sourceRatio > targetRatio) {
      cropWidth = Math.floor(sourceHeight * targetRatio);
      cropX = Math.floor((sourceWidth - cropWidth) / 2);
    } else {
      cropHeight = Math.floor(sourceWidth / targetRatio);
      cropY = Math.floor((sourceHeight - cropHeight) / 2);
    }

    const maxTargetDim = Math.max(targetWidth, targetHeight) * 2;
    const currentMaxDim = Math.max(cropWidth, cropHeight);
    let finalWidth = cropWidth;
    let finalHeight = cropHeight;
    if (currentMaxDim > maxTargetDim) {
      const scaleFactor = maxTargetDim / currentMaxDim;
      finalWidth = Math.max(1, Math.floor(cropWidth * scaleFactor));
      finalHeight = Math.max(1, Math.floor(cropHeight * scaleFactor));
    }

    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, finalWidth, finalHeight);

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
    );
  } catch {
    return null;
  }
}

export async function downloadCroppedWallpaper(
  url: string,
  title = 'wallpaper',
  downloadLocationUrl?: string
): Promise<boolean> {
  triggerUnsplashDownloadPing(downloadLocationUrl);
  const blob = await scaleAndCenterCropBlob(url);
  if (blob) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = title.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40) || 'wallpaper';
    a.href = objectUrl;
    a.download = `${safeName}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
  }
  return false;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface RotationCandidate {
  url: string;
  previewUrl: string;
  sourceName: string;
  downloadLocationUrl: string;
}

async function fetchFavoriteCandidates(
  fav?: { slug: string; type?: 'topic' | 'search'; mediaType?: MediaType },
  allowLandscape = true
): Promise<RotationCandidate[]> {
  const key = fav?.slug || 'wallpapers';
  const isSearch = fav?.type === 'search';
  const mediaType = fav?.mediaType ?? 'photos';
  try {
    const page = isSearch
      ? await searchUnsplashPhotos(key, 1, 'latest', mediaType, allowLandscape)
      : await fetchTopicPhotos(key, 1, 'latest', mediaType, allowLandscape);
    const valid = page.photos.map((p) => ({
      url: p.fullUrl,
      previewUrl: p.previewUrl,
      sourceName: isSearch ? `"${key}"` : key,
      downloadLocationUrl: p.downloadLocationUrl,
    }));
    SchedulerLogger.log(
      `Fetched ${valid.length} Pixel 9 candidates from ${isSearch ? 'search' : 'topic'} "${key}" (${mediaType}).`
    );
    return valid;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    SchedulerLogger.log(`Failed fetching ${isSearch ? 'search' : 'topic'} "${key}": ${msg}`);
    return [];
  }
}

export async function rotateWallpaper(): Promise<{
  success: boolean;
  rateLimited: boolean;
  updatedSettings: AppSettings;
}> {
  const currentSettings = loadSettings();
  const favoriteCategories = loadFavoriteCategories();
  const favoriteImages = loadFavoriteImages();

  let candidates: RotationCandidate[] = [];
  const source = currentSettings.wallpaperSource;
  const allowLandscape = currentSettings.allowLandscape;

  try {
    if (source === 1) {
      if (favoriteImages.length > 0) {
        candidates = shuffle(
          favoriteImages.filter((img) => isPixel9WallpaperQuality(img, allowLandscape)).map((img) => ({
            url: img.fullUrl,
            previewUrl: img.previewUrl,
            sourceName: 'Saved Pictures',
            downloadLocationUrl: img.downloadLocationUrl,
          }))
        );
        SchedulerLogger.log(`Loaded ${candidates.length} Pixel 9 saved pictures.`);
      } else {
        SchedulerLogger.log('No saved pictures available.');
      }
    } else if (source === 0) {
      const picked = shuffle(favoriteCategories)[0];
      candidates = shuffle(await fetchFavoriteCandidates(picked, allowLandscape));
    } else {
      if (favoriteImages.length > 0 && (favoriteCategories.length === 0 || Math.random() < 0.5)) {
        candidates = shuffle(
          favoriteImages.filter((img) => isPixel9WallpaperQuality(img, allowLandscape)).map((img) => ({
            url: img.fullUrl,
            previewUrl: img.previewUrl,
            sourceName: 'Saved Pictures',
            downloadLocationUrl: img.downloadLocationUrl,
          }))
        );
        SchedulerLogger.log(`Using Saved Pictures (blended). Found ${candidates.length} Pixel 9 items.`);
      } else {
        const picked = shuffle(favoriteCategories)[0];
        candidates = shuffle(await fetchFavoriteCandidates(picked, allowLandscape));
      }
    }
  } catch (err) {
    if (err instanceof UnsplashRateLimitException) {
      return { success: false, rateLimited: true, updatedSettings: currentSettings };
    }
  }

  if (candidates.length === 0) {
    SchedulerLogger.log('No wallpaper candidates available. Kept current wallpaper.');
    return { success: false, rateLimited: false, updatedSettings: currentSettings };
  }

  const historyList = currentSettings.historyUrls.split(',').filter(Boolean);
  const blockedList = currentSettings.blockedUrls.split(',').filter(Boolean);

  const filteredCandidates = candidates.filter(
    (c) => !historyList.includes(c.url) && !blockedList.includes(c.url)
  );
  const fallbackCandidates = candidates.filter((c) => !blockedList.includes(c.url));
  const finalCandidates = filteredCandidates.length > 0 ? filteredCandidates : fallbackCandidates;

  if (finalCandidates.length === 0) {
    SchedulerLogger.log('All candidates are blocked or none left.');
    return { success: false, rateLimited: false, updatedSettings: currentSettings };
  }

  let selected: RotationCandidate | null = null;
  const maxAttempts = currentSettings.onlyLightBackgrounds ? 15 : 10;
  let attempts = 0;

  for (const candidate of finalCandidates) {
    if (++attempts > maxAttempts) break;
    try {
      // Analyze small previewUrl for speed during light-background luminance check
      const checkUrl = candidate.previewUrl || candidate.url;
      await loadHtmlImage(checkUrl);
      if (currentSettings.onlyLightBackgrounds) {
        if (await isLightImage(checkUrl)) {
          selected = candidate;
          break;
        }
        SchedulerLogger.log(`Skipped dark wallpaper candidate from ${candidate.sourceName}.`);
      } else {
        selected = candidate;
        break;
      }
    } catch {
      // Try next candidate
    }
  }

  if (!selected) {
    for (const candidate of finalCandidates.slice(0, 3)) {
      try {
        await loadHtmlImage(candidate.previewUrl || candidate.url);
        selected = candidate;
        break;
      } catch {
        // Ignore
      }
    }
  }

  if (!selected) {
    SchedulerLogger.log('Failed: No candidate image could be loaded.');
    return { success: false, rateLimited: false, updatedSettings: currentSettings };
  }

  triggerUnsplashDownloadPing(selected.downloadLocationUrl);

  const newHistoryList = [selected.url, ...historyList.filter((u) => u !== selected!.url)].slice(
    0,
    10
  );
  const updatedSettings: AppSettings = {
    ...currentSettings,
    lastUpdateTime: Date.now(),
    currentWallpaperUrl: selected.url,
    currentWallpaperCategory: selected.sourceName,
    historyUrls: newHistoryList.join(','),
  };

  saveSettings(updatedSettings);
  SchedulerLogger.log(`Success! Set wallpaper from ${selected.sourceName}: ${selected.url}`);
  return { success: true, rateLimited: false, updatedSettings };
}
