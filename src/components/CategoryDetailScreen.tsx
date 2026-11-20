import { AlertCircle, ArrowLeft, Camera, Loader2, Palette, RefreshCw, Sparkles, Star } from 'lucide-react';
import type { FavoriteCategory, FavoriteImage, MediaType, SortOrder, WallpaperItem } from '../types/wallpaper';
import { ImageCard } from './ImageCard';

interface CategoryDetailScreenProps {
  target: { type: 'topic' | 'search'; key: string; title: string; mediaType?: MediaType };
  sortOrder: SortOrder;
  allowLandscape: boolean;
  photos: WallpaperItem[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  favoriteCategories: FavoriteCategory[];
  favoriteImages: FavoriteImage[];
  onSortChange: (sort: SortOrder) => void;
  onMediaTypeChange: (mediaType: MediaType) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onBackClick: () => void;
  onImageClick: (photo: WallpaperItem) => void;
  onToggleCategory: (
    slug: string,
    title: string,
    isFav: boolean,
    type: 'topic' | 'search',
    mediaType?: MediaType
  ) => void;
  onToggleFavorite: (photo: WallpaperItem, isFav: boolean) => void;
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

export function CategoryDetailScreen({
  target,
  allowLandscape,
  photos,
  isLoading,
  error,
  hasMore,
  favoriteCategories,
  favoriteImages,
  onMediaTypeChange,
  onRefresh,
  onLoadMore,
  onBackClick,
  onImageClick,
  onToggleCategory,
  onToggleFavorite,
}: CategoryDetailScreenProps) {
  const activeMedia: MediaType = target.mediaType === 'illustrations' ? 'illustrations' : 'photos';
  const mediaLabel = activeMedia === 'illustrations' ? 'Illustrations' : 'Photos';
  const isTargetFav = favoriteCategories.some(
    (c) => (c.type ?? 'topic') === target.type && c.slug.toLowerCase() === target.key.toLowerCase()
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackClick}
            data-testid="detail_back_button"
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
              {target.type === 'search' ? `"${target.title}"` : target.title}
            </h1>
            <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
              Pixel 9+ {mediaLabel.toLowerCase()} (≥1080×2424{allowLandscape ? ' · Portrait & centered landscape' : ' · Portrait only'}) · Latest published
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label={target.type === 'search' ? 'Favorite Search Keyword' : 'Favorite Category'}
            onClick={() =>
              onToggleCategory(target.key, target.title, isTargetFav, target.type, target.mediaType)
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#CAC4D0] dark:border-[#49454F] hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Star
              className={`h-4.5 w-4.5 ${
                isTargetFav ? 'fill-[#FFB300] text-[#FFB300]' : 'text-[#49454F] dark:text-[#CAC4D0]'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-[#CAC4D0] dark:border-[#49454F] px-3.5 text-xs font-semibold text-[#1C1B1F] dark:text-[#E6E1E5] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Collection media type"
          className="inline-flex rounded-xl border border-[#CAC4D0] dark:border-[#49454F] bg-[#F3EDF7] dark:bg-[#211F26] p-1"
        >
          <button
            type="button"
            data-testid="detail_media_type_photos"
            onClick={() => onMediaTypeChange('photos')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
              activeMedia === 'photos'
                ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1C1B1F] dark:hover:text-[#E6E1E5]'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Photos</span>
          </button>
          <button
            type="button"
            data-testid="detail_media_type_illustrations"
            onClick={() => onMediaTypeChange('illustrations')}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
              activeMedia === 'illustrations'
                ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1C1B1F] dark:hover:text-[#E6E1E5]'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Illustrations</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-[#6650A4] dark:text-[#D0BCFF]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Sorted by Latest Published (Newest First)</span>
        </div>
      </div>

      {/* Content */}
      {photos.length === 0 && isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6650A4] dark:text-[#D0BCFF]" />
        </div>
      ) : photos.length === 0 && !isLoading ? (
        error ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl bg-[#F3EDF7] dark:bg-[#211F26] p-8 text-center">
            <AlertCircle className="h-10 w-10 text-[#B3261E] dark:text-[#F2B8B5]" />
            <p className="max-w-md text-sm font-medium text-[#B3261E] dark:text-[#F2B8B5]">
              {error}
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6650A4] dark:bg-[#D0BCFF] px-4 text-xs font-semibold text-white dark:text-[#381E72]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try again</span>
            </button>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#CAC4D0] dark:border-[#49454F] p-8 text-center">
            <p className="text-sm text-[#49454F] dark:text-[#CAC4D0]">No wallpapers found</p>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6650A4] dark:bg-[#D0BCFF] px-4 text-xs font-semibold text-white dark:text-[#381E72]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => {
              const isFav = favoriteImages.some((img) => img.id === photo.id);
              return (
                <ImageCard
                  key={photo.id}
                  title={photo.title}
                  subtitle={formatPhotoDate(photo.createdAt) || photo.authorName}
                  imageUrl={photo.previewUrl}
                  isFav={isFav}
                  onCardClick={() => onImageClick(photo)}
                  onFavToggle={() => onToggleFavorite(photo, isFav)}
                />
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoading}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#CAC4D0] dark:border-[#49454F] px-5 text-sm font-medium text-[#1C1B1F] dark:text-[#E6E1E5] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isLoading ? 'Loading…' : 'Load More'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
