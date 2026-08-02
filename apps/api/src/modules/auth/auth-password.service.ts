/**
 * auth-password.service.ts  (Parte 73)
 *
 * A troca da senha em si acontece client-side, direto contra o Supabase
 * (apps/web/src/app/providers/AuthContext.tsx's updatePassword(), que chama
 * supabase.auth.updateUser({ password }) usando a sessão já autenticada do
 * usuário) — o backend nunca vê nem processa a senha nova. O que só o
 * backend pode fazer é limpar `app_metadata.must_change_password` (só a
 * service_role tem permissão para editar app_metadata) depois que a troca
 * client-side já teve sucesso, e registar a auditoria.
 */
import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.tokens';
import { AuditService } from '../../core/audit/audit.service';
import type { JwtAuth } from '../../core/guards/auth.guard';

@Injectable()
export class AuthPasswordService {
  constructor(
    @Optional() private readonly config: ConfigService | undefined,
    @Inject(DATA_SOURCE) @Optional() private readonly ds: DataSource | null,
    private readonly audit: AuditService,
  ) {}

  private supabaseAdmin() {
    const url = this.config?.get<string>('SUPABASE_URL') ?? process.env['SUPABASE_URL'];
    const key = this.config?.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!url || !key) {
      throw new ServiceUnavailableException('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas — não é possível limpar must_change_password.');
    }
    return createClient(url, key);
  }

  async clearMustChangePassword(auth: JwtAuth, tenantId: string | null): Promise<void> {
    const currentAppMetadata = (auth.claims['app_metadata'] as Record<string, unknown> | undefined) ?? {};
    if (currentAppMetadata['must_change_password'] !== true) {
      return; // idempotente — nada a limpar, não é erro chamar de novo
    }

    const supabase = this.supabaseAdmin();
    const { error } = await supabase.auth.admin.updateUserById(auth.userId, {
      app_metadata: { ...currentAppMetadata, must_change_password: false },
    });
    if (error) {
      throw new ServiceUnavailableException(`Falha ao concluir troca de senha: ${error.message}`);
    }

    await this.audit.log({
      tenantId,
      orgId: auth.orgId,
      userId: auth.userId,
      actorRole: auth.orgRole,
      action: 'user.password_changed',
      entity: 'user',
      entityId: auth.userId,
    });
  }
}
