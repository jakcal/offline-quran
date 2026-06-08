/**
 * Google Analytics 4 (gtag.js) wiring.
 *
 * Driven by the VITE_GA_ID env var. When it's unset (dev / local / no consent),
 * every call is a no-op (events are logged to the console in dev instead), so
 * the app works identically with or without analytics configured.
 */

type ParamValue = string | number | boolean | undefined
export type AnalyticsParams = Record<string, ParamValue>

const GA_ID = import.meta.env.VITE_GA_ID
export const analyticsEnabled = typeof GA_ID === 'string' && /^G-[A-Z0-9]+$/i.test(GA_ID)

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let started = false

/** Inject gtag.js and configure the GA property. Safe to call once on app start. */
export function initAnalytics(): void {
  if (!analyticsEnabled || started || typeof window === 'undefined') return
  started = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // GA expects the raw arguments object pushed onto the dataLayer.
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { send_page_view: true })
}

/** Track a GA4 event. Undefined params are dropped. */
export function track(event: string, params: AnalyticsParams = {}): void {
  const clean: AnalyticsParams = {}
  for (const [k, v] of Object.entries(params)) if (v !== undefined) clean[k] = v

  if (!analyticsEnabled) {
    if (import.meta.env.DEV) console.debug('[analytics]', event, clean)
    return
  }
  window.gtag?.('event', event, clean)
}
