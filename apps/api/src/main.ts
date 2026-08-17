// ── .env carregado ANTES de qualquer módulo (garante process.env para QueueModule.register) ──
// Carrega apps/api/.env.development explicitamente (path relativo ao CWD =
// apps/api/ via `npm run dev`). Só é usado para desenvolvimento local — em
// staging/produção as variáveis vêm do provedor de hosting/Docker -e/secrets
// de CI (o arquivo não existe nesses ambientes, então isto vira um no-op).
// Variáveis já presentes em process.env não são sobrepostas — só preenche o
// que ainda não foi definido.
import * as fs from 'fs';
import * as path from 'path';

function loadLocalEnv(envPath: string): void {
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const raw = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key] != null) continue;

    process.env[key] = raw.replace(/^["']|["']$/g, '');
  }
}

loadLocalEnv(path.resolve(__dirname, '../.env.development'));
loadLocalEnv(path.resolve(process.cwd(), '.env.development'));

// ── Sentry DEVE ser o segundo import ───────────────────────────────────────────
import './instrument';

import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createApp } from './create-app';

// Silencia erros de conexão a serviços de rede indisponíveis em ambiente de
// desenvolvimento (ex: Redis local não subiu ainda, ou pooler do Supabase
// caiu temporariamente).
const NETWORK_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT']);
const NET_LOG_THROTTLE_MS = 30_000;
let __netLastCode = '';
let __netLastLogAt = 0;

function suppressNetworkNoise(err: NodeJS.ErrnoException): boolean {
  if (!err.code || !NETWORK_CODES.has(err.code)) return false;
  const now = Date.now();
  if (err.code === __netLastCode && now - __netLastLogAt < NET_LOG_THROTTLE_MS) return true;
  __netLastCode = err.code;
  __netLastLogAt = now;
  console.warn(`[net] Conexao indisponivel (${err.code}): ${err.message?.split('\n')[0]}`);
  return true;
}

process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (suppressNetworkNoise(err)) return;
  throw err;
});

process.on('unhandledRejection', (reason: unknown) => {
  if (reason instanceof Error && suppressNetworkNoise(reason as NodeJS.ErrnoException)) return;
  throw reason;
});

/**
 * Traditional long-running server entrypoint — Docker/self-hosted
 * deployments only. Vercel Functions use api/index.ts instead, which calls
 * createApp() directly and never reaches app.listen().
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await createApp();

  // ── Graceful Shutdown ────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM recebido — iniciando graceful shutdown...');
    await app.close();
    process.exit(0);
  });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  logger.log(`🎵 MUSIC OS 360° API rodando em http://localhost:${port}/api/v1`);

  const { isProdLike } = await import('./core/config/runtime-environment');
  if (!isProdLike(process.env['NODE_ENV'])) {
    logger.log(`📚 Swagger em http://localhost:${port}/docs`);
  }
}

bootstrap().catch((err: unknown) => {
  console.error('Falha crítica no bootstrap:', err);
  process.exit(1);
});
