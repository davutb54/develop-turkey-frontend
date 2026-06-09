import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    pure: ["console.log", "console.info", "console.debug", "console.error", "console.warn"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          editor: ['@tiptap/react', '@tiptap/starter-kit', '@uiw/react-md-editor'],
          map: ['leaflet', 'react-leaflet', 'turkey-map-react'],
          charts: ['recharts']
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5214",
        changeOrigin: true,
        secure: false, // Localde self-signed certificate varsa hata almamak için
        ws: true, // SignalR WebSockets için kritik
      },
      "/uploads": {
        target: "http://localhost:5214",
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      usePolling: false,
    },
  },
});
