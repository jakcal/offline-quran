import { useEffect, useMemo, useRef, useState } from 'react'
import { CHAPTER_BY_ID } from '../data'
import { toArabicNumber } from '../lib/format'
import { parseTajweed, TAJWEED_LEGEND, tajweedColor } from '../lib/tajweed'
import type { VerseText } from '../lib/types'
import { getChapterVerses } from '../lib/verses'
import { useBookmarks } from '../store/bookmarks'
import { usePlayer } from '../store/player'
import { useReader } from '../store/reader'
import { type ReaderScript, type ReaderTheme, useReaderSettings } from '../store/readerSettings'
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
  SlidersIcon,
  SpinnerIcon,
} from './icons'

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'

interface Palette {
  bg: string
  panel: string
  text: string
  faint: string
  accent: string
  accentInk: string
  rule: string
  sel: string
}

const THEMES: Record<ReaderTheme, Palette> = {
  light: { bg: '#faf9f6', panel: '#ffffff', text: '#1c1917', faint: '#78716c', accent: '#0f766e', accentInk: '#ffffff', rule: '#e7e5e4', sel: 'rgba(15,118,110,0.10)' },
  sepia: { bg: '#f4ecd8', panel: '#efe6cf', text: '#4b3b2a', faint: '#8a7355', accent: '#9a6a2f', accentInk: '#fffaf0', rule: '#e1d4b5', sel: 'rgba(154,106,47,0.13)' },
  green: { bg: '#e9f0e8', panel: '#dfe9dd', text: '#1c2b22', faint: '#5d7466', accent: '#15803d', accentInk: '#f0fdf4', rule: '#cdddc9', sel: 'rgba(21,128,61,0.12)' },
  dark: { bg: '#0f0f10', panel: '#1a1a1c', text: '#e9e7e4', faint: '#9a948c', accent: '#2dd4bf', accentInk: '#06231f', rule: '#2a2622', sel: 'rgba(45,212,191,0.15)' },
}

const SWATCH: Record<ReaderTheme, string> = { light: '#faf9f6', sepia: '#f4ecd8', green: '#e3ede1', dark: '#161618' }
const SCRIPTS: { key: ReaderScript; label: string }[] = [
  { key: 'uthmani', label: 'Uthmani' },
  { key: 'indopak', label: 'IndoPak' },
  { key: 'tajweed', label: 'Tajweed' },
]

export function Reader() {
  const chapterId = useReader((s) => s.chapterId)
  const close = useReader((s) => s.close)
  if (chapterId == null) return null
  return <ReaderView key={chapterId} chapterId={chapterId} onClose={close} />
}

