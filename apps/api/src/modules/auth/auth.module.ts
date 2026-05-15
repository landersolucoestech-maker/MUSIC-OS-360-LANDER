/**
 * modules/auth/auth.module.ts
 *
 * Módulo de autenticação JWT do MUSIC OS 360.
 * Fornece endpoints de login/registro/refresh/logout.
 *
 * Os guards globais (JwtAuthGuard, TenantGuard, RolesGuard)
 * são registados no AppModule via APP_GUARD para cobertura total.
 */

import { Module } from '@nestjs/common';

@Module({
  imports:     [],
  controllers: [],
  providers:   [],
  exports:     [],
})
export class AuthModule {}
