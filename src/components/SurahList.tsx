import { useMemo, useState } from 'react'
import { CHAPTERS, CHAPTER_BY_ID, RECITERS } from '../data'
import { useDownloads } from '../store/downloads'
import { DownloadedRow } from './DownloadedRow'
import { SearchIcon } from './icons'
import { SurahRow } from './SurahRow'

type Filter = 'all' | 'offline'

const reciterName = (id: number) => RECITERS.find((r) => r.id === id)?.name ?? ''

export function SurahList() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const downloaded = useDownloads((s) => s.downloaded)

  // All-tab: filter the 114 chapters by the search query.
  const chapters = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CHAPTERS
    return CHAPTERS.filter(
      (c) =>
        c.nameSimple.toLowerCase().includes(q) ||
        c.translatedName.toLowerCase().includes(q) ||
        c.nameArabic.includes(query.trim()) ||
        String(c.id) === q,
    )
  }, [query])

  // Offline-tab: every downloaded recording across all reciters, each with its reciter.
  const offlineEntries = useMemo(() => {
    const q = query.trim().toLowerCase()
    const entries = [...downloaded]
      .map((k) => {
        const [reciterId, chapterId] = k.split(':').map(Number)
        return { reciterId, chapterId }
      })
      .filter(({ chapterId }) => CHAPTER_BY_ID.has(chapterId))
    const matched = q
      ? entries.filter(({ reciterId, chapterId }) => {
          const c = CHAPTER_BY_ID.get(chapterId)!
          return (
            c.nameSimple.toLowerCase().includes(q) ||
            c.translatedName.toLowerCase().includes(q) ||
            c.nameArabic.includes(query.trim()) ||
            String(c.id) === q ||
            reciterName(reciterId).toLowerCase().includes(q)
          )
        })
      : entries
    return matched.sort(
      (a, b) => a.chapterId - b.chapterId || reciterName(a.reciterId).localeCompare(reciterName(b.reciterId)),
    )
  }, [downloaded, query])

  return (
    <section className="mx-auto w-full max-w-2xl px-3">
      <div className="sticky top-0 z-10 -mx-3 bg-paper/90 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">
          <SearchIcon className="h-5 w-5 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputMode="search"
            placeholder={filter === 'offline' ? 'Search saved surahs or reciters' : 'Search surah by name or number'}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>

        <div className="mt-2 flex gap-2">
          <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
            All 114
          </FilterTab>
          <FilterTab active={filter === 'offline'} onClick={() => setFilter('offline')}>
            Offline {downloaded.size > 0 && `· ${downloaded.size}`}
          </FilterTab>
        </div>
      </div>

      {filter === 'offline' ? (
        offlineEntries.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted">
            {query
              ? 'No saved recordings match your search.'
              : 'Nothing saved offline yet. Play any surah (or tap its download icon) and it appears here — from every reciter you download.'}
          </p>
        ) : (
          <ul className="pb-2">
            {offlineEntries.map((e) => (
              <DownloadedRow key={`${e.reciterId}:${e.chapterId}`} reciterId={e.reciterId} chapterId={e.chapterId} />
            ))}
          </ul>
        )
      ) : chapters.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted">No surahs match your search.</p>
      ) : (
        <ul className="pb-2">
          {chapters.map((c) => (
            <SurahRow key={c.id} chapter={c} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'bg-brand text-white' : 'bg-surface text-muted ring-1 ring-line active:bg-line'
      }`}
    >
      {children}
    </button>
  )
}
