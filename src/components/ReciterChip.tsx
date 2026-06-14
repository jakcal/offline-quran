import { RECITERS } from '../data'
import { usePlayer } from '../store/player'
import { useReciterSheet } from '../store/reciterSheet'
import { MicIcon } from './icons'

export function ReciterChip() {
  const reciterId = usePlayer((s) => s.reciterId)
  const show = useReciterSheet((s) => s.show)
  const current = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0]

  return (
    <button
      type="button"
      onClick={show}
      className="flex w-full items-center gap-3.5 rounded-card border border-brand/25 bg-brand-50/50 px-4 py-3.5 text-left shadow-sm transition-all hover:border-brand/50 hover:bg-brand-50/80 active:scale-[0.99]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-sm">
        <MicIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-brand">Reciter</span>
        <span className="block truncate text-[15px] font-bold leading-tight">{current.name}</span>
        {current.style && <span className="block truncate text-xs text-muted">{current.style}</span>}
      </span>
      <span className="shrink-0 rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">Change</span>
    </button>
  )
}
