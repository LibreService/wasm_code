import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    sourcemap: true,
    rollupOptions: {
      external: ['vue', 'naive-ui', '@babel/runtime/helpers/extends']
    }
  },
  plugins: [vue()]
})
