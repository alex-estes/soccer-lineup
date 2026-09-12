/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/soccer-lineup/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    // Pure logic only — no component tests yet, so no DOM environment needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
