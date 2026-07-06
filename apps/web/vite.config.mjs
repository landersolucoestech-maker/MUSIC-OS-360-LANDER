import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertWebSupabaseEnv } from "./scripts/assert-supabase-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const guardMode =
  process.env.NODE_ENV === "production" || process.argv.some((arg) => /\bbuild\b/.test(arg))
    ? "production"
    : "development";

assertWebSupabaseEnv(guardMode, __dirname);

function acrcloudApiPlugin() {
  return {
    name: "acrcloud-api-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/acrcloud/") || req.method !== "POST") {
          return next();
        }

        const endpoint = req.url.replace("/api/acrcloud/", "").split("?")[0];

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const ts = new Date().toISOString();
            const mockResponses = {
              recognize: {
                status: "success",
                track: {
                  title: "Demo Track",
                  artist: "Demo Artist",
                  album: "Demo Album",
                  isrc: "BRUM71400520",
                  duration: 237,
                },
                confidence: 0.97,
                fingerprint_id: `fp_${Date.now()}`,
                processed_at: ts,
              },
              copyright: {
                status: "success",
                protected: true,
                rights_holders: [
                  { name: "Demo Publisher", share: 100, territory: "WW" },
                ],
                license_type: "PRO",
                expiry: null,
              },
              catalog: {
                status: "success",
                matches: 3,
                tracks: [{ id: "t001", title: "Demo Track", similarity: 0.97 }],
              },
              monitor: {
                status: "monitoring",
                job_id: `job_${Date.now()}`,
                estimated_completion: new Date(Date.now() + 3_600_000).toISOString(),
              },
            };

            const response = mockResponses[endpoint] ?? {
              status: "error",
              error: `Endpoint desconhecido: ${endpoint}`,
            };

            res.setHeader("Content-Type", "application/json");
            res.setHeader("X-Powered-By", "Music-OS-360-ACRCloud-Backend");
            res.end(JSON.stringify(response));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ status: "error", error: String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
    plugins: [react(), acrcloudApiPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@music-os-360/ai-skills": path.resolve(__dirname, "../../packages/ai-skills/src/index.ts"),
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
    server: {
      allowedHosts: true,
      proxy: {
        "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
        "/projects/upload-audio": { target: "http://127.0.0.1:3001", changeOrigin: true },
        "/projects/audio": { target: "http://127.0.0.1:3001", changeOrigin: true },
        "/socket.io": { target: "http://127.0.0.1:3001", changeOrigin: true, ws: true },
      },
    },
});
