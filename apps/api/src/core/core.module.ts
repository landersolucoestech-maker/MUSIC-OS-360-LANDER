/**
 * core/core.module.ts
 *
 * CoreModule — agrega todos os serviços de infraestrutura transversal:
 *   - EncryptionService  (AES-256-GCM para campos PII)
 *   - AuditService       (audit_logs Drizzle)
 *   - AuditInterceptor   (registo automático via @Audit())
 *   - RateLimitService   (Upstash sliding window)
 *   - RateLimitGuard     (guard injectável)
 *   - MailService        (Resend — email transacional)
 *   - PostHogService     (product analytics server-side)
 *
 * É @Global() — importar uma vez no AppModule.
 */

import { Global, Module }    from '@nestjs/common';
import { EncryptionService }  from './security/encryption.service';
import { AuditService }       from './audit/audit.service';
import { AuditInterceptor }   from './interceptors/audit.interceptor';
import { RateLimitService }   from './security/rate-limit.service';
import { RateLimitGuard }     from './guards/rate-limit.guard';
import { MailService }        from './mail/mail.service';
import { PostHogService }     from './analytics/posthog.service';

@Global()
@Module({
  providers: [
    EncryptionService,
    AuditService,
    AuditInterceptor,
    RateLimitService,
    RateLimitGuard,
    MailService,
    PostHogService,
  ],
  exports: [
    EncryptionService,
    AuditService,
    AuditInterceptor,
    RateLimitService,
    RateLimitGuard,
    MailService,
    PostHogService,
  ],
})
export class CoreModule {}
