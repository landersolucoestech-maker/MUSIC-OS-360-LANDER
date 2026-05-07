/**
 * Service layer do módulo projects.
 */
import { storage } from "@/shared/lib/storage";
import type { Projeto, ProjetoInsert, ProjetoUpdate } from "../types";

export const projetoService = {
  async list(): Promise<Projeto[]> {
    return (await storage.list<Projeto & { id: string }>("projetos")) as Projeto[];
  },

  async findById(id: string): Promise<Projeto | undefined> {
    return (await storage.findById<Projeto & { id: string }>("projetos", id)) as Projeto | undefined;
  },

  async findByArtista(artistaId: string): Promise<Projeto[]> {
    return (await storage.list<Projeto & { id: string }>("projetos", {
      filters: { artista_id: artistaId },
    })) as Projeto[];
  },

  async create(data: ProjetoInsert): Promise<Projeto> {
    return (await storage.create<Projeto & { id: string }>(
      "projetos",
      data as Omit<Projeto & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Projeto;
  },

  async update(id: string, data: ProjetoUpdate): Promise<Projeto> {
    return (await storage.update<Projeto & { id: string }>(
      "projetos",
      id,
      data as Partial<Projeto & { id: string }>,
    )) as Projeto;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("projetos", id);
  },
};
