/**
 * api/index.ts
 *
 * Vercel serverless entrypoint for the NestJS API. Vercel's Node.js runtime
 * auto-detects any file under an `api/` directory (relative to the
 * project's configured root directory — apps/api for this project) that
 * default-exports a `(req, res) => ...` handler, and maps requests for that
 * path to it.
 *
 * Unlike main.ts (the Docker/self-hosted entrypoint), this file:
 *   - never calls app.listen() — Vercel owns the HTTP listener; calling
 *     listen() would try to bind a port inside a function sandbox that
 *     doesn't accept inbound connections that way;
 *   - caches the initialized Nest app across invocations on the SAME warm
 *     container (the `ready` promise below) — re-running createApp() per
 *     request would re-register every provider, reopen DB pools, etc. on
 *     every single HTTP request;
 *   - never triggers migrations (db:migrate is a separate, explicit CI step
 *     — see .github/workflows/staging.yml's migrations-staging job) and
 *     never starts BullMQ workers or the Socket.IO adapter (both already
 *     removed/replaced — see queues/ and core/realtime/ — since neither can
 *     run inside a function that only lives for the duration of one
 *     request).
 */

import express from 'express';
import type { Request, Response } from 'express';
import { createApp } from '../src/create-app';

const server = express();
let ready: Promise<void> | null = null;

function bootstrapOnce(): Promise<void> {
  if (!ready) {
    ready = createApp(server).then((app) => app.init()).then(() => undefined);
  }
  return ready;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  await bootstrapOnce();
  server(req, res);
}
