import { useState } from 'react';
import { Heart, Image as ImageIcon } from 'lucide-react';

interface ImageCardProps {
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  isFav: boolean;
  onCardClick: () => void;
  onFavToggle: () => void;
}

export function ImageCard({
  title,
  subtitle,
  imageUrl,
  isFav,
  onCardClick,
  onFavToggle,
}: ImageCardProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick();
        }
      }}
      data-testid="wallpaper_grid_card"
      className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#ECE6F0] dark:bg-[#2B2930] shadow-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6650A4] dark:focus-visible:outline-[#D0BCFF] transition-transform duration-200 hover:-translate-y-0.5"
    >
      {!hasError ? (
        <img
          src={imageUrl}
          alt={title}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EADDFF] to-[#D0BCFF]/40 dark:from-[#2B2930] dark:to-[#1D1B20] p-4 text-center">
          <ImageIcon className="h-8 w-8 text-[#6650A4] dark:text-[#D0BCFF] opacity-60" />
          <span className="line-clamp-2 text-xs font-medium text-[#49454F] dark:text-[#CAC4D0]">
            {title}
          </span>
        </div>
      )}

      {/* Contrast scrim on bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* Top-right favorite toggle */}
      <button
        type="button"
        aria-label={isFav ? 'Remove wallpaper from favorites' : 'Save wallpaper'}
        data-testid="favorite_toggle_button"
        onClick={(e) => {
          e.stopPropagation();
          onFavToggle();
        }}
        className="absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-white"
      >
        <Heart
          className={`h-4.5 w-4.5 transition-colors ${
            isFav ? 'fill-red-500 text-red-500' : 'text-white'
          }`}
        />
      </button>

      {/* Bottom title & date */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
        <p className="truncate text-xs font-medium text-white">{title}</p>
        {subtitle && (
          <p className="mt-0.5 truncate text-[11px] text-white/75 tabular-nums">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
