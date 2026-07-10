import { getAccessToken } from "@/shared/lib/api-client";

function decodeOrgId(): string {
  const token = getAccessToken();
  if (!token) return "";
  try {
    const payload = token.split(".")[1];
    const p = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    return typeof p["org_id"] === "string" ? p["org_id"] : "";
  } catch {
    return "";
  }
}

export function getCurrentOrgId(): string {
  return decodeOrgId();
}

export function withTenantFilter<T extends Record<string, unknown>>(
  filters?: T,
): T & { org_id?: string } {
  return (filters ?? {}) as T & { org_id?: string };
}

export function assertTenantScope(
  _record: { org_id?: string | null },
  _context = "record",
): void {
  return;
}

export function stampTenant<T extends Record<string, unknown>>(
  data: T,
): T & { org_id?: string } {
  return data;
}
