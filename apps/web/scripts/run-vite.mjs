import { build, createServer, preview } from "vite";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const command = process.argv[2] ?? "dev";
const port = Number(process.env.PORT ?? process.env.VITE_PORT ?? 5000);

process.chdir(webRoot);

const configModule = await import(pathToFileURL(path.join(webRoot, "vite.config.mjs")).href);
const config = configModule.default ?? {};

// CAUSA RAIZ (localhost morria em background): com stdin fechado/não-TTY,
// `process.stdin.resume()` emite `end` imediatamente e solta o handle; o
// keepAlive antigo era `unref()` (não segura o event loop). Durante lacunas
// assíncronas do startup do Vite o loop drenava e o Node saía com código 0,
// silenciosamente. A correção é um timer REF'D (segura o loop até SIGINT/
// SIGTERM), armado só para servidores (dev/preview) — build sai normalmente.
function holdEventLoopForServer() {
  setInterval(() => {}, 2 ** 30);
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => process.exit(0));
  }
}

// Guard de ambiente: falha antes de subir/buildar se o Supabase ref for inválido.

const inlineConfig = {
  ...config,
  root: webRoot,
  configFile: false,
};

if (command === "dev") {
  holdEventLoopForServer();
  const server = await createServer({
    ...config,
    root: webRoot,
    configFile: false,
    server: {
      ...(config.server ?? {}),
      host: "0.0.0.0",
      port,
      strictPort: true,
    },
  });

  await server.listen();
  server.httpServer?.on("close", () => {
    console.error("[run-vite] HTTP server closed unexpectedly");
  });
  server.printUrls();
} else if (command === "build") {
  await build(inlineConfig);
} else if (command === "preview") {
  holdEventLoopForServer();
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
