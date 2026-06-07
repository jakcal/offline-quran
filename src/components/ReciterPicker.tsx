import { useEffect, useState } from 'react'
import { RECITERS } from '../data'
import { fetchReciters } from '../lib/api'
import type { Reciter } from '../lib/types'
import { usePlayer } from '../store/player'
import { CheckIcon, CloseIcon, MicIcon } from './icons'

export function ReciterPicker() {
  const [open, setOpen] = useState(false)
  const [reciters, setReciters] = useState<Reciter[]>(RECITERS)
  const reciterId = usePlayer((s) => s.reciterId)
  const setReciter = usePlayer((s) => s.setReciter)

  // Refresh the list from quran.com when online; falls back to the bundled snapshot.
  useEffect(() => {
    fetchReciters().then(setReciters)
  }, [])

  const current = reciters.find((r) => r.id === reciterId) ?? RECITERS[0]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left active:scale-[0.99] transition-transform"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
          <MicIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Reciter</span>
          <span className="block truncate font-semibold">{current.name}</span>
          {current.style && <span className="block truncate text-xs text-muted">{current.style}</span>}
        </span>
        <span className="text-xs font-semibold text-brand">Change</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="safe-bottom relative max-h-[80vh] overflow-hidden rounded-t-3xl bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-bold">Choose a reciter</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-muted active:bg-line"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <ul className="max-h-[68vh] overflow-y-auto overscroll-contain p-2">
              {reciters.map((r) => {
                const active = r.id === reciterId
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setReciter(r.id)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${
                        active ? 'bg-brand-50 text-brand' : 'active:bg-line'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{r.name}</span>
                        {r.style && <span className="block truncate text-xs text-muted">{r.style}</span>}
                      </span>
                      {active && <CheckIcon className="h-5 w-5 shrink-0" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
