import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CHAPTER_BY_ID, RECITERS } from '../data'
import { track } from '../lib/analytics'
import { formatTime, toArabicNumber } from '../lib/format'
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
  HeadphonesIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
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
  gold: string
  rule: string
  sel: string
  nowPlaying: string // wash behind the ayah currently being recited
}

const THEMES: Record<ReaderTheme, Palette> = {
  light: { bg: '#faf9f6', panel: '#ffffff', text: '#1c1917', faint: '#78716c', accent: '#0f766e', accentInk: '#ffffff', gold: '#b08d57', rule: '#e7e5e4', sel: 'rgba(15,118,110,0.10)', nowPlaying: 'rgba(15,118,110,0.20)' },
  sepia: { bg: '#f4ecd8', panel: '#efe6cf', text: '#4b3b2a', faint: '#8a7355', accent: '#9a6a2f', accentInk: '#fffaf0', gold: '#9a6a2f', rule: '#e1d4b5', sel: 'rgba(154,106,47,0.13)', nowPlaying: 'rgba(154,106,47,0.24)' },
  green: { bg: '#e9f0e8', panel: '#dfe9dd', text: '#1c2b22', faint: '#5d7466', accent: '#15803d', accentInk: '#f0fdf4', gold: '#9a7b3a', rule: '#cdddc9', sel: 'rgba(21,128,61,0.12)', nowPlaying: 'rgba(21,128,61,0.22)' },
  dark: { bg: '#0f0f10', panel: '#1a1a1c', text: '#e9e7e4', faint: '#9a948c', accent: '#2dd4bf', accentInk: '#06231f', gold: '#d4af37', rule: '#2a2622', sel: 'rgba(45,212,191,0.15)', nowPlaying: 'rgba(45,212,191,0.26)' },
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
  const [flashVerse, setFlashVerse] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const readerApi = useRef<ReaderHandle>(null)
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
  const playerChapterId = usePlayer((s) => s.chapterId)
  const playerReciterId = usePlayer((s) => s.reciterId)
  const currentTime = usePlayer((s) => s.currentTime)
  const duration = usePlayer((s) => s.duration)
  const seek = usePlayer((s) => s.seek)
  const prev = usePlayer((s) => s.prev)
  const next = usePlayer((s) => s.next)
  const openReader = useReader((s) => s.open)
  // The ayah being recited right now — only when this surah is the one playing.
  const activeVerseKey = usePlayer((s) => (s.chapterId === chapterId ? s.activeVerseKey : null))
  const [follow, setFollow] = useState(true)

  useEffect(() => setLastRead(chapterId, resumeKey.current), [chapterId, setLastRead])
  useEffect(() => track('open_reader', { chapter_id: chapterId }), [chapterId])

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
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === ' ') {
        const t = e.target as HTMLElement | null
        const tag = t?.tagName
        // Let focused controls and text fields handle Space themselves.
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
        if (tag === 'BUTTON' || tag === 'A' || t?.getAttribute('role') === 'button') return
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, toggle])

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
    const markFlash = () => {
      setFlashVerse(target)
      window.setTimeout(() => setFlashVerse((f) => (f === target ? null : f)), 1900)
    }
    if (view === 'paged') {
      const idx = pages.findIndex((pg) => pg.verses.some((v) => v.key === target))
      if (idx >= 0) {
        setPageIndex(idx)
        markFlash()
        resumed.current = true
      }
      return
    }
    // Continuous view is virtualized, so the target may not be mounted — the
    // reader handle windows it in and scrolls to it.
    if (pages.some((pg) => pg.verses.some((v) => v.key === target))) {
      readerApi.current?.scrollToKey(target, false)
      markFlash()
      resumed.current = true
    }
  }, [verses, view, pages])

  // Auto-track reading position (separate from manual bookmarks).
  useEffect(() => {
    if (!paged || !currentPage) return
    setLastRead(chapterId, currentPage.verses[0].key)
  }, [paged, currentPage, chapterId, setLastRead])

  useEffect(() => {
    if (view !== 'continuous') return
    const el = scrollRef.current
    if (!el) return
    let last = 0
    const onScroll = () => {
      const now = Date.now()
      if (now - last < 600) return
      last = now
      const rect = el.getBoundingClientRect()
      const probe = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 96)
      const key = probe?.closest('[data-key]')?.getAttribute('data-key')
      if (key) setLastRead(chapterId, key)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [view, chapterId, setLastRead])

  // Follow the recitation: keep the ayah being recited in view. In paged view,
  // first flip to its page (the effect re-runs once `safeIndex` updates, below).
  // We center the ayah ourselves rather than using scrollIntoView, which is
  // unreliable for the inline, multi-line verse spans; long ayahs are pinned
  // near the top instead of centered so their start is always visible.
  useEffect(() => {
    if (!follow || !activeVerseKey) return
    // Continuous view is virtualized — hand off to the reader, which windows
    // the ayah in before centering it.
    if (view !== 'paged') {
      readerApi.current?.scrollToKey(activeVerseKey)
      return
    }
    const idx = pages.findIndex((pg) => pg.verses.some((v) => v.key === activeVerseKey))
    if (idx >= 0 && idx !== safeIndex) {
      setPageIndex(idx)
      return
    }
    const container = scrollRef.current
    if (!container) return
    // Wait a frame so a just-flipped page has laid out before we measure.
    const raf = requestAnimationFrame(() => {
      const el = container.querySelector<HTMLElement>(`[data-key="${activeVerseKey}"]`)
      if (!el) return
      const pad = 24
      const cRect = container.getBoundingClientRect()
      const eRect = el.getBoundingClientRect()
      const tooTall = eRect.height >= container.clientHeight - pad * 2
      const delta = tooTall
        ? eRect.top - cRect.top - pad
        : eRect.top - cRect.top - container.clientHeight / 2 + eRect.height / 2
      container.scrollBy({ top: delta, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [activeVerseKey, follow, view, pages, safeIndex])

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

  // Now-playing context for the in-reader mini player.
  const playingChapter = playerChapterId != null ? CHAPTER_BY_ID.get(playerChapterId) : null
  const playingReciter = RECITERS.find((r) => r.id === playerReciterId)
  const playingHere = playerChapterId === chapterId
  const showMini = playingChapter != null && !selected

  const doFlash = (msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 1600)
  }

  const onCopy = () => {
    const v = selected && verseByKey.get(selected)
    if (!v) return
    void navigator.clipboard?.writeText(`${v.text}\n— Surah ${chapter.nameSimple} (${v.key})`)
    track('verse_copy', { verse_key: v.key })
    doFlash('Copied')
  }

  const onShare = () => {
    const v = selected && verseByKey.get(selected)
    if (!v) return
    const text = `${v.text}\n— Surah ${chapter.nameSimple} (${v.key})`
    track('verse_share', { verse_key: v.key, method: 'share' in navigator ? 'native' : 'copy' })
    if ('share' in navigator) void navigator.share({ title: `Surah ${chapter.nameSimple}`, text }).catch(() => {})
    else onCopy()
  }

  const renderVerses = (list: VerseText[]) => (
    <p dir="rtl" lang="ar" className="font-arabic" style={{ fontSize: `${fontSize}rem`, lineHeight, textAlign: 'justify' }}>
      {list.map((v) => {
        const isSel = selected === v.key
        const isReciting = activeVerseKey === v.key
        return (
          <span
            key={v.key}
            data-key={v.key}
            onClick={() => {
              setSelected(v.key)
              setLastRead(chapterId, v.key)
            }}
            className="cursor-pointer rounded-lg transition-colors"
            style={{
              background: isReciting ? p.nowPlaying : isSel || flashVerse === v.key ? p.sel : 'transparent',
              padding: '0.04em 0.18em',
              boxDecorationBreak: 'clone',
              WebkitBoxDecorationBreak: 'clone',
            }}
          >
            <VerseContent v={v} script={script} />
            {!hideMarkers && (
              <AyahMarker n={v.verseNumber} color={p.gold} bg={p.bg} ink={p.accentInk} filled={bookmarkSet.has(v.key)} />
            )}{' '}
          </span>
        )
      })}
    </p>
  )

  // Changes here alter verse heights, so the virtual list must re-measure.
  const layoutKey = `${fontSize}|${lineHeight}|${script}|${hideMarkers}`

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
            {/* Ornamental surah header — only atop the surah (first page in paged view). */}
            {(!paged || safeIndex === 0) && (
              <div className="mx-auto mb-7 max-w-md rounded-2xl px-6 py-4 text-center" style={{ border: `1px solid ${p.rule}`, background: p.bg }}>
                <div className="mb-1.5 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: p.faint }}>
                  <Flourish color={p.gold} /> Surah {chapter.id} <Flourish color={p.gold} />
                </div>
                <h1 className="font-arabic text-4xl leading-tight">{chapter.nameArabic}</h1>
                <p className="font-display mt-1 text-base font-bold">{chapter.nameSimple}</p>
                <p className="text-xs" style={{ color: p.faint }}>{chapter.translatedName} · {place}</p>
              </div>
            )}

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
                {paged ? (
                  currentPage && renderVerses(currentPage.verses)
                ) : (
                  <ContinuousReader
                    ref={readerApi}
                    scrollRef={scrollRef}
                    pages={pages}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                    layoutKey={layoutKey}
                    renderVerses={renderVerses}
                  />
                )}
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
        <div className={`flex shrink-0 items-center justify-between px-4 py-3 ${showMini ? '' : 'safe-bottom'}`} style={{ background: p.panel, borderTop: `1px solid ${p.rule}` }}>
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

      {/* In-reader mini player: keeps playback context + the Follow toggle in reach. */}
      {showMini && playingChapter && (
        <div className="safe-bottom shrink-0 px-3 pb-2 pt-2" style={{ background: p.panel, borderTop: `1px solid ${p.rule}` }}>
          <div className="flex items-center gap-2">
            <span className="w-9 text-right text-[10px] tabular-nums" style={{ color: p.faint }}>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step="any"
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
              style={{ accentColor: p.accent, background: p.rule }}
            />
            <span className="w-9 text-[10px] tabular-nums" style={{ color: p.faint }}>{formatTime(duration)}</span>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <button type="button" onClick={prev} disabled={playerChapterId != null && playerChapterId <= 1} aria-label="Previous surah" className="grid h-9 w-9 shrink-0 place-items-center rounded-full disabled:opacity-30" style={{ color: p.text }}>
              <PrevIcon className="h-5 w-5" />
            </button>
            <button type="button" onClick={toggle} aria-label={isPlaying ? 'Pause' : 'Play'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full active:scale-95 transition-transform" style={{ background: p.accent, color: p.accentInk }}>
              {loading ? <SpinnerIcon className="h-5 w-5" /> : isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            </button>
            <button type="button" onClick={next} disabled={playerChapterId != null && playerChapterId >= 114} aria-label="Next surah" className="grid h-9 w-9 shrink-0 place-items-center rounded-full disabled:opacity-30" style={{ color: p.text }}>
              <NextIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => !playingHere && playerChapterId != null && openReader(playerChapterId)}
              className="min-w-0 flex-1 text-left"
              aria-label={playingHere ? undefined : 'Open the surah now playing'}
            >
              <p className="truncate text-xs font-semibold">
                {playingChapter.id}. {playingChapter.nameSimple}
                {!playingHere && <span style={{ color: p.faint }}> · tap to open</span>}
              </p>
              <p className="truncate text-[11px]" style={{ color: p.faint }}>{playingReciter?.name}</p>
            </button>

            {playingHere && (
              <button
                type="button"
                onClick={() => setFollow((f) => !f)}
                aria-pressed={follow}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                style={follow ? { background: p.accent, color: p.accentInk } : { color: p.faint, border: `1px solid ${p.rule}` }}
              >
                <HeadphonesIcon className="h-4 w-4" />
                Follow
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ReaderHandle {
  /** Window the ayah into view (if virtualized) and center it. */
  scrollToKey: (key: string, smooth?: boolean) => void
}

interface Page {
  page: number
  juz: number
  verses: VerseText[]
}

// How far beyond the viewport (px) to keep pages mounted, so scrolling never
// outruns rendering.
const OVERSCAN = 1200
// A mushaf page renders to roughly this many wrapped lines at the default text
// size; used to estimate the height of pages not yet measured.
const PAGE_LINES = 20

/**
 * Virtualized continuous reader. Long surahs (Al-Baqarah is ~15k inline nodes
 * in Tajweed mode) freeze layout when rendered whole, so we window by mushaf
 * page: only pages near the viewport are mounted, with spacer divs standing in
 * for the rest. Heights are measured on mount and remembered, so scroll
 * positions stay stable once a page has been seen.
 */
const ContinuousReader = forwardRef<ReaderHandle, {
  scrollRef: React.RefObject<HTMLDivElement | null>
  pages: Page[]
  fontSize: number
  lineHeight: number
  layoutKey: string
  renderVerses: (list: VerseText[]) => React.ReactNode
}>(function ContinuousReader({ scrollRef, pages, fontSize, lineHeight, layoutKey, renderVerses }, ref) {
    const listRef = useRef<HTMLDivElement>(null)
    const heights = useRef<number[]>([])
    const pending = useRef<{ key: string; smooth: boolean } | null>(null)
    // The mounted window plus the spacer heights that stand in for the rest.
    // Kept in state (not derived in render) so we never read the heights ref
    // during rendering.
    const [win, setWin] = useState({ start: 0, end: Math.min(pages.length, 3), topPad: 0, botPad: 0 })

    // Estimated height of a page: its measured value, or a line-count guess that
    // is INDEPENDENT of other pages — so measuring one page never changes the
    // estimate for another, and content already scrolled to (e.g. a resumed
    // verse) never shifts underfoot. The trade-off is that the scrollbar drifts
    // slightly as real, taller pages replace the guess while you scroll down.
    const est = useCallback(
      (i: number) => heights.current[i] || Math.round(PAGE_LINES * fontSize * 16 * lineHeight) + 48,
      [fontSize, lineHeight],
    )

    const buildWin = useCallback(
      (start: number, end: number) => {
        let topPad = 0
        for (let i = 0; i < start; i++) topPad += est(i)
        let botPad = 0
        for (let i = end; i < pages.length; i++) botPad += est(i)
        return { start, end, topPad, botPad }
      },
      [est, pages.length],
    )

    // Window the pages within the viewport (+overscan).
    const recompute = useCallback(() => {
      // A targeted scroll-to has mounted its own window and is about to move the
      // viewport there; recomputing now (from the pre-scroll position) would fight
      // it. The scroll it triggers re-runs this once the position is correct.
      if (pending.current) return
      const c = scrollRef.current
      const l = listRef.current
      if (!c || !l) return
      const offset = c.getBoundingClientRect().top - l.getBoundingClientRect().top
      const viewTop = offset - OVERSCAN
      const viewBot = offset + c.clientHeight + OVERSCAN
      let acc = 0
      let start = 0
      let end = pages.length
      for (let i = 0; i < pages.length; i++) {
        const h = est(i)
        if (acc + h <= viewTop) start = i + 1
        acc += h
        if (acc >= viewBot) {
          end = i + 1
          break
        }
      }
      start = Math.max(0, Math.min(start, Math.max(0, pages.length - 1)))
      end = Math.max(start + 1, Math.min(end, pages.length))
      setWin((w) => {
        const n = buildWin(start, end)
        return w.start === n.start && w.end === n.end && w.topPad === n.topPad && w.botPad === n.botPad ? w : n
      })
    }, [scrollRef, pages.length, est, buildWin])

    // Center a mounted ayah (long ones pin near the top). Returns false if it
    // isn't in the DOM yet.
    const scrollToEl = useCallback(
      (key: string, smooth: boolean) => {
        const c = scrollRef.current
        const el = listRef.current?.querySelector<HTMLElement>(`[data-key="${key}"]`)
        if (!c || !el) return false
        const pad = 24
        const cRect = c.getBoundingClientRect()
        const eRect = el.getBoundingClientRect()
        const tooTall = eRect.height >= c.clientHeight - pad * 2
        const delta = tooTall
          ? eRect.top - cRect.top - pad
          : eRect.top - cRect.top - c.clientHeight / 2 + eRect.height / 2
        c.scrollBy({ top: delta, behavior: smooth ? 'smooth' : 'auto' })
        return true
      },
      [scrollRef],
    )

    // Remember the real height of every mounted page, then re-window.
    useLayoutEffect(() => {
      const l = listRef.current
      if (!l) return
      let changed = false
      l.querySelectorAll<HTMLElement>('[data-chunk]').forEach((el) => {
        const i = Number(el.dataset.chunk)
        const h = el.offsetHeight
        if (h && Math.abs((heights.current[i] || 0) - h) > 1) {
          heights.current[i] = h
          changed = true
        }
      })
      if (changed) recompute()
    })

    // Once a requested ayah has been mounted by a window change, scroll to it.
    useLayoutEffect(() => {
      const p = pending.current
      if (p && scrollToEl(p.key, p.smooth)) pending.current = null
    })

    // Text metrics changed — drop cached heights and re-window.
    useLayoutEffect(() => {
      heights.current = []
      recompute()
    }, [layoutKey, recompute])

    useEffect(() => {
      const c = scrollRef.current
      if (!c) return
      let raf = 0
      const onScroll = () => {
        if (raf) return
        raf = requestAnimationFrame(() => {
          raf = 0
          recompute()
        })
      }
      c.addEventListener('scroll', onScroll, { passive: true })
      let w = c.clientWidth
      const ro = new ResizeObserver(() => {
        if (c.clientWidth !== w) {
          w = c.clientWidth // width changed → wrapping changed, remeasure
          heights.current = []
        }
        recompute()
      })
      ro.observe(c)
      recompute()
      return () => {
        c.removeEventListener('scroll', onScroll)
        ro.disconnect()
        if (raf) cancelAnimationFrame(raf)
      }
    }, [scrollRef, recompute])

    useImperativeHandle(
      ref,
      () => ({
        scrollToKey(key, smooth = true) {
          const idx = pages.findIndex((pg) => pg.verses.some((v) => v.key === key))
          if (idx < 0) return
          // Already mounted → scroll now; otherwise mount a window around it and
          // let the layout effect finish the scroll.
          if (idx >= win.start && idx < win.end) scrollToEl(key, smooth)
          else {
            pending.current = { key, smooth }
            setWin(buildWin(Math.max(0, idx - 1), Math.min(pages.length, idx + 2)))
          }
        },
      }),
      [pages, win.start, win.end, buildWin, scrollToEl],
    )

    return (
      <div ref={listRef}>
        <div style={{ height: win.topPad }} aria-hidden />
        {pages.slice(win.start, win.end).map((pg, k) => (
          <div key={pg.page} data-chunk={win.start + k}>
            {renderVerses(pg.verses)}
          </div>
        ))}
        <div style={{ height: win.botPad }} aria-hidden />
      </div>
    )
  },
)

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
