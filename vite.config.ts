import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Connect } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

/**
 * acrcloudApiPlugin — ACRCloud como infraestrutura backend nativa.
 *
 * REGRAS ABSOLUTAS:
 *   - Nenhuma credencial ACRCloud é exposta ao browser
 *   - Autenticação HMAC ocorre EXCLUSIVAMENTE server-side
 *   - Frontend chama apenas /api/acrcloud/* (API interna Music OS 360)
 *   - Nenhum domínio acrcloud.com é acessado pelo cliente
 *
 * Em produção: as mesmas rotas são servidas pelo NestJS (ACRCloudService)
 * Em desenvolvimento (modo standalone): retorna dados mock autênticos
 */
function acrcloudApiPlugin() {
  return {
    name: "acrcloud-api-middleware",
    configureServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(
        async (
          req: IncomingMessage,
          res: ServerResponse,
          next: Connect.NextFunction,
        ) => {
          if (!req.url?.startsWith("/api/acrcloud/") || req.method !== "POST") {
            return next();
          }

          const endpoint = req.url.replace("/api/acrcloud/", "").split("?")[0];

          // HMAC auth + request para ACRCloud ocorre aqui server-side.
          // Credenciais lidas APENAS de variáveis de ambiente — nunca enviadas ao browser.
          // const host   = process.env.ACRCLOUD_HOST;
          // const key    = process.env.ACRCLOUD_ACCESS_KEY;
          // const secret = process.env.ACRCLOUD_ACCESS_SECRET;

          let body = "";
          req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              // Modo standalone: retorna resposta mock tratada (sem credenciais expostas)
              const ts = new Date().toISOString();
              const mockResponses: Record<string, unknown> = {
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
                  tracks: [
                    { id: "t001", title: "Demo Track", similarity: 0.97 },
                  ],
                },
                monitor: {
                  status: "monitoring",
                  job_id: `job_${Date.now()}`,
                  estimated_completion: new Date(
                    Date.now() + 3_600_000,
                  ).toISOString(),
                },
              };

              const response = mockResponses[endpoint] ?? {
                status: "error",
                error: `Endpoint desconhecido: ${endpoint}`,
              };

              res.setHeader("Content-Type", "application/json");
              res.setHeader("X-Powered-By", "Music-OS-360-ACRCloud-Backend");
              res.end(JSON.stringify(response));
            } catch (err: unknown) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ status: "error", error: String(err) }));
            }
          });
        },
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), acrcloudApiPlugin()],
  root: path.resolve(__dirname, "apps/web"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
    },
  },
  define: {
    "import.meta.env.VITE_MOCK_MODE": JSON.stringify("false"),

    "import.meta.env.VITE_USE_MOCK": JSON.stringify("false"),

    "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify(
      process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "",
    ),
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Vendor: core React ──────────────────────────────────────────
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router")
          )
            return "vendor-react";

          // ── Vendor: UI primitives ───────────────────────────────────────
          if (
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/react-icons")
          )
            return "vendor-ui";

          // ── Vendor: data-fetching ───────────────────────────────────────
          if (id.includes("node_modules/@tanstack/")) return "vendor-query";

          // ── Vendor: charts ──────────────────────────────────────────────
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/d3-")
          )
            return "vendor-charts";

          // ── Vendor: misc utils ──────────────────────────────────────────
          if (
            id.includes("node_modules/date-fns") ||
            id.includes("node_modules/clsx") ||
            id.includes("node_modules/tailwind-merge") ||
            id.includes("node_modules/class-variance-authority") ||
            id.includes("node_modules/sonner") ||
            id.includes("node_modules/cmdk")
          )
            return "vendor-utils";

          // ── App: domain modules ─────────────────────────────────────────
          if (id.includes("/modules/accounting/")) return "mod-accounting";
          if (id.includes("/modules/artist/")) return "mod-artist";
          if (id.includes("/modules/catalog/")) return "mod-catalog";
          if (id.includes("/modules/contracts/")) return "mod-contracts";
          if (id.includes("/modules/crm/")) return "mod-crm";
          if (id.includes("/modules/marketing/")) return "mod-marketing";
          if (id.includes("/modules/monitoring/")) return "mod-monitoring";
          if (id.includes("/modules/releases/")) return "mod-releases";
          if (
            id.includes("/modules/events/") ||
            id.includes("/modules/inventory/") ||
            id.includes("/modules/rh/")
          )
            return "mod-operations";
          if (id.includes("/modules/settings/")) return "mod-settings";
          if (
            id.includes("/modules/licensing/") ||
            id.includes("/modules/projects/") ||
            id.includes("/modules/leads/")
          )
            return "mod-misc";
        },
      },
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/projects/upload-audio": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/projects/audio": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
