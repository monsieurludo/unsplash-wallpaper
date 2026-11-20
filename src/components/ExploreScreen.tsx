import { AlertCircle, Camera, Loader2, Palette, Search, Sparkles, Star, X } from 'lucide-react';
import type {
  FavoriteCategory,
  FavoriteImage,
  MediaType,
  UiState,
  UnsplashTopic,
  WallpaperItem,
} from '../types/wallpaper';
import { ImageCard } from './ImageCard';

interface ExploreScreenProps {
  searchQuery: string;
  mediaType: MediaType;
  allowLandscape: boolean;
  activeMode: { type: 'topic' | 'search'; key: string; title: string };
  exploreState: UiState<WallpaperItem[]>;
  topics: UnsplashTopic[];
  favoriteCategories: FavoriteCategory[];
  favoriteImages: FavoriteImage[];
  onQueryChange: (q: string) => void;
  onMediaTypeChange: (next: MediaType) => void;
  onSearch: (query: string) => void;
  onSelectTopic: (slug: string, title: string) => void;
  onSelectFavorite: (cat: FavoriteCategory) => void;
  onUpdateFavoriteMediaType: (cat: FavoriteCategory, next: MediaType) => void;
  onToggleCategory: (
    slug: string,
    title: string,
    isFav: boolean,
    type: 'topic' | 'search',
    mediaType?: MediaType
  ) => void;
  onToggleImage: (photo: WallpaperItem, isFav: boolean) => void;
  onImageClick: (photo: WallpaperItem, list: WallpaperItem[]) => void;
  onCategoryDetail: (target: {
    type: 'topic' | 'search';
    key: string;
    title: string;
    mediaType?: MediaType;
  }) => void;
}

