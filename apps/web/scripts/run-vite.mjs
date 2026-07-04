import { build, createServer, preview } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../vite.config.mjs";
import { assertWebSupabaseEnv } from "./assert-supabase-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const command = process.argv[2] ?? "dev";
const port = Number(process.env.PORT ?? process.env.VITE_PORT ?? 5000);

// Guard de ambiente: falha antes de subir/buildar se o Supabase ref for inválido.
assertWebSupabaseEnv(command === "dev" ? "development" : "production", webRoot);

const inlineConfig = {
  ...config,
  root: webRoot,
  configFile: false,
};

if (command === "dev") {
  const server = await createServer({
    ...inlineConfig,
    server: {
      ...(config.server ?? {}),
      host: "0.0.0.0",
      port,
      strictPort: true,
    },
  });

  await server.listen();
  server.printUrls();
  if (!process.stdin.isTTY) {
    setInterval(() => {}, 2 ** 30);
  }
} else if (command === "build") {
  await build(inlineConfig);
} else if (command === "preview") {
  const server = await preview({
    ...inlineConfig,
    preview: {
      host: "0.0.0.0",
      port,
      strictPort: true,
    },
  });
  server.printUrls();
} else {
  console.error(`Unknown Vite command: ${command}`);
  process.exit(1);
}
