/**
 * core/security/security-startup.service.ts
 *
 * Valida configuração de segurança no boot da aplicação.
 * Em produção, termina o processo se chaves críticas estiverem ausentes ou
 * com valores padrão inseguros.
 * Em desenvolvimento, emite warnings sem bloquear o boot.
 */

import { Optional, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ZERO_KEY = '0000000000000000000000000000000000000000000000000000000000000000';

interface SecurityCheck {
  name:    string;
  fatal:   boolean;
  check:   () => boolean;
  message: string;
}

@Injectable()
export class SecurityStartupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SecurityStartupService.name);

  constructor(@Optional() private readonly config?: ConfigService) {}

  private getConfig(key: string): string | undefined {
    return this.config?.get<string>(key) ?? process.env[key];
  }

  onApplicationBootstrap(): void {
    const isProduction = this.getConfig('NODE_ENV') === 'production';
    const checks: SecurityCheck[] = [
      {
        name:    'ENCRYPTION_KEY presente',
        fatal:   true,
        check:   () => Boolean(this.getConfig('ENCRYPTION_KEY')),
        message: 'ENCRYPTION_KEY não definida — dados PII serão cifrados com chave zero (INSEGURO)',
      },
      {
        name:    'ENCRYPTION_KEY não é zero-key',
        fatal:   true,
        check:   () => this.getConfig('ENCRYPTION_KEY') !== ZERO_KEY,
        message: 'ENCRYPTION_KEY é a chave zero padrão — substituir por chave de 64 hex chars antes do deploy',
      },
      {
        name:    'SUPABASE_URL presente',
        fatal:   true,
        check:   () => Boolean(
          this.getConfig('SUPABASE_URL') ??
          process.env['VITE_SUPABASE_URL']
        ),
        message: 'SUPABASE_URL não definida — autenticação JWT não funcionará',
      },
      {
        name:    'DATABASE_URL presente',
        fatal:   false,
        check:   () => Boolean(this.getConfig('DATABASE_URL')),
        message: 'DATABASE_URL não definida — API em modo standalone sem persistência',
      },
      {
        name:    'SUPABASE_SERVICE_ROLE_KEY presente em produção',
        fatal:   true,
        check:   () => !isProduction || Boolean(this.getConfig('SUPABASE_SERVICE_ROLE_KEY')),
        message: 'SUPABASE_SERVICE_ROLE_KEY não definida — operações admin Supabase não funcionarão',
      },
      {
        name:    'STRIPE_WEBHOOK_SECRET presente quando Stripe activo',
        fatal:   true,
        check:   () => {
          if (!isProduction) return true;
          const stripeActive = Boolean(this.getConfig('STRIPE_SECRET_KEY'));
          return !stripeActive || Boolean(this.getConfig('STRIPE_WEBHOOK_SECRET'));
        },
        message: 'STRIPE_WEBHOOK_SECRET não definido — webhooks Stripe serão rejeitados em produção',
      },
      {
        name:    'SENTRY_DSN presente em produção',
        fatal:   true,
        check:   () => !isProduction || Boolean(this.getConfig('SENTRY_DSN')),
        message: 'SENTRY_DSN não definido em produção — erros não serão reportados ao Sentry',
      },
      {
        name:    'RESEND_API_KEY presente em produção',
        fatal:   false,
        check:   () => !isProduction || Boolean(this.getConfig('RESEND_API_KEY')),
        message: 'RESEND_API_KEY não definida em produção — emails transacionais não serão enviados',
      },
      {
        name:    'JWT_SECRET / SUPABASE_JWT_SECRET presente',
        fatal:   false,
        check:   () => Boolean(
          this.getConfig('SUPABASE_JWT_SECRET') ??
          this.getConfig('JWT_SECRET')
        ),
        message: 'SUPABASE_JWT_SECRET não definido — verificação de assinatura HMAC pode falhar',
      },
    ];

    let hasFatal = false;
    for (const item of checks) {
      if (!item.check()) {
        if (item.fatal && isProduction) {
          this.logger.error(`[FATAL SECURITY] ${item.name}: ${item.message}`);
          hasFatal = true;
        } else {
          this.logger.warn(`[SECURITY] ${item.name}: ${item.message}`);
        }
      } else {
        this.logger.debug(`[SECURITY] ✓ ${item.name}`);
      }
    }

    if (hasFatal) {
      this.logger.error('[SECURITY] Configuração de segurança inválida — terminando processo.');
      setTimeout(() => process.exit(1), 200);
    } else {
      this.logger.log('[SECURITY] Configuração de segurança validada.');
    }
  }
}
