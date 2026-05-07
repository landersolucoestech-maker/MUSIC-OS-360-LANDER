import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "client"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  define: {
    "import.meta.env.VITE_MOCK_MODE": JSON.stringify(
      process.env.VITE_MOCK_MODE ??
        (process.env.NODE_ENV === "production" ? "false" : "true")
    ),
    // VITE_USE_MOCK is the canonical name per task spec; VITE_MOCK_MODE kept for back-compat.
    "import.meta.env.VITE_USE_MOCK": JSON.stringify(
      process.env.VITE_USE_MOCK ??
        process.env.VITE_MOCK_MODE ??
        (process.env.NODE_ENV === "production" ? "false" : "true")
    ),
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/projects/upload-audio": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/projects/audio": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      // WebSocket gateway — proxies Socket.IO HTTP handshake + upgrade to the backend
      "/socket.io": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
