/**
 * tenant-zero.constants.ts  (Parte 69 — formalização do tenant-zero)
 *
 * LANDER RECORDS é o tenant institucional inicial ("tenant-zero") do
 * MUSIC OS 360: precisa existir antes dos tenants comuns, com identidade
 * estável e determinística — não um UUID sorteado por ambiente, não uma
 * string espalhada por múltiplos arquivos.
 *
 * Estratégia adotada — UUID v5 (namespace-derived, determinístico):
 *   TENANT_ZERO_ORG_ID / TENANT_ZERO_TENANT_ID são derivados via
 *   uuidv5(seed, MUSICOS360_NAMESPACE_UUID). A mesma seed + o mesmo
 *   namespace produzem, por definição de UUIDv5 (RFC 4122 §4.3, SHA-1),
 *   sempre o mesmo UUID — em DEV, STAGING e PROD, sem precisar copiar um
 *   literal manualmente entre ambientes e sem risco de duas execuções
 *   divergirem. `tenant-zero.constants.spec.ts` prova a determinística via
 *   recomputação independente.
 *
 * MUSICOS360_NAMESPACE_UUID foi gerado uma única vez (crypto.randomUUID())
 * e está congelado — nunca deve ser regenerado; regenerá-lo mudaria todos
 * os IDs derivados dele.
 *
 * Isto é a ÚNICA fonte de verdade para a identidade do tenant-zero. Nenhum
 * outro arquivo deve declarar um UUID, slug ou string equivalente para
 * LANDER RECORDS — sempre importar daqui.
 *
 * Importante: tenant-zero é um tenant normal para fins de RLS/RBAC/billing.
 * Estas constantes identificam QUAL linha é o tenant-zero — elas não
 * concedem, por si só, nenhum privilégio. Nenhuma policy de RLS, nenhum
 * guard de RBAC e nenhuma regra de billing deve comparar contra estes
 * valores; os únicos leitores legítimos dos três símbolos de ID brutos são o
 * bootstrap (`bootstrap-tenant-zero.ts`, que os usa para criar/validar a
 * linha) e este próprio módulo, que os reempacota em
 * TENANT_ZERO_AUTH_DISABLED_IDENTITY para o bypass dev-only de autenticação
 * (`core/auth-disabled.ts`) — nunca uma comparação de autorização.
 */
import { v5 as uuidv5 } from 'uuid';

/** Congelado — nunca regenerar. Ver docstring acima. */
const MUSICOS360_NAMESPACE_UUID = '142d39d6-8454-4ba1-b2f0-695b120ae83f';

export const TENANT_ZERO_SLUG = 'lander-records';
export const TENANT_ZERO_NAME = 'LANDER RECORDS';

export const TENANT_ZERO_ORG_ID = uuidv5(`${TENANT_ZERO_SLUG}:organization`, MUSICOS360_NAMESPACE_UUID);
export const TENANT_ZERO_TENANT_ID = uuidv5(`${TENANT_ZERO_SLUG}:tenant`, MUSICOS360_NAMESPACE_UUID);

/**
 * Identidade sintética do owner inicial — usada apenas em DEV/STAGING pelo
 * bootstrap (nunca em produção, onde um owner real deve ser fornecido via
 * env — ver bootstrap-tenant-zero.ts). Determinística pela mesma razão dos
 * IDs acima: precisa ser estável entre execuções do bootstrap, não um UUID
 * novo a cada rodada.
 */
export const TENANT_ZERO_SYNTHETIC_OWNER_AUTH_USER_ID = uuidv5(`${TENANT_ZERO_SLUG}:synthetic-owner`, MUSICOS360_NAMESPACE_UUID);
export const TENANT_ZERO_SYNTHETIC_OWNER_EMAIL = 'owner@lander-records.example.com';
export const TENANT_ZERO_SYNTHETIC_OWNER_NAME = 'LANDER RECORDS (Owner Sintético — DEV/STAGING)';

/**
 * Identidade empacotada para o modo AUTH_DISABLED (bypass dev-only de
 * autenticação — ver core/auth-disabled.ts). Existe como objeto separado, e
 * não como export direto dos três símbolos brutos acima, para que
 * `tenant-zero-no-special-case.spec.ts` continue garantindo que nenhum outro
 * arquivo do sistema (RLS, RBAC, billing, guards) referencie
 * TENANT_ZERO_ORG_ID/TENANT_ZERO_TENANT_ID/TENANT_ZERO_SYNTHETIC_OWNER_AUTH_USER_ID
 * diretamente — só o bootstrap e este pacote os leem.
 */
export const TENANT_ZERO_AUTH_DISABLED_IDENTITY = {
  orgId: TENANT_ZERO_ORG_ID,
  tenantId: TENANT_ZERO_TENANT_ID,
  syntheticOwnerAuthUserId: TENANT_ZERO_SYNTHETIC_OWNER_AUTH_USER_ID,
};

/** Motivo de auditoria registrado em todo evento de bootstrap do tenant-zero. */
export const TENANT_ZERO_AUDIT_ACTION_CREATED = 'tenant.bootstrap.system_tenant_created';
export const TENANT_ZERO_AUDIT_ACTION_VERIFIED = 'tenant.bootstrap.system_tenant_verified';
