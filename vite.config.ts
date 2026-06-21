import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes built asset paths relative, so the same dist/ works both
// on Firebase Hosting and when loaded via file:// inside the Electron app.
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
})
