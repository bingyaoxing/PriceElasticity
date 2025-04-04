import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 部署到GitHub Pages或其他非根路径时，取消下面一行的注释并修改路径
  base: '/PriceElasticity-web/',
  server: {
    port: 3000
  }
})