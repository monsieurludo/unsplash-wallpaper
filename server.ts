import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnsplashTopic, WallpaperItem, WallpaperPage } from './src/types/wallpaper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present (without overriding existing environment variables)
function loadDotEnvIfPresent() {
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore unreadable .env
  }
}

loadDotEnvIfPresent();

const UNSPLASH_BASE_URL = 'https://api.unsplash.com';
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes to protect the 50 req/hr Demo quota

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const responseCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  responseCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
}

interface UnsplashPhotoRaw {
  id: string;
  alt_description?: string | null;
  description?: string | null;
  width?: number;
  height?: number;
  blur_hash?: string | null;
  created_at?: string | null;
  urls?: {
    small?: string;
    regular?: string;
    full?: string;
    raw?: string;
  };
  user?: {
    name?: string;
    links?: {
      html?: string;
    };
  };
  links?: {
    download_location?: string;
  };
}

interface UnsplashSearchRaw {
  total: number;
  total_pages: number;
  results: UnsplashPhotoRaw[];
}

interface UnsplashTopicRaw {
  id: string;
  slug: string;
  title: string;
}

const PIXEL_9_MIN_WIDTH = 1080;
const PIXEL_9_MIN_HEIGHT = 2424;

function isPixel9Quality(raw: UnsplashPhotoRaw, allowLandscape = true): boolean {
  const w = raw.width ?? 0;
  const h = raw.height ?? 0;
  if (!Number.isFinite(w) || !Number.isFinite(h)) return false;
  if (w < PIXEL_9_MIN_WIDTH || h < PIXEL_9_MIN_HEIGHT) return false;
  return allowLandscape ? true : h > w;
}

function sortNewestFirst(items: WallpaperItem[]): WallpaperItem[] {
  return [...items].sort((a, b) => {
    const tA = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tB = b.createdAt ? Date.parse(b.createdAt) : 0;
    return (Number.isNaN(tB) ? 0 : tB) - (Number.isNaN(tA) ? 0 : tA);
  });
}

function mapUnsplashPhoto(raw: UnsplashPhotoRaw, category: string): WallpaperItem {
  // Use regular (1080px wide) for sharp Pixel 9 previews and full (uncompressed) for wallpaper application
  const previewUrl = raw.urls?.regular || raw.urls?.full || '';
  const fullUrl = raw.urls?.full || raw.urls?.raw || previewUrl;
  return {
    id: raw.id,
    title: (raw.alt_description || raw.description || 'Untitled Wallpaper').trim(),
    category,
    previewUrl,
    fullUrl,
    width: raw.width ?? PIXEL_9_MIN_WIDTH,
    height: raw.height ?? PIXEL_9_MIN_HEIGHT,
    blurHash: raw.blur_hash ?? null,
    authorName: raw.user?.name || 'Unsplash Creator',
    authorUrl: raw.user?.links?.html || 'https://unsplash.com',
    downloadLocationUrl: raw.links?.download_location || '',
    createdAt: raw.created_at ?? null,
  };
}

async function fetchUnsplashJson(url: string, accessKey: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
      Accept: 'application/json',
    },
  });
}

async function parseUpstreamJson<T>(upstream: Response): Promise<T> {
  const rawText = await upstream.text();
  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(`Unexpected non-JSON response from Unsplash (${upstream.status}).`);
  }
}

