import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/', // Explicitly set base path
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  build: {
    rollupOptions: {
      external: [],
    },
    // Ensure proper chunking and asset handling
    assetsDir: 'assets',
    sourcemap: false,
  },
})