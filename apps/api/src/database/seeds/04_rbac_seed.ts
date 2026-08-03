/**
 * seeds/04_rbac_seed.ts  (FASE 8 — RBAC Enterprise)
 *
 * Popula o catálogo GLOBAL de autorização (tenant-independente):
 *   - permissions     → união das chaves resource:action da matriz legada ROLE_PERMISSIONS;
 *   - roles           → garante os 20 roles globais (idempotente; preserva hierarchy_level);
 *   - role_permissions → derivado EXATAMENTE de ROLE_PERMISSIONS, garantindo paridade.
 *
 * Aliases (artista→artist, tenant_owner→owner) NÃO recebem role_permissions próprias:
 * herdam do canônico via roles.canonical_role_id (resolvido na FASE 5).
 *
 * Idempotente: pode rodar N vezes sem duplicar. Não cria roles custom.
 */
import { DataSource } from 'typeorm';
import { ROLE_PERMISSIONS, ROLE_HIERARCHY } from '../../core/rbac/rbac.service';

/** Aliases → role canônico. Excluídos do seed de role_permissions (herdam do canônico). */
const ALIASES: Record<string, string> = {
  artista: 'artist',
  tenant_owner: 'owner',
};

/** Nomes PT-BR dos roles globais (alinhado à migration M2). */
const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Super Administrador',
  tenant_owner: 'Proprietário do Tenant',
  owner: 'Proprietário',
  admin: 'Administrador',
  manager: 'Gerente',
  editor: 'Editor',
  financial: 'Financeiro',
  accounting: 'Contabilidade',
  juridico: 'Jurídico',
  marketing_manager: 'Gerente de Marketing',
  rh_manager: 'Gerente de RH',
  marketing: 'Marketing',
  comercial: 'Comercial',
  produtor: 'Produtor',
  radio: 'Rádio',
  tv: 'TV',
  artist: 'Artista',
  artista: 'Artista (legado)',
  colaborador: 'Colaborador',
  viewer: 'Visualizador',
};

const NON_ASSIGNABLE = new Set<string>(['super_admin']);

const FINANCIAL_PERMISSION_GRANTS: Record<string, string[]> = {
  'financial_category:read': [
    'super_admin', 'owner', 'admin', 'manager', 'editor', 'financial', 'accounting',
    'juridico', 'marketing_manager', 'marketing', 'comercial', 'produtor', 'radio',
    'tv', 'artist', 'colaborador', 'rh_manager', 'viewer',
  ],
  'financial_category:create': ['super_admin', 'owner', 'admin', 'manager', 'editor', 'financial', 'accounting'],
  'financial_category:update': ['super_admin', 'owner', 'admin', 'manager', 'editor', 'financial', 'accounting'],
  'financial_category:delete': ['super_admin', 'owner', 'admin', 'manager'],
  'financial_category:reorder': ['super_admin', 'owner', 'admin', 'manager', 'editor', 'financial', 'accounting'],

  'financial_rule:read': [
    'super_admin', 'owner', 'admin', 'manager', 'editor', 'financial', 'accounting',
    'juridico', 'marketing_manager', 'marketing', 'comercial', 'produtor', 'radio',
    'tv', 'artist', 'colaborador', 'rh_manager', 'viewer',
  ],
  'financial_rule:create': ['super_admin', 'owner', 'admin', 'manager'],
  'financial_rule:update': ['super_admin', 'owner', 'admin', 'manager'],
  'financial_rule:delete': ['super_admin', 'owner', 'admin'],
  'financial_rule:trigger': ['super_admin', 'owner', 'admin', 'manager', 'editor', 'financial', 'accounting'],
};

// Listas de roles por limiar de hierarquia legada (canônicos; aliases herdam do canônico).
//   viewer+    (nível >= 10) = todos os roles canônicos
//   financial+ (nível >= 60) = super_admin..accounting
//   manager+   (nível >= 70) = super_admin..manager
const VIEWER_PLUS = [
  'super_admin', 'owner', 'admin', 'manager', 'editor', 'financial', 'accounting',
  'juridico', 'marketing_manager', 'marketing', 'comercial', 'produtor', 'radio',
  'tv', 'artist', 'colaborador', 'rh_manager', 'viewer',
];
const FINANCIAL_PLUS = ['super_admin', 'owner', 'admin', 'manager', 'editor', 'financial', 'accounting'];
const MANAGER_PLUS = ['super_admin', 'owner', 'admin', 'manager'];

