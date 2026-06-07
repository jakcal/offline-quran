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
      className="flex w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brand/40 active:scale-[0.99]"
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
  )
}
