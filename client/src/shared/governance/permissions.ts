/**
 * shared/governance/permissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * MUSIC OS 360 — Sistema de Permissões RBAC (Role-Based Access Control)
 *
 * Documenta o modelo de permissões do sistema: papéis, módulos,
 * operações e restrições por plano de billing.
 *
 * Fonte de implementação: app/providers/TenantContext.tsx
 * Tipos: TenantRole, TenantModuleKey, TenantModulePermission, TenantPermissions
 *
 * REGRA: toda UI que restringe acesso DEVE usar useTenant().hasPermission()
 *        ou verificar features flags via tenant.features.
 *        PROIBIDO: verificar papéis directamente em componentes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { TenantRole, TenantModuleKey } from "@/app/providers/TenantContext";

// ─── Tipos de documentação ────────────────────────────────────────────────────

export interface RoleDescription {
  role: TenantRole;
  name: string;
  description: string;
  canInviteRoles: TenantRole[];
  restrictions: string[];
}

export interface OperationPermission {
  operation: "read" | "write" | "delete" | "export";
  description: string;
  minRole: TenantRole;
}

export interface ModuleAccessPolicy {
  module: TenantModuleKey;
  operations: OperationPermission[];
  planRestrictions: Partial<Record<"starter" | "professional" | "enterprise", string>>;
  notes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAPÉIS DO SISTEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hierarquia de papéis (ordem decrescente de poder):
 *   owner > admin > manager > editor > viewer
 *
 * REGRA: um utilizador só pode convidar utilizadores com papéis
 *        iguais ou inferiores ao seu próprio.
 */
