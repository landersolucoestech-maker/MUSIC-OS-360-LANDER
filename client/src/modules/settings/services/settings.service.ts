/**
 * Service layer do módulo settings.
 * Gerencia configurações da empresa, papéis/permissões e usuários.
 */
import { storage } from "@/shared/lib/storage";
import type { CompanySettings, Role, Permission, TeamMember } from "../types";

export const companySettingsService = {
  async get(): Promise<CompanySettings> {
    return (storage.getRaw<CompanySettings>("company_settings") ?? {}) as CompanySettings;
  },

  async update(data: Partial<CompanySettings>): Promise<CompanySettings> {
    const current = (storage.getRaw<CompanySettings>("company_settings") ?? {}) as CompanySettings;
    const updated = { ...current, ...data } as CompanySettings;
    storage.setRaw("company_settings", updated);
    return updated;
  },
};

export type UsuarioRow = {
  id: string;
  user_id?: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export const usuarioService = {
  async list(): Promise<UsuarioRow[]> {
    return (await storage.list<UsuarioRow & { id: string }>("usuarios")) as UsuarioRow[];
  },

  async create(data: Omit<UsuarioRow, "id" | "user_id" | "created_at" | "updated_at">): Promise<UsuarioRow> {
    return (await storage.create<UsuarioRow & { id: string }>(
      "usuarios",
      data as Omit<UsuarioRow & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as UsuarioRow;
  },

  async update(id: string, data: Partial<UsuarioRow>): Promise<UsuarioRow> {
    return (await storage.update<UsuarioRow & { id: string }>(
      "usuarios",
      id,
      data as Partial<UsuarioRow & { id: string }>,
    )) as UsuarioRow;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("usuarios", id);
  },
};

export const roleService = {
  async listRoles(): Promise<Role[]> {
    return (await storage.list<Record<string, unknown> & { id: string }>("roles")) as unknown as Role[];
  },

  async listPermissions(): Promise<Permission[]> {
    return (await storage.list<Record<string, unknown> & { id: string }>("permissions")) as unknown as Permission[];
  },

  async listMembers(): Promise<TeamMember[]> {
    return (await storage.list<Record<string, unknown> & { id: string }>("org_members")) as unknown as TeamMember[];
  },
};
