import { registerSW } from 'virtual:pwa-register'
import { track } from './analytics'

// How often to check for a new build while the app stays open. PWAs can run
// for days, so a periodic poll is what actually delivers updates in practice.
const UPDATE_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Register the service worker and keep the app on the latest build automatically.
 *
 * The SW is generated with `registerType: 'autoUpdate'`, so a new version skips
 * waiting and reloads the page on its own. Here we just (a) register on startup
 * and (b) poll for new builds while the app is open or returns to the foreground.
 */
export function setupPWAUpdates(): void {
  const updateSW = registerSW({
    immediate: true,

    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const checkForUpdate = () => {
        if (navigator.onLine) void registration.update().catch(() => {})
      }

      // Poll on an interval and whenever the app is brought back to the foreground.
      setInterval(checkForUpdate, UPDATE_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
    },

    onNeedRefresh() {
      // Fallback: apply and reload immediately if a waiting worker is detected.
      track('app_update')
      void updateSW(true)
    },
  })
}
