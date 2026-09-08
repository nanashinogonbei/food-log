import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // マルチページ構成: トップ/カテゴリー/詳細/マイページ系は index.html の
      // SPA(react-router)で扱い、ログインだけ独立した HTML エントリーとする
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
      },
    },
  },
})
