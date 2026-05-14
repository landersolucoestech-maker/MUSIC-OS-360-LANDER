interface MigrationStep {
  version: number;
  keysToRemove: string[];
}

const MIGRATIONS: MigrationStep[] = [
  {
    version: 2,
    keysToRemove: [
      "musicos360_spotify_credentials",
      "musicos360_soundcloud_credentials",
      "musicos360_apple_music_credentials",
      "musicos360_tiktok_ads_credentials",
      "musicos360_google_ads_credentials",
      "musicos360_youtube_credentials",
      "musicos360_abramus_credentials",
    ],
  },
  // To add a new migration wave, append a new entry here:
  // { version: 3, keysToRemove: ["musicos360_some_old_key"] },
];

function migrationFlag(version: number): string {
  return `musicos360_migration_v${version}_done`;
}

export function runClientMigrations(): void {
  for (const step of MIGRATIONS) {
    const flag = migrationFlag(step.version);
    if (sessionStorage.getItem(flag)) continue;

    for (const key of step.keysToRemove) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }

    sessionStorage.setItem(flag, "1");
  }
}
