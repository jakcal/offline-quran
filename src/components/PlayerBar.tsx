import { CHAPTER_BY_ID, RECITERS } from '../data'
import { audioKey } from '../lib/db'
import { formatTime } from '../lib/format'
import { useDownloads } from '../store/downloads'
import { usePlayer } from '../store/player'
import {
  CheckIcon,
  CloudOffIcon,
  DownloadIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  SpinnerIcon,
} from './icons'

export function PlayerBar() {
  const reciterId = usePlayer((s) => s.reciterId)
  const chapterId = usePlayer((s) => s.chapterId)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const loading = usePlayer((s) => s.loading)
  const error = usePlayer((s) => s.error)
  const streaming = usePlayer((s) => s.streaming)
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const toggle = usePlayer((s) => s.toggle)
  const next = usePlayer((s) => s.next)
  const prev = usePlayer((s) => s.prev)
  const seek = usePlayer((s) => s.seek)
  const speed = usePlayer((s) => s.speed)
  const setSpeed = usePlayer((s) => s.setSpeed)

  const key = chapterId != null ? audioKey(reciterId, chapterId) : ''
  const downloaded = useDownloads((s) => (key ? s.downloaded.has(key) : false))
  const progress = useDownloads((s) => (key ? s.progress[key] : undefined))

  if (chapterId == null) return null
  const chapter = CHAPTER_BY_ID.get(chapterId)
  if (!chapter) return null
  const reciter = RECITERS.find((r) => r.id === reciterId)

  const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2]
  const cycleSpeed = () => {
    const i = SPEEDS.indexOf(speed)
    setSpeed(SPEEDS[(i + 1) % SPEEDS.length] ?? 1)
  }

  const savePct = progress?.state === 'downloading' && progress.total
    ? Math.round((progress.received / progress.total) * 100)
    : null

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-2xl px-4 pb-2 pt-2">
        {error && <p className="mb-1.5 text-center text-xs font-medium text-red-500">{error}</p>}

        {/* Seek bar */}
        <div className="flex items-center gap-2">
          <span className="w-9 text-right text-[11px] tabular-nums text-muted">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="any"
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-brand"
          />
          <span className="w-9 text-[11px] tabular-nums text-muted">{formatTime(duration)}</span>
        </div>

        {/* Info + controls */}
        <div className="mt-1.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">
                {chapter.id}. {chapter.nameSimple}
              </p>
              <span className="font-arabic shrink-0 text-base text-muted" dir="rtl">
                {chapter.nameArabic}
              </span>
            </div>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted">
              <span className="truncate">{reciter?.name}</span>
              <span aria-hidden>·</span>
              {downloaded ? (
                <span className="flex items-center gap-1 text-brand">
                  <CheckIcon className="h-3.5 w-3.5" /> Offline
                </span>
              ) : savePct != null ? (
                <span className="flex items-center gap-1">
                  <DownloadIcon className="h-3.5 w-3.5" /> Saving {savePct}%
                </span>
              ) : progress?.state === 'downloading' ? (
                <span className="flex items-center gap-1">
                  <DownloadIcon className="h-3.5 w-3.5" /> Saving…
                </span>
              ) : streaming ? (
                <span className="flex items-center gap-1">
                  <CloudOffIcon className="h-3.5 w-3.5" /> Streaming
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={cycleSpeed}
              aria-label={`Playback speed ${speed}×`}
              className="grid h-10 w-10 place-items-center rounded-full text-xs font-semibold tabular-nums text-ink active:bg-line"
            >
              {speed}×
            </button>

            <button
              type="button"
              onClick={prev}
              disabled={chapterId <= 1}
              aria-label="Previous surah"
              className="grid h-10 w-10 place-items-center rounded-full text-ink disabled:opacity-30 active:bg-line"
            >
              <PrevIcon className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white active:scale-95 transition-transform"
            >
              {loading ? (
                <SpinnerIcon className="h-6 w-6" />
              ) : isPlaying ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6" />
              )}
            </button>

            <button
              type="button"
              onClick={next}
              disabled={chapterId >= 114}
              aria-label="Next surah"
              className="grid h-10 w-10 place-items-center rounded-full text-ink disabled:opacity-30 active:bg-line"
            >
              <NextIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
