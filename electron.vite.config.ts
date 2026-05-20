import { resolve } from 'path'
import { cpSync, mkdirSync } from 'fs'
import type { Plugin } from 'vite'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Copies Excalidraw's dynamically-loaded font files from node_modules into the
 * renderer's public directory so they're accessible via HTTP in both dev and
 * production builds.
 *
 * Without this, Excalidraw falls back to fetching fonts from esm.sh CDN, which
 * is blocked by the app's CSP (connect-src / font-src are restricted to self).
 *
 * Destination: src/renderer/public/excalidraw-assets/fonts/
 * EXCALIDRAW_ASSET_PATH: '/excalidraw-assets/' (set in DrawingCanvas.tsx)
 */
function copyExcalidrawFonts(): Plugin {
  return {
    name: 'copy-excalidraw-fonts',
    enforce: 'pre',
    buildStart() {
      const isDevMode = process.env.NODE_ENV !== 'production'
      const distVariant = isDevMode ? 'dev' : 'prod'
      const src = resolve(
        __dirname,
        `node_modules/@excalidraw/excalidraw/dist/${distVariant}/fonts`
      )
      const dest = resolve(__dirname, 'src/renderer/public/excalidraw-assets/fonts')
      mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ include: ['typescript'] })],
    build: { lib: { entry: 'src/main/index.ts' } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: 'src/preload/index.ts' },
      rollupOptions: {
        output: {
          // Force CJS for preload — avoids ESM + sandbox issues with contextBridge
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss(), copyExcalidrawFonts()],
    build: {
      rollupOptions: {
        // Force lucide-react Inbox icon into the main chunk so it is available
        // synchronously when the Sidebar renders. Without this, Rollup tree-shakes
        // Inbox from the eager bundle because no eager JSX path uses it directly.
        output: {
          manualChunks(id: string) {
            if (id.includes('lucide-react') && id.includes('inbox')) {
              return 'index'
            }
          }
        }
      }
    }
  }
})
