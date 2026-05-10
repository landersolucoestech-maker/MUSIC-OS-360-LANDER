import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Connect } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

function aiApiPlugin() {
  return {
    name: "ai-api-middleware",
    configureServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          if (req.url !== "/api/ai/generate" || req.method !== "POST") {
            return next();
          }

          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", async () => {
            try {
              const { prompt, type } = JSON.parse(body || "{}");
              if (!prompt) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "prompt é obrigatório" }));
                return;
              }

              const { default: OpenAI } = await import("openai");
              const openai = new OpenAI({
                apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
                baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
              });

              const completion = await openai.chat.completions.create({
                model: "gpt-5-mini",
                messages: [
                  {
                    role: "system",
                    content:
                      "Você é um assistente especializado em música e indústria fonográfica brasileira. " +
                      "Responda sempre em Português do Brasil. Seja conciso, profissional e direto. " +
                      "Não use asteriscos para negrito nem markdown. Use texto simples.",
                  },
                  { role: "user", content: prompt },
                ],
                max_completion_tokens: 1024,
              });

              const content = completion.choices[0]?.message?.content ?? "";
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ content, type }));
            } catch (err: unknown) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
        }
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), aiApiPlugin()],
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
    "import.meta.env.VITE_USE_MOCK": JSON.stringify(
      process.env.VITE_USE_MOCK ??
        process.env.VITE_MOCK_MODE ??
        (process.env.NODE_ENV === "production" ? "false" : "true")
    ),
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@radix-ui/") || id.includes("node_modules/lucide-react") || id.includes("node_modules/react-icons")) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/date-fns") || id.includes("node_modules/clsx") || id.includes("node_modules/tailwind-merge") || id.includes("node_modules/class-variance-authority") || id.includes("node_modules/sonner") || id.includes("node_modules/cmdk")) {
            return "vendor-utils";
          }
        },
      },
    },
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
      "/socket.io": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
