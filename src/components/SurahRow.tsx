import { memo } from 'react'
import { audioKey } from '../lib/db'
import type { Chapter } from '../lib/types'
import { useBookmarks } from '../store/bookmarks'
import { useDownloads } from '../store/downloads'
import { usePlayer } from '../store/player'
import { useRecents } from '../store/recents'
import { useSurahSheet } from '../store/surahSheet'
import { CheckIcon, ChevronRightIcon, PauseIcon, PlayIcon } from './icons'

function SurahRowImpl({ chapter }: { chapter: Chapter }) {
  const reciterId = usePlayer((s) => s.reciterId)
  const active = usePlayer((s) => s.chapterId === chapter.id)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const downloaded = useDownloads((s) => s.downloaded.has(audioKey(reciterId, chapter.id)))
  const openSheet = useSurahSheet((s) => s.open)

  // Progress for this surah only (listening for the current reciter, else reading).
  const listenProg = useRecents((s) => {
    const e = s.entries[audioKey(reciterId, chapter.id)]
    return e && e.duration > 0 ? e.position / e.duration : 0
  })
  const readProg = useBookmarks((s) => {
    const r = s.lastRead
    return r && r.chapterId === chapter.id && r.verseKey ? Number(r.verseKey.split(':')[1]) / chapter.versesCount : 0
  })
  const progress = listenProg > 0 ? listenProg : readProg

  return (
    <li>
      <button
        type="button"
        onClick={() => openSheet(chapter.id)}
        className={`relative flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left transition-colors ${
          active ? 'bg-brand-50' : 'hover:bg-line/70 active:bg-line'
        }`}
      >
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
            active ? 'bg-brand text-white' : 'bg-paper text-muted ring-1 ring-line'
          }`}
        >
          {active ? isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" /> : chapter.id}
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${active ? 'text-brand' : ''}`}>{chapter.nameSimple}</span>
          <span className="block truncate text-xs text-muted">
            {chapter.translatedName} · {chapter.versesCount} verses
          </span>
        </span>

        <span className="font-arabic hidden shrink-0 text-lg leading-none sm:block" dir="rtl">
          {chapter.nameArabic}
        </span>

        {downloaded && <CheckIcon className="h-4 w-4 shrink-0 text-brand" />}
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted/50" />

        {progress > 0 && (
          <span className="pointer-events-none absolute inset-x-3 bottom-1 h-0.5 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </span>
        )}
      </button>
    </li>
  )
}

export const SurahRow = memo(SurahRowImpl)
