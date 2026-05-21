/**
 * MUSIC OS 360 — Feature Flags
 *
 * Centralizes all feature gate decisions.
 * In standalone/mock mode all flags default to enabled.
 * Future: resolved server-side per tenant plan + overrides.
 */

// ─── Flag definitions ─────────────────────────────────────────────────────────

export interface FeatureFlags {
  // ── Core modules
  moduleArtists:      boolean;
  moduleCatalog:      boolean;
  moduleReleases:     boolean;
  moduleContracts:    boolean;
  moduleAccounting:   boolean;
  moduleCrm:          boolean;
  moduleMarketing:    boolean;
  moduleEvents:       boolean;
  moduleInventory:    boolean;
  moduleRh:           boolean;
  moduleMonitoring:   boolean;
  moduleLicensing:    boolean;
  moduleProjects:     boolean;
  moduleLeads:        boolean;

  // ── Features
  musicChat:          boolean;
  commandPalette:     boolean;
  exportPdf:          boolean;
  importCsv:          boolean;
  bulkActions:        boolean;
  activityFeed:       boolean;
  auditLog:           boolean;

  // ── Integrations
  abramusIntegration: boolean;
  onerpIntegration:   boolean;
  symphonicIntegration: boolean;
  distrokidIntegration: boolean;
  soundonIntegration: boolean;
  musicproIntegration: boolean;
  somvibeIntegration: boolean;
  autentiqueIntegration: boolean;
  spotifyIntegration: boolean;
  youtubeIntegration: boolean;
  metaAdsIntegration: boolean;
  googleIntegration:  boolean;
  tiktokIntegration:  boolean;
  deezerIntegration:  boolean;
  appleMusicIntegration: boolean;
  soundcloudIntegration: boolean;
  resendIntegration:  boolean;
  ecadIntegration:    boolean;

  // ── Future / Gated
  aiFeatures:         boolean;
  multiTenantAdmin:   boolean;
  billingPortal:      boolean;
  storageR2:          boolean;
  rbacAdvanced:       boolean;
  analyticsAdvanced:  boolean;
}

// ─── Default flags (standalone / enterprise plan) ─────────────────────────────

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Core modules — all enabled in enterprise
  moduleArtists:      true,
  moduleCatalog:      true,
  moduleReleases:     true,
  moduleContracts:    true,
  moduleAccounting:   true,
  moduleCrm:          true,
  moduleMarketing:    true,
  moduleEvents:       true,
  moduleInventory:    true,
  moduleRh:           true,
  moduleMonitoring:   true,
  moduleLicensing:    true,
  moduleProjects:     true,
  moduleLeads:        true,

  // Features
  musicChat:          true,
  commandPalette:     true,
  exportPdf:          true,
  importCsv:          true,
  bulkActions:        true,
  activityFeed:       true,
  auditLog:           true,

  // Integrations — only Abramus active in mock
  abramusIntegration:    true,
  onerpIntegration:      false,
  symphonicIntegration:  false,
  distrokidIntegration:  false,
  soundonIntegration:    false,
  musicproIntegration:   false,
  somvibeIntegration:    false,
  autentiqueIntegration: false,
  spotifyIntegration:    false,
  youtubeIntegration:    false,
  metaAdsIntegration:    false,
  googleIntegration:     false,
  tiktokIntegration:     false,
  deezerIntegration:     false,
  appleMusicIntegration: false,
  soundcloudIntegration: false,
  resendIntegration:     false,
  ecadIntegration:       false,

  // Future / Gated — all disabled until backend ready
  aiFeatures:         false,
  multiTenantAdmin:   false,
  billingPortal:      false,
  storageR2:          false,
  rbacAdvanced:       false,
  analyticsAdvanced:  false,
};

/** Plan-scoped flag presets */
export const PLAN_FLAGS: Record<"starter" | "professional" | "enterprise", Partial<FeatureFlags>> = {
  starter: {
    moduleMonitoring:  false,
    moduleLicensing:   false,
    moduleRh:          false,
    auditLog:          false,
    bulkActions:       false,
    analyticsAdvanced: false,
  },
  professional: {
    analyticsAdvanced: false,
    multiTenantAdmin:  false,
  },
  enterprise: {
    // all defaults apply
  },
};

/** Merge plan flags with defaults */
export function resolveFlagsForPlan(
  plan: "starter" | "professional" | "enterprise"
): FeatureFlags {
  return { ...DEFAULT_FEATURE_FLAGS, ...PLAN_FLAGS[plan] };
}
