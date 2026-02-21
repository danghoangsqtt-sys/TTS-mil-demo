
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Quan trọng: Đặt đường dẫn tương đối để Electron có thể load assets
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
