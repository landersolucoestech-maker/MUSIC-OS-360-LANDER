export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  ARTIST: "ARTIST",
  MARKETING: "MARKETING",
  RADIO: "RADIO",
  TV: "TV",
  FINANCIAL: "FINANCIAL",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 90,
  MANAGER: 70,
  FINANCIAL: 60,
  MARKETING: 50,
  RADIO: 40,
  TV: 40,
  ARTIST: 30,
};

export function hasMinimumRole(userRole: Role, required: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}
