import { useEffect, useRef, useState } from 'react'
import { CHAPTER_BY_ID, RECITERS } from '../data'
import { audioKey } from '../lib/db'
import { formatTime } from '../lib/format'
import { useDownloads } from '../store/downloads'
import { usePlayer } from '../store/player'
import { useReader } from '../store/reader'
import {
  BookIcon,
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
  const openReader = useReader((s) => s.open)

  const key = chapterId != null ? audioKey(reciterId, chapterId) : ''
  const downloaded = useDownloads((s) => (key ? s.downloaded.has(key) : false))
  const progress = useDownloads((s) => (key ? s.progress[key] : undefined))

  const [speedOpen, setSpeedOpen] = useState(false)
  const speedRef = useRef<HTMLDivElement>(null)
  const speedBtnRef = useRef<HTMLButtonElement>(null)
  const speedMenuRef = useRef<HTMLDivElement>(null)

  const closeSpeed = (returnFocus = false) => {
    setSpeedOpen(false)
    if (returnFocus) speedBtnRef.current?.focus()
  }

  // Close the speed menu on outside tap / Escape, and move focus into it on open.
  useEffect(() => {
    if (!speedOpen) return
    speedMenuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    const onDown = (e: PointerEvent) => {
      if (!speedRef.current?.contains(e.target as Node)) setSpeedOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSpeed(true)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [speedOpen])

  // Roving arrow-key navigation between speed options while the menu is open.
  const onSpeedMenuKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const nav: Record<string, (i: number, n: number) => number> = {
      ArrowDown: (i, n) => (i + 1) % n,
      ArrowUp: (i, n) => (i - 1 + n) % n,
      Home: () => 0,
      End: (_i, n) => n - 1,
    }
    const move = nav[e.key]
    if (!move) return
    const items = Array.from(speedMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])
    if (!items.length) return
    e.preventDefault()
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    items[move(i, items.length)]?.focus()
  }

  if (chapterId == null) return null
  const chapter = CHAPTER_BY_ID.get(chapterId)
  if (!chapter) return null
  const reciter = RECITERS.find((r) => r.id === reciterId)

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

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
              onClick={() => openReader(chapterId)}
              aria-label="Read along"
              className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors active:bg-line"
            >
              <BookIcon className="h-5 w-5" />
            </button>

            <div ref={speedRef} className="relative">
              <button
                ref={speedBtnRef}
                type="button"
                onClick={() => setSpeedOpen((o) => !o)}
                aria-label={`Playback speed ${speed}×`}
                aria-haspopup="menu"
                aria-expanded={speedOpen}
                className={`grid h-10 w-10 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors ${
                  speedOpen ? 'bg-brand-50 text-brand' : 'text-ink active:bg-line'
                }`}
              >
                {speed}×
              </button>

              {speedOpen && (
                <div
                  ref={speedMenuRef}
                  role="menu"
                  aria-label="Playback speed"
                  onKeyDown={onSpeedMenuKey}
                  className="absolute bottom-full right-0 z-40 mb-2 w-32 overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-xl"
                >
                  <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">Speed</p>
                  {SPEEDS.map((s) => {
                    const active = s === speed
                    return (
                      <button
                        key={s}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => {
                          setSpeed(s)
                          closeSpeed(true)
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold tabular-nums ${
                          active ? 'bg-brand-50 text-brand' : 'text-ink hover:bg-line/70 active:bg-line'
                        }`}
                      >
                        <span>{s}×</span>
                        {active && <CheckIcon className="h-4 w-4" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

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