function ReaderView({ chapterId, onClose }: { chapterId: number; onClose: () => void }) {
  const chapter = CHAPTER_BY_ID.get(chapterId)!
  const [verses, setVerses] = useState<VerseText[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const resumeKey = useRef(useBookmarks.getState().lastRead?.chapterId === chapterId ? useBookmarks.getState().lastRead?.verseKey ?? null : null)
  const resumed = useRef(false)

  const { theme, script, view, fontSize, lineHeight, hideMarkers, setTheme, setScript, setView, toggleMarkers, incFont, decFont, incLine, decLine } = useReaderSettings()
  const p = THEMES[theme]

  const bookmarks = useBookmarks((s) => s.bookmarks)
  const toggleBookmark = useBookmarks((s) => s.toggleBookmark)
  const setLastRead = useBookmarks((s) => s.setLastRead)
  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks])

  const active = usePlayer((s) => s.chapterId === chapterId)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const loading = usePlayer((s) => s.loading)
  const play = usePlayer((s) => s.play)
  const toggle = usePlayer((s) => s.toggle)

  useEffect(() => setLastRead(chapterId, resumeKey.current), [chapterId, setLastRead])

  useEffect(() => {
    let alive = true
    setVerses(null)
    setError(null)
    getChapterVerses(chapterId)
      .then((v) => alive && setVerses(v))
      .catch(
        () =>
          alive &&
          setError(
            navigator.onLine
              ? 'Could not load the text. Please try again.'
              : 'This surah isn’t saved for offline reading yet. Connect once to read it.',
          ),
      )
    return () => {
      alive = false
    }
  }, [chapterId, nonce])

  useEffect(() => setPageIndex(0), [verses])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pages = useMemo(() => {
    if (!verses) return []
    const map = new Map<number, VerseText[]>()
    for (const v of verses) {
      const arr = map.get(v.page) ?? []
      arr.push(v)
      map.set(v.page, arr)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([page, vs]) => ({ page, juz: vs[0].juz, verses: vs }))
  }, [verses])

  const paged = view === 'paged'
  const safeIndex = Math.min(pageIndex, Math.max(0, pages.length - 1))
  const currentPage = pages[safeIndex]

  // Resume to the last-read verse: jump to its mushaf page (paged) or scroll to it (scroll).
  useEffect(() => {
    if (resumed.current || !verses || !resumeKey.current) return
    const target = resumeKey.current
    if (view === 'paged') {
      const idx = pages.findIndex((pg) => pg.verses.some((v) => v.key === target))
      if (idx >= 0) {
        setPageIndex(idx)
        setSelected(target)
        resumed.current = true
      }
      return
    }
    const el = scrollRef.current?.querySelector(`[data-key="${target}"]`)
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ block: 'center' }))
      setSelected(target)
      resumed.current = true
    }
  }, [verses, view, pages])

  useEffect(() => {
    if (!paged) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setPageIndex((i) => Math.max(0, i - 1))
      else if (e.key === 'ArrowRight') setPageIndex((i) => Math.min(pages.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paged, pages.length])

  const verseByKey = useMemo(() => new Map((verses ?? []).map((v) => [v.key, v])), [verses])
  const showBismillah = chapterId !== 1 && chapterId !== 9
  const place = chapter.revelationPlace.charAt(0).toUpperCase() + chapter.revelationPlace.slice(1)

  const onSelect = (key: string) => {
    setSelected(key)
    setLastRead(chapterId, key)
  }

  const doFlash = (msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 1600)
  }

  const onCopy = () => {
    const v = selected && verseByKey.get(selected)
    if (!v) return
    void navigator.clipboard?.writeText(`${v.text}\n— Surah ${chapter.nameSimple} (${v.key})`)
    doFlash('Copied')
  }

  const onShare = () => {
    const v = selected && verseByKey.get(selected)
    if (!v) return
    const text = `${v.text}\n— Surah ${chapter.nameSimple} (${v.key})`
    if ('share' in navigator) void navigator.share({ title: `Surah ${chapter.nameSimple}`, text }).catch(() => {})
    else onCopy()
  }

  const renderVerses = (list: VerseText[]) => (
    <p dir="rtl" lang="ar" className="font-arabic" style={{ fontSize: `${fontSize}rem`, lineHeight, textAlign: 'justify' }}>
      {list.map((v) => {
        const isSel = selected === v.key
        return (
          <span
            key={v.key}
            data-key={v.key}
            onClick={() => onSelect(v.key)}
            className="cursor-pointer rounded-lg transition-colors"
            style={{
              background: isSel ? p.sel : 'transparent',
              padding: '0.04em 0.18em',
              boxDecorationBreak: 'clone',
              WebkitBoxDecorationBreak: 'clone',
            }}
          >
            <VerseContent v={v} script={script} />
            {!hideMarkers && (
              <AyahMarker n={v.verseNumber} color={p.accent} bg={p.bg} ink={p.accentInk} filled={bookmarkSet.has(v.key)} />
            )}{' '}
          </span>
        )
      })}
    </p>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: p.bg, color: p.text }}>
      {/* Toolbar */}
      <div className="safe-top flex shrink-0 items-center gap-2 px-3 py-3" style={{ background: p.panel, borderBottom: `1px solid ${p.rule}` }}>
        <IconBtn label="Close reader" onClick={onClose} color={p.faint}>
          <CloseIcon className="h-5 w-5" />
        </IconBtn>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-semibold">{chapter.nameSimple}</p>
          <p className="truncate text-xs" style={{ color: p.faint }}>
            Surah {chapter.id} · {place} · {chapter.versesCount} verses
          </p>
        </div>
        <IconBtn label="Reading settings" onClick={() => setSettingsOpen((v) => !v)} color={settingsOpen ? p.accent : p.faint}>
          <SlidersIcon className="h-5 w-5" />
        </IconBtn>
        <button
          type="button"
          onClick={() => (active ? toggle() : void play(chapterId))}
          aria-label={active && isPlaying ? 'Pause' : 'Play'}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-95"
          style={{ background: p.accent, color: p.accentInk }}
        >
          {active && loading ? <SpinnerIcon className="h-5 w-5" /> : active && isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Settings sheet */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close settings" className="absolute inset-0 bg-black/40" onClick={() => setSettingsOpen(false)} />
          <div className="safe-bottom relative max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-3xl" style={{ background: p.panel, color: p.text }}>
            <div className="sticky top-0 z-10 pt-2.5" style={{ background: p.panel }}>
              <div className="mx-auto h-1.5 w-10 rounded-full" style={{ background: p.rule }} />
              <div className="flex items-center justify-between px-4 pb-2 pt-2">
                <h2 className="font-bold">Reading settings</h2>
                <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full" style={{ color: p.faint }}>
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mx-auto max-w-2xl space-y-4 px-4 pb-6 pt-2">
            <Row label="Theme" faint={p.faint}>
              <div className="flex gap-2">
                {(Object.keys(SWATCH) as ReaderTheme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    aria-label={t}
                    className="h-8 w-8 rounded-full"
                    style={{ background: SWATCH[t], boxShadow: theme === t ? `0 0 0 2px ${p.accent}` : `inset 0 0 0 1px ${p.rule}` }}
                  />
                ))}
              </div>
            </Row>

            <Row label="Script" faint={p.faint}>
              <Segmented options={SCRIPTS.map((s) => ({ value: s.key, label: s.label }))} value={script} onChange={(v) => setScript(v as ReaderScript)} p={p} />
            </Row>

            <Row label="Text size" faint={p.faint}>
              <div className="flex items-center gap-2">
                <Stepper onClick={decFont} rule={p.rule} text={p.text}><span className="text-sm">A</span></Stepper>
                <span className="w-10 text-center text-xs tabular-nums" style={{ color: p.faint }}>{Math.round((fontSize / 1.8) * 100)}%</span>
                <Stepper onClick={incFont} rule={p.rule} text={p.text}><span className="text-lg">A</span></Stepper>
              </div>
            </Row>

            <Row label="Line spacing" faint={p.faint}>
              <div className="flex items-center gap-2">
                <Stepper onClick={decLine} rule={p.rule} text={p.text}><span className="text-base leading-none">≡</span></Stepper>
                <span className="w-10 text-center text-xs tabular-nums" style={{ color: p.faint }}>{lineHeight.toFixed(2)}</span>
                <Stepper onClick={incLine} rule={p.rule} text={p.text}><span className="text-base leading-none tracking-tighter">☰</span></Stepper>
              </div>
            </Row>

            <Row label="Layout" faint={p.faint}>
              <Segmented options={[{ value: 'continuous', label: 'Scroll' }, { value: 'paged', label: 'Pages' }]} value={view} onChange={(v) => setView(v as 'continuous' | 'paged')} p={p} />
            </Row>

            <Row label="Hide ayah numbers" faint={p.faint}>
              <Toggle on={hideMarkers} onClick={toggleMarkers} p={p} />
            </Row>

            {script === 'tajweed' && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                {TAJWEED_LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-2 text-xs" style={{ color: p.faint }}>
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Reading area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Desktop page-turn arrows (in the side gutters) */}
        {paged && currentPage && (
          <>
            <GutterBtn side="left" label="Previous page" disabled={safeIndex <= 0} onClick={() => setPageIndex((i) => Math.max(0, i - 1))} p={p}>
              <ChevronLeftIcon className="h-6 w-6" />
            </GutterBtn>
            <GutterBtn side="right" label="Next page" disabled={safeIndex >= pages.length - 1} onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))} p={p}>
              <ChevronRightIcon className="h-6 w-6" />
            </GutterBtn>
          </>
        )}

        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain px-5 py-6 md:px-8">
          <div className="mx-auto max-w-3xl">
            {/* Ornamental surah header */}
            <div className="mx-auto mb-7 max-w-md rounded-2xl px-6 py-4 text-center" style={{ border: `1px solid ${p.rule}`, background: p.bg }}>
              <div className="mb-1.5 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: p.faint }}>
                <Flourish color={p.accent} /> Surah {chapter.id} <Flourish color={p.accent} />
              </div>
              <h1 className="font-arabic text-4xl leading-tight">{chapter.nameArabic}</h1>
              <p className="mt-1 text-sm font-medium">{chapter.nameSimple}</p>
              <p className="text-xs" style={{ color: p.faint }}>{chapter.translatedName} · {place}</p>
            </div>

            {error ? (
              <div className="py-16 text-center">
                <p className="text-sm" style={{ color: p.faint }}>{error}</p>
                {navigator.onLine && (
                  <button type="button" onClick={() => setNonce((n) => n + 1)} className="mt-3 rounded-full px-4 py-1.5 text-sm font-semibold" style={{ background: p.accent, color: p.accentInk }}>
                    Retry
                  </button>
                )}
              </div>
            ) : !verses ? (
              <div className="grid place-items-center py-20" style={{ color: p.accent }}>
                <SpinnerIcon className="h-8 w-8" />
              </div>
            ) : (
              <>
                {showBismillah && (!paged || safeIndex === 0) && (
                  <p className="font-arabic mb-7 text-center text-2xl" dir="rtl" style={{ color: p.accent }}>
                    {BISMILLAH}
                  </p>
                )}
                {renderVerses(paged && currentPage ? currentPage.verses : verses)}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Verse action bar */}
      {selected && verseByKey.has(selected) && (
        <div className="safe-bottom flex shrink-0 items-center gap-1 px-3 py-2.5" style={{ background: p.panel, borderTop: `1px solid ${p.rule}` }}>
          <span className="px-2 text-sm font-semibold tabular-nums">{flash ?? `Ayah ${selected}`}</span>
          <div className="flex-1" />
          <ActionBtn label="Copy" onClick={onCopy} color={p.text}><CopyIcon className="h-5 w-5" /></ActionBtn>
          <ActionBtn label="Share" onClick={onShare} color={p.text}><ShareIcon className="h-5 w-5" /></ActionBtn>
          <ActionBtn label="Bookmark" onClick={() => toggleBookmark(selected)} color={bookmarkSet.has(selected) ? p.accent : p.text}>
            <BookmarkIcon className="h-5 w-5" style={bookmarkSet.has(selected) ? { fill: 'currentColor' } : undefined} />
          </ActionBtn>
          <ActionBtn label="Clear selection" onClick={() => setSelected(null)} color={p.faint}><CloseIcon className="h-5 w-5" /></ActionBtn>
        </div>
      )}

      {/* Paged nav (mobile/compact) */}
      {paged && currentPage && !selected && (
        <div className="safe-bottom flex shrink-0 items-center justify-between px-4 py-3" style={{ background: p.panel, borderTop: `1px solid ${p.rule}` }}>
          <NavBtn label="Previous page" onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={safeIndex <= 0} rule={p.rule} text={p.text}>
            <ChevronLeftIcon className="h-5 w-5" />
          </NavBtn>
          <div className="text-center text-xs" style={{ color: p.faint }}>
            <div className="font-semibold" style={{ color: p.text }}>Page {currentPage.page} · Juz {currentPage.juz}</div>
            <div>{safeIndex + 1} / {pages.length}</div>
          </div>
          <NavBtn label="Next page" onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))} disabled={safeIndex >= pages.length - 1} rule={p.rule} text={p.text}>
            <ChevronRightIcon className="h-5 w-5" />
          </NavBtn>
        </div>
      )}
    </div>
  )
}