export const ROLE_DESCRIPTIONS: Record<TenantRole, RoleDescription> = {

  owner: {
    role:          "owner",
    name:          "Proprietário",
    description:
      "Controlo total do tenant: billing, utilizadores, configurações, " +
      "todos os módulos. Não pode ser removido por outros papéis. " +
      "Um tenant tem exactamente um owner (pode ser transferido).",
    canInviteRoles: ["admin", "manager", "editor", "viewer"],
    restrictions:  [],
  },

  admin: {
    role:          "admin",
    name:          "Administrador",
    description:
      "Acesso total a todos os módulos e operações. " +
      "Pode gerir utilizadores excluindo o owner. " +
      "Não acede a configurações de billing (reservado ao owner).",
    canInviteRoles: ["manager", "editor", "viewer"],
    restrictions:  [
      "Não pode alterar plano de billing",
      "Não pode remover o owner",
      "Não pode transferir ownership",
    ],
  },

  manager: {
    role:          "manager",
    name:          "Gestor",
    description:
      "Acesso de escrita a todos os módulos operacionais. " +
      "Acesso de leitura a auditoria e configurações. " +
      "Não pode gerir utilizadores nem alterar configurações do tenant.",
    canInviteRoles: ["editor", "viewer"],
    restrictions:  [
      "Leitura em auditoria e configurações (sem escrita)",
      "Não pode gerir utilizadores",
      "Não pode alterar configurações do tenant",
    ],
  },

  editor: {
    role:          "editor",
    name:          "Editor",
    description:
      "Pode criar e editar registos em todos os módulos operacionais. " +
      "Não pode eliminar registos nem aceder a auditoria ou configurações. " +
      "Típico para colaboradores de produção e marketing.",
    canInviteRoles: [],
    restrictions:  [
      "Sem acesso a auditoria",
      "Sem acesso a configurações",
      "Sem permissão de eliminação em nenhum módulo",
      "Não pode convidar novos utilizadores",
    ],
  },

  viewer: {
    role:          "viewer",
    name:          "Visualizador",
    description:
      "Acesso de leitura e exportação a todos os módulos operacionais. " +
      "Não pode criar, editar ou eliminar nada. " +
      "Típico para stakeholders externos, auditores, artistas com acesso ao ERP.",
    canInviteRoles: [],
    restrictions:  [
      "Apenas leitura e exportação",
      "Sem acesso a auditoria",
      "Sem acesso a configurações",
      "Não pode convidar novos utilizadores",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MATRIZ DE PERMISSÕES POR MÓDULO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tabela de permissões por módulo e papel.
 * Implementação em: ROLE_PERMISSIONS (TenantContext.tsx).
 *
 * Legenda:
 *   ✓ = permitido    ✗ = proibido    R = apenas leitura
 *
 * Módulo         | owner | admin | manager | editor | viewer
 * ─────────────────────────────────────────────────────────────
 * artists        |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * catalog        |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * releases       |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * contracts      |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * accounting     |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * crm            |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * marketing      |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * events         |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * inventory      |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * rh             |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * monitoring     |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * licensing      |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * projects       |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * leads          |  ✓✓✓✓ |  ✓✓✓✓ |   ✓✓✓✓  |  ✓✓✗✓  |  R
 * audit          |  ✓✓✓✓ |  ✓✓✓✓ |     R   |  ✗✗✗✗  | ✗✗✗✗
 * settings       |  ✓✓✓✓ |  ✓✓✓✓ |     R   |  ✗✗✗✗  | ✗✗✗✗
 *
 * Formato ✓✓✓✓: read.write.delete.export
 */
export const PERMISSION_MATRIX_DOCS = `
Módulo         | owner | admin | manager | editor | viewer
─────────────────────────────────────────────────────────────
artists        | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
catalog        | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
releases       | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
contracts      | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
accounting     | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
crm            | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
marketing      | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
events         | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
inventory      | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
rh             | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
monitoring     | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
licensing      | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
projects       | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
leads          | FULL  | FULL  |  FULL   | R/W/-/E|  R/-/-/E
audit          | FULL  | FULL  | R/-/-/E |  NONE  |  NONE
settings       | FULL  | FULL  | R/-/-/E |  NONE  |  NONE

FULL = read + write + delete + export
R    = read only
E    = export
-    = denied
`;

// ═══════════════════════════════════════════════════════════════════════════════
// RESTRIÇÕES POR PLANO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Módulos bloqueados por plano de billing.
 * Implementação em: PLAN_FLAGS (shared/lib/feature-flags.ts).
 *
 * starter (entry-level):
 *   - monitoring desabilitado
 *   - licensing desabilitado
 *   - rh desabilitado
 *   - auditLog desabilitado
 *   - bulkActions desabilitado
 *   - analyticsAdvanced desabilitado
 *
 * professional (mid-tier):
 *   - analyticsAdvanced desabilitado
 *   - whitelabel desabilitado
 *   - multiTenantAdmin desabilitado
 *
 * enterprise (full):
 *   - todos os módulos e features habilitados
 */
export const PLAN_ACCESS_RESTRICTIONS: Record<
  "starter" | "professional" | "enterprise",
  { blockedModules: TenantModuleKey[]; blockedFeatures: string[] }
> = {
  starter: {
    blockedModules:  ["monitoring", "licensing", "rh", "audit"],
    blockedFeatures: ["auditLog", "bulkActions", "analyticsAdvanced",
                      "aiFeatures", "multiTenantAdmin", "billingPortal",
                      "storageR2", "rbacAdvanced", "whitelabel"],
  },
  professional: {
    blockedModules:  [],
    blockedFeatures: ["analyticsAdvanced", "whitelabel", "multiTenantAdmin"],
  },
  enterprise: {
    blockedModules:  [],
    blockedFeatures: [],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PADRÃO DE USO NA UI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * COMO VERIFICAR PERMISSÕES NA UI:
 *
 * 1. Verificação de módulo (read access):
 *    const { tenant } = useTenant();
 *    if (!tenant.permissions.artists.read) return <NoAccess />;
 *
 * 2. Verificação de operação:
 *    const canWrite = tenant.permissions.accounting.write;
 *    <Button disabled={!canWrite}>Criar Transação</Button>
 *
 * 3. Verificação de feature flag:
 *    const { tenant } = useTenant();
 *    if (!tenant.features.moduleMonitoring) return <UpgradePrompt />;
 *
 * 4. Rota protegida (AdminRoute):
 *    <AdminRoute roles={["owner", "admin"]}>
 *      <AuditPage />
 *    </AdminRoute>
 *
 * PROIBIDO:
 *   - Verificar tenant.role directamente (usar permissions object)
 *   - Esconder elementos via CSS em vez de não os renderizar
 *   - Verificar permissões em serviços (apenas na UI ou no backend futuro)
 */
export const PERMISSION_USAGE_PATTERN = {
  moduleAccess:   "tenant.permissions[moduleKey].read",
  writeAccess:    "tenant.permissions[moduleKey].write",
  deleteAccess:   "tenant.permissions[moduleKey].delete",
  exportAccess:   "tenant.permissions[moduleKey].export",
  featureFlag:    "tenant.features[featureFlagKey]",
  adminRoute:     "AdminRoute roles={['owner', 'admin']}",
  forbidden: [
    "verificar tenant.role directamente",
    "esconder via CSS (usar renderização condicional)",
    "verificar permissões em serviços/mappers",
  ],
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DADOS SENSÍVEIS — Política de acesso
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Campos que requerem tratamento especial de acesso:
 *
 * CPF/CNPJ:
 *   - Visíveis apenas para owner, admin, manager
 *   - Mascarados para editor e viewer (ex: ***.123.456-**)
 *   - FUTURO: encriptação em repouso no backend
 *
 * Salários (Funcionario.salario):
 *   - Visíveis apenas para owner e admin
 *   - Completamente ocultos para manager, editor, viewer
 *
 * Credenciais de integração (musicos360_<id>_credentials):
 *   - Nunca visíveis na UI (apenas asteriscos)
 *   - Eliminadas no logout
 *   - FUTURO: armazenadas no backend encriptadas (Vault)
 *
 * Dados financeiros (Transacao.valor, NotaFiscal.valor_total):
 *   - Visíveis para owner, admin, manager (com exportação)
 *   - Visíveis para editor (sem exportação de relatórios completos)
 *   - Mascarados para viewer em contextos de lista
 *
 * Chaves de autenticação:
 *   - musicos360_rt → eliminado no logout
 *   - Nunca exposto em logs ou consola
 */
export const SENSITIVE_DATA_POLICY = {
  cpfCnpj: {
    visibleFor: ["owner", "admin", "manager"] as TenantRole[],
    maskedFor:  ["editor", "viewer"] as TenantRole[],
    maskPattern: "***.XXX.XXX-**",
  },
  salarios: {
    visibleFor: ["owner", "admin"] as TenantRole[],
    hiddenFor:  ["manager", "editor", "viewer"] as TenantRole[],
  },
  integrationCredentials: {
    visibleFor:  [] as TenantRole[],
    neverDisplay: true,
    storageNote:  "localStorage apenas em modo standalone; backend Vault no futuro",
  },
  authTokens: {
    clearOnLogout: true,
    neverLog:      true,
    keys:          ["musicos360_rt"],
  },
} as const;
