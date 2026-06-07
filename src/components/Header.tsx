import { useDownloads } from '../store/downloads'
import { formatBytes } from '../lib/format'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { CloudOffIcon, MicIcon } from './icons'
import { InstallButton } from './InstallButton'
import { About } from './About'

export function Header() {
  const online = useOnlineStatus()
  const cacheSize = useDownloads((s) => s.cacheSize)

  return (
    <header className="safe-top border-b border-line bg-paper">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
            <MicIcon className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-bold tracking-tight">Offline Quran</h1>
            <p className="text-xs text-muted">{formatBytes(cacheSize)} saved offline</p>
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
          <About />
        </div>
      </div>
    </header>
  )
}