function formatPhotoDate(createdAt: string | null): string | null {
  if (!createdAt) return null;
  const ms = Date.parse(createdAt);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function ExploreScreen({
  searchQuery,
  mediaType,
  allowLandscape,
  activeMode,
  exploreState,
  topics,
  favoriteCategories,
  favoriteImages,
  onQueryChange,
  onMediaTypeChange,
  onSearch,
  onSelectTopic,
  onSelectFavorite,
  onUpdateFavoriteMediaType,
  onToggleCategory,
  onToggleImage,
  onImageClick,
  onCategoryDetail,
}: ExploreScreenProps) {
  const isActiveFav = favoriteCategories.some(
    (c) =>
      (c.type ?? 'topic') === activeMode.type &&
      c.slug.toLowerCase() === activeMode.key.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    } else {
      onSelectTopic('wallpapers', 'Wallpapers');
    }
  };

  return (
    <div className="space-y-5">
      {/* Debounced Keyword Search Bar + Photos / Illustrations Toggle */}
      <div className="space-y-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-[#49454F] dark:text-[#CAC4D0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={`Search ${mediaType} (e.g., mountain, minimalism, space)`}
              aria-label="Search Unsplash wallpapers"
              data-testid="wallpaper_search_input"
              className="h-12 w-full rounded-xl border border-[#79747E]/50 dark:border-[#938F99]/40 bg-white dark:bg-[#1D1B20] pl-10 pr-10 text-sm text-[#1C1B1F] dark:text-[#E6E1E5] placeholder:text-[#49454F]/70 dark:placeholder:text-[#CAC4D0]/60 focus:border-[#6650A4] dark:focus:border-[#D0BCFF] focus:outline-none"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#49454F] dark:text-[#CAC4D0] hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            data-testid="submit_search_button"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#6650A4] dark:bg-[#D0BCFF] px-6 text-sm font-semibold text-white dark:text-[#381E72] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6650A4]"
          >
            <Search className="h-4 w-4" />
            <span>Search {mediaType === 'illustrations' ? 'Illustrations' : 'Photos'}</span>
          </button>
        </form>

        {/* Photos / Illustrations Segmented Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Media type"
            className="inline-flex rounded-xl border border-[#CAC4D0] dark:border-[#49454F] bg-[#F3EDF7] dark:bg-[#211F26] p-1"
          >
            <button
              type="button"
              data-testid="media_type_photos"
              onClick={() => onMediaTypeChange('photos')}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                mediaType === 'photos'
                  ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                  : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1C1B1F] dark:hover:text-[#E6E1E5]'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Photos</span>
            </button>
            <button
              type="button"
              data-testid="media_type_illustrations"
              onClick={() => onMediaTypeChange('illustrations')}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                mediaType === 'illustrations'
                  ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                  : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1C1B1F] dark:hover:text-[#E6E1E5]'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Illustrations</span>
            </button>
          </div>
          <span className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
            Sorted newest first · Pixel 9+ (≥1080×2424{allowLandscape ? ' · Centered landscape on' : ' · Portrait only'})
          </span>
        </div>
      </div>

      {/* Favorites Section (always above Editorial Topics) */}
      <div className="space-y-2.5" data-testid="explore_favorites_section">
        <div className="flex items-center gap-2 text-sm font-medium text-[#49454F] dark:text-[#CAC4D0]">
          <Star className="h-4 w-4 fill-[#FFB300] text-[#FFB300]" />
          <span>Favorites</span>
        </div>
        {favoriteCategories.length === 0 ? (
          <p className="text-xs text-[#49454F]/80 dark:text-[#CAC4D0]/75">
            Star any topic or search keyword below to pin your favorites here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favoriteCategories.map((cat) => {
              const catType = cat.type ?? 'topic';
              const catMedia = cat.mediaType ?? 'photos';
              const isSelected =
                activeMode.type === catType &&
                activeMode.key.toLowerCase() === cat.slug.toLowerCase();
              return (
                <div
                  key={`${catType}:${cat.slug}`}
                  className={`inline-flex min-h-[40px] items-center overflow-hidden rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-[#6650A4] dark:border-[#D0BCFF] bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF]'
                      : 'border-[#CAC4D0] dark:border-[#49454F] bg-[#F3EDF7]/60 dark:bg-[#211F26] text-[#1C1B1F] dark:text-[#E6E1E5]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectFavorite(cat)}
                    className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap px-3 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {catType === 'search' && <Search className="h-3.5 w-3.5 opacity-75" />}
                    <span>{catType === 'search' ? `"${cat.title}"` : cat.title}</span>
                  </button>
                  <div
                    role="group"
                    aria-label={`${cat.title} media type`}
                    className="flex h-10 items-center border-l border-[#CAC4D0]/70 dark:border-[#49454F]/70 bg-black/[0.03] dark:bg-white/[0.03] px-1 gap-0.5"
                  >
                    <button
                      type="button"
                      title="Photos"
                      aria-label={`${cat.title} Photos`}
                      onClick={() => {
                        onUpdateFavoriteMediaType(cat, 'photos');
                        onSelectFavorite({ ...cat, mediaType: 'photos' });
                      }}
                      className={`flex h-7 items-center gap-1 rounded px-2 text-[11px] font-semibold transition-colors ${
                        catMedia === 'photos'
                          ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                          : 'text-[#49454F] dark:text-[#CAC4D0] hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <Camera className="h-3 w-3" />
                      <span>Photos</span>
                    </button>
                    <button
                      type="button"
                      title="Illustrations"
                      aria-label={`${cat.title} Illustrations`}
                      onClick={() => {
                        onUpdateFavoriteMediaType(cat, 'illustrations');
                        onSelectFavorite({ ...cat, mediaType: 'illustrations' });
                      }}
                      className={`flex h-7 items-center gap-1 rounded px-2 text-[11px] font-semibold transition-colors ${
                        catMedia === 'illustrations'
                          ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                          : 'text-[#49454F] dark:text-[#CAC4D0] hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <Palette className="h-3 w-3" />
                      <span>Illus.</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unsplash Editorial Topics */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-[#49454F] dark:text-[#CAC4D0]">
          <Sparkles className="h-4 w-4 text-[#625B71] dark:text-[#CCC2DC]" />
          <span>Editorial Topics</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => {
            const isSelected =
              activeMode.type === 'topic' &&
              activeMode.key.toLowerCase() === topic.slug.toLowerCase();
            return (
              <button
                key={topic.slug}
                type="button"
                onClick={() => {
                  onQueryChange('');
                  onSelectTopic(topic.slug, topic.title);
                }}
                className={`min-h-[40px] whitespace-nowrap shrink-0 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-[#6650A4] dark:border-[#D0BCFF] bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF]'
                    : 'border-[#CAC4D0] dark:border-[#49454F] bg-transparent text-[#49454F] dark:text-[#CAC4D0] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {topic.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Category / Search Banner */}
      <div
        onClick={() => onCategoryDetail({ ...activeMode, mediaType })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCategoryDetail({ ...activeMode, mediaType });
          }
        }}
        className="flex items-center justify-between gap-4 rounded-xl bg-[#ECE6F0] dark:bg-[#2B2930] px-4 py-3 cursor-pointer transition-colors hover:bg-[#E4DCEB] dark:hover:bg-[#35323B]"
      >
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
            {activeMode.type === 'search' ? `Results for "${activeMode.title}"` : activeMode.title}
            <span className="ml-2 text-xs font-medium text-[#49454F] dark:text-[#CAC4D0]">
              ({mediaType === 'illustrations' ? 'Illustrations' : 'Photos'})
            </span>
          </h2>
          <p className="text-xs font-semibold text-[#6650A4] dark:text-[#D0BCFF]">
            Tap to browse full collection and load more
          </p>
        </div>
        <button
          type="button"
          aria-label={activeMode.type === 'search' ? 'Favorite Search Keyword' : 'Favorite Category'}
          data-testid="fav_category_toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCategory(activeMode.key, activeMode.title, isActiveFav, activeMode.type, mediaType);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Star
            className={`h-5 w-5 ${
              isActiveFav
                ? 'fill-[#FFB300] text-[#FFB300]'
                : 'text-[#49454F] dark:text-[#CAC4D0]'
            }`}
          />
        </button>
      </div>

      {/* Results Area */}
      {exploreState.status === 'idle' && (
        <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-[#CAC4D0] dark:border-[#49454F] p-8 text-center">
          <p className="text-sm text-[#49454F] dark:text-[#CAC4D0]">
            Enter a keyword or select an editorial topic above to explore wallpapers.
          </p>
        </div>
      )}

      {exploreState.status === 'loading' && (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#6650A4] dark:text-[#D0BCFF]" />
          <p className="text-sm text-[#49454F] dark:text-[#CAC4D0]">Loading wallpapers…</p>
        </div>
      )}

      {exploreState.status === 'error' && (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl bg-[#F9DEDC]/40 dark:bg-[#8C1D18]/20 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-[#B3261E] dark:text-[#F2B8B5]" />
          <p className="max-w-md text-sm font-medium text-[#B3261E] dark:text-[#F2B8B5]">
            {exploreState.message}
          </p>
        </div>
      )}

      {exploreState.status === 'success' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {exploreState.data.map((photo) => {
            const isFav = favoriteImages.some((img) => img.id === photo.id);
            return (
              <ImageCard
                key={photo.id}
                title={photo.title}
                subtitle={formatPhotoDate(photo.createdAt) || photo.authorName}
                imageUrl={photo.previewUrl}
                isFav={isFav}
                onCardClick={() => onImageClick(photo, exploreState.data)}
                onFavToggle={() => onToggleImage(photo, isFav)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
