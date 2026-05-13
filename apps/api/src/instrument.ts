/**
 * instrument.ts
 *
 * Sentry SDK initialization — deve ser importado ANTES de qualquer outro módulo
 * da aplicação (incluindo NestJS / Express).
 * Segue as instruções oficiais do Sentry para Node.js.
 *
 * Se SENTRY_DSN não estiver configurado, o SDK é desativado silenciosamente.
 */

// ── Silencia ruído ioredis em desenvolvimento ──────────────────────────────
// BullMQ duplica conexões ioredis por fila; as duplicatas emitem 'error' events
// sem listeners → ioredis loga "[ioredis] Unhandled error event" via console.error.
// Em produção (Railway) o Redis está acessível, então este filtro não interfere.
if (process.env['NODE_ENV'] !== 'production') {
  const _origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const first = String(args[0] ?? '');
    if (
      first.includes('[ioredis]') ||
      first.includes('ENOTFOUND') ||
      first.includes('redis.railway.internal') ||
      first.includes('Connection is closed')
    ) {
      return; // engole ruído de conexão Redis inacessível em dev
    }
    _origError(...args);
  };
}

const SENTRY_DSN = process.env['SENTRY_DSN'];

if (SENTRY_DSN) {
  // Import dinâmico para não crashar se @sentry/node não estiver instalado
  import('@sentry/node')
    .then(Sentry => {
      Sentry.init({
        dsn: SENTRY_DSN,

        environment: process.env['NODE_ENV'] ?? 'development',

        // Release tracking (ex: Git SHA injectado no CI/CD)
        release: process.env['SENTRY_RELEASE'] ?? undefined,

        // Distributed tracing — 10% sampling em produção
        tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,

        // Profiles — apenas em produção
        profilesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.05 : 0,

        // Dados sensíveis: nunca enviar request bodies com PII
        sendDefaultPii: false,

        // Integrations padrão do Sentry Node.js (HTTP, Express, etc.)
        integrations: [
          Sentry.httpIntegration(),
          Sentry.expressIntegration(),
        ],

        // Ignorar erros de cliente (4xx) — só queremos erros de sistema
        ignoreErrors: [
          /^NotFoundException/,
          /^UnauthorizedException/,
          /^ForbiddenException/,
          /^BadRequestException/,
          /^ConflictException/,
        ],

        // Breadcrumbs: desativar console (muito verboso) em produção
        beforeBreadcrumb(breadcrumb) {
          if (breadcrumb.category === 'console' && process.env['NODE_ENV'] === 'production') {
            return null;
          }
          return breadcrumb;
        },
      });

      console.info(`[Sentry] Inicializado — env: ${process.env['NODE_ENV'] ?? 'development'}`);
    })
    .catch(err => {
      console.warn(`[Sentry] Falha na inicialização (continuando sem monitoramento): ${String(err)}`);
    });
} else {
  console.info('[Sentry] SENTRY_DSN não configurado — monitoramento desativado');
}
