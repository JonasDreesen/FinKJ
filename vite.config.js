import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

function contentSecurityPolicy(mode) {
  return {
    name: 'finkj-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      let supabase
      try {
        supabase = new URL(env.VITE_SUPABASE_URL).origin
      } catch {
        throw new Error('VITE_SUPABASE_URL ontbreekt of is ongeldig: kan geen veilige build maken.')
      }
      if (!supabase.startsWith('https://')) {
        throw new Error('VITE_SUPABASE_URL moet met https:// beginnen.')
      }
      const policy = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: blob: ${supabase}`,
        "font-src 'self'",
        `connect-src 'self' ${supabase} https://api.twelvedata.com`,
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
      ].join('; ')
      return html.replace(
        /<!-- CSP wordt .*? -->/,
        `<meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      )
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: '/FinKJ/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    contentSecurityPolicy(mode),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'boot.js'],
      manifest: {
        id: '/FinKJ/',
        name: 'FinKJ — Budget',
        short_name: 'FinKJ',
        description: 'Jullie privé budget-app: uitgaven, budgetten, sparen en beleggen.',
        lang: 'nl-BE',
        start_url: '/FinKJ/#/',
        scope: '/FinKJ/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f8fc',
        theme_color: '#533afd',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Nieuwe uitgave', short_name: 'Uitgave', url: '/FinKJ/#/transacties?nieuw=1' },
          { name: 'Budgetten', short_name: 'Budgetten', url: '/FinKJ/#/budgetten' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['ocr/**', '**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Financiële data (Supabase) wordt bewust NOOIT door de service worker
        // gecachet; enkel de app zelf en de OCR-bestanden.
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/ocr/'),
            handler: 'CacheFirst',
            options: { cacheName: 'ocr-assets', expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
        },
      },
    },
  },
}))