// FASE 8.3: permissões de transactions/invoices em paridade com o baseline @RequireRole dos
// controllers (read→viewer+, create/update→financial+, cancel→manager+). DELETE não é mapeado:
// a rota DELETE tem semântica de cancelamento/soft delete → usa-se *:cancel, não *:delete.
const TRANSACTION_INVOICE_PERMISSION_GRANTS: Record<string, string[]> = {
  'transaction:read': VIEWER_PLUS,
  'transaction:create': FINANCIAL_PLUS,
  'transaction:update': FINANCIAL_PLUS,
  'transaction:cancel': MANAGER_PLUS,
  'invoice:read': VIEWER_PLUS,
  'invoice:create': FINANCIAL_PLUS,
  'invoice:update': FINANCIAL_PLUS,
  'invoice:cancel': MANAGER_PLUS,
};

// FASE 8.4: permissões de contracts/contract-templates em paridade com o baseline @RequireRole
// dos controllers (read→viewer+, create/update→editor+, cancel/archive→manager+).
// editor+ (nível >= 60) é exatamente o mesmo conjunto que financial+ (editor e financial = nível 60).
// DELETE não vira *:delete: a semântica é cancelamento (contract) / arquivamento (template).
const EDITOR_PLUS = FINANCIAL_PLUS;
const CONTRACT_PERMISSION_GRANTS: Record<string, string[]> = {
  'contract:read': VIEWER_PLUS,
  'contract:create': EDITOR_PLUS,
  'contract:update': EDITOR_PLUS,
  'contract:cancel': MANAGER_PLUS,
  'contract_template:read': VIEWER_PLUS,
  'contract_template:create': EDITOR_PLUS,
  'contract_template:update': EDITOR_PLUS,
  'contract_template:archive': MANAGER_PLUS,
  'contract_service_type:read': VIEWER_PLUS,
  'contract_service_type:create': EDITOR_PLUS,
  'contract_service_type:update': EDITOR_PLUS,
  'contract_service_type:archive': MANAGER_PLUS,
};

// FASE 8.5: fecha o GAP crítico catálogo×controller. CRUD granular dos controllers já migrados
// (works/phonograms/shares/clients/contacts/leads/lead-interactions/licensing/events/projects/
// artist-goals) em paridade EXATA com o @RequireRole de cada rota:
//   read→viewer+, create/update→editor+, delete→manager+.
// Exceções derivadas dos controllers (fonte da verdade): contact não tem rota DELETE;
// lead_interaction não tem rota PATCH/update → não recebem essas chaves.
const GRANULAR_CRUD_PERMISSION_GRANTS: Record<string, string[]> = {
  'work:read': VIEWER_PLUS, 'work:create': EDITOR_PLUS, 'work:update': EDITOR_PLUS, 'work:delete': MANAGER_PLUS,
  'phonogram:read': VIEWER_PLUS, 'phonogram:create': EDITOR_PLUS, 'phonogram:update': EDITOR_PLUS, 'phonogram:delete': MANAGER_PLUS,
  'share:read': VIEWER_PLUS, 'share:create': EDITOR_PLUS, 'share:update': EDITOR_PLUS, 'share:delete': MANAGER_PLUS,
  'client:read': VIEWER_PLUS, 'client:create': EDITOR_PLUS, 'client:update': EDITOR_PLUS, 'client:delete': MANAGER_PLUS,
  'contact:read': VIEWER_PLUS, 'contact:create': EDITOR_PLUS, 'contact:update': EDITOR_PLUS,
  'lead:read': VIEWER_PLUS, 'lead:create': EDITOR_PLUS, 'lead:update': EDITOR_PLUS, 'lead:delete': MANAGER_PLUS,
  'lead_interaction:read': VIEWER_PLUS, 'lead_interaction:create': EDITOR_PLUS, 'lead_interaction:delete': MANAGER_PLUS,
  'license:read': VIEWER_PLUS, 'license:create': EDITOR_PLUS, 'license:update': EDITOR_PLUS, 'license:delete': MANAGER_PLUS,
  'event:read': VIEWER_PLUS, 'event:create': EDITOR_PLUS, 'event:update': EDITOR_PLUS, 'event:delete': MANAGER_PLUS,
  'project:read': VIEWER_PLUS, 'project:create': EDITOR_PLUS, 'project:update': EDITOR_PLUS, 'project:delete': MANAGER_PLUS,
  'artist_goal:read': VIEWER_PLUS, 'artist_goal:create': EDITOR_PLUS, 'artist_goal:update': EDITOR_PLUS, 'artist_goal:delete': MANAGER_PLUS,
};

