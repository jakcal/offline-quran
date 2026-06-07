import { useSyncExternalStore } from 'react'

const QUERY = '(hover: hover) and (pointer: fine)'

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

/** True on devices with a real mouse/keyboard (desktop/laptop), false on touch. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
