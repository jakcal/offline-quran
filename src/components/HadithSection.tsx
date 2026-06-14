import { memo, useEffect, useMemo, useState } from 'react'
import { HADITH_COLLECTIONS } from '../data'
import { getCachedHadithSlugs } from '../lib/db'
import { normalize } from '../lib/hadith'
import type { HadithItem } from '../lib/types'
import { useHadith } from '../store/hadith'
import { BookIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, SearchIcon, SpinnerIcon } from './icons'

const PAGE = 10

export function HadithSection() {
  const openSlug = useHadith((s) => s.openSlug)
  return openSlug == null ? <CollectionList /> : <CollectionView />
}

// ---- Collection list ----------------------------------------------------

function CollectionList() {
  const open = useHadith((s) => s.open)
  const [cached, setCached] = useState<Set<string>>(new Set())

  // Re-read which collections are saved offline each time we land here.
  useEffect(() => {
    void getCachedHadithSlugs().then((slugs) => setCached(new Set(slugs)))
  }, [])

  return (
    <section className="mx-auto w-full max-w-2xl px-3 pt-3">
      <p className="px-1 pb-3 text-sm leading-relaxed text-muted">
        Browse and search the major collections. Each opens with Arabic and English, and is saved for offline use
        after the first view.
      </p>
      <ul className="space-y-2.5">
        {HADITH_COLLECTIONS.map((c) => {
          const saved = cached.has(c.slug)
          return (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => void open(c.slug)}
                className="flex w-full items-center gap-3.5 rounded-card border border-line bg-surface px-4 py-3.5 text-left transition-colors hover:border-brand/40 active:scale-[0.99]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
                  <BookIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  {c.note && <span className="block truncate text-xs text-muted">{c.note}</span>}
                </span>
                <span className="font-arabic shrink-0 text-lg text-muted" dir="rtl">
                  {c.arabic}
                </span>
                {saved ? (
                  <CheckIcon className="h-4 w-4 shrink-0 text-brand" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted/50" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---- Open collection: search + paginated list ---------------------------

function CollectionView() {
  const openSlug = useHadith((s) => s.openSlug)
  const data = useHadith((s) => s.data)
  const loading = useHadith((s) => s.loading)
  const error = useHadith((s) => s.error)
  const query = useHadith((s) => s.query)
  const setQuery = useHadith((s) => s.setQuery)
  const back = useHadith((s) => s.back)
  const retry = useHadith((s) => s.retry)

  const collection = HADITH_COLLECTIONS.find((c) => c.slug === openSlug)

  // Keep the input snappy but debounce the O(n) filter so fast typing on a big
  // collection doesn't run a full scan on every keystroke.
  const [text, setText] = useState('')
  useEffect(() => {
    const id = setTimeout(() => setQuery(text), 150)
    return () => clearTimeout(id)
  }, [text, setQuery])

  // Paging window. Reset during render when the query/collection changes — the
  // React-recommended alternative to a state-resetting effect.
  const [visible, setVisible] = useState(PAGE)
  const pageKey = `${openSlug}:${query}`
  const [seenKey, setSeenKey] = useState(pageKey)
  if (seenKey !== pageKey) {
    setSeenKey(pageKey)
    setVisible(PAGE)
  }

  // Drop content-less entries (e.g. muqaddimah markers with empty text).
  const items = useMemo(
    () => data?.items.filter((h) => h.english.trim() || h.arabic.trim()) ?? [],
    [data],
  )
  // Precompute a normalized search index once per loaded collection.
  const index = useMemo(() => items.map((h) => normalize(`${h.english} ${h.arabic}`)), [items])

  const results = useMemo(() => {
    const q = normalize(query)
    if (!q) return items
    const asNumber = Number(query.trim())
    return items.filter(
      (h, i) => (Number.isInteger(asNumber) && h.number === asNumber) || index[i].includes(q),
    )
  }, [items, query, index])

  const shown = results.slice(0, visible)

  return (
    <section className="mx-auto w-full max-w-2xl px-3 pt-3">
      {/* Header + sticky search */}
      <div className="sticky top-0 z-10 -mx-3 bg-paper/90 px-3 pb-2 backdrop-blur">
        <div className="flex items-center gap-2 pb-2">
          <button
            type="button"
            onClick={back}
            aria-label="Back to collections"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted active:bg-line"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight">{collection?.name ?? data?.name}</p>
            {data && <p className="text-xs text-muted">{items.length.toLocaleString()} hadiths</p>}
          </div>
          {collection && (
            <span className="font-arabic shrink-0 text-lg text-muted" dir="rtl">
              {collection.arabic}
            </span>
          )}
        </div>

        {data && (
          <div className="flex items-center gap-2 rounded-card border border-line bg-surface px-3 py-2">
            <SearchIcon className="h-5 w-5 shrink-0 text-muted" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              inputMode="search"
              placeholder="Search this collection or # number"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center text-sm text-muted">
          <SpinnerIcon className="h-7 w-7 text-brand" />
          Loading {collection?.name ?? 'collection'}…
          <span className="text-xs">First open downloads it for offline use.</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
          <p className="text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            Try again
          </button>
        </div>
      ) : results.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted">No hadiths match your search.</p>
      ) : (
        <>
          {query && (
            <p className="px-1 py-2 text-xs text-muted">
              {results.length.toLocaleString()} match{results.length === 1 ? '' : 'es'}
            </p>
          )}
          <ul className="space-y-3 py-1">
            {shown.map((h) => (
              <HadithCard key={h.number} item={h} collection={collection?.name ?? ''} />
            ))}
          </ul>

          {visible < results.length ? (
            <div className="px-1 py-4">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE)}
                className="w-full rounded-card border border-line bg-surface py-3 text-sm font-semibold text-brand transition-colors hover:border-brand/40 active:scale-[0.99]"
              >
                Load more · {(results.length - visible).toLocaleString()} left
              </button>
            </div>
          ) : (
            shown.length > PAGE && <p className="px-1 py-4 text-center text-xs text-muted">That's all of them.</p>
          )}
        </>
      )}
    </section>
  )
}

// ---- One hadith ---------------------------------------------------------

const HadithCard = memo(function HadithCard({ item, collection }: { item: HadithItem; collection: string }) {
  return (
    <li className="overflow-hidden rounded-card border border-line bg-surface">
      {/* Header: number + grades */}
      <div className="flex items-center gap-2 border-b border-line/70 bg-paper/40 px-4 py-2.5">
        <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">#{item.number}</span>
        <span className="truncate text-xs font-medium text-muted">
          {collection}
          {item.reference.book > 0 && ` · Book ${item.reference.book}`}
        </span>
        {item.grades.length > 0 && (
          <span className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
            {item.grades.slice(0, 2).map((g) => (
              <span key={g} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand">
                {g}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="px-4 py-4">
        {item.arabic && (
          <p className="font-arabic text-right text-[1.6rem] leading-[2.1] text-ink" dir="rtl">
            {item.arabic}
          </p>
        )}
        {item.arabic && <div className="my-4 h-px bg-line" />}
        <p className="text-[15px] leading-relaxed text-ink/90">{item.english}</p>
      </div>
    </li>
  )
})
