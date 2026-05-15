/**
 * Service layer do módulo crm.
 * Gerencia leads, clientes, contatos e interações.
 */
import { storage } from "@/shared/lib/storage";
import type {
  Lead,
  LeadInsert,
  LeadUpdate,
  Cliente,
  ClienteInsert,
  ClienteUpdate,
  Contato,
  ContatoInsert,
  ContatoUpdate,
  LeadInteraction,
  LeadInteractionInsert,
} from "../types";
import { getProbabilidadeForStatus } from "../domain/lead.rules";

export const leadService = {
  async list(): Promise<Lead[]> {
    return (await storage.list<Lead & { id: string }>("leads", {
      orderBy: { column: "created_at", ascending: false },
    })) as Lead[];
  },

  async findById(id: string): Promise<Lead | undefined> {
    return (await storage.findById<Lead & { id: string }>("leads", id)) as Lead | undefined;
  },

  async create(data: LeadInsert): Promise<Lead> {
    return (await storage.create<Lead & { id: string }>(
      "leads",
      data as Omit<Lead & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Lead;
  },

  async update(id: string, data: LeadUpdate): Promise<Lead> {
    const enriched: LeadUpdate = { ...data };
    if (data.status_lead !== undefined) {
      enriched.probabilidade = getProbabilidadeForStatus(
        (data.status_lead as string | null) ?? "",
        (data.probabilidade as number | null) ?? null,
      );
    }
    return (await storage.update<Lead & { id: string }>(
      "leads",
      id,
      enriched as Partial<Lead & { id: string }>,
    )) as Lead;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("leads", id);
  },
};

export const clienteService = {
  async list(): Promise<Cliente[]> {
    return (await storage.list<Cliente & { id: string }>("clientes")) as Cliente[];
  },

  async findById(id: string): Promise<Cliente | undefined> {
    return (await storage.findById<Cliente & { id: string }>("clientes", id)) as Cliente | undefined;
  },

  async create(data: ClienteInsert): Promise<Cliente> {
    return (await storage.create<Cliente & { id: string }>(
      "clientes",
      data as Omit<Cliente & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Cliente;
  },

  async update(id: string, data: ClienteUpdate): Promise<Cliente> {
    return (await storage.update<Cliente & { id: string }>(
      "clientes",
      id,
      data as Partial<Cliente & { id: string }>,
    )) as Cliente;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("clientes", id);
  },
};

export const contatoService = {
  async list(): Promise<Contato[]> {
    return (await storage.list<Contato & { id: string }>("contatos")) as Contato[];
  },

  async findById(id: string): Promise<Contato | undefined> {
    return (await storage.findById<Contato & { id: string }>("contatos", id)) as Contato | undefined;
  },

  async create(data: ContatoInsert): Promise<Contato> {
    return (await storage.create<Contato & { id: string }>(
      "contatos",
      data as Omit<Contato & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Contato;
  },

  async update(id: string, data: ContatoUpdate): Promise<Contato> {
    return (await storage.update<Contato & { id: string }>(
      "contatos",
      id,
      data as Partial<Contato & { id: string }>,
    )) as Contato;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("contatos", id);
  },
};

export const leadInteractionService = {
  async list(): Promise<LeadInteraction[]> {
    return (await storage.list<LeadInteraction & { id: string }>("lead_interactions")) as LeadInteraction[];
  },

  async listByLead(leadId: string): Promise<LeadInteraction[]> {
    return (await storage.list<LeadInteraction & { id: string }>("lead_interactions", {
      filters: { lead_id: leadId },
      orderBy: { column: "data_interacao", ascending: false },
    })) as LeadInteraction[];
  },

  async create(data: LeadInteractionInsert): Promise<LeadInteraction> {
    return (await storage.create<LeadInteraction & { id: string }>(
      "lead_interactions",
      data as Omit<LeadInteraction & { id: string }, "id" | "user_id" | "created_at">,
    )) as LeadInteraction;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("lead_interactions", id);
  },
};
