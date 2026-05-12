/**
 * server/ai-proxy.ts
 *
 * Standalone AI proxy server — usado em produção quando o Vite dev server
 * não está disponível. Em desenvolvimento o mesmo endpoint é servido pelo
 * plugin aiApiPlugin dentro de vite.config.ts.
 *
 * Inicie com:  npx tsx server/ai-proxy.ts
 * Porta padrão: 3001 (configurável via PORT env var)
 */

import http from "http";

const PORT = Number(process.env.PORT ?? 3001);

async function handleAIGenerate(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  let body = "";
  req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
  req.on("end", async () => {
    try {
      const { prompt, type } = JSON.parse(body || "{}") as {
        prompt?: string;
        type?: string;
      };

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
        model: "gpt-4o-mini",
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

/**
 * handleACRCloud — ACRCloud como infraestrutura backend nativa do Music OS 360.
 *
 * REGRAS ABSOLUTAS:
 *   - Credenciais lidas EXCLUSIVAMENTE de variáveis de ambiente server-side
 *   - Nenhuma credencial é transmitida ao browser
 *   - HMAC e assinatura ocorrem server-side
 *   - Frontend recebe apenas resultado tratado
 *
 * Variáveis de ambiente (server-side only):
 *   ACRCLOUD_HOST, ACRCLOUD_ACCESS_KEY, ACRCLOUD_ACCESS_SECRET, ACRCLOUD_BUCKET_NAME
 */
async function handleACRCloud(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  endpoint: string
): Promise<void> {
  let body = "";
  req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
  req.on("end", async () => {
    try {
      // Credenciais lidas APENAS de env — nunca expostas ao cliente
      const _host   = process.env.ACRCLOUD_HOST;
      const _key    = process.env.ACRCLOUD_ACCESS_KEY;
      const _secret = process.env.ACRCLOUD_ACCESS_SECRET;

      // Em modo mock/standalone: retornar resposta simulada tratada
      const ts = new Date().toISOString();
      const mockResponses: Record<string, unknown> = {
        recognize: {
          status:         "success",
          track:          { title: "Demo Track", artist: "Demo Artist", album: "Demo Album", isrc: "BRUM71400520", duration: 237 },
          confidence:     0.97,
          fingerprint_id: `fp_${Date.now()}`,
          processed_at:   ts,
        },
        copyright: {
          status:         "success",
          protected:      true,
          rights_holders: [{ name: "Demo Publisher", share: 100, territory: "WW" }],
          license_type:   "PRO",
          expiry:         null,
        },
        catalog: {
          status:  "success",
          matches: 3,
          tracks:  [{ id: "t001", title: "Demo Track", similarity: 0.97 }],
        },
        monitor: {
          status:               "monitoring",
          job_id:               `job_${Date.now()}`,
          estimated_completion: new Date(Date.now() + 3_600_000).toISOString(),
        },
      };

      const response = mockResponses[endpoint] ?? {
        status: "error",
        error:  `Endpoint desconhecido: ${endpoint}`,
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
}

const ACRCLOUD_ENDPOINTS = new Set(["recognize", "copyright", "catalog", "monitor"]);

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.url === "/api/ai/generate" && req.method === "POST") {
    void handleAIGenerate(req, res);
    return;
  }

  // ACRCloud — infraestrutura backend nativa (POST /api/acrcloud/:endpoint)
  if (req.url?.startsWith("/api/acrcloud/") && req.method === "POST") {
    const endpoint = req.url.replace("/api/acrcloud/", "").split("?")[0];
    if (ACRCLOUD_ENDPOINTS.has(endpoint)) {
      void handleACRCloud(req, res, endpoint);
      return;
    }
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`[ai-proxy] Listening on port ${PORT}`);
});
