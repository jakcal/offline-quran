import { useState } from 'react'
import { useInstallPrompt } from '../lib/useInstallPrompt'
import { CloseIcon, DownloadIcon, ShareIcon } from './icons'

export function InstallButton() {
  const { installed, canPrompt, iosHint, promptInstall } = useInstallPrompt()
  const [showHint, setShowHint] = useState(false)

  if (installed) return null

  const pill =
    'flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white active:scale-95 transition-transform'

  if (canPrompt) {
    return (
      <button type="button" onClick={promptInstall} className={pill}>
        <DownloadIcon className="h-4 w-4" />
        Install
      </button>
    )
  }

  if (iosHint) {
    return (
      <div className="relative">
        <button type="button" onClick={() => setShowHint((v) => !v)} className={pill}>
          <DownloadIcon className="h-4 w-4" />
          Install
        </button>
        {showHint && (
          <>
            <button
              type="button"
              aria-label="Close"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setShowHint(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-card border border-line bg-surface p-3 text-left">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-bold">Add to Home Screen</p>
                <button type="button" aria-label="Close" onClick={() => setShowHint(false)} className="text-muted">
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                Tap <ShareIcon className="inline h-4 w-4 text-brand" /> Share, then “Add to Home Screen”.
              </p>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}
