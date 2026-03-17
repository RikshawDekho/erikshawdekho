import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Plugin: inject build hash into public/sw.js at build time
function injectSwVersion() {
  return {
    name: 'inject-sw-version',
    closeBundle() {
      const buildHash = createHash('sha1').update(Date.now().toString()).digest('hex').slice(0, 8)
      const swPath = resolve(__dirname, 'dist/sw.js')
      try {
        let sw = readFileSync(swPath, 'utf8')
        sw = sw.replace(/const CACHE_VERSION = "[^"]*"/, `const CACHE_VERSION = "v-${buildHash}"`)
        writeFileSync(swPath, sw)
        console.log(`[sw] CACHE_VERSION → v-${buildHash}`)
      } catch {
        // sw.js not found in dist — skip (dev mode)
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), injectSwVersion()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
