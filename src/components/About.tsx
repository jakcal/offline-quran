import { useState } from 'react'
import { LINKS } from '../lib/links'
import { useIsDesktop } from '../lib/useIsDesktop'
import { CloseIcon, ExternalIcon, GithubIcon, HeartIcon, InfoIcon } from './icons'

const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause'],
  ['← / →', 'Seek −5s / +5s'],
  ['J / L', 'Seek −10s / +10s'],
  ['⇧ ← / →', 'Previous / next surah'],
  ['↑ / ↓', 'Volume'],
]

export function About() {
  const [open, setOpen] = useState(false)
  const isDesktop = useIsDesktop()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="About this app"
        className="grid h-9 w-9 place-items-center rounded-full text-muted active:bg-line"
      >
        <InfoIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          <div className="safe-bottom relative max-h-[90vh] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface">
            {/* grabber + close */}
            <div className="sticky top-0 z-10 bg-surface pt-2.5">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted active:bg-line"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 pb-7 pt-3">
              {/* Hero */}
              <div className="flex flex-col items-center text-center">
                <img src="/icon.svg" alt="" className="h-20 w-20 rounded-3xl" />
                <h2 className="font-display mt-3 text-2xl font-bold tracking-tight">Offline Quran</h2>
                <span className="mt-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand">
                  Free &amp; open source
                </span>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                  Pick a reciter, play a surah, and it downloads in the background for offline listening.
                  No ads, no tracking, no account.
                </p>
              </div>

              {/* Primary actions */}
              <div className="mt-6 space-y-2.5">
                <a
                  href={LINKS.donate}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-card bg-brand px-4 py-3.5 font-semibold text-white active:scale-[0.99] transition-transform"
                >
                  <HeartIcon className="h-5 w-5" />
                  Support development
                </a>
                <a
                  href={LINKS.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-card border border-line px-4 py-3 active:bg-line"
                >
                  <GithubIcon className="h-5 w-5" />
                  <span className="flex-1 text-sm font-semibold">View source on GitHub</span>
                  <ExternalIcon className="h-4 w-4 text-muted" />
                </a>
              </div>

              {/* Author */}
              <p className="mt-4 text-center text-sm text-muted">
                Built by{' '}
                <a
                  href={LINKS.authorGithub}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand hover:underline"
                >
                  {LINKS.author}
                </a>{' '}
                <span className="text-xs">@{LINKS.authorHandle}</span>
              </p>

              {/* Keyboard shortcuts — desktop only */}
              {isDesktop && (
                <div className="mt-6 rounded-card border border-line bg-paper p-4">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Keyboard shortcuts</h3>
                  <ul className="space-y-2">
                    {SHORTCUTS.map(([keys, label]) => (
                      <li key={keys} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted">{label}</span>
                        <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[11px] text-ink">
                          {keys}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Credit */}
              <p className="mt-6 text-center text-xs leading-relaxed text-muted">
                Audio &amp; metadata from{' '}
                <a href={LINKS.source} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  quran.com
                </a>
                .<br />
                Not affiliated with or endorsed by quran.com.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
