/**
 * Service layer do módulo catalog.
 * Gerencia obras, fonogramas e shares.
 */
import { storage } from "@/shared/lib/storage";
import type {
  Obra,
  ObraInsert,
  ObraUpdate,
  Fonograma,
  FonogramaInsert,
  FonogramaUpdate,
  Share,
  ShareInsert,
  ShareUpdate,
} from "../types";

export const obraService = {
  async list(): Promise<Obra[]> {
    return (await storage.list<Obra & { id: string }>("obras")) as Obra[];
  },

  async findById(id: string): Promise<Obra | undefined> {
    return (await storage.findById<Obra & { id: string }>("obras", id)) as Obra | undefined;
  },

  async findByArtista(artistaId: string): Promise<Obra[]> {
    return (await storage.list<Obra & { id: string }>("obras", {
      filters: { artista_id: artistaId },
    })) as Obra[];
  },

  async create(data: ObraInsert): Promise<Obra> {
    return (await storage.create<Obra & { id: string }>(
      "obras",
      data as Omit<Obra & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Obra;
  },

  async update(id: string, data: ObraUpdate): Promise<Obra> {
    return (await storage.update<Obra & { id: string }>(
      "obras",
      id,
      data as Partial<Obra & { id: string }>,
    )) as Obra;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("obras", id);
  },
};

export const fonogramaService = {
  async list(): Promise<Fonograma[]> {
    return (await storage.list<Fonograma & { id: string }>("fonogramas")) as Fonograma[];
  },

  async findById(id: string): Promise<Fonograma | undefined> {
    return (await storage.findById<Fonograma & { id: string }>("fonogramas", id)) as Fonograma | undefined;
  },

  async findByObra(obraId: string): Promise<Fonograma[]> {
    return (await storage.list<Fonograma & { id: string }>("fonogramas", {
      filters: { obra_id: obraId },
    })) as Fonograma[];
  },

  async create(data: FonogramaInsert): Promise<Fonograma> {
    return (await storage.create<Fonograma & { id: string }>(
      "fonogramas",
      data as Omit<Fonograma & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Fonograma;
  },

  async update(id: string, data: FonogramaUpdate): Promise<Fonograma> {
    return (await storage.update<Fonograma & { id: string }>(
      "fonogramas",
      id,
      data as Partial<Fonograma & { id: string }>,
    )) as Fonograma;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("fonogramas", id);
  },
};

export const shareService = {
  async list(): Promise<Share[]> {
    return (await storage.list<Share & { id: string }>("shares")) as Share[];
  },

  async findByObra(obraId: string): Promise<Share[]> {
    return (await storage.list<Share & { id: string }>("shares", {
      filters: { obra_id: obraId },
    })) as Share[];
  },

  async create(data: ShareInsert): Promise<Share> {
    return (await storage.create<Share & { id: string }>(
      "shares",
      data as Omit<Share & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Share;
  },

  async update(id: string, data: ShareUpdate): Promise<Share> {
    return (await storage.update<Share & { id: string }>(
      "shares",
      id,
      data as Partial<Share & { id: string }>,
    )) as Share;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("shares", id);
  },
};
