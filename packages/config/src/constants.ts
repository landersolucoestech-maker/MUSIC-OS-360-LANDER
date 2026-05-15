// ─── App constants ────────────────────────────────────────────────────────────

export const APP_NAME = "MUSIC OS 360";
export const APP_TAGLINE = "ERP OPERACIONAL MUSICAL";
export const APP_VERSION = "1.0.0";

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const STORAGE_PREFIX = "musicos360_";
export const MOCK_DATA_KEY = `${STORAGE_PREFIX}mock_data`;
export const THEME_KEY = `${STORAGE_PREFIX}theme`;
export const SIDEBAR_STATE_KEY = `${STORAGE_PREFIX}sidebar_state`;

// ─── Auth cookie names ────────────────────────────────────────────────────────

export const ACCESS_TOKEN_COOKIE = "musicos360_at";
export const REFRESH_TOKEN_COOKIE = "musicos360_rt";

// ─── API defaults ─────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

// ─── Cache TTLs (ms) ──────────────────────────────────────────────────────────

export const CACHE_TIMES = {
  SHORT: 30_000,
  MEDIUM: 5 * 60_000,
  LONG: 30 * 60_000,
  STATIC: 24 * 60 * 60_000,
} as const;

// ─── Upload limits ────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE_MB = 100;
export const MAX_IMAGE_SIZE_MB = 10;
export const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "audio/aac"];
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ─── CustomEvent names ────────────────────────────────────────────────────────

export const EVENTS = {
  AUTH_LOGOUT: "musicos360:auth:logout",
  TENANT_CHANGED: "musicos360:tenant:changed",
  MOCK_DATA_RESET: "musicos360:mock:reset",
} as const;
