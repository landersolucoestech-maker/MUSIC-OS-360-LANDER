export type PersistedAuthorityMode = 'OFF' | 'SHADOW' | 'ON';

export function getPersistedAuthorityMode(): PersistedAuthorityMode {
  const raw = (process.env['RBAC_PERSISTED_AUTHORITY'] ?? '')
    .trim()
    .toUpperCase();
  if (raw === 'OFF' || raw === 'SHADOW' || raw === 'ON') return raw;
  return process.env['RBAC_PERMISSION_ENFORCEMENT'] === 'true'
    ? 'ON'
    : 'SHADOW';
}

export function isPermissionEnforcementEnabled(): boolean {
  return getPersistedAuthorityMode() === 'ON';
}

