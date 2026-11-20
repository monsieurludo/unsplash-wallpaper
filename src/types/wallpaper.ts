export type MediaType = 'photos' | 'illustrations';

export const PIXEL_9_MIN_WIDTH = 1080;
export const PIXEL_9_MIN_HEIGHT = 2424;

export interface UnsplashTopic {
  id: string;
  slug: string;
  title: string;
}

export interface WallpaperItem {
  id: string;
  title: string;
  category: string;
  previewUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  blurHash: string | null;
  authorName: string;
  authorUrl: string;
  downloadLocationUrl: string;
  createdAt: string | null;
}

export interface WallpaperPage {
  photos: WallpaperItem[];
  page: number;
  hasMore: boolean;
}

export interface FavoriteCategory {
  slug: string;
  title: string;
  type?: 'topic' | 'search';
  mediaType?: MediaType;
  addedAt: number;
}

export interface FavoriteImage {
  id: string;
  title: string;
  category: string;
  previewUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  blurHash: string | null;
  authorName: string;
  authorUrl: string;
  downloadLocationUrl: string;
  addedAt: number;
}

export interface AppSettings {
  id: number;
  isRotationEnabled: boolean;
  intervalHours: number;
  onlyWifi: boolean;
  onlyLightBackgrounds: boolean;
  allowLandscape: boolean;
  wallpaperTarget: number; // 1 = Home, 2 = Lock, 3 = Both
  lastUpdateTime: number;
  currentWallpaperUrl: string;
  currentWallpaperCategory: string;
  themePreference: number; // 0 = System Default, 1 = Light Theme, 2 = Dark Theme
  wallpaperSource: number; // 0 = Favorite Topics, 1 = Saved Pictures, 2 = Mix Both
  historyUrls: string;
  blockedUrls: string;
  preferredScheduleHour: number; // 0..23 or -1 if disabled
  preferredScheduleMinute: number; // 0..59
}

export type SortOrder = 'latest' | 'popular';

export type UiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  isRotationEnabled: false,
  intervalHours: 4,
  onlyWifi: true,
  onlyLightBackgrounds: false,
  allowLandscape: true,
  wallpaperTarget: 3,
  lastUpdateTime: 0,
  currentWallpaperUrl: '',
  currentWallpaperCategory: '',
  themePreference: 0,
  wallpaperSource: 0,
  historyUrls: '',
  blockedUrls: '',
  preferredScheduleHour: -1,
  preferredScheduleMinute: 0,
};

export const CURATED_TOPICS: UnsplashTopic[] = [
  { id: 'topic_wallpapers', slug: 'wallpapers', title: 'Wallpapers' },
  { id: 'topic_3d_renders', slug: '3d-renders', title: '3D Renders' },
  { id: 'topic_nature', slug: 'nature', title: 'Nature' },
  { id: 'topic_architecture', slug: 'architecture-interior', title: 'Architecture & Interior' },
  { id: 'topic_textures', slug: 'textures-patterns', title: 'Textures & Patterns' },
  { id: 'topic_minimalism', slug: 'minimalism', title: 'Minimalism' },
  { id: 'topic_space', slug: 'space', title: 'Space' },
];
