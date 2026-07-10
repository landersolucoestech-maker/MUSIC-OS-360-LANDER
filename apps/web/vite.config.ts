import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { assertWebSupabaseEnv } from "./scripts/assert-supabase-env.mjs";

export default defineConfig(({ mode }) => {
  assertWebSupabaseEnv(mode === "production" ? "production" : "development", __dirname);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@music-os-360/config/environment": path.resolve(__dirname, "../../packages/config/src/environment.ts"),
        "@music-os-360/ai-skills": path.resolve(__dirname, "../../packages/ai-skills/src/index.ts"),
      },
    },
    build: {
      outDir: path.resolve(__dirname, "../../dist"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router")
            )
              return "vendor-react";
            if (
              id.includes("node_modules/@radix-ui/") ||
              id.includes("node_modules/lucide-react") ||
              id.includes("node_modules/react-icons")
            )
              return "vendor-ui";
            if (id.includes("node_modules/@tanstack/")) return "vendor-query";
            if (
              id.includes("node_modules/recharts") ||
              id.includes("node_modules/d3-")
            )
              return "vendor-charts";
            if (
              id.includes("node_modules/date-fns") ||
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/tailwind-merge") ||
              id.includes("node_modules/class-variance-authority") ||
              id.includes("node_modules/sonner") ||
              id.includes("node_modules/cmdk")
            )
              return "vendor-utils";
          },
        },
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/client",
        "react-router-dom",
        "@tanstack/react-query",
        "@sentry/react",
        "posthog-js",
      ],
    },
    server: {
      allowedHosts: true,
      proxy: {
        "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
        "/projects/upload-audio": { target: "http://127.0.0.1:3001", changeOrigin: true },
        "/projects/audio": { target: "http://127.0.0.1:3001", changeOrigin: true },
        "/socket.io": { target: "http://127.0.0.1:3001", changeOrigin: true, ws: true },
      },
    },
  };
});
