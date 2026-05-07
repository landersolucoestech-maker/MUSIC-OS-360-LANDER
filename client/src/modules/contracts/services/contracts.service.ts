/**
 * Service layer do módulo contracts.
 * Gerencia contratos e templates de contratos.
 */
import { storage } from "@/shared/lib/storage";
import type {
  Contrato,
  ContratoInsert,
  ContratoUpdate,
  TemplateContrato,
  TemplateContratoInsert,
  TemplateContratoUpdate,
} from "../types";

export const contratoService = {
  async list(): Promise<Contrato[]> {
    return (await storage.list<Contrato & { id: string }>("contratos")) as Contrato[];
  },

  async findById(id: string): Promise<Contrato | undefined> {
    return (await storage.findById<Contrato & { id: string }>("contratos", id)) as Contrato | undefined;
  },

  async findByArtista(artistaId: string): Promise<Contrato[]> {
    return (await storage.list<Contrato & { id: string }>("contratos", {
      filters: { artista_id: artistaId },
    })) as Contrato[];
  },

  async create(data: ContratoInsert): Promise<Contrato> {
    return (await storage.create<Contrato & { id: string }>(
      "contratos",
      data as Omit<Contrato & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Contrato;
  },

  async update(id: string, data: ContratoUpdate): Promise<Contrato> {
    return (await storage.update<Contrato & { id: string }>(
      "contratos",
      id,
      data as Partial<Contrato & { id: string }>,
    )) as Contrato;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("contratos", id);
  },
};

export const templateContratoService = {
  async list(): Promise<TemplateContrato[]> {
    return (await storage.list<TemplateContrato & { id: string }>("templates_contratos")) as TemplateContrato[];
  },

  async findById(id: string): Promise<TemplateContrato | undefined> {
    return (await storage.findById<TemplateContrato & { id: string }>("templates_contratos", id)) as TemplateContrato | undefined;
  },

  async create(data: TemplateContratoInsert): Promise<TemplateContrato> {
    return (await storage.create<TemplateContrato & { id: string }>(
      "templates_contratos",
      data as Omit<TemplateContrato & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as TemplateContrato;
  },

  async update(id: string, data: TemplateContratoUpdate): Promise<TemplateContrato> {
    return (await storage.update<TemplateContrato & { id: string }>(
      "templates_contratos",
      id,
      data as Partial<TemplateContrato & { id: string }>,
    )) as TemplateContrato;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("templates_contratos", id);
  },
};
