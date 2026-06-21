import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/** Padrão obrigatório de chave de permissão: resource:action (minúsculas, snake). */
const PERMISSION_KEY_FORMAT = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;

/**
 * @RequirePermission('artist:read', 'artist:export')
 *
 * Exige que o membro possua TODAS as permissões informadas (semântica AND).
 * Coexiste com @RequireRole: a rota pode ter ambos (exige hierarquia E permissão).
 * O enforcement real depende da flag RBAC_PERMISSION_ENFORCEMENT (ver PermissionsGuard).
 *
 * As chaves são validadas no formato `resource:action` em tempo de decoração (boot),
 * para falhar cedo em caso de typo.
 */
export const RequirePermission = (...permissions: string[]) => {
  for (const permission of permissions) {
    if (!PERMISSION_KEY_FORMAT.test(permission)) {
      throw new Error(
        `@RequirePermission: chave inválida "${permission}" — use o padrão resource:action (ex.: artist:read).`,
      );
    }
  }
  return SetMetadata(PERMISSIONS_KEY, permissions);
};
