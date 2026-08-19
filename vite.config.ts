import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register + drive periodic update checks ourselves (src/lib/pwa.ts),
      // so disable the auto-injected registration to avoid double-registering.
      injectRegister: null,
      includeAssets: ['icon.svg', 'maskable.svg'],
      manifest: {
        name: 'Offline Quran',
        short_name: 'Quran',
        description: 'Listen to the Holy Quran offline. Pick a reciter, play a surah, and it downloads in the background.',
        lang: 'en',
        dir: 'ltr',
        theme_color: '#9a6a2f',
        background_color: '#f4ecd8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['music', 'lifestyle', 'education'],
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Adhkar reminders: notification taps + background schedule checks.
        importScripts: ['/sw-adhkar.js'],
        // App shell precache. Audio is handled separately in IndexedDB,
        // so keep big mp3 files out of the service-worker cache.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Part of the worker itself, not a page asset — precaching it would
        // ship the same code twice and pin a stale copy.
        globIgnores: ['**/sw-adhkar.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Quran.com metadata (chapters / reciters / audio-url lookups).
            urlPattern: ({ url }) => url.hostname === 'api.quran.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'quran-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Let us test install/offline behaviour during `vite dev`.
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
