import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: { host: "::", port: 8080 },
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // optimizeDeps: {
  //   exclude: ['vite/modulepreload-polyfill']
  // },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            return 'vendor'
          }
        }
      },
    },
  },
  css: {
    postcss: {}
  }
});
