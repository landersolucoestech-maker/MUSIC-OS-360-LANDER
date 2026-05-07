/**
 * Service layer do módulo monitoring.
 * Gerencia takedowns, detecções, regras e relatórios ECAD.
 */
import { storage } from "@/shared/lib/storage";
import type {
  Takedown,
  TakedownInsert,
  TakedownUpdate,
  Regra,
  RegraInsert,
  RegraUpdate,
  RelatorioECAD,
  RelatorioECADInsert,
  RelatorioECADUpdate,
} from "../types";

export const takedownService = {
  async list(): Promise<Takedown[]> {
    return (await storage.list<Takedown & { id: string }>("takedowns")) as Takedown[];
  },

  async findById(id: string): Promise<Takedown | undefined> {
    return (await storage.findById<Takedown & { id: string }>("takedowns", id)) as Takedown | undefined;
  },

  async create(data: TakedownInsert): Promise<Takedown> {
    return (await storage.create<Takedown & { id: string }>(
      "takedowns",
      data as Omit<Takedown & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Takedown;
  },

  async update(id: string, data: TakedownUpdate): Promise<Takedown> {
    return (await storage.update<Takedown & { id: string }>(
      "takedowns",
      id,
      data as Partial<Takedown & { id: string }>,
    )) as Takedown;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("takedowns", id);
  },
};

export const regraService = {
  async list(): Promise<Regra[]> {
    return (await storage.list<Regra & { id: string }>("regras")) as Regra[];
  },

  async create(data: RegraInsert): Promise<Regra> {
    return (await storage.create<Regra & { id: string }>(
      "regras",
      data as Omit<Regra & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Regra;
  },

  async update(id: string, data: RegraUpdate): Promise<Regra> {
    return (await storage.update<Regra & { id: string }>(
      "regras",
      id,
      data as Partial<Regra & { id: string }>,
    )) as Regra;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("regras", id);
  },
};

export const relatorioECADService = {
  async list(): Promise<RelatorioECAD[]> {
    return (await storage.list<RelatorioECAD & { id: string }>("relatorios_ecad")) as RelatorioECAD[];
  },

  async create(data: RelatorioECADInsert): Promise<RelatorioECAD> {
    return (await storage.create<RelatorioECAD & { id: string }>(
      "relatorios_ecad",
      data as Omit<RelatorioECAD & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as RelatorioECAD;
  },

  async update(id: string, data: RelatorioECADUpdate): Promise<RelatorioECAD> {
    return (await storage.update<RelatorioECAD & { id: string }>(
      "relatorios_ecad",
      id,
      data as Partial<RelatorioECAD & { id: string }>,
    )) as RelatorioECAD;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("relatorios_ecad", id);
  },
};

export type Deteccao = {
  id: string;
  user_id?: string;
  titulo?: string | null;
  obra_id?: string | null;
  fonograma_id?: string | null;
  plataforma?: string | null;
  url?: string | null;
  status?: string | null;
  data_deteccao?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export const deteccaoService = {
  async list(): Promise<Deteccao[]> {
    return (await storage.list<Deteccao & { id: string }>("deteccoes")) as Deteccao[];
  },

  async create(data: Omit<Deteccao, "id" | "user_id" | "created_at" | "updated_at">): Promise<Deteccao> {
    return (await storage.create<Deteccao & { id: string }>(
      "deteccoes",
      data as Omit<Deteccao & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Deteccao;
  },

  async update(id: string, data: Partial<Deteccao>): Promise<Deteccao> {
    return (await storage.update<Deteccao & { id: string }>(
      "deteccoes",
      id,
      data as Partial<Deteccao & { id: string }>,
    )) as Deteccao;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("deteccoes", id);
  },
};
