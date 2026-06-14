import { track } from '../lib/analytics'
import { useView, type AppView } from '../store/view'

const TABS: { id: AppView; label: string }[] = [
  { id: 'quran', label: 'Quran' },
  { id: 'hadith', label: 'Hadith' },
]

/** Top-level Quran / Hadith switcher. */
export function ViewTabs() {
  const view = useView((s) => s.view)
  const setView = useView((s) => s.setView)

  return (
    <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1">
      {TABS.map((t) => {
        const active = view === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (active) return
              track('view_change', { view: t.id })
              setView(t.id)
            }}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
              active ? 'bg-brand text-white' : 'text-muted active:bg-line'
            }`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