function VerseContent({ v, script }: { v: VerseText; script: ReaderScript }) {
  if (script === 'indopak') return <>{v.indopak}</>
  if (script === 'tajweed')
    return (
      <>
        {parseTajweed(v.tajweed).map((t, i) => (
          <span key={i} style={{ color: tajweedColor(t.cls) }}>
            {t.text}
          </span>
        ))}
      </>
    )
  return <>{v.text}</>
}

function IconBtn({ label, onClick, color, children }: { label: string; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-opacity hover:opacity-70" style={{ color }}>
      {children}
    </button>
  )
}

function ActionBtn({ label, onClick, color, children }: { label: string; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full transition-opacity hover:opacity-70" style={{ color }}>
      {children}
    </button>
  )
}

function Row({ label, faint, children }: { label: string; faint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium" style={{ color: faint }}>{label}</span>
      {children}
    </div>
  )
}

function Segmented({ options, value, onChange, p }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; p: Palette }) {
  return (
    <div className="flex rounded-full p-0.5" style={{ background: p.bg, border: `1px solid ${p.rule}` }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className="rounded-full px-3 py-1 text-xs font-semibold transition-colors" style={value === o.value ? { background: p.accent, color: p.accentInk } : { color: p.faint }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Stepper({ onClick, rule, text, children }: { onClick: () => void; rule: string; text: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-95" style={{ border: `1px solid ${rule}`, color: text }}>
      {children}
    </button>
  )
}

function Toggle({ on, onClick, p }: { on: boolean; onClick: () => void; p: Palette }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="relative h-6 w-10 rounded-full transition-colors" style={{ background: on ? p.accent : p.rule }}>
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: on ? '1.125rem' : '0.125rem' }} />
    </button>
  )
}

function NavBtn({ label, onClick, disabled, rule, text, children }: { label: string; onClick: () => void; disabled: boolean; rule: string; text: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="grid h-10 w-12 place-items-center rounded-xl transition-transform active:scale-95 disabled:opacity-25" style={{ border: `1px solid ${rule}`, color: text }}>
      {children}
    </button>
  )
}

function GutterBtn({ side, label, disabled, onClick, p, children }: { side: 'left' | 'right'; label: string; disabled: boolean; onClick: () => void; p: Palette; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full transition-opacity hover:opacity-100 disabled:opacity-20 md:grid ${side === 'left' ? 'left-3' : 'right-3'}`}
      style={{ background: p.panel, border: `1px solid ${p.rule}`, color: p.text, opacity: 0.85 }}
    >
      {children}
    </button>
  )
}

function Flourish({ color }: { color: string }) {
  return <span className="inline-block h-1.5 w-1.5 rotate-45" style={{ background: color }} />
}

/** Ornate mushaf-style end-of-ayah medallion. Filled when the verse is bookmarked. */
function AyahMarker({ n, color, bg, ink, filled }: { n: number; color: string; bg: string; ink: string; filled: boolean }) {
  return (
    <svg viewBox="0 0 40 40" width="1.55em" height="1.55em" className="mx-0.5 inline-block" style={{ verticalAlign: 'middle' }} aria-label={`Ayah ${n}`}>
      <g fill={color}>
        <rect x="8" y="8" width="24" height="24" rx="3.5" />
        <rect x="8" y="8" width="24" height="24" rx="3.5" transform="rotate(45 20 20)" />
      </g>
      <circle cx="20" cy="20" r="12.5" fill={filled ? color : bg} stroke={color} strokeWidth="1.3" />
      <text x="20" y="21" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="600" fontFamily="ui-sans-serif, system-ui, sans-serif" fill={filled ? ink : color}>
        {toArabicNumber(n)}
      </text>
    </svg>
  )
}
