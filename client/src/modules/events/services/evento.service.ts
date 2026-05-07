/**
 * Service layer do módulo events.
 */
import { storage } from "@/shared/lib/storage";
import type { Evento, EventoInsert, EventoUpdate } from "../types";

export const eventoService = {
  async list(): Promise<Evento[]> {
    return (await storage.list<Evento & { id: string }>("eventos", {
      orderBy: { column: "data_inicio", ascending: true },
    })) as Evento[];
  },

  async findById(id: string): Promise<Evento | undefined> {
    return (await storage.findById<Evento & { id: string }>("eventos", id)) as Evento | undefined;
  },

  async findByArtista(artistaId: string): Promise<Evento[]> {
    return (await storage.list<Evento & { id: string }>("eventos", {
      filters: { artista_id: artistaId },
      orderBy: { column: "data_inicio", ascending: true },
    })) as Evento[];
  },

  async create(data: EventoInsert): Promise<Evento> {
    return (await storage.create<Evento & { id: string }>(
      "eventos",
      data as Omit<Evento & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Evento;
  },

  async update(id: string, data: EventoUpdate): Promise<Evento> {
    return (await storage.update<Evento & { id: string }>(
      "eventos",
      id,
      data as Partial<Evento & { id: string }>,
    )) as Evento;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("eventos", id);
  },
};
