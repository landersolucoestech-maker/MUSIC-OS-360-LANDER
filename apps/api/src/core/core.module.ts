/**
 * core/core.module.ts
 *
 * CoreModule — agrega todos os serviços de infraestrutura transversal:
 *   - EncryptionService (AES-256-GCM para campos PII)
 *   - AuditService      (audit_logs Drizzle)
 *   - AuditInterceptor  (registo automático via @Audit())
 *   - RateLimitService  (Upstash sliding window)
 *   - RateLimitGuard    (guard injectável)
 *
 * É @Global() — importar uma vez no AppModule.
 */

import { Global, Module } from '@nestjs/common';
import { EncryptionService }  from './security/encryption.service';
import { AuditService }       from './audit/audit.service';
import { AuditInterceptor }   from './interceptors/audit.interceptor';
import { RateLimitService }   from './security/rate-limit.service';
import { RateLimitGuard }     from './guards/rate-limit.guard';

@Global()
@Module({
  providers: [
    EncryptionService,
    AuditService,
    AuditInterceptor,
    RateLimitService,
    RateLimitGuard,
  ],
  exports: [
    EncryptionService,
    AuditService,
    AuditInterceptor,
    RateLimitService,
    RateLimitGuard,
  ],
})
export class CoreModule {}
