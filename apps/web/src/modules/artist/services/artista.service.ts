/**
 * Service layer do módulo artist.
 * Ponto de acesso exclusivo ao storage para dados de artistas.
 * Ao conectar um backend real, substitua as implementações aqui.
 */
import { storage } from "@/shared/lib/storage";
import type { Artista, ArtistaInsert, ArtistaUpdate } from "../types/artista.types";

export const artistaService = {
  async list(): Promise<Artista[]> {
    return (await storage.list<Artista & { id: string }>("artistas")) as Artista[];
  },

  async findById(id: string): Promise<Artista | undefined> {
    return (await storage.findById<Artista & { id: string }>("artistas", id)) as Artista | undefined;
  },

  async create(data: ArtistaInsert): Promise<Artista> {
    return (await storage.create<Artista & { id: string }>(
      "artistas",
      data as Omit<Artista & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Artista;
  },

  async update(id: string, data: ArtistaUpdate): Promise<Artista> {
    return (await storage.update<Artista & { id: string }>(
      "artistas",
      id,
      data as Partial<Artista & { id: string }>,
    )) as Artista;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("artistas", id);
  },
};
