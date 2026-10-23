import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend gọi API qua đường dẫn tương đối /api; Vite chuyển tiếp sang backend.
// Nhờ vậy trình duyệt chỉ thấy một origin -> không cần bật CORS ở backend (TD-15).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: process.env.API_URL || 'http://localhost:3000', changeOrigin: true },
    },
  },
});
