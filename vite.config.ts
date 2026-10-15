import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import { groqApiPlugin } from './src/server/viteGroqPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    groqApiPlugin()
  ],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    host: true,
    port: 5173
  }
})

