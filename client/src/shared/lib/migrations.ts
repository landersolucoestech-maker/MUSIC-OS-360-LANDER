const MIGRATION_FLAG = "musicos360_migration_v2_done";

const LEGACY_CREDENTIAL_KEYS = [
  "musicos360_spotify_credentials",
  "musicos360_soundcloud_credentials",
  "musicos360_apple_music_credentials",
  "musicos360_tiktok_ads_credentials",
  "musicos360_google_ads_credentials",
  "musicos360_youtube_credentials",
  "musicos360_abramus_credentials",
];

export function runClientMigrations(): void {
  if (sessionStorage.getItem(MIGRATION_FLAG)) return;

  for (const key of LEGACY_CREDENTIAL_KEYS) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }

  sessionStorage.setItem(MIGRATION_FLAG, "1");
}
