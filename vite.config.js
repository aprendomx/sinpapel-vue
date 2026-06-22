import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      name: 'SinpapelVue',
      fileName: 'sinpapel-vue',
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'quasar'],
      output: { globals: { vue: 'Vue', pinia: 'Pinia', quasar: 'Quasar' } },
    },
  },
})
