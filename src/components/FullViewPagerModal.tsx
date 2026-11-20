import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Heart,
  Home,
  Infinity as InfinityIcon,
  Lock,
  Wallpaper,
} from 'lucide-react';
import type { FavoriteImage, WallpaperItem } from '../types/wallpaper';
import { downloadCroppedWallpaper } from '../services/wallpaperService';

interface FullViewPagerModalProps {
  photos: WallpaperItem[];
  initialIndex: number;
  favoriteImages: FavoriteImage[];
  onDismiss: () => void;
  onToggleFavorite: (photo: WallpaperItem, isFav: boolean) => void;
  onWallpaperSet: (photo: WallpaperItem, targetLabel: string) => void;
  onNotify: (msg: string) => void;
}

export function FullViewPagerModal({
  photos,
  initialIndex,
  favoriteImages,
  onDismiss,
  onToggleFavorite,
  onWallpaperSet,
  onNotify,
}: FullViewPagerModalProps) {
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(initialIndex, Math.max(0, photos.length - 1)))
  );
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [isOperating, setIsOperating] = useState(false);

  const photo = photos[index];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showApplyDialog) setShowApplyDialog(false);
        else onDismiss();
      } else if (e.key === 'ArrowLeft' && index > 0) {
        setIndex((i) => i - 1);
      } else if (e.key === 'ArrowRight' && index < photos.length - 1) {
        setIndex((i) => i + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, photos.length, showApplyDialog, onDismiss]);

  if (!photo) return null;

  const isFav = favoriteImages.some((img) => img.id === photo.id);
  const baseAuthorUrl = photo.authorUrl || 'https://unsplash.com';
  const separator = baseAuthorUrl.includes('?') ? '&' : '?';
  const attributionUrl = `${baseAuthorUrl}${separator}utm_source=personal_wallpaper_app&utm_medium=referral`;

  const handleApply = async (targetLabel: string) => {
    setShowApplyDialog(false);
    setIsOperating(true);
    try {
      onWallpaperSet(photo, targetLabel);
      onNotify(`${targetLabel} wallpaper applied (no file saved to device storage).`);
    } finally {
      setIsOperating(false);
    }
  };

  const handleDownload = async () => {
    setIsOperating(true);
    const ok = await downloadCroppedWallpaper(
      photo.fullUrl,
      photo.title || 'wallpaper',
      photo.downloadLocationUrl
    );
    setIsOperating(false);
    onNotify(ok ? 'Cropped wallpaper downloaded!' : 'Could not prepare wallpaper download.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
    >
      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/75"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <span className="text-xs font-medium text-white/70 tabular-nums">
          {index + 1} / {photos.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isOperating}
            aria-label="Download cropped wallpaper"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/75 disabled:opacity-50"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onToggleFavorite(photo, isFav)}
            aria-label="Favorite icon"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/75"
          >
            <Heart className={`h-5 w-5 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
        </div>
      </div>

      {/* High-Resolution Full Image + Side Arrows */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        <img
          src={photo.fullUrl}
          alt={photo.title}
          referrerPolicy="no-referrer"
          className="max-h-full max-w-full object-contain select-none"
        />

        {index > 0 && (
          <button
            type="button"
            aria-label="Previous wallpaper"
            onClick={() => setIndex((i) => i - 1)}
            className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {index < photos.length - 1 && (
          <button
            type="button"
            aria-label="Next wallpaper"
            onClick={() => setIndex((i) => i + 1)}
            className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/80"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom Scrim, Unsplash Attribution & Set Wallpaper CTA */}
      <div className="relative z-10 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-6 pb-6 pt-10">
        <div className="mx-auto max-w-2xl space-y-3">
          <h2 className="line-clamp-2 text-base font-bold text-white">{photo.title}</h2>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <a
              href={attributionUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="unsplash_attribution_link"
              className="inline-flex items-center gap-1.5 text-white/85 hover:text-white underline underline-offset-2"
            >
              <span>Photo by {photo.authorName} on Unsplash</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <span className="text-white/60 tabular-nums">
              {photo.width} × {photo.height}
            </span>
          </div>

          <button
            type="button"
            data-testid="full_view_set_wallpaper_button"
            disabled={isOperating}
            onClick={() => setShowApplyDialog(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6650A4] text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            <Wallpaper className="h-5 w-5" />
            <span>{isOperating ? 'Applying Wallpaper...' : 'Set Wallpaper'}</span>
          </button>
        </div>
      </div>

      {/* Set Wallpaper Options Dialog */}
      {showApplyDialog && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowApplyDialog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#FFFBFE] dark:bg-[#2B2930] p-6 text-[#1C1B1F] dark:text-[#E6E1E5] shadow-xl"
          >
            <h3 className="text-lg font-semibold">Set Wallpaper Options</h3>
            <div className="mt-4 space-y-2">
              {[
                { label: 'Home Screen Only', short: 'Home screen', Icon: Home },
                { label: 'Lock Screen Only', short: 'Lock screen', Icon: Lock },
                {
                  label: 'Both Home & Lock Screen',
                  short: 'Home and Lock screens',
                  Icon: InfinityIcon,
                },
              ].map(({ label, short, Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => void handleApply(short)}
                  className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Icon className="h-5 w-5 text-[#6650A4] dark:text-[#D0BCFF]" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowApplyDialog(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6650A4] dark:text-[#D0BCFF] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
