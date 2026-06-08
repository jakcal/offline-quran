import { useEffect, useState } from 'react'
import { RECITERS } from '../data'
import { track } from '../lib/analytics'
import { fetchReciters } from '../lib/api'
import type { Reciter } from '../lib/types'
import { usePlayer } from '../store/player'
import { useReciterSheet } from '../store/reciterSheet'
import { CheckIcon, CloseIcon } from './icons'

/** Global reciter picker. Rendered once; opened via useReciterSheet. */
export function ReciterSheet() {
  const open = useReciterSheet((s) => s.open)
  const hide = useReciterSheet((s) => s.hide)
  const [reciters, setReciters] = useState<Reciter[]>(RECITERS)
  const reciterId = usePlayer((s) => s.reciterId)
  const setReciter = usePlayer((s) => s.setReciter)

  useEffect(() => {
    if (open) fetchReciters().then(setReciters)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={hide} />
      <div className="safe-bottom relative max-h-[80vh] overflow-hidden rounded-t-3xl bg-surface">
        <div className="pt-2.5">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 pt-2">
          <h2 className="font-bold">Choose a reciter</h2>
          <button type="button" onClick={hide} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-muted active:bg-line">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <ul className="max-h-[64vh] overflow-y-auto overscroll-contain p-2">
          {reciters.map((r) => {
            const active = r.id === reciterId
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    track('select_reciter', { reciter_id: r.id, reciter_name: r.name })
                    setReciter(r.id)
                    hide()
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${
                    active ? 'bg-brand-50 text-brand' : 'hover:bg-line/70 active:bg-line'
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
  )
}
