import { formatDuration } from '../lib/format'
import { globalStats, useStats } from '../store/stats'

/** Compact "Your listening" summary on the home screen (global totals). */
export function ListeningStats() {
  const byChapter = useStats((s) => s.byChapter)
  const reset = useStats((s) => s.reset)
  const { seconds, plays, surahs } = globalStats(byChapter)

  // Nothing listened yet — keep the home clean.
  if (plays === 0 && seconds === 0) return null

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted">Your listening</h2>
        <button
          type="button"
          onClick={() => {
            if (confirm('Reset your listening stats?')) void reset()
          }}
          className="text-[11px] font-semibold text-muted transition-colors hover:text-ink"
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-3 divide-x divide-line rounded-card border border-line bg-surface">
        <Stat value={formatDuration(seconds)} label="Listened" />
        <Stat value={String(plays)} label={plays === 1 ? 'Play' : 'Plays'} />
        <Stat value={String(surahs)} label={surahs === 1 ? 'Surah' : 'Surahs'} />
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-2 py-3">
      <span className="font-display text-xl font-bold tabular-nums">{value}</span>
      <span className="mt-0.5 text-[11px] text-muted">{label}</span>
    </div>
  )
}
