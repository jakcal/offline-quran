import { memo } from 'react'
import { audioKey } from '../lib/db'
import type { Chapter } from '../lib/types'
import { useDownloads } from '../store/downloads'
import { usePlayer } from '../store/player'
import { CheckIcon, DownloadIcon, PauseIcon, PlayIcon, SpinnerIcon } from './icons'

function SurahRowImpl({ chapter }: { chapter: Chapter }) {
  const reciterId = usePlayer((s) => s.reciterId)
  const active = usePlayer((s) => s.chapterId === chapter.id)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const play = usePlayer((s) => s.play)
  const toggle = usePlayer((s) => s.toggle)

  const key = audioKey(reciterId, chapter.id)
  const downloaded = useDownloads((s) => s.downloaded.has(key))
  const progress = useDownloads((s) => s.progress[key])
  const ensure = useDownloads((s) => s.ensure)
  const cancel = useDownloads((s) => s.cancel)
  const remove = useDownloads((s) => s.remove)

  const downloading = progress?.state === 'downloading'
  const failed = progress?.state === 'error'
  const pct = downloading && progress.total ? Math.round((progress.received / progress.total) * 100) : null

  function onTrailing(e: React.MouseEvent) {
    e.stopPropagation()
    if (downloading) cancel(reciterId, chapter.id)
    else if (downloaded) void remove(reciterId, chapter.id)
    else void ensure(reciterId, chapter.id)
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => (active ? toggle() : void play(chapter.id))}
        className={`flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left transition-colors ${
          active ? 'bg-brand-50' : 'active:bg-line'
        }`}
      >
        {/* Number / play-state medallion */}
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

        {/* Names */}
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${active ? 'text-brand' : ''}`}>
            {chapter.nameSimple}
          </span>
          <span className="block truncate text-xs text-muted">
            {chapter.translatedName} · {chapter.versesCount} verses
          </span>
        </span>

        {/* Arabic */}
        <span className="font-arabic shrink-0 text-xl leading-none" dir="rtl">
          {chapter.nameArabic}
        </span>

        {/* Download status */}
        <span
          role="button"
          tabIndex={0}
          aria-label={
            downloading ? 'Cancel download' : downloaded ? 'Remove download' : 'Download for offline'
          }
          onClick={onTrailing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onTrailing(e as unknown as React.MouseEvent)
            }
          }}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs transition-colors ${
            downloaded
              ? 'text-brand'
              : failed
                ? 'text-red-500'
                : 'text-muted active:bg-line'
          }`}
        >
          {downloading ? (
            pct != null ? (
              <span className="font-semibold text-brand">{pct}%</span>
            ) : (
              <SpinnerIcon className="h-4 w-4 text-brand" />
            )
          ) : downloaded ? (
            <CheckIcon className="h-5 w-5" />
          ) : (
            <DownloadIcon className="h-5 w-5" />
          )}
        </span>
      </button>
    </li>
  )
}

export const SurahRow = memo(SurahRowImpl)
