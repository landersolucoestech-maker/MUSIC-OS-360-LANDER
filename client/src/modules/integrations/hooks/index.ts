/**
 * modules/integrations/hooks/index.ts
 *
 * Barrel de todos os hooks de integração.
 *
 * Organização por categoria:
 *   - Auth              → useClerk
 *   - Storage           → useR2
 *   - Email             → useResend
 *   - Payments          → useStripe
 *   - Signing           → useAutentique
 *   - App Monitoring    → usePostHog, useSentry
 *   - Streaming/Ads     → useSpotify, useYouTube, useTikTok,
 *                         useInstagram, useGoogleAds,
 *                         useDeezer, useAppleMusic, useSoundCloud
 *   - Rights            → useEcad, useUbc, useAbramus
 *   - Music Monitoring  → useACRCloud
 *   - Chat              → useChat
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────
export * from "./useClerk";

// ─── Storage ──────────────────────────────────────────────────────────────────
export * from "./useR2";

// ─── Email ────────────────────────────────────────────────────────────────────
export * from "./useResend";

// ─── Payments ─────────────────────────────────────────────────────────────────
export * from "./useStripe";

// ─── Signing ──────────────────────────────────────────────────────────────────
export * from "./useAutentique";

// ─── App Monitoring ───────────────────────────────────────────────────────────
export * from "./usePostHog";
export * from "./useSentry";

// ─── Streaming & Ads ──────────────────────────────────────────────────────────
export * from "./useSpotify";
export * from "./useYouTube";
export * from "./useTikTok";
export * from "./useInstagram";
export * from "./useGoogleAds";
export * from "./useDeezer";
export * from "./useAppleMusic";
export * from "./useSoundCloud";

// ─── Rights (ECAD · UBC · ABRAMUS) ───────────────────────────────────────────
export * from "./useEcad";
export * from "./useUbc";
export * from "./useAbramus";

// ─── Music Monitoring (ACRCloud) ──────────────────────────────────────────────
export * from "./useACRCloud";

// ─── Chat ─────────────────────────────────────────────────────────────────────
export * from "./useChat";
