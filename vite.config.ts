import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux', 'react-router-dom', 'axios', 'chart.js', 'react-chartjs-2', 'lucide-react', 'react-hook-form', 'yup', 'date-fns', 'xlsx']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'react-hot-toast']
        }
      }
    }
  }
})