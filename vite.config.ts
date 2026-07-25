import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Project page on GitHub Pages (served under /volossoftwareweb/).
// Relative base => assets resolve correctly at any sub-path, and the same
// build also works locally and on a future custom domain via Vercel.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      input: {
        // Multi-page: the landing, the two direction pages, and the privacy notice.
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        automation: fileURLToPath(new URL('./automation.html', import.meta.url)),
        social: fileURLToPath(new URL('./social.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
      },
    },
  },
})
