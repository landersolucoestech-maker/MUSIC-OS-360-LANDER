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

if (!process.stdin.isTTY) {
  process.stdin.resume();
}

// Guard de ambiente: falha antes de subir/buildar se o Supabase ref for inválido.

const inlineConfig = {
  ...config,
  root: webRoot,
  configFile: false,
};

if (command === "dev") {
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

  const keepAlive = setInterval(() => {}, 2 ** 30);
  await server.listen();
  server.httpServer?.on("close", () => {
    console.error("[run-vite] HTTP server closed unexpectedly");
  });
  server.printUrls();
  keepAlive.unref?.();
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
