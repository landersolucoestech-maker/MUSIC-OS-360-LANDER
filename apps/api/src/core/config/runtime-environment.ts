export function isProdLike(environment: string | null | undefined): boolean {
  const env = (environment ?? 'development').trim().toLowerCase();
  return env === 'production' || env === 'staging';
}
