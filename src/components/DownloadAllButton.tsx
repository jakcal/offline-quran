import { CHAPTERS } from '../data'
import { audioKey } from '../lib/db'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { usePlayer } from '../store/player'
import { useDownloads } from '../store/downloads'
import { CloseIcon, DownloadIcon, SpinnerIcon } from './icons'

const TOTAL = CHAPTERS.length

export function DownloadAllButton() {
  const online = useOnlineStatus()
  const reciterId = usePlayer((s) => s.reciterId)
  const downloaded = useDownloads((s) => s.downloaded)
  const bulk = useDownloads((s) => s.bulk)
  const downloadAll = useDownloads((s) => s.downloadAll)
  const cancelAll = useDownloads((s) => s.cancelAll)

  const savedCount = CHAPTERS.reduce(
    (n, c) => (downloaded.has(audioKey(reciterId, c.id)) ? n + 1 : n),
    0,
  )
  const allSaved = savedCount >= TOTAL
  const running = bulk?.reciterId === reciterId

  // A bulk run for this reciter is in progress.
  if (running) {
    const pct = bulk.total ? Math.round((bulk.completed / bulk.total) * 100) : 0
    return (
      <div className="rounded-card border border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
            <SpinnerIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">Downloading all surahs</span>
            <span className="block text-xs text-muted">
              {bulk.completed} of {bulk.total} · {pct}%
            </span>
          </span>
          <button
            type="button"
            onClick={cancelAll}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-brand/40 hover:text-ink active:scale-95"
          >
            <CloseIcon className="h-4 w-4" />
            Stop
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  // Everything is already cached for this reciter — nothing to offer, so hide it.
  if (allSaved) return null

  const remaining = TOTAL - savedCount

  return (
    <button
      type="button"
      onClick={() => void downloadAll(reciterId)}
      disabled={!online}
      className="flex w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brand/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
        <DownloadIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Download all surahs</span>
        <span className="block text-xs text-muted">
          {online
            ? savedCount > 0
              ? `${remaining} remaining · ${savedCount}/${TOTAL} saved`
              : `Save all ${TOTAL} for offline listening`
            : 'Connect to the internet to download'}
        </span>
      </span>
      {online && <span className="text-xs font-semibold text-brand">Save</span>}
    </button>
  )
}
