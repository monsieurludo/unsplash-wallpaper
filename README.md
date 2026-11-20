# Wallpaper Studio (Unsplash Edition)

A React, TypeScript, and Express wallpaper browser, favorites manager, and automatic rotation scheduler powered by the live **Unsplash REST API**.

Built to enforce high-resolution **Pixel 9+ quality** (`≥ 1080 × 2424`), support **Photos vs. Illustrations** across feeds and saved favorites, sort results **newest first** (`order_by=latest`), and respect Unsplash API rate-limit and attribution guidelines without exposing API secrets to the browser.

---

## Features

### 1. Explore & Discovery
- **Live Editorial Topics & Debounced Search**: Browse Unsplash Editorial Topics (e.g., `Wallpapers`, `3D Renders`, `Nature`, `Architecture & Interior`, `Textures & Patterns`, `Minimalism`, `Space`, plus dynamically fetched featured topics) or search keywords with a **550ms input debounce**.
- **Photos vs. Illustrations Toggle**: Switch cleanly between Unsplash **Photos** (`/topics/:slug/photos`, `/search/photos`) and **Illustrations** (`/illustrations`, `/search/illustrations`) on the Explore bar, per Favorite item, and inside Collection Detail views.
- **Newest-First Sorting**: All topic feeds, search queries, and detail views sort by **Latest Published (Newest First)** (`order_by=latest` + server-side descending timestamp sorting).
- **Favorites Bar Above Editorial Topics**: Starred topics and search keywords appear pinned directly above **Editorial Topics** on the Explore tab, each with an inline **Photos | Illus.** toggle.

### 2. Pixel 9+ Quality & Orientation Filtering
- **Strict Minimum Resolution**: Every feed and rotation candidate requires `width >= 1080` and `height >= 2424` before appearing in previews or rotation.
- **Allow High-Quality Landscape (Centered)**: Enabled by default in **Settings** (`allowLandscape: true`) to include high-resolution landscape images that can be cleanly center-cropped to portrait dimensions, or toggle it off for portrait-only (`height > width`) results.

### 3. Full-Screen Pager & Storage-Friendly Apply
- **High-Resolution Preview**: Swipe or use arrow keys across `urls.full` images with photographer attribution links (`?utm_source=personal_wallpaper_app&utm_medium=referral`).
- **No Unnecessary Device Storage Clutter**: Choosing **Set Wallpaper** (Home Screen, Lock Screen, or Both) updates the active wallpaper preview/history and triggers Unsplash's required `download_location` ping **without** automatically downloading `.jpg` files to device storage.
- **Optional Manual Center-Cropped Download**: A dedicated Download icon in the top-right bar remains available when you explicitly want to export a `1080 × 2424` center-cropped JPG via `/api/image-proxy`.

### 4. Favorites & Collection Detail Browser
- **Favorite Topics, Search Keywords & Pictures**: Star both editorial topics and custom search keywords with their preferred **Photos / Illustrations** mode, and bookmark individual wallpapers with full offline-ready metadata (`id`, `previewUrl`, `fullUrl`, `authorName`, `authorUrl`, `downloadLocationUrl`).
- **Detail Browser**: Paginated collection grid (`Load More`), manual refresh, and a top-level **Photos | Illustrations** switcher.

### 5. Automatic Rotation Scheduler & Settings
- **Flexible Scheduling**: Periodic intervals (`2h`, `4h`, `6h`, `12h`, `24h`, `48h`) or a daily fixed-time override (`HH:MM`).
- **Smart Candidate Selection**: Pull from **Saved Topics**, **Saved Pics**, or **Mix Both**, skip recent history and blocked items (**Delete Bin**), and optionally filter out dark wallpapers using a **16×16 W3C relative luminance** check (**Opt for Light Backgrounds Only**).
- **Backup & Restore**: Export and import all settings, favorite topics/searches, and saved pictures as JSON.
- **Theme Support**: System Default, Light Theme, and Dark Theme.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons
- **Backend Proxy**: Node.js, Express 4 (`server.ts`)
- **Upstream API**: Unsplash REST API (`https://api.unsplash.com`, `Accept-Version: v1`)

---

## Architecture & Server Proxy

All Unsplash requests run through Express routes in `server.ts` so your API keys stay strictly on the server:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Server health check (`{ ok: true }`) |
| `GET /api/unsplash/topics` | Fetches featured Unsplash Editorial Topics (`per_page=20`) |
| `GET /api/unsplash/topics/:slug/photos` | Fetches latest Pixel 9+ Photos or Illustrations for a topic |
| `GET /api/unsplash/search` | Searches latest Pixel 9+ Photos or Illustrations by keyword |
| `GET /api/unsplash/download` | Server-side proxy for Unsplash `download_location` tracking pings |
| `GET /api/image-proxy` | CORS-safe image proxy for luminance analysis and optional cropped JPG exports |

### Rate-Limit Protection
- Server responses are cached in memory for **20 minutes** (`CACHE_TTL_MS`) keyed by route, slug/query, media type, orientation filter, sort order, and page number to protect Unsplash's 50 requests/hour Demo tier quota.
- Upstream `403` / `429` responses return structured JSON errors handled gracefully in the UI.

---

## Getting Started

### Prerequisites
- **Node.js** `20+` (tested on `v22.x`)
- An **Unsplash Developer Access Key** from [unsplash.com/developers](https://unsplash.com/developers)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (never commit `.env`):
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
UNSPLASH_APPLICATION_ID=your_application_id
UNSPLASH_ACCESS_KEY=your_access_key
UNSPLASH_SECRET_KEY=your_secret_key
```

### 3. Run in Development
Starts the Express API proxy + Vite middleware on `http://localhost:3000`:
```bash
npm run dev
```

### 4. Type-Check, Build & Run in Production
```bash
npm run lint
npm run build
NODE_ENV=production npm start
```

---

## Project Structure

```text
.
├── server.ts                         # Express API proxy, caching, Pixel 9 filter, & Vite/static serving
├── index.html                        # HTML entry point
├── package.json                      # Scripts & dependencies
├── vite.config.ts                    # Vite & Tailwind v4 configuration
├── .env.example                      # Environment variable template (no secrets)
└── src/
    ├── App.tsx                       # Root navigation shell, tabs, toast & modal coordination
    ├── index.css                     # Tailwind CSS v4 entry
    ├── types/
    │   └── wallpaper.ts              # Domain models, settings, Pixel 9 constants, curated topics
    ├── hooks/
    │   └── useWallpaperStore.ts      # Central app state, debounced search, pagination & scheduler loop
    ├── services/
    │   ├── wallpaperService.ts       # API client, luminance check, center-cropper, rotation engine
    │   └── storage.ts                # localStorage persistence, scheduler logs, JSON backup/restore
    └── components/
        ├── ExploreScreen.tsx         # Search, Photos/Illustrations toggle, Favorites bar, Topics grid
        ├── CategoryDetailScreen.tsx  # Full collection browser with Photos/Illustrations switcher
        ├── FavoritesScreen.tsx       # Saved Topics/Searches (with media toggle) & Saved Pictures
        ├── FullViewPagerModal.tsx    # Full-screen swipeable preview, attribution, Set Wallpaper modal
        ├── ImageCard.tsx             # Responsive wallpaper tile
        ├── SchedulerScreen.tsx       # Rotation intervals, daily override, light filter, history & logs
        └── SettingsScreen.tsx        # Theme, Allow Landscape (Centered), and JSON backup/restore
```

---

## License

MIT
