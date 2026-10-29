import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Injects the exact list of emitted static assets and a version hash into dist/sw.js
 * at build time so the Progressive Web App works 100% offline after first visit.
 */
function pwaPreCachePlugin(): Plugin {
  let outDir = 'dist'
  return {
    name: 'quadra-pwa-precache',
    configResolved(config) {
      outDir = config.build.outDir
    },
    writeBundle(_options, bundle) {
      try {
        const swPath = resolve(outDir, 'sw.js')
        const rawSw = readFileSync(swPath, 'utf-8')
        const emitted = Object.keys(bundle)
          .filter((f) => !f.endsWith('.map'))
          .map((f) => `/${f}`)
        const urls = Array.from(
          new Set(['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', ...emitted]),
        )
        const version = createHash('sha256').update(urls.join('|')).digest('hex').slice(0, 10)
        const header = `self.__CACHE_NAME = "quadra-cache-${version}";\nself.__PRECACHE_MANIFEST = ${JSON.stringify(urls)};\n`
        writeFileSync(swPath, header + rawSw, 'utf-8')
      } catch {
        // Ignore if sw.js is not present
      }
    },
  }
}

// Everything runs in the browser, so the build output (dist/) is plain static files.
export default defineConfig({
  plugins: [react(), tailwindcss(), pwaPreCachePlugin()],
  build: { target: 'es2020' },
})
