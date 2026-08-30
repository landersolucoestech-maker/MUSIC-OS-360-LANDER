import 'reflect-metadata';

// auth.guard (importado transitivamente por IS_PUBLIC_KEY) puxa jwks-rsa→jose (ESM).
// Mockamos jwks-rsa para o jest não tentar transpilar o pacote ESM — mesmo padrão do auth.guard.spec.
jest.mock('jwks-rsa', () => jest.fn(() => ({ getSigningKey: jest.fn() })));

import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY, RequirePermission } from '../decorators/permissions.decorator';
import { ROLES_KEY, RequireRole } from '../decorators/roles.decorator';
import type { RbacDecisionService } from '../rbac/rbac-decision.service';

const HANDLER = function handler(): void {};
class KLASS {}

function makeReflector(required: string[]): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(false), // rota não-pública
    get: jest.fn((key: string, target: unknown) => {
      if (key === PERMISSIONS_KEY) return target === HANDLER ? required : [];
      return undefined;
    }),
  } as unknown as Reflector;
}

function makeContext(member: Record<string, unknown> | undefined): ExecutionContext {
  const req = { method: 'GET', url: '/artists', originalUrl: '/artists', currentMember: member };
  return {
    getHandler: () => HANDLER,
    getClass: () => KLASS,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeDecisions(perms: string[] | Error): RbacDecisionService {
  return {
    evaluate: jest.fn(
      async ({
        requiredPermissions,
      }: {
        requiredPermissions: string[];
      }) => {
        if (perms instanceof Error) throw perms;
        return requiredPermissions.every((permission) =>
          perms.includes(permission),
        )
          ? 'ALLOW'
          : 'DENY';
      },
    ),
  } as unknown as RbacDecisionService;
}

function makeGuard(required: string[], rbacPerms: string[] | Error): PermissionsGuard {
  return new PermissionsGuard(
    makeReflector(required),
    makeDecisions(rbacPerms),
  );
}

const MEMBER = { role: 'editor', role_id: 'r-1', tenant_id: 't-1' };

afterEach(() => {
  delete process.env['RBAC_PERSISTED_AUTHORITY'];
  jest.restoreAllMocks();
});

function enforcementOn(): void {
  process.env['RBAC_PERSISTED_AUTHORITY'] = 'ON';
}

// ── Enforcement OFF (modo observação) ─────────────────────────────────────────
describe('PermissionsGuard — enforcement OFF (default)', () => {
  it('não bloqueia mesmo sem a permissão (apenas observa/loga)', async () => {
    const guard = makeGuard(['artist:read'], []); // membro sem permissões
    await expect(guard.canActivate(makeContext(MEMBER))).resolves.toBe(true);
  });

  it('rota sem @RequirePermission é no-op (não chama o resolver)', async () => {
    const decisions = makeDecisions([]);
    const guard = new PermissionsGuard(makeReflector([]), decisions);
    await expect(guard.canActivate(makeContext(MEMBER))).resolves.toBe(true);
    expect((decisions.evaluate as jest.Mock)).not.toHaveBeenCalled();
  });
});

// ── Enforcement ON ────────────────────────────────────────────────────────────
describe('PermissionsGuard — enforcement ON', () => {
  beforeEach(enforcementOn);

  it('usuário com artist:read acessa GET', async () => {
    await expect(makeGuard(['artist:read'], ['artist:read']).canActivate(makeContext(MEMBER))).resolves.toBe(true);
  });

  it('usuário sem artist:read recebe 403', async () => {
    await expect(makeGuard(['artist:read'], ['catalog:read']).canActivate(makeContext(MEMBER)))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('usuário com artist:create acessa POST', async () => {
    await expect(makeGuard(['artist:create'], ['artist:create']).canActivate(makeContext(MEMBER))).resolves.toBe(true);
  });

  it('usuário só com artist:read NÃO consegue POST (artist:create)', async () => {
    await expect(makeGuard(['artist:create'], ['artist:read']).canActivate(makeContext(MEMBER)))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('usuário com artist:update acessa PATCH', async () => {
    await expect(makeGuard(['artist:update'], ['artist:update']).canActivate(makeContext(MEMBER))).resolves.toBe(true);
  });

  it('usuário com artist:delete acessa DELETE', async () => {
    await expect(makeGuard(['artist:delete'], ['artist:delete']).canActivate(makeContext(MEMBER))).resolves.toBe(true);
  });

  it('múltiplas permissões (AND): falta uma → 403', async () => {
    await expect(makeGuard(['artist:read', 'artist:export'], ['artist:read']).canActivate(makeContext(MEMBER)))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('múltiplas permissões (AND): tem todas → libera', async () => {
    await expect(
      makeGuard(['artist:read', 'artist:export'], ['artist:read', 'artist:export']).canActivate(makeContext(MEMBER)),
    ).resolves.toBe(true);
  });

  it('role_id ausente → usa fallback legado (resolver retorna permissões legadas)', async () => {
    const guard = makeGuard(['artist:read'], ['artist:read']); // resolver já encapsula fallback (FASE 5)
    await expect(guard.canActivate(makeContext({ role: 'viewer', role_id: null, tenant_id: 't-1' }))).resolves.toBe(true);
  });

  it('role custom do tenant correto funciona (resolver retorna a permissão)', async () => {
    await expect(makeGuard(['artist:read'], ['artist:read']).canActivate(makeContext(MEMBER))).resolves.toBe(true);
  });

  it('role custom de outro tenant NÃO funciona (resolver retorna vazio → 403)', async () => {
    await expect(makeGuard(['artist:read'], []).canActivate(makeContext(MEMBER)))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('erro no resolver gera DENY, não allow', async () => {
    await expect(makeGuard(['artist:read'], new Error('db down')).canActivate(makeContext(MEMBER)))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sem membro no contexto → DENY', async () => {
    await expect(makeGuard(['artist:read'], ['artist:read']).canActivate(makeContext(undefined)))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permissões vazias não liberam acesso', async () => {
    await expect(makeGuard(['artist:read'], []).canActivate(makeContext(MEMBER)))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});

// ── Paridade / coexistência @RequireRole + @RequirePermission ─────────────────
describe('Coexistência @RequireRole + @RequirePermission (paridade do piloto)', () => {
  class PilotoArtistsController {
    @RequireRole('viewer')
    @RequirePermission('artist:read')
    list(): void {}

    @RequireRole('editor')
    @RequirePermission('artist:create')
    create(): void {}

    @RequireRole('manager')
    @RequirePermission('artist:delete')
    remove(): void {}
  }
  const proto = PilotoArtistsController.prototype;

  it('cada rota carrega AMBAS as metadatas (role + permission)', () => {
    expect(Reflect.getMetadata(ROLES_KEY, proto.list)).toEqual(['viewer']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto.list)).toEqual(['artist:read']);
    expect(Reflect.getMetadata(ROLES_KEY, proto.create)).toEqual(['editor']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto.create)).toEqual(['artist:create']);
    expect(Reflect.getMetadata(ROLES_KEY, proto.remove)).toEqual(['manager']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto.remove)).toEqual(['artist:delete']);
  });
});

// ── Validação de formato da chave ─────────────────────────────────────────────
describe('@RequirePermission — formato resource:action', () => {
  it('rejeita chave malformada em tempo de decoração', () => {
    expect(() => RequirePermission('ArtistRead')).toThrow(/resource:action/);
    expect(() => RequirePermission('artist:')).toThrow();
  });
  it('aceita chave válida', () => {
    expect(() => RequirePermission('artist:read')).not.toThrow();
  });
});
