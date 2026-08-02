/**
 * auth-password.service.ts  (Parte 73, refeito na Parte 74)
 *
 * Parte 73 tinha duas fontes de verdade concorrentes: o frontend trocava a
 * senha direto no Supabase (client-side, updateUser({password})) e DEPOIS
 * chamava um endpoint separado só para limpar `must_change_password` — sem
 * nenhuma prova de que a troca realmente aconteceu. Isso não é atômico: o
 * frontend nunca chegou a implementar essa segunda chamada (Parte 74,
 * Bloco 2), e mesmo que implementasse, um cliente malicioso podia chamar só
 * o "clear" sem nunca trocar a senha de fato.
 *
 * Parte 74: uma única operação atômica. `changeRequiredPassword()` valida a
 * senha nova, troca-a fisicamente no Supabase Auth via Admin API E limpa
 * `must_change_password` NA MESMA CHAMADA (`updateUserById({ password,
 * app_metadata })`) — se o GoTrue rejeitar (senha fraca por regra própria,
 * rate limit, etc.), nada muda: a flag permanece true, nenhuma auditoria é
 * escrita. Só depois de confirmado sucesso é que registamos
 * `user.password_changed`.
 */
import { BadRequestException, Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.tokens';
import { AuditService } from '../../core/audit/audit.service';
import type { JwtAuth } from '../../core/guards/auth.guard';
import { strongPasswordViolations } from '../../core/security/password-policy';
import type { ChangeRequiredPasswordDto } from './dto/change-required-password.dto';

@Injectable()
export class AuthPasswordService {
  constructor(
    @Optional() private readonly config: ConfigService | undefined,
    @Inject(DATA_SOURCE) @Optional() private readonly ds: DataSource | null,
    private readonly audit: AuditService,
  ) {}

  private env(key: string): string | undefined {
    return this.config?.get<string>(key) ?? process.env[key];
  }

  private supabaseAdmin() {
    const url = this.env('SUPABASE_URL');
    const key = this.env('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new ServiceUnavailableException('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configuradas — não é possível trocar a senha.');
    }
    return createClient(url, key);
  }

  /**
   * Tentativa de bloquear reutilização da senha provisória atual, "quando
   * tecnicamente verificável" (Parte 74, Bloco 5): a única forma de provar
   * que `candidate` é igual à senha atual sem ter o hash é tentar logar com
   * ela. Best-effort — se SUPABASE_ANON_KEY ou o e-mail não estiverem
   * disponíveis, ou a chamada falhar por qualquer motivo de rede, apenas
   * pula a checagem (nunca bloqueia a troca real por causa disso).
   */
  private async isSameAsCurrentPassword(email: string | undefined, candidate: string): Promise<boolean> {
    const url = this.env('SUPABASE_URL');
    const anonKey = this.env('SUPABASE_ANON_KEY');
    if (!url || !anonKey || !email) return false;
    try {
      const anon = createClient(url, anonKey);
      const { data, error } = await anon.auth.signInWithPassword({ email, password: candidate });
      if (data?.session) {
        // Não precisamos (nem queremos) manter essa sessão de teste viva.
        await anon.auth.signOut().catch(() => {});
      }
      return !error && !!data?.session;
    } catch {
      return false;
    }
  }

  async changeRequiredPassword(
    auth: JwtAuth,
    tenantId: string | null,
    dto: ChangeRequiredPasswordDto,
    accessToken: string | null,
  ): Promise<{ passwordChanged: true; mustRefreshSession: true }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem.');
    }

    const violations = strongPasswordViolations(dto.newPassword);
    if (violations.length > 0) {
      throw new BadRequestException(`Senha fraca — requisitos pendentes: ${violations.join(', ')}.`);
    }

    const email = auth.claims['email'] as string | undefined;
    if (await this.isSameAsCurrentPassword(email, dto.newPassword)) {
      throw new BadRequestException('A nova senha não pode ser igual à senha provisória atual.');
    }

    const currentAppMetadata = (auth.claims['app_metadata'] as Record<string, unknown> | undefined) ?? {};
    const supabase = this.supabaseAdmin();

    // Atômico: senha e app_metadata mudam na MESMA chamada Admin API. Se o
    // GoTrue rejeitar, nem a senha nem a flag mudam — o catch abaixo garante
    // que nada é auditado nesse caso.
    const { error } = await supabase.auth.admin.updateUserById(auth.userId, {
      password: dto.newPassword,
      app_metadata: { ...currentAppMetadata, must_change_password: false },
    });
    if (error) {
      throw new ServiceUnavailableException(`Falha ao trocar a senha: ${error.message}`);
    }

    // Best-effort: revoga sessões desta conta que não sejam a atual (ex.:
    // alguém mais usando a senha provisória comprometida em outro lugar).
    // Nunca deve derrubar o sucesso já confirmado da troca de senha.
    if (accessToken) {
      await supabase.auth.admin.signOut(accessToken, 'others').catch(() => {});
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

    return { passwordChanged: true, mustRefreshSession: true };
  }
}
