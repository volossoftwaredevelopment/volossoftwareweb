import { defineConfig } from 'vite'

// Project page on GitHub Pages (served under /volossoftwareweb/).
// Relative base => assets resolve correctly at any sub-path, and the same
// build also works locally and on a future custom domain via Vercel.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    cssMinify: true,
  },
})
