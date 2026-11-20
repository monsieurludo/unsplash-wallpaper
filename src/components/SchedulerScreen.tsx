import { useMemo, useState } from 'react';
import {
  Bug,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CloudCog,
  CloudOff,
  Compass,
  Download,
  Heart,
  Home,
  Infinity as InfinityIcon,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Signal,
  Sun,
  Trash2,
  Wifi,
} from 'lucide-react';
import type { AppSettings, FavoriteImage } from '../types/wallpaper';
import { downloadCroppedWallpaper } from '../services/wallpaperService';

interface SchedulerScreenProps {
  settings: AppSettings;
  isRotating: boolean;
  favoriteImages: FavoriteImage[];
  logs: string[];
  onToggleFavoriteUrl: (url: string, isCurrentlyFav: boolean) => void;
  onSettingsChanged: (next: AppSettings) => void;
  onForceUpdate: () => void;
  onBlockCurrentWallpaper: () => void;
  onClearLogs: () => void;
  onNotify: (msg: string) => void;
}

const INTERVALS = [2, 4, 6, 12, 24, 48];

function formatTime24(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function SchedulerScreen({
  settings,
  isRotating,
  favoriteImages,
  logs,
  onToggleFavoriteUrl,
  onSettingsChanged,
  onForceUpdate,
  onBlockCurrentWallpaper,
  onClearLogs,
  onNotify,
}: SchedulerScreenProps) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerHour, setPickerHour] = useState(
    settings.preferredScheduleHour >= 0 ? settings.preferredScheduleHour : 8
  );
  const [pickerMinute, setPickerMinute] = useState(settings.preferredScheduleMinute);
  const [isBlockedExpanded, setIsBlockedExpanded] = useState(false);
  const [isDiagnosticsExpanded, setIsDiagnosticsExpanded] = useState(false);

  const allHistory = useMemo(() => {
    const raw = [
      settings.currentWallpaperUrl,
      ...settings.historyUrls.split(',').filter(Boolean),
    ].filter(Boolean);
    return Array.from(new Set(raw));
  }, [settings.currentWallpaperUrl, settings.historyUrls]);

  const [historyIndex, setHistoryIndex] = useState(0);
  const safeIndex = Math.min(historyIndex, Math.max(0, allHistory.length - 1));
  const currentViewUrl = allHistory[safeIndex] || settings.currentWallpaperUrl;
  const isFav = favoriteImages.some(
    (img) => img.fullUrl === currentViewUrl || img.previewUrl === currentViewUrl
  );

  const blockedUrlsList = useMemo(
    () => settings.blockedUrls.split(',').filter(Boolean),
    [settings.blockedUrls]
  );

  const nextRunText = useMemo(() => {
    if (!settings.isRotationEnabled) return 'Rotation Disabled';
    const now = new Date();
    if (settings.preferredScheduleHour >= 0 && settings.preferredScheduleHour <= 23) {
      const target = new Date();
      target.setHours(settings.preferredScheduleHour, settings.preferredScheduleMinute, 0, 0);
      if (target.getTime() < now.getTime() || target.getTime() - now.getTime() < 60_000) {
        if (settings.lastUpdateTime < target.getTime()) {
          return 'Pending Immediate Execution';
        }
        target.setDate(target.getDate() + 1);
      }
      return target.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    const elapsed = Date.now() - settings.lastUpdateTime;
    const intervalMs = settings.intervalHours * 3600 * 1000;
    const remaining = intervalMs - elapsed;
    if (remaining <= 0) return 'Pending Immediate Execution';
    const nextDate = new Date(Date.now() + remaining);
    return nextDate.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [
    settings.isRotationEnabled,
    settings.preferredScheduleHour,
    settings.preferredScheduleMinute,
    settings.intervalHours,
    settings.lastUpdateTime,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
          Automatic Rotation Settings
        </h1>
        <p className="mt-1 text-sm text-[#49454F] dark:text-[#CAC4D0]">
          Set background update schedules to automatically rotate wallpapers from your favorite Unsplash topics or saved pictures.
        </p>
      </div>

      {/* Main Enable Rotation Switch Card */}
      <div
        className={`flex items-center justify-between gap-4 rounded-xl p-4 transition-colors ${
          settings.isRotationEnabled
            ? 'bg-[#EADDFF]/50 dark:bg-[#4F378B]/40'
            : 'bg-[#ECE6F0] dark:bg-[#2B2930]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {settings.isRotationEnabled ? (
            <CloudCog className="h-7 w-7 shrink-0 text-[#6650A4] dark:text-[#D0BCFF]" />
          ) : (
            <CloudOff className="h-7 w-7 shrink-0 text-[#49454F] dark:text-[#CAC4D0]" />
          )}
          <div>
            <p className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
              Enable Wallpaper Rotation
            </p>
            <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
              {settings.isRotationEnabled
                ? 'Updates wallpapers on the set schedule'
                : 'Wallpaper updates are paused'}
            </p>
          </div>
        </div>
        <ToggleSwitch
          checked={settings.isRotationEnabled}
          onChange={(checked) => onSettingsChanged({ ...settings, isRotationEnabled: checked })}
          testId="schedule_toggle_switch"
          label="Enable Wallpaper Rotation"
        />
      </div>

      {/* Interval Selection */}
      {settings.isRotationEnabled && (
        <div className="space-y-2.5">
          <div>
            <h2 className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
              Update Interval
            </h2>
            <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
              Pick the periodic interval for automatic rotation checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTERVALS.map((hr) => {
              const selected = settings.intervalHours === hr;
              return (
                <button
                  key={hr}
                  type="button"
                  data-testid={`interval_chip_${hr}h`}
                  onClick={() => onSettingsChanged({ ...settings, intervalHours: hr })}
                  className={`min-h-[40px] whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-medium tabular-nums transition-colors ${
                    selected
                      ? 'border-[#6650A4] dark:border-[#D0BCFF] bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF]'
                      : 'border-[#CAC4D0] dark:border-[#49454F] text-[#49454F] dark:text-[#CAC4D0] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {hr} Hours
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-Column Controls Grid on Desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          {/* Connection Policy */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
              Connection Policy
            </h2>
            <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
              Control background internet usage properties for updates.
            </p>
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-3 rounded-xl p-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                <input
                  type="radio"
                  name="connection_policy"
                  checked={settings.onlyWifi}
                  onChange={() => onSettingsChanged({ ...settings, onlyWifi: true })}
                  className="mt-1 h-4 w-4 accent-[#6650A4]"
                />
                <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-[#49454F] dark:text-[#CAC4D0]" />
                <div>
                  <p className="text-sm font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">Wi-Fi Only</p>
                  <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
                    Updates are paused on cellular connections, saving data.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-xl p-2.5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                <input
                  type="radio"
                  name="connection_policy"
                  checked={!settings.onlyWifi}
                  onChange={() => onSettingsChanged({ ...settings, onlyWifi: false })}
                  className="mt-1 h-4 w-4 accent-[#6650A4]"
                />
                <Signal className="mt-0.5 h-5 w-5 shrink-0 text-[#49454F] dark:text-[#CAC4D0]" />
                <div>
                  <p className="text-sm font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
                    Wi-Fi & Cellular
                  </p>
                  <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
                    Automatically update wallpaper on any available connection.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Daily Update Time Override */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
              Daily Update Time Override
            </h2>
            <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
              Force the automatic updates to run at a specific hour of the day.
            </p>
            <div className="rounded-xl bg-[#ECE6F0] dark:bg-[#2B2930] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Clock
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      settings.preferredScheduleHour !== -1
                        ? 'text-[#6650A4] dark:text-[#D0BCFF]'
                        : 'text-[#49454F] dark:text-[#CAC4D0]'
                    }`}
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
                      Preferred Update Time
                    </p>
                    <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
                      {settings.preferredScheduleHour === -1
                        ? 'No override (runs based on interval from last manual update)'
                        : `Updates daily at ${formatTime24(
                            settings.preferredScheduleHour,
                            settings.preferredScheduleMinute
                          )}`}
                    </p>
                    <p
                      className={`text-xs font-bold tabular-nums ${
                        nextRunText.includes('Pending')
                          ? 'text-[#B3261E] dark:text-[#F2B8B5]'
                          : 'text-[#6650A4] dark:text-[#D0BCFF]'
                      }`}
                    >
                      Next Run: {nextRunText}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.preferredScheduleHour !== -1}
                  onChange={(checked) =>
                    onSettingsChanged({
                      ...settings,
                      preferredScheduleHour: checked ? 8 : -1,
                      preferredScheduleMinute: 0,
                    })
                  }
                  label="Preferred Update Time"
                />
              </div>

              {settings.preferredScheduleHour !== -1 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-[#49454F] dark:text-[#CAC4D0]">
                    Selected Override Time:
                  </p>
                  <button
                    type="button"
                    data-testid="select_time_card"
                    onClick={() => {
                      setPickerHour(Math.max(0, Math.min(23, settings.preferredScheduleHour)));
                      setPickerMinute(Math.max(0, Math.min(59, settings.preferredScheduleMinute)));
                      setShowTimePicker(true);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-[#CAC4D0] dark:border-[#49454F] bg-white dark:bg-[#1D1B20] px-4 py-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <span className="flex items-center gap-3 text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5] tabular-nums">
                      <Clock className="h-5 w-5 text-[#6650A4] dark:text-[#D0BCFF]" />
                      {formatTime24(
                        settings.preferredScheduleHour,
                        settings.preferredScheduleMinute
                      )}
                    </span>
                    <span className="text-xs font-semibold text-[#6650A4] dark:text-[#D0BCFF]">
                      Change Time
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Light Background Filter Card */}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-[#ECE6F0]/70 dark:bg-[#2B2930]/80 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <Sun
                className={`h-6 w-6 shrink-0 ${
                  settings.onlyLightBackgrounds
                    ? 'text-[#FFB300]'
                    : 'text-[#49454F] dark:text-[#CAC4D0]'
                }`}
              />
              <div>
                <p className="text-sm font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
                  Opt for Light Backgrounds Only
                </p>
                <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
                  Analyzes candidates to skip dark wallpapers (e.g., pitch-black themes).
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={settings.onlyLightBackgrounds}
              onChange={(checked) =>
                onSettingsChanged({ ...settings, onlyLightBackgrounds: checked })
              }
              label="Opt for Light Backgrounds Only"
            />
          </div>
        </div>

        <div className="space-y-5">
          {/* Wallpaper Apply Target */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
              Wallpaper Apply Target
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Home', value: 1, Icon: Home },
                { label: 'Lock', value: 2, Icon: Lock },
                { label: 'Both', value: 3, Icon: InfinityIcon },
              ].map(({ label, value, Icon }) => {
                const selected = settings.wallpaperTarget === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onSettingsChanged({ ...settings, wallpaperTarget: value })}
                    className={`flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-xs font-semibold transition-colors ${
                      selected
                        ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                        : 'bg-[#ECE6F0] dark:bg-[#2B2930] text-[#1C1B1F] dark:text-[#E6E1E5] hover:opacity-90'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rotation Wallpaper Source */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
              Rotation Wallpaper Source
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Saved Topics', value: 0, Icon: Compass },
                { label: 'Saved Pics', value: 1, Icon: Heart },
                { label: 'Mix Both', value: 2, Icon: InfinityIcon },
              ].map(({ label, value, Icon }) => {
                const selected = settings.wallpaperSource === value;
                return (
                  <button
                    key={value}
                    type="button"
                    data-testid={`wallpaper_source_${value}`}
                    onClick={() => onSettingsChanged({ ...settings, wallpaperSource: value })}
                    className={`flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-xs font-semibold transition-colors ${
                      selected
                        ? 'bg-[#6650A4] dark:bg-[#D0BCFF] text-white dark:text-[#381E72]'
                        : 'bg-[#ECE6F0] dark:bg-[#2B2930] text-[#1C1B1F] dark:text-[#E6E1E5] hover:opacity-90'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current / History Wallpaper Preview */}
          {settings.currentWallpaperUrl && (
            <div className="overflow-hidden rounded-xl bg-[#ECE6F0] dark:bg-[#2B2930]">
              <div className="relative h-52 w-full bg-black">
                <img
                  src={currentViewUrl}
                  alt="Wallpaper Preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                {safeIndex < allHistory.length - 1 && (
                  <button
                    type="button"
                    aria-label="Previous history wallpaper"
                    onClick={() => setHistoryIndex((i) => i + 1)}
                    className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/75"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {safeIndex > 0 && (
                  <button
                    type="button"
                    aria-label="Next history wallpaper"
                    onClick={() => setHistoryIndex((i) => i - 1)}
                    className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/75"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 p-3.5">
                <Info className="h-5 w-5 shrink-0 text-[#625B71] dark:text-[#CCC2DC]" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-bold text-[#1C1B1F] dark:text-[#E6E1E5] tabular-nums">
                    {safeIndex === 0 && settings.lastUpdateTime > 0
                      ? new Date(settings.lastUpdateTime).toLocaleString(undefined, {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : safeIndex > 0
                        ? 'Historical Wallpaper'
                        : 'Never'}
                  </p>
                  {safeIndex === 0 && settings.currentWallpaperCategory && (
                    <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
                      Source: {settings.currentWallpaperCategory}
                    </p>
                  )}
                  <a
                    href={currentViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-[11px] font-medium text-[#6650A4] dark:text-[#D0BCFF] underline"
                  >
                    Url: {currentViewUrl}
                  </a>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Download cropped wallpaper"
                    onClick={async () => {
                      const ok = await downloadCroppedWallpaper(currentViewUrl, 'current_wallpaper');
                      onNotify(ok ? 'Wallpaper downloaded!' : 'Download failed.');
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#49454F] dark:text-[#CAC4D0] hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <Download className="h-4.5 w-4.5" />
                  </button>
                  {safeIndex === 0 && (
                    <button
                      type="button"
                      aria-label="Block wallpaper"
                      onClick={onBlockCurrentWallpaper}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-[#B3261E] dark:text-[#F2B8B5] hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Toggle Favorite"
                    onClick={() => onToggleFavoriteUrl(currentViewUrl, isFav)}
                    className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <Heart
                      className={`h-4.5 w-4.5 ${
                        isFav
                          ? 'fill-red-500 text-red-500'
                          : 'text-[#49454F] dark:text-[#CAC4D0]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Bin / Blocked Wallpapers */}
          <div className="rounded-xl bg-[#F3EDF7] dark:bg-[#211F26] p-4">
            <button
              type="button"
              onClick={() => setIsBlockedExpanded((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-[#1C1B1F] dark:text-[#E6E1E5] tabular-nums">
                <Trash2 className="h-4.5 w-4.5 text-[#B3261E] dark:text-[#F2B8B5]" />
                Delete Bin / Blocked Wallpapers ({blockedUrlsList.length})
              </span>
              {isBlockedExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>

            {isBlockedExpanded && (
              <div className="mt-3 space-y-2">
                {blockedUrlsList.length === 0 ? (
                  <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
                    No blocked wallpapers. Wallpapers skipped from current rotation will show up here.
                  </p>
                ) : (
                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {blockedUrlsList.map((url) => (
                      <div
                        key={url}
                        className="flex items-center gap-3 rounded-lg bg-[#ECE6F0] dark:bg-[#2B2930] p-2"
                      >
                        <img
                          src={url}
                          alt="Blocked Thumbnail"
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 shrink-0 rounded object-cover bg-black/20"
                        />
                        <span className="min-w-0 flex-1 truncate text-xs text-[#49454F] dark:text-[#CAC4D0]">
                          {url}
                        </span>
                        <button
                          type="button"
                          aria-label="Restore Wallpaper"
                          onClick={() => {
                            const updated = blockedUrlsList.filter((u) => u !== url);
                            onSettingsChanged({
                              ...settings,
                              blockedUrls: updated.join(','),
                            });
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6650A4] dark:text-[#D0BCFF] hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Diagnostics Logs */}
          <div className="rounded-xl bg-[#F3EDF7] dark:bg-[#211F26] p-4">
            <button
              type="button"
              onClick={() => setIsDiagnosticsExpanded((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
                <Bug className="h-4.5 w-4.5 text-[#625B71] dark:text-[#CCC2DC]" />
                Scheduler Diagnostics & Logs
              </span>
              {isDiagnosticsExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>

            {isDiagnosticsExpanded && (
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
                    Recent scheduling & update attempts:
                  </span>
                  <button
                    type="button"
                    onClick={onClearLogs}
                    className="rounded px-2 py-1 text-xs font-semibold text-[#6650A4] dark:text-[#D0BCFF] hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    Clear Logs
                  </button>
                </div>
                {logs.length === 0 ? (
                  <p className="text-xs text-[#49454F] dark:text-[#CAC4D0]">
                    No logs recorded yet. Action logs will populate here as updates trigger.
                  </p>
                ) : (
                  <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg bg-[#141218] p-3 font-mono text-[11px] text-[#E6E1E5]">
                    {logs.map((line, i) => (
                      <p
                        key={`${i}-${line}`}
                        className={
                          line.toLowerCase().includes('success')
                            ? 'text-emerald-400'
                            : line.toLowerCase().includes('failed') ||
                                line.toLowerCase().includes('error')
                              ? 'text-rose-400'
                              : 'text-[#E6E1E5]'
                        }
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary Force Update Button */}
      <button
        type="button"
        data-testid="force_update_button"
        disabled={isRotating}
        onClick={onForceUpdate}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#6650A4] dark:bg-[#D0BCFF] text-base font-semibold text-white dark:text-[#381E72] transition-opacity hover:opacity-95 disabled:opacity-60"
      >
        {isRotating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analyzing & Rotating...</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-5 w-5" />
            <span>Update wallpaper now</span>
          </>
        )}
      </button>

      {/* Time Picker Dialog */}
      {showTimePicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setShowTimePicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-[#FFFBFE] dark:bg-[#2B2930] p-6 text-[#1C1B1F] dark:text-[#E6E1E5] shadow-xl"
          >
            <p className="text-xs font-medium text-[#49454F] dark:text-[#CAC4D0]">Select Time</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <label className="text-[11px] text-[#49454F] dark:text-[#CAC4D0]">Hour</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={pickerHour}
                  onChange={(e) =>
                    setPickerHour(Math.max(0, Math.min(23, Number(e.target.value) || 0)))
                  }
                  className="h-14 w-20 rounded-xl border border-[#CAC4D0] dark:border-[#49454F] bg-transparent text-center text-2xl font-bold tabular-nums focus:border-[#6650A4] focus:outline-none"
                />
              </div>
              <span className="mt-5 text-2xl font-bold">:</span>
              <div className="flex flex-col items-center gap-1">
                <label className="text-[11px] text-[#49454F] dark:text-[#CAC4D0]">Minute</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={pickerMinute}
                  onChange={(e) =>
                    setPickerMinute(Math.max(0, Math.min(59, Number(e.target.value) || 0)))
                  }
                  className="h-14 w-20 rounded-xl border border-[#CAC4D0] dark:border-[#49454F] bg-transparent text-center text-2xl font-bold tabular-nums focus:border-[#6650A4] focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                data-testid="time_picker_cancel"
                onClick={() => setShowTimePicker(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6650A4] dark:text-[#D0BCFF] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="time_picker_confirm"
                onClick={() => {
                  onSettingsChanged({
                    ...settings,
                    preferredScheduleHour: pickerHour,
                    preferredScheduleMinute: pickerMinute,
                  });
                  setShowTimePicker(false);
                }}
                className="rounded-lg bg-[#6650A4] dark:bg-[#D0BCFF] px-4 py-2 text-sm font-semibold text-white dark:text-[#381E72]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  testId,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6650A4] ${
        checked
          ? 'bg-[#6650A4] dark:bg-[#D0BCFF]'
          : 'bg-[#79747E]/40 dark:bg-[#49454F]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-[#381E72] shadow transition-transform duration-150 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
