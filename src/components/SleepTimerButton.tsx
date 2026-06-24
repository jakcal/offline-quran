import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../lib/format'
import { usePlayer } from '../store/player'
import { CheckIcon, MoonIcon } from './icons'

const PRESETS = [5, 10, 15, 30, 45, 60]

/** Sleep-timer control: pick a duration (or "end of surah") to stop playback. */
export function SleepTimerButton() {
  const sleepRemaining = usePlayer((s) => s.sleepRemaining)
  const sleepAfterTrack = usePlayer((s) => s.sleepAfterTrack)
  const startSleepTimer = usePlayer((s) => s.startSleepTimer)
  const sleepAfterCurrent = usePlayer((s) => s.sleepAfterCurrent)
  const cancelSleepTimer = usePlayer((s) => s.cancelSleepTimer)

  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const active = sleepRemaining != null || sleepAfterTrack

  const close = (returnFocus = false) => {
    setOpen(false)
    if (returnFocus) btnRef.current?.focus()
  }

  // Close on outside tap / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(true)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (minutes: number) => {
    startSleepTimer(minutes)
    close(true)
  }

  const submitCustom = () => {
    const m = Math.round(Number(custom))
    if (Number.isFinite(m) && m > 0) {
      startSleepTimer(m)
      setCustom('')
      close(true)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={active ? 'Sleep timer on' : 'Set sleep timer'}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`grid h-10 place-items-center gap-1 rounded-full px-2 transition-colors ${
          active || open ? 'bg-brand-50 text-brand' : 'text-ink active:bg-line'
        } ${active ? 'w-auto' : 'w-10'}`}
      >
        <span className="flex items-center gap-1">
          <MoonIcon className="h-5 w-5" />
          {sleepRemaining != null && (
            <span className="text-[11px] font-semibold tabular-nums">{formatTime(sleepRemaining)}</span>
          )}
          {sleepAfterTrack && <span className="text-[11px] font-semibold">End</span>}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Sleep timer"
          className="absolute bottom-full right-0 z-40 mb-2 w-44 overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-xl"
        >
          <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">Sleep timer</p>

          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              role="menuitemradio"
              aria-checked={false}
              onClick={() => pick(m)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-ink hover:bg-line/70 active:bg-line"
            >
              <span>{m} min</span>
            </button>
          ))}

          <button
            type="button"
            role="menuitemradio"
            aria-checked={sleepAfterTrack}
            onClick={() => {
              sleepAfterCurrent()
              close(true)
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold ${
              sleepAfterTrack ? 'bg-brand-50 text-brand' : 'text-ink hover:bg-line/70 active:bg-line'
            }`}
          >
            <span>End of surah</span>
            {sleepAfterTrack && <CheckIcon className="h-4 w-4" />}
          </button>

          {/* Custom minutes */}
          <div className="flex items-center gap-1.5 px-2 py-1.5">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitCustom()
                }
              }}
              placeholder="min"
              aria-label="Custom minutes"
              className="w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm tabular-nums outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={submitCustom}
              className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white active:scale-95"
            >
              Set
            </button>
          </div>

          {active && (
            <button
              type="button"
              onClick={() => {
                cancelSleepTimer()
                close(true)
              }}
              className="mt-0.5 flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-line/70 active:bg-line"
            >
              Turn off
            </button>
          )}
        </div>
      )}
    </div>
  )
}
