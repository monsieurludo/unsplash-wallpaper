import { useRef } from 'react';
import { Download, MonitorCog, Moon, Sun, Upload } from 'lucide-react';
import type { AppSettings } from '../types/wallpaper';

interface SettingsScreenProps {
  settings: AppSettings;
  onSettingsChanged: (next: AppSettings) => void;
  onExportBackup: () => string;
  onImportBackup: (json: string) => boolean;
  onNotify: (msg: string) => void;
}

export function SettingsScreen({
  settings,
  onSettingsChanged,
  onExportBackup,
  onImportBackup,
  onNotify,
}: SettingsScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const themes = [
    { label: 'System Default', value: 0, Icon: MonitorCog },
    { label: 'Light Theme', value: 1, Icon: Sun },
    { label: 'Dark Theme', value: 2, Icon: Moon },
  ];

  const handleExport = () => {
    try {
      const json = onExportBackup();
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
        now.getHours()
      )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WallpaperChanger_Backup_${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onNotify('Backup file saved successfully!');
    } catch {
      onNotify('Failed to generate backup data.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const ok = onImportBackup(text);
      onNotify(
        ok ? 'Backup restored successfully!' : 'Restore failed: Invalid or corrupted backup file format.'
      );
    } catch {
      onNotify('Error reading backup file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
          Application Visual Theme
        </h2>
        <div className="space-y-3">
          {themes.map(({ label, value, Icon }) => {
            const selected = settings.themePreference === value;
            return (
              <button
                key={value}
                type="button"
                data-testid={`theme_preference_${value}`}
                onClick={() => onSettingsChanged({ ...settings, themePreference: value })}
                className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors ${
                  selected
                    ? 'bg-[#EADDFF] dark:bg-[#4F378B] text-[#21005D] dark:text-[#EADDFF]'
                    : 'bg-[#F3EDF7] dark:bg-[#211F26] text-[#1C1B1F] dark:text-[#E6E1E5] hover:bg-[#ECE6F0] dark:hover:bg-[#2B2930]'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={`text-base ${selected ? 'font-bold' : 'font-normal'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <hr className="border-[#CAC4D0]/60 dark:border-[#49454F]/60" />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
            Wallpaper Orientation & Quality
          </h2>
          <p className="mt-1 text-sm text-[#49454F] dark:text-[#CAC4D0]">
            Minimum Pixel 9 resolution (≥1080×2424) is always enforced before previewing or applying.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F3EDF7] dark:bg-[#211F26] p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
              Allow High-Quality Landscape (Centered)
            </p>
            <p className="mt-0.5 text-xs text-[#49454F] dark:text-[#CAC4D0]">
              Include ultra-high-resolution landscape images and center-crop them cleanly for portrait screens.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.allowLandscape}
            aria-label="Allow High-Quality Landscape (Centered)"
            data-testid="allow_landscape_switch"
            onClick={() =>
              onSettingsChanged({ ...settings, allowLandscape: !settings.allowLandscape })
            }
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6650A4] ${
              settings.allowLandscape
                ? 'bg-[#6650A4] dark:bg-[#D0BCFF]'
                : 'bg-[#79747E]/40 dark:bg-[#49454F]'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-[#381E72] shadow transition-transform duration-150 ${
                settings.allowLandscape ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      <hr className="border-[#CAC4D0]/60 dark:border-[#49454F]/60" />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#1C1B1F] dark:text-[#E6E1E5]">
            Backup & Restore
          </h2>
          <p className="mt-1 text-sm text-[#49454F] dark:text-[#CAC4D0]">
            Export your favorite topics, saved wallpapers with attribution, and scheduler settings.
          </p>
        </div>

        <div className="space-y-3 rounded-xl bg-[#F3EDF7] dark:bg-[#211F26] p-4">
          <button
            type="button"
            data-testid="backup_export_button"
            onClick={handleExport}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6650A4] dark:bg-[#D0BCFF] text-sm font-semibold text-white dark:text-[#381E72] transition-opacity hover:opacity-95"
          >
            <Download className="h-4.5 w-4.5" />
            <span>Backup to Storage</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            data-testid="backup_import_button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#E8DEF8] dark:bg-[#4A4458] text-sm font-semibold text-[#1D192B] dark:text-[#E8DEF8] transition-opacity hover:opacity-95"
          >
            <Upload className="h-4.5 w-4.5" />
            <span>Restore Backup File</span>
          </button>
        </div>
      </section>
    </div>
  );
}
