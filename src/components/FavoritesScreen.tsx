import { useState } from 'react';
import { Camera, Compass, Heart, Palette, Search, Trash2 } from 'lucide-react';
import type { FavoriteCategory, FavoriteImage, MediaType, WallpaperItem } from '../types/wallpaper';

interface FavoritesScreenProps {
  favoriteCategories: FavoriteCategory[];
  favoriteImages: FavoriteImage[];
  onCategoryRemove: (cat: FavoriteCategory) => void;
  onCategorySelect: (cat: FavoriteCategory) => void;
  onCategoryMediaTypeChange: (cat: FavoriteCategory, nextMedia: MediaType) => void;
  onImageClick: (fav: FavoriteImage, allPhotos: WallpaperItem[]) => void;
  onImageRemove: (fav: FavoriteImage) => void;
}

export function FavoritesScreen({
  favoriteCategories,
  favoriteImages,
  onCategoryRemove,
  onCategorySelect,
  onCategoryMediaTypeChange,
  onImageClick,
  onImageRemove,
}: FavoritesScreenProps) {
  const [innerTab, setInnerTab] = useState<'topics' | 'pics'>('topics');

  const mappedPhotos: WallpaperItem[] = favoriteImages.map((fav) => ({
    id: fav.id,
    title: fav.title,
    category: fav.category,
    previewUrl: fav.previewUrl,
    fullUrl: fav.fullUrl,
    width: fav.width,
    height: fav.height,
    blurHash: fav.blurHash,
    authorName: fav.authorName,
    authorUrl: fav.authorUrl,
    downloadLocationUrl: fav.downloadLocationUrl,
    createdAt: new Date(fav.addedAt).toISOString(),
  }));

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="grid grid-cols-2 border-b border-[#CAC4D0]/60 dark:border-[#49454F]/60">
        <button
          type="button"
          onClick={() => setInnerTab('topics')}
          className={`min-h-[44px] whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors tabular-nums ${
            innerTab === 'topics'
              ? 'border-[#6650A4] dark:border-[#D0BCFF] text-[#6650A4] dark:text-[#D0BCFF]'
              : 'border-transparent text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1C1B1F] dark:hover:text-[#E6E1E5]'
          }`}
        >
          Topics & Searches ({favoriteCategories.length})
        </button>
        <button
          type="button"
          onClick={() => setInnerTab('pics')}
          className={`min-h-[44px] whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors tabular-nums ${
            innerTab === 'pics'
              ? 'border-[#6650A4] dark:border-[#D0BCFF] text-[#6650A4] dark:text-[#D0BCFF]'
              : 'border-transparent text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1C1B1F] dark:hover:text-[#E6E1E5]'
          }`}
        >
          Saved Pictures ({favoriteImages.length})
        </button>
      </div>

      {innerTab === 'topics' ? (
        favoriteCategories.length === 0 ? (
          <EmptyFavoritesNotice
            title="No Favorite Topics or Searches"
            description="Star any Unsplash editorial topic or search keyword on the Explore tab so you can revisit it or include it in automatic rotation."
          />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {favoriteCategories.map((cat) => {
              const isSearch = cat.type === 'search';
              const Icon = isSearch ? Search : Compass;
              const catMedia: MediaType = cat.mediaType === 'illustrations' ? 'illustrations' : 'photos';
              return (
                <div
                  key={`${cat.type ?? 'topic'}:${cat.slug}`}
                  onClick={() => onCategorySelect(cat)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCategorySelect(cat);
                    }
                  }}
                  className="flex flex-col gap-3 rounded-xl bg-[#F3EDF7] dark:bg-[#211F26] px-4 py-3.5 cursor-pointer transition-colors hover:bg-[#EAE2F0] dark:hover:bg-[#2B2930]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-5 w-5 shrink-0 text-[#6650A4] dark:text-[#D0BCFF]" />
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
                          {isSearch ? `"${cat.title}"` : cat.title}
                        </p>
                        <p className="text-xs font-semibold text-[#6650A4] dark:text-[#D0BCFF]">
                          {isSearch ? 'Search keyword' : 'Editorial topic'} · Tap to browse
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${cat.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCategoryRemove(cat);
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#B3261E] dark:text-[#F2B8B5] hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Per-Favorite Photos / Illustrations Toggle */}
                  <div
                    role="group"
                    aria-label={`${cat.title} media type`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex w-fit rounded-lg border border-[#CAC4D0] dark:border-[#49454F] bg-white/70 dark:bg-[#141218]/60 p-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => onCategoryMediaTypeChange(cat, 'photos')}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                        catMedia === 'photos'
                          ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                          : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1C1B1F] dark:hover:text-[#E6E1E5]'
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Photos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onCategoryMediaTypeChange(cat, 'illustrations')}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
                        catMedia === 'illustrations'
                          ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                          : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1C1B1F] dark:hover:text-[#E6E1E5]'
                      }`}
                    >
                      <Palette className="h-3.5 w-3.5" />
                      <span>Illustrations</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : favoriteImages.length === 0 ? (
        <EmptyFavoritesNotice
          title="No saved pictures yet"
          description="Save individual pictures on the Explore screen using the Heart icon to store them offline-ready here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {favoriteImages.map((fav) => (
            <div
              key={fav.id}
              onClick={() => onImageClick(fav, mappedPhotos)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onImageClick(fav, mappedPhotos);
                }
              }}
              className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#ECE6F0] dark:bg-[#2B2930] shadow-sm cursor-pointer"
            >
              <img
                src={fav.previewUrl || fav.fullUrl}
                alt={fav.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/75 to-transparent" />
              <button
                type="button"
                aria-label="Delete saved picture"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageRemove(fav);
                }}
                className="absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/70"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <p className="pointer-events-none absolute bottom-2.5 left-3 right-3 truncate text-xs font-semibold text-white">
                {fav.authorName}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyFavoritesNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#CAC4D0] dark:border-[#49454F] p-8 text-center">
      <Heart className="h-12 w-12 text-[#6650A4]/50 dark:text-[#D0BCFF]/50" />
      <h3 className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">{title}</h3>
      <p className="max-w-md text-sm text-[#49454F] dark:text-[#CAC4D0]">{description}</p>
    </div>
  );
}