// FASE 8.6: realinha a DISTRIBUIÇÃO de artist:* e inventory:* ao baseline @RequireRole dos seus
// controllers (read→viewer+, create/update→editor+, delete→manager+). Essas permissões já existem
// no catálogo (vindas da matriz legada com distribuição mais estreita); aqui apenas COMPLEMENTAMOS
// os grants faltantes via ON CONFLICT DO NOTHING. Nenhuma permissão nova é criada; nada é removido.
const ARTIST_INVENTORY_PERMISSION_GRANTS: Record<string, string[]> = {
  'artist:read': VIEWER_PLUS, 'artist:create': EDITOR_PLUS, 'artist:update': EDITOR_PLUS, 'artist:delete': MANAGER_PLUS,
  'inventory:read': VIEWER_PLUS, 'inventory:create': EDITOR_PLUS, 'inventory:update': EDITOR_PLUS, 'inventory:delete': MANAGER_PLUS,
};

export interface RbacSeedResult {
  permissions: number;
  roles: number;
  rolePermissions: number;
}

export async function seedRbac(ds: DataSource): Promise<RbacSeedResult> {
  // ── 1) permissions: catálogo = união das chaves da matriz legada ────────────
  const keys = new Set<string>();
  for (const perms of Object.values(ROLE_PERMISSIONS)) {
    for (const key of perms) keys.add(key);
  }
  for (const key of Object.keys(FINANCIAL_PERMISSION_GRANTS)) {
    keys.add(key);
  }
  for (const key of Object.keys(TRANSACTION_INVOICE_PERMISSION_GRANTS)) {
    keys.add(key);
  }
  for (const key of Object.keys(CONTRACT_PERMISSION_GRANTS)) {
    keys.add(key);
  }
  for (const key of Object.keys(GRANULAR_CRUD_PERMISSION_GRANTS)) {
    keys.add(key);
  }
  for (const key of keys) {
    const [resource, action] = key.split(':');
    await ds.query(
      `INSERT INTO "permissions" ("resource", "action", "key")
       VALUES ($1, $2, $3)
       ON CONFLICT ("resource", "action") DO NOTHING`,
      [resource, action, key],
    );
  }

  // ── 2) roles: garante os 20 globais (idempotente; preserva hierarchy_level) ──
  for (const slug of Object.keys(ROLE_HIERARCHY)) {
    const level = ROLE_HIERARCHY[slug];
    const name = ROLE_NAMES[slug] ?? slug;
    const assignable = !NON_ASSIGNABLE.has(slug);
    await ds.query(
      `INSERT INTO "roles" ("tenant_id", "slug", "name", "hierarchy_level", "is_system", "is_assignable")
       SELECT NULL::uuid, $1::varchar, $2::varchar, $3::int, TRUE, $4::boolean
       WHERE NOT EXISTS (
         SELECT 1 FROM "roles" WHERE "slug" = $1::varchar AND "tenant_id" IS NULL AND "deleted_at" IS NULL
       )`,
      [slug, name, level, assignable],
    );
  }

  // ── 2b) aliases → canonical_role_id ─────────────────────────────────────────
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    await ds.query(
      `UPDATE "roles" a
          SET "canonical_role_id" = c."id"
         FROM "roles" c
        WHERE a."slug" = $1 AND c."slug" = $2
          AND a."tenant_id" IS NULL AND c."tenant_id" IS NULL
          AND a."canonical_role_id" IS NULL`,
      [alias, canonical],
    );
  }

  // ── 3) role_permissions: paridade EXATA com ROLE_PERMISSIONS (exceto aliases) ─
  for (const [slug, perms] of Object.entries(ROLE_PERMISSIONS)) {
    if (ALIASES[slug]) continue; // alias herda do canônico
    for (const key of perms) {
      await ds.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT r."id", p."id"
           FROM "roles" r, "permissions" p
          WHERE r."slug" = $1 AND r."tenant_id" IS NULL AND r."deleted_at" IS NULL
            AND p."key" = $2
         ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
        [slug, key],
      );
    }
  }

  // FASE 8.1: permissões financeiras incrementais sem alterar a matriz legada.
  for (const [key, slugs] of Object.entries(FINANCIAL_PERMISSION_GRANTS)) {
    for (const slug of slugs) {
      if (ALIASES[slug]) continue; // aliases herdam do canônico
      await ds.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT r."id", p."id"
           FROM "roles" r, "permissions" p
          WHERE r."slug" = $1 AND r."tenant_id" IS NULL AND r."deleted_at" IS NULL
            AND p."key" = $2
         ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
        [slug, key],
      );
    }
  }

  // FASE 8.3: permissões de transactions/invoices em paridade com o baseline dos controllers.
  for (const [key, slugs] of Object.entries(TRANSACTION_INVOICE_PERMISSION_GRANTS)) {
    for (const slug of slugs) {
      if (ALIASES[slug]) continue; // aliases herdam do canônico
      await ds.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT r."id", p."id"
           FROM "roles" r, "permissions" p
          WHERE r."slug" = $1 AND r."tenant_id" IS NULL AND r."deleted_at" IS NULL
            AND p."key" = $2
         ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
        [slug, key],
      );
    }
  }

  // FASE 8.4: permissões de contracts/contract-templates em paridade com o baseline dos controllers.
  for (const [key, slugs] of Object.entries(CONTRACT_PERMISSION_GRANTS)) {
    for (const slug of slugs) {
      if (ALIASES[slug]) continue; // aliases herdam do canônico
      await ds.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT r."id", p."id"
           FROM "roles" r, "permissions" p
          WHERE r."slug" = $1 AND r."tenant_id" IS NULL AND r."deleted_at" IS NULL
            AND p."key" = $2
         ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
        [slug, key],
      );
    }
  }

  // FASE 8.5: CRUD granular dos controllers migrados (fecha o gap catálogo×controller).
  for (const [key, slugs] of Object.entries(GRANULAR_CRUD_PERMISSION_GRANTS)) {
    for (const slug of slugs) {
      if (ALIASES[slug]) continue; // aliases herdam do canônico
      await ds.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT r."id", p."id"
           FROM "roles" r, "permissions" p
          WHERE r."slug" = $1 AND r."tenant_id" IS NULL AND r."deleted_at" IS NULL
            AND p."key" = $2
         ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
        [slug, key],
      );
    }
  }

  // FASE 8.6: realinhamento de distribuição de artist:* e inventory:* (complementa grants faltantes).
  for (const [key, slugs] of Object.entries(ARTIST_INVENTORY_PERMISSION_GRANTS)) {
    for (const slug of slugs) {
      if (ALIASES[slug]) continue; // aliases herdam do canônico
      await ds.query(
        `INSERT INTO "role_permissions" ("role_id", "permission_id")
         SELECT r."id", p."id"
           FROM "roles" r, "permissions" p
          WHERE r."slug" = $1 AND r."tenant_id" IS NULL AND r."deleted_at" IS NULL
            AND p."key" = $2
         ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
        [slug, key],
      );
    }
  }

  const [{ permissions }] = (await ds.query(`SELECT count(*)::int AS permissions FROM "permissions"`)) as Array<{ permissions: number }>;
  const [{ roles }] = (await ds.query(`SELECT count(*)::int AS roles FROM "roles" WHERE "tenant_id" IS NULL`)) as Array<{ roles: number }>;
  const [{ rolepermissions }] = (await ds.query(`SELECT count(*)::int AS rolepermissions FROM "role_permissions"`)) as Array<{ rolepermissions: number }>;

  return { permissions, roles, rolePermissions: rolepermissions };
}
