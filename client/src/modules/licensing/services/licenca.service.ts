/**
 * Service layer do módulo licensing.
 */
import { storage } from "@/shared/lib/storage";
import type { Licenca, LicencaInsert, LicencaUpdate } from "../types";

export const licencaService = {
  async list(): Promise<Licenca[]> {
    return (await storage.list<Licenca & { id: string }>("licencas")) as Licenca[];
  },

  async findById(id: string): Promise<Licenca | undefined> {
    return (await storage.findById<Licenca & { id: string }>("licencas", id)) as Licenca | undefined;
  },

  async findByCliente(clienteId: string): Promise<Licenca[]> {
    return (await storage.list<Licenca & { id: string }>("licencas", {
      filters: { cliente_id: clienteId },
    })) as Licenca[];
  },

  async create(data: LicencaInsert): Promise<Licenca> {
    return (await storage.create<Licenca & { id: string }>(
      "licencas",
      data as Omit<Licenca & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Licenca;
  },

  async update(id: string, data: LicencaUpdate): Promise<Licenca> {
    return (await storage.update<Licenca & { id: string }>(
      "licencas",
      id,
      data as Partial<Licenca & { id: string }>,
    )) as Licenca;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("licencas", id);
  },
};
