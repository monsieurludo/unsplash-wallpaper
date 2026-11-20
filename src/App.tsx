import { useEffect, useState } from 'react';
import {
  Clock,
  Compass,
  Heart,
  Loader2,
  RefreshCw,
  Settings as SettingsIcon,
  Wallpaper,
} from 'lucide-react';
import { useWallpaperStore } from './hooks/useWallpaperStore';
import type { WallpaperItem } from './types/wallpaper';
import { ExploreScreen } from './components/ExploreScreen';
import { FavoritesScreen } from './components/FavoritesScreen';
import { SchedulerScreen } from './components/SchedulerScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { CategoryDetailScreen } from './components/CategoryDetailScreen';
import { FullViewPagerModal } from './components/FullViewPagerModal';

type TabKey = 'explore' | 'favorites' | 'scheduler' | 'settings';

export default function App() {
  const store = useWallpaperStore();
  const [currentTab, setCurrentTab] = useState<TabKey>('explore');
  const [fullViewPhotos, setFullViewPhotos] = useState<WallpaperItem[]>([]);
  const [fullViewIndex, setFullViewIndex] = useState<number | null>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);

  const activeToast = store.uiMessage ?? localToast;

  useEffect(() => {
    if (!store.uiMessage) return;
    const t = window.setTimeout(() => store.clearUiMessage(), 3200);
    return () => window.clearTimeout(t);
  }, [store.uiMessage, store]);

  useEffect(() => {
    if (!localToast) return;
    const t = window.setTimeout(() => setLocalToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [localToast]);

  const navigateTab = (tab: TabKey) => {
    store.exitCategoryDetail();
    setFullViewIndex(null);
    setCurrentTab(tab);
  };

  const navItems: Array<{ key: TabKey; label: string; Icon: typeof Compass; testId: string }> = [
    { key: 'explore', label: 'Explore', Icon: Compass, testId: 'nav_explore' },
    { key: 'favorites', label: 'Favorites', Icon: Heart, testId: 'nav_favorites' },
    { key: 'scheduler', label: 'Scheduler', Icon: Clock, testId: 'nav_scheduler' },
    { key: 'settings', label: 'Settings', Icon: SettingsIcon, testId: 'nav_settings' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFBFE] dark:bg-[#141218] text-[#1C1B1F] dark:text-[#E6E1E5] pb-20 md:pb-10">
      {/* Top Bar (3-zone contract on desktop, compact bar on mobile) */}
      <header className="sticky top-0 z-30 border-b border-[#CAC4D0]/50 dark:border-[#49454F]/50 bg-[#F3EDF7]/95 dark:bg-[#211F26]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateTab('explore')}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#1C1B1F] dark:text-[#E6E1E5] whitespace-nowrap shrink-0"
          >
            <Wallpaper className="h-5 w-5 text-[#6650A4] dark:text-[#D0BCFF]" />
            <span>Wallpaper Studio</span>
          </button>

          {/* Zone 2: 4 single-line nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map(({ key, label, testId }) => {
              const active = currentTab === key && !store.detailTarget;
              return (
                <button
                  key={key}
                  type="button"
                  data-testid={`${testId}_desktop`}
                  onClick={() => navigateTab(key)}
                  className={`relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'text-[#6650A4] dark:text-[#D0BCFF] font-semibold'
                      : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1C1B1F] dark:hover:text-[#E6E1E5]'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-[#6650A4] dark:bg-[#D0BCFF]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={store.isRotating}
              onClick={() => void store.triggerImmediateRotation()}
              className="inline-flex h-9 items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#6650A4] dark:bg-[#D0BCFF] px-3.5 text-xs font-semibold text-white dark:text-[#381E72] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {store.isRotating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>{store.isRotating ? 'Rotating…' : 'Rotate Now'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {store.detailTarget ? (
          <CategoryDetailScreen
            target={store.detailTarget}
            sortOrder={store.detailSort}
            allowLandscape={store.settings.allowLandscape}
            photos={store.detailPhotos}
            isLoading={store.detailLoading}
            error={store.detailError}
            hasMore={store.detailHasMore}
            favoriteCategories={store.favoriteCategories}
            favoriteImages={store.favoriteImages}
            onSortChange={store.setDetailSort}
            onMediaTypeChange={store.changeDetailMediaType}
            onRefresh={store.refreshDetail}
            onLoadMore={store.loadMoreDetailPhotos}
            onBackClick={store.exitCategoryDetail}
            onImageClick={(photo) => {
              setFullViewPhotos(store.detailPhotos);
              setFullViewIndex(Math.max(0, store.detailPhotos.indexOf(photo)));
            }}
            onToggleCategory={store.toggleCategoryFavorite}
            onToggleFavorite={store.toggleImageFavorite}
          />
        ) : currentTab === 'explore' ? (
          <ExploreScreen
            searchQuery={store.searchQuery}
            mediaType={store.mediaType}
            allowLandscape={store.settings.allowLandscape}
            activeMode={store.activeMode}
            exploreState={store.exploreState}
            topics={store.topics}
            favoriteCategories={store.favoriteCategories}
            favoriteImages={store.favoriteImages}
            onQueryChange={store.setSearchQuery}
            onMediaTypeChange={store.changeMediaType}
            onSearch={store.searchPhotos}
            onSelectTopic={store.selectTopic}
            onSelectFavorite={store.selectFavoriteOnExplore}
            onUpdateFavoriteMediaType={store.updateCategoryMediaType}
            onToggleCategory={store.toggleCategoryFavorite}
            onToggleImage={store.toggleImageFavorite}
            onImageClick={(photo, list) => {
              setFullViewPhotos(list);
              setFullViewIndex(Math.max(0, list.indexOf(photo)));
            }}
            onCategoryDetail={store.enterCategoryDetail}
          />
        ) : currentTab === 'favorites' ? (
          <FavoritesScreen
            favoriteCategories={store.favoriteCategories}
            favoriteImages={store.favoriteImages}
            onCategoryRemove={(cat) =>
              store.toggleCategoryFavorite(
                cat.slug,
                cat.title,
                true,
                cat.type ?? 'topic',
                cat.mediaType
              )
            }
            onCategorySelect={(cat) =>
              store.enterCategoryDetail({
                type: cat.type ?? 'topic',
                key: cat.slug,
                title: cat.title,
                mediaType: cat.mediaType,
              })
            }
            onCategoryMediaTypeChange={store.updateCategoryMediaType}
            onImageClick={(fav, mappedPhotos) => {
              const idx = mappedPhotos.findIndex((p) => p.id === fav.id);
              setFullViewPhotos(mappedPhotos);
              setFullViewIndex(Math.max(0, idx));
            }}
            onImageRemove={(fav) => store.toggleFavImageFavorite(fav, true)}
          />
        ) : currentTab === 'scheduler' ? (
          <SchedulerScreen
            settings={store.settings}
            isRotating={store.isRotating}
            favoriteImages={store.favoriteImages}
            logs={store.logs}
            onToggleFavoriteUrl={store.toggleCurrentWallpaperFavorite}
            onSettingsChanged={store.updateSettings}
            onForceUpdate={store.triggerImmediateRotation}
            onBlockCurrentWallpaper={store.blockCurrentWallpaper}
            onClearLogs={store.clearLogs}
            onNotify={setLocalToast}
          />
        ) : (
          <SettingsScreen
            settings={store.settings}
            onSettingsChanged={store.updateSettings}
            onExportBackup={store.exportBackup}
            onImportBackup={store.importBackup}
            onNotify={setLocalToast}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        data-testid="bottom_nav_bar"
        className="fixed bottom-0 left-0 right-0 z-30 grid h-14 grid-cols-4 border-t border-[#CAC4D0]/50 dark:border-[#49454F]/50 bg-[#F3EDF7]/95 dark:bg-[#211F26]/95 backdrop-blur-md md:hidden"
      >
        {navItems.map(({ key, label, Icon, testId }) => {
          const active = currentTab === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={testId}
              onClick={() => navigateTab(key)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-[#6650A4] dark:text-[#D0BCFF] font-semibold'
                  : 'text-[#49454F] dark:text-[#CAC4D0]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Full Screen Horizontal Pager Overlay */}
      {fullViewIndex !== null && (
        <FullViewPagerModal
          photos={fullViewPhotos}
          initialIndex={fullViewIndex}
          favoriteImages={store.favoriteImages}
          onDismiss={() => setFullViewIndex(null)}
          onToggleFavorite={store.toggleImageFavorite}
          onWallpaperSet={store.setCurrentWallpaper}
          onNotify={setLocalToast}
        />
      )}

      {/* Toast Notification */}
      {activeToast && (
        <div
          role="status"
          className="fixed bottom-20 right-4 z-50 max-w-xs rounded-xl bg-[#313033] dark:bg-[#E6E1E5] px-4 py-2.5 text-xs font-medium text-[#F4EFF4] dark:text-[#313033] shadow-lg md:bottom-6"
        >
          {activeToast}
        </div>
      )}
    </div>
  );
}
