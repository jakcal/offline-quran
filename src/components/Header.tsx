import { useDownloads } from '../store/downloads'
import { formatBytes } from '../lib/format'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { useSettingsSheet } from '../store/settingsSheet'
import { CloudOffIcon, SlidersIcon } from './icons'
import { InstallButton } from './InstallButton'
import { About } from './About'

export function Header() {
  const online = useOnlineStatus()
  const cacheSize = useDownloads((s) => s.cacheSize)
  const showSettings = useSettingsSheet((s) => s.show)

  return (
    <header className="safe-top relative border-b border-line">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-brand) 9%, transparent), transparent)' }}
      />
      <div className="relative mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-10 w-10 rounded-xl ring-1 ring-black/5" />
          <div className="leading-tight">
            <h1 className="font-display text-xl font-bold leading-none tracking-tight">Offline Quran</h1>
            <p className="mt-0.5 text-[11px] text-muted">{formatBytes(cacheSize)} saved offline</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!online && (
            <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand">
              <CloudOffIcon className="h-4 w-4" />
              Offline
            </span>
          )}
          <InstallButton />
          <button
            type="button"
            onClick={showSettings}
            aria-label="Reciter & downloads"
            className="grid h-9 w-9 place-items-center rounded-full text-muted active:bg-line"
          >
            <SlidersIcon className="h-5 w-5" />
          </button>
          <About />
        </div>
      </div>
    </header>
  )
}