async function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  // Fetch Editorial Topics: GET /topics?per_page=20&order_by=featured
  app.get('/api/unsplash/topics', async (_req, res) => {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
    const cacheKey = 'topics_featured_20';
    const cached = getCached<UnsplashTopic[]>(cacheKey);
    if (cached) {
      return res.json({ topics: cached });
    }

    if (!accessKey) {
      return res.status(503).json({
        error: 'UNSPLASH_ACCESS_KEY is not configured on the server.',
      });
    }

    try {
      const upstream = await fetchUnsplashJson(
        `${UNSPLASH_BASE_URL}/topics?per_page=20&order_by=featured`,
        accessKey
      );
      if (upstream.status === 403 || upstream.status === 429) {
        return res.status(upstream.status).json({
          error: 'Unsplash API rate limit reached (50 requests/hour). Please try again shortly.',
        });
      }
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: 'Failed to load Unsplash topics.' });
      }
      const rawTopics = await parseUpstreamJson<UnsplashTopicRaw[]>(upstream);
      const topics: UnsplashTopic[] = rawTopics.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
      }));
      setCached(cacheKey, topics);
      return res.json({ topics });
    } catch {
      return res.status(502).json({ error: 'Unable to reach Unsplash API.' });
    }
  });

  // Fetch Topic Wallpapers (Photos or Illustrations), always sorted newest-first & filtered for Pixel 9 quality
  app.get('/api/unsplash/topics/:slug/photos', async (req, res) => {
    const slug = req.params.slug.trim().replace(/[^a-zA-Z0-9-_]/g, '');
    if (!slug) {
      return res.status(400).json({ error: 'Invalid topic slug.' });
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const mediaType = req.query.media_type === 'illustrations' ? 'illustrations' : 'photos';
    const allowLandscape = req.query.allow_landscape !== 'false';
    const orderBy = req.query.order_by === 'popular' ? 'popular' : 'latest';
    const cacheKey = `topic:${slug}:media:${mediaType}:landscape:${allowLandscape}:order:${orderBy}:page:${page}:p9`;

    const cached = getCached<WallpaperPage>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
    if (!accessKey) {
      return res.status(503).json({
        error: 'UNSPLASH_ACCESS_KEY is not configured on the server.',
      });
    }

    try {
      let currentPage = page;
      let collected: WallpaperItem[] = [];
      let hasMore = false;
      const orientationParam = allowLandscape ? '' : '&orientation=portrait';

      // Try up to 2 pages only if page 1 is completely filtered out by Pixel 9 resolution criteria
      for (let attempt = 0; attempt < 2; attempt++) {
        if (mediaType === 'illustrations') {
          const isAllFeed = slug.toLowerCase() === 'wallpapers' || slug.toLowerCase() === 'illustrations';
          const url = isAllFeed
            ? `${UNSPLASH_BASE_URL}/illustrations?per_page=30&page=${currentPage}&order_by=${orderBy}${orientationParam}`
            : `${UNSPLASH_BASE_URL}/search/illustrations?query=${encodeURIComponent(
                slug.replace(/-/g, ' ')
              )}&per_page=30&page=${currentPage}&order_by=${orderBy === 'popular' ? 'relevant' : 'latest'}${orientationParam}`;

          const upstream = await fetchUnsplashJson(url, accessKey);
          if (upstream.status === 403 || upstream.status === 429) {
            return res.status(upstream.status).json({
              error: 'Unsplash API rate limit reached (50 requests/hour). Please try again shortly.',
            });
          }
          if (!upstream.ok) {
            return res.status(upstream.status).json({ error: `Failed to load illustrations for "${slug}".` });
          }

          const payload = await parseUpstreamJson<UnsplashPhotoRaw[] | UnsplashSearchRaw>(upstream);
          const rawList = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : [];
          hasMore = Array.isArray(payload) ? rawList.length >= 30 : currentPage < (payload.total_pages ?? 1);
          collected = rawList.filter((p) => isPixel9Quality(p, allowLandscape)).map((p) => mapUnsplashPhoto(p, slug));
        } else {
          const url = `${UNSPLASH_BASE_URL}/topics/${encodeURIComponent(
            slug
          )}/photos?per_page=30&page=${currentPage}&order_by=${orderBy}${orientationParam}`;
          const upstream = await fetchUnsplashJson(url, accessKey);

          if (upstream.status === 403 || upstream.status === 429) {
            return res.status(upstream.status).json({
              error: 'Unsplash API rate limit reached (50 requests/hour). Please try again shortly.',
            });
          }
          if (upstream.status === 404) {
            return res.status(404).json({ error: `Topic "${slug}" was not found on Unsplash.` });
          }
          if (!upstream.ok) {
            return res.status(upstream.status).json({ error: `Failed to load topic "${slug}".` });
          }

          const rawPhotos = await parseUpstreamJson<UnsplashPhotoRaw[]>(upstream);
          hasMore = rawPhotos.length >= 30;
          collected = rawPhotos.filter((p) => isPixel9Quality(p, allowLandscape)).map((p) => mapUnsplashPhoto(p, slug));
        }

        if (collected.length > 0 || !hasMore) break;
        currentPage += 1;
      }

      const result: WallpaperPage = {
        photos: orderBy === 'latest' ? sortNewestFirst(collected) : collected,
        page: currentPage,
        hasMore,
      };
      setCached(cacheKey, result);
      return res.json(result);
    } catch {
      return res.status(502).json({ error: `Unable to reach Unsplash for topic "${slug}".` });
    }
  });

  // Keyword Search (Photos or Illustrations): always sorted by latest published & filtered for Pixel 9 quality
  app.get('/api/unsplash/search', async (req, res) => {
    const query = String(req.query.query || '').trim();
    if (!query) {
      return res.status(400).json({ error: 'Search query cannot be empty.' });
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const mediaType = req.query.media_type === 'illustrations' ? 'illustrations' : 'photos';
    const allowLandscape = req.query.allow_landscape !== 'false';
    const orderBy = req.query.order_by === 'relevant' ? 'relevant' : 'latest';
    const cacheKey = `search:${query.toLowerCase()}:media:${mediaType}:landscape:${allowLandscape}:order:${orderBy}:page:${page}:p9`;

    const cached = getCached<WallpaperPage>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
    if (!accessKey) {
      return res.status(503).json({
        error: 'UNSPLASH_ACCESS_KEY is not configured on the server.',
      });
    }

    try {
      const endpoint = mediaType === 'illustrations' ? 'illustrations' : 'photos';
      const orientationParam = allowLandscape ? '' : '&orientation=portrait';
      let currentPage = page;
      let collected: WallpaperItem[] = [];
      let hasMore = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        const url = `${UNSPLASH_BASE_URL}/search/${endpoint}?query=${encodeURIComponent(
          query
        )}&per_page=30&page=${currentPage}&order_by=${orderBy}${orientationParam}`;
        const upstream = await fetchUnsplashJson(url, accessKey);

        if (upstream.status === 403 || upstream.status === 429) {
          return res.status(upstream.status).json({
            error: 'Unsplash API rate limit reached (50 requests/hour). Please try again shortly.',
          });
        }
        if (!upstream.ok) {
          return res.status(upstream.status).json({ error: `Search failed for "${query}".` });
        }

        const wrapped = await parseUpstreamJson<UnsplashSearchRaw>(upstream);
        const rawResults = Array.isArray(wrapped.results) ? wrapped.results : [];
        hasMore = currentPage < (wrapped.total_pages ?? 1);
        collected = rawResults.filter((p) => isPixel9Quality(p, allowLandscape)).map((p) => mapUnsplashPhoto(p, query));

        if (collected.length > 0 || !hasMore) break;
        currentPage += 1;
      }

      const result: WallpaperPage = {
        photos: orderBy === 'latest' ? sortNewestFirst(collected) : collected,
        page: currentPage,
        hasMore,
      };
      setCached(cacheKey, result);
      return res.json(result);
    } catch {
      return res.status(502).json({ error: `Unable to reach Unsplash search for "${query}".` });
    }
  });

  // Unsplash Download Endpoint Ping (required by API guidelines when applying/downloading)
  app.get('/api/unsplash/download', async (req, res) => {
    const downloadUrl = String(req.query.url || '').trim();
    const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();

    if (!downloadUrl || !accessKey) {
      return res.json({ ok: true, skipped: true });
    }

    // Security guard: only allow pings to api.unsplash.com
    try {
      const parsed = new URL(downloadUrl);
      if (parsed.hostname !== 'api.unsplash.com') {
        return res.status(400).json({ error: 'Invalid Unsplash download_location host.' });
      }
      const upstream = await fetchUnsplashJson(downloadUrl, accessKey);
      return res.json({ ok: upstream.ok });
    } catch {
      return res.json({ ok: false });
    }
  });

  // CORS-safe proxy for canvas pixel luminance analysis & center-cropped downloads
  app.get('/api/image-proxy', async (req, res) => {
    const rawUrl = String(req.query.url || '');
    if (!rawUrl || !rawUrl.startsWith('http')) {
      return res.status(400).send('Invalid URL');
    }

    try {
      const upstream = await fetch(rawUrl);
      if (!upstream.ok) {
        return res.status(upstream.status).send('Image fetch failed');
      }
      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(buffer);
    } catch {
      return res.status(502).send('Image proxy error');
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Ensure unknown /api routes always return JSON instead of falling through to SPA HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });

    // HMR is disabled in this environment; serve a WebSocket-free client shim
    // so /@vite/client never attempts a failing WebSocket connection.
    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(`
const sheetsMap = new Map();

export class ErrorOverlay {}

export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}

export function injectQuery(url) {
  return url;
}

export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    const nonce = document.querySelector('meta[property="csp-nonce"]')?.getAttribute('nonce');
    if (nonce) style.setAttribute('nonce', nonce);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}

export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
`.trimStart());
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Unsplash Wallpaper Changer server running on http://0.0.0.0:3000');
  });
}

createApp();
