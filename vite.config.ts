import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    pure: ["console.log", "console.info", "console.debug"],
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
