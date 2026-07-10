// ─────────────────────────────────────────────────────────────────────────────
// SECURITY-SENSITIVE — Auth bypass switch.
//
// AUTH_DISABLED bypasses JwtAuthGuard / TenantGuard / RolesGuard / RateLimitGuard.
// It is honored ONLY when BOTH conditions hold:
//   1. explicit opt-in via env: AUTH_DISABLED=true
//   2. NODE_ENV is exactly 'development'
// Staging/production are ALWAYS fail-closed (guards enforced), regardless of env.
// A hard bootstrap guard in main.ts additionally aborts startup if someone sets
// AUTH_DISABLED=true in production.
// ─────────────────────────────────────────────────────────────────────────────
import { isProdLike } from './config/runtime-environment';

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const IS_DEVELOPMENT = NODE_ENV === 'development' && !isProdLike(NODE_ENV);
const AUTH_DISABLE_REQUESTED = process.env.AUTH_DISABLED === 'true';

export const AUTH_DISABLED = AUTH_DISABLE_REQUESTED && IS_DEVELOPMENT;

if (AUTH_DISABLED) {
  // eslint-disable-next-line no-console
  console.warn(
    `[SECURITY] AUTH_DISABLED is ACTIVE — authentication, tenant and RBAC guards are BYPASSED. ` +
      `Permitted only because NODE_ENV='${NODE_ENV}' (non-production). NEVER enable in production.`,
  );
}

// Tenant/org usados pelo bypass. Sobrescritíveis via env (DEV_TENANT_ID /
// DEV_ORG_ID) para apontar o dev local a um tenant COM dados reais (ex.: o
// tenant de seed/demo). Sem override, mantém o sentinela histórico — um
// workspace vazio, sem linhas no banco. Honrados apenas fora de produção,
// pelas mesmas condições de AUTH_DISABLED acima.
const DEV_TENANT_ID =
  process.env.DEV_TENANT_ID ?? '00000000-0000-4000-8000-000000000001';
const DEV_ORG_ID =
  process.env.DEV_ORG_ID ?? '00000000-0000-4000-8000-000000000001';

export const DEV_AUTH = {
  userId: "dev-auth-disabled-user",
  sessionId: "dev-auth-disabled-session",
  orgId: DEV_ORG_ID,
  orgRole: "owner",
  claims: {
    sub: "dev-auth-disabled-user",
    app_metadata: {
      org_id: DEV_ORG_ID,
      role: "owner",
    },
  },
};

export const DEV_TENANT = {
  id: DEV_TENANT_ID,
  org_id: DEV_ORG_ID,
  external_auth_org_id: DEV_ORG_ID,
  name: "Auth Disabled Workspace",
  slug: "auth-disabled",
  active: true,
  plan: "enterprise",
};

export const DEV_MEMBER = {
  id: "00000000-0000-4000-8000-000000000002",
  tenant_id: DEV_TENANT.id,
  org_id: DEV_TENANT.org_id,
  auth_user_id: DEV_AUTH.userId,
  email: "dev@musicos360.local",
  full_name: "Dev Auth Disabled",
  role: "owner",
  is_active: true,
};
