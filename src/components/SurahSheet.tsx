import { useEffect } from 'react'
import { CHAPTER_BY_ID, RECITERS } from '../data'
import { track } from '../lib/analytics'
import { audioKey } from '../lib/db'
import { useBookmarks } from '../store/bookmarks'
import { useDownloads } from '../store/downloads'
import { usePlayer } from '../store/player'
import { useReader } from '../store/reader'
import { useReciterSheet } from '../store/reciterSheet'
import { useRecents } from '../store/recents'
import { useSurahSheet } from '../store/surahSheet'
import { BookIcon, CheckIcon, CloseIcon, DownloadIcon, HeadphonesIcon, MicIcon, SpinnerIcon, TrashIcon } from './icons'

export function SurahSheet() {
  const chapterId = useSurahSheet((s) => s.chapterId)
  if (chapterId == null) return null
  return <SurahSheetView chapterId={chapterId} />
}

function SurahSheetView({ chapterId }: { chapterId: number }) {
  const close = useSurahSheet((s) => s.close)
  const reciterId = usePlayer((s) => s.reciterId)
  const play = usePlayer((s) => s.play)
  const openReader = useReader((s) => s.open)
  const showReciters = useReciterSheet((s) => s.show)

  const key = audioKey(reciterId, chapterId)
  const downloaded = useDownloads((s) => s.downloaded.has(key))
  const progress = useDownloads((s) => s.progress[key])
  const ensure = useDownloads((s) => s.ensure)
  const cancel = useDownloads((s) => s.cancel)
  const remove = useDownloads((s) => s.remove)

  const lastListened = useRecents((s) => s.lastListened)
  const lastRead = useBookmarks((s) => s.lastRead)

  const chapter = CHAPTER_BY_ID.get(chapterId)!
  const reciter = RECITERS.find((r) => r.id === reciterId)
  const place = chapter.revelationPlace.charAt(0).toUpperCase() + chapter.revelationPlace.slice(1)

  useEffect(() => {
    track('open_surah_sheet', { chapter_id: chapterId })
  }, [chapterId])

  const downloading = progress?.state === 'downloading'
  const pct = downloading && progress.total ? Math.round((progress.received / progress.total) * 100) : null

  const resumeAt =
    lastListened && lastListened.chapterId === chapterId && lastListened.reciterId === reciterId && lastListened.duration > 0
      ? lastListened
      : null
  const listenPct = resumeAt ? Math.min(100, (resumeAt.position / resumeAt.duration) * 100) : 0
  const readVerse = lastRead && lastRead.chapterId === chapterId && lastRead.verseKey ? Number(lastRead.verseKey.split(':')[1]) : 0
  const readPct = readVerse ? Math.min(100, (readVerse / chapter.versesCount) * 100) : 0

  const onListen = () => {
    void play(chapterId, reciterId, resumeAt ? resumeAt.position : undefined)
    close()
  }
  const onRead = () => {
    openReader(chapterId)
    close()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={close} />

      <div className="safe-bottom relative max-h-[90vh] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface">
        <div className="pt-2.5">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
        </div>
        <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted active:bg-line">
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="px-5 pb-7 pt-3">
          {/* Hero */}
          <div className="flex flex-col items-center text-center">
            <span className="mb-1 grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand">
              {chapter.id}
            </span>
            <h2 className="font-arabic text-4xl leading-tight" dir="rtl">
              {chapter.nameArabic}
            </h2>
            <p className="font-display mt-1 text-2xl font-bold">{chapter.nameSimple}</p>
            <p className="text-sm text-muted">
              {chapter.translatedName} · {place} · {chapter.versesCount} verses
            </p>
          </div>

          {/* Primary actions */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onListen}
              className="flex flex-col items-center gap-1.5 rounded-card bg-brand px-4 py-5 font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <HeadphonesIcon className="h-7 w-7" />
              {resumeAt ? 'Resume' : 'Listen'}
              {listenPct > 0 && (
                <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/25">
                  <span className="block h-full rounded-full bg-white" style={{ width: `${listenPct}%` }} />
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onRead}
              className="flex flex-col items-center gap-1.5 rounded-card border border-line px-4 py-5 font-semibold text-brand transition-transform hover:bg-brand-50 active:scale-[0.98]"
            >
              <BookIcon className="h-7 w-7" />
              Read
              {readPct > 0 && (
                <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${readPct}%` }} />
                </span>
              )}
            </button>
          </div>

          {/* Reciter */}
          <button
            type="button"
            onClick={showReciters}
            className="mt-3 flex w-full items-center gap-3 rounded-card border border-line px-4 py-3 text-left transition-colors hover:border-brand/40"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
              <MicIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Reciter</span>
              <span className="block truncate font-semibold">{reciter?.name}</span>
            </span>
            <span className="text-xs font-semibold text-brand">Change</span>
          </button>

          {/* Download */}
          {downloaded ? (
            <button
              type="button"
              onClick={() => void remove(reciterId, chapterId)}
              className="mt-3 flex w-full items-center gap-3 rounded-card border border-line px-4 py-3 text-left active:bg-line"
            >
              <CheckIcon className="h-5 w-5 shrink-0 text-brand" />
              <span className="flex-1 text-sm font-semibold text-brand">Saved offline</span>
              <TrashIcon className="h-5 w-5 text-muted" />
            </button>
          ) : downloading ? (
            <button
              type="button"
              onClick={() => cancel(reciterId, chapterId)}
              className="mt-3 flex w-full items-center gap-3 rounded-card border border-line px-4 py-3 text-left active:bg-line"
            >
              <SpinnerIcon className="h-5 w-5 shrink-0 text-brand" />
              <span className="flex-1 text-sm font-semibold">Downloading{pct != null ? ` · ${pct}%` : '…'}</span>
              <span className="text-xs text-muted">Cancel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void ensure(reciterId, chapterId)}
              className="mt-3 flex w-full items-center gap-3 rounded-card border border-line px-4 py-3 text-left transition-colors hover:border-brand/40"
            >
              <DownloadIcon className="h-5 w-5 shrink-0 text-muted" />
              <span className="flex-1 text-sm font-semibold">Download for offline</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
