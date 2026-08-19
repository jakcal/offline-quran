import { useDownloads } from '../store/downloads'
import { useSettingsSheet } from '../store/settingsSheet'
import { AdhkarReminders } from './AdhkarReminders'
import { CloseIcon } from './icons'
import { DownloadAllButton } from './DownloadAllButton'
import { ReciterChip } from './ReciterChip'

/** Bottom sheet for playback/offline options and adhkar reminders. */
export function SettingsSheet() {
  const open = useSettingsSheet((s) => s.open)
  const hide = useSettingsSheet((s) => s.hide)
  const autoDownload = useDownloads((s) => s.autoDownload)
  const setAutoDownload = useDownloads((s) => s.setAutoDownload)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={hide} />

      <div className="safe-bottom relative max-h-[90vh] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface">
        <div className="pt-2.5">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 pt-2">
          <h2 className="font-bold">Settings</h2>
          <button
            type="button"
            onClick={hide}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-muted active:bg-line"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 pb-7 pt-2">
          <ReciterChip />
          <DownloadAllButton />

          {/* Auto-download toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={autoDownload}
            onClick={() => setAutoDownload(!autoDownload)}
            className="flex w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brand/40"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Auto-save while listening</span>
              <span className="block text-xs text-muted">Keep each surah you play for offline use</span>
            </span>
            <span
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                autoDownload ? 'bg-brand' : 'bg-line'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  autoDownload ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>

          <AdhkarReminders />
        </div>
      </div>
    </div>
  )
}
