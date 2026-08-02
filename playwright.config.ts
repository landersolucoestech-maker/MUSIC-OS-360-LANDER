import { defineConfig, devices } from '@playwright/test';

/**
 * playwright.config.ts  (Parte 77)
 *
 * E2E mínimo real: exercita o navegador de verdade contra o WEB local
 * (http://localhost:5000) e a API local (http://localhost:3001), nunca
 * substituindo o fluxo por chamadas diretas ao Supabase. Requer que ambos
 * já estejam rodando (`pnpm dev`) e que as credenciais institucionais de
 * teste estejam nas variáveis de ambiente abaixo — os specs pulam
 * graciosamente (test.skip) quando ausentes, para nunca quebrar `pnpm test`
 * de quem não tem acesso a essas credenciais.
 *
 * Nunca grava vídeo/trace com senha, nunca tira screenshot com campos
 * preenchidos — ver e2e/login-and-password-change.spec.ts.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:5000',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
