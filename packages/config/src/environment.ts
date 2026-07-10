export type RuntimeEnvironment = string | null | undefined;

export function normalizeEnvironment(environment: RuntimeEnvironment): string {
  return (environment ?? "development").trim().toLowerCase();
}

export function isProdLike(environment: RuntimeEnvironment): boolean {
  const env = normalizeEnvironment(environment);
  return env === "production" || env === "staging";
}
