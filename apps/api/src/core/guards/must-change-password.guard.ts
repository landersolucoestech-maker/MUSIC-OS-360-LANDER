/**
 * must-change-password.guard.ts  (Parte 73)
 *
 * Supabase Auth não tem uma flag nativa de "troca de senha obrigatória" —
 * ela é modelada em `app_metadata.must_change_password` (setada na criação
 * do owner institucional real, ver bootstrap-tenant-zero.cli.ts) e viaja no
 * JWT como qualquer outro claim (mesmo mecanismo de org_id/role — ver
 * auth.guard.ts). Este guard bloqueia toda rota, exceto uma allowlist
 * mínima, enquanto a flag estiver true — o gate real de segurança fica no
 * backend, não apenas num redirect de frontend (que um usuário determinado
 * poderia contornar).
 *
 * A allowlist inclui deliberadamente /auth/context (o frontend precisa
 * disso pra saber que deve mostrar a tela de troca de senha) e
 * /auth/change-required-password (Parte 74 — o único endpoint que pode
 * tirar a conta deste estado, e só faz isso de forma atômica: troca a
 * senha de verdade E limpa a flag na mesma chamada Admin API), mas NÃO
 * /auth/onboarding — a sequência é sempre trocar senha primeiro, depois
 * (se aplicável) o assistente de configuração da empresa.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_BOOTSTRAP_KEY } from '../decorators/auth-bootstrap.decorator';
import { AUTH_DISABLED } from '../auth-disabled';

const ALWAYS_ALLOWED_PREFIXES = [
  '/auth/logout',
  '/auth/context',
  '/auth/change-required-password',
  '/health',
];

function normalizePath(req: Request): string {
  const raw = (req.route?.path && typeof req.route.path === 'string')
    ? req.originalUrl
    : req.originalUrl ?? req.url ?? '';
  return raw.replace(/^\/api\/v\d+/, '').split('?')[0] || '/';
}

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (AUTH_DISABLED) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isAuthBootstrap = this.reflector.getAllAndOverride<boolean>(
      AUTH_BOOTSTRAP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAuthBootstrap) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const appMetadata = request.auth?.claims?.['app_metadata'] as Record<string, unknown> | undefined;
    const mustChange = appMetadata?.['must_change_password'] === true;
    if (!mustChange) return true;

    const path = normalizePath(request);
    if (startsWithAny(path, ALWAYS_ALLOWED_PREFIXES)) return true;

    throw new ForbiddenException({
      error: 'MUST_CHANGE_PASSWORD',
      message: 'Troca de senha obrigatória antes de continuar.',
    });
  }
}
