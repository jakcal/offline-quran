import { memo } from 'react'
import { CHAPTER_BY_ID, RECITERS } from '../data'
import { useDownloads } from '../store/downloads'
import { usePlayer } from '../store/player'
import { PauseIcon, PlayIcon, TrashIcon } from './icons'

/** A single downloaded recording — a (reciter, surah) pair shown in the Offline tab. */
function DownloadedRowImpl({ reciterId, chapterId }: { reciterId: number; chapterId: number }) {
  const active = usePlayer((s) => s.chapterId === chapterId && s.reciterId === reciterId)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const play = usePlayer((s) => s.play)
  const toggle = usePlayer((s) => s.toggle)
  const remove = useDownloads((s) => s.remove)

  const chapter = CHAPTER_BY_ID.get(chapterId)
  const reciter = RECITERS.find((r) => r.id === reciterId)
  if (!chapter) return null

  function onTrailing(e: React.MouseEvent) {
    e.stopPropagation()
    void remove(reciterId, chapterId)
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => (active ? toggle() : void play(chapterId, reciterId))}
        className={`flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left transition-colors ${
          active ? 'bg-brand-50' : 'active:bg-line'
        }`}
      >
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
            active ? 'bg-brand text-white' : 'bg-paper text-muted ring-1 ring-line'
          }`}
        >
          {active ? (
            isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />
          ) : (
            chapter.id
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${active ? 'text-brand' : ''}`}>
            {chapter.nameSimple}
          </span>
          <span className="block truncate text-xs text-muted">
            {reciter?.name ?? `Reciter ${reciterId}`}
            {reciter?.style ? ` · ${reciter.style}` : ''}
          </span>
        </span>

        <span className="font-arabic shrink-0 text-xl leading-none" dir="rtl">
          {chapter.nameArabic}
        </span>

        <span
          role="button"
          tabIndex={0}
          aria-label="Remove download"
          onClick={onTrailing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onTrailing(e as unknown as React.MouseEvent)
            }
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted active:bg-line"
        >
          <TrashIcon className="h-5 w-5" />
        </span>
      </button>
    </li>
  )
}

export const DownloadedRow = memo(DownloadedRowImpl)
