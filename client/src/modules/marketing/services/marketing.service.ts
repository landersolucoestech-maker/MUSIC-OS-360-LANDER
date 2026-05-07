/**
 * Service layer do módulo marketing.
 * Gerencia campanhas, briefings, conteúdos, metas e tarefas de marketing.
 */
import { storage } from "@/shared/lib/storage";
import type {
  Campanha,
  CampanhaInsert,
  CampanhaUpdate,
  Briefing,
  BriefingInsert,
  BriefingUpdate,
  Conteudo,
  ConteudoInsert,
  ConteudoUpdate,
  Meta,
  MetaInsert,
  MetaUpdate,
  TarefaMarketing,
  TarefaMarketingInsert,
  TarefaMarketingUpdate,
} from "../types";

export const campanhaService = {
  async list(): Promise<Campanha[]> {
    return (await storage.list<Campanha & { id: string }>("campanhas")) as Campanha[];
  },

  async findById(id: string): Promise<Campanha | undefined> {
    return (await storage.findById<Campanha & { id: string }>("campanhas", id)) as Campanha | undefined;
  },

  async create(data: CampanhaInsert): Promise<Campanha> {
    return (await storage.create<Campanha & { id: string }>(
      "campanhas",
      data as Omit<Campanha & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Campanha;
  },

  async update(id: string, data: CampanhaUpdate): Promise<Campanha> {
    return (await storage.update<Campanha & { id: string }>(
      "campanhas",
      id,
      data as Partial<Campanha & { id: string }>,
    )) as Campanha;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("campanhas", id);
  },
};

export const briefingService = {
  async list(): Promise<Briefing[]> {
    return (await storage.list<Briefing & { id: string }>("briefings")) as Briefing[];
  },

  async findById(id: string): Promise<Briefing | undefined> {
    return (await storage.findById<Briefing & { id: string }>("briefings", id)) as Briefing | undefined;
  },

  async create(data: BriefingInsert): Promise<Briefing> {
    return (await storage.create<Briefing & { id: string }>(
      "briefings",
      data as Omit<Briefing & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Briefing;
  },

  async update(id: string, data: BriefingUpdate): Promise<Briefing> {
    return (await storage.update<Briefing & { id: string }>(
      "briefings",
      id,
      data as Partial<Briefing & { id: string }>,
    )) as Briefing;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("briefings", id);
  },
};

export const conteudoService = {
  async list(): Promise<Conteudo[]> {
    return (await storage.list<Conteudo & { id: string }>("conteudos", {
      orderBy: { column: "created_at", ascending: false },
    })) as Conteudo[];
  },

  async create(data: ConteudoInsert): Promise<Conteudo> {
    return (await storage.create<Conteudo & { id: string }>(
      "conteudos",
      data as Omit<Conteudo & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Conteudo;
  },

  async update(id: string, data: ConteudoUpdate): Promise<Conteudo> {
    return (await storage.update<Conteudo & { id: string }>(
      "conteudos",
      id,
      data as Partial<Conteudo & { id: string }>,
    )) as Conteudo;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("conteudos", id);
  },
};

export const metaService = {
  async list(): Promise<Meta[]> {
    return (await storage.list<Meta & { id: string }>("metas_artistas")) as Meta[];
  },

  async findByArtista(artistaId: string): Promise<Meta[]> {
    return (await storage.list<Meta & { id: string }>("metas_artistas", {
      filters: { artista_id: artistaId },
    })) as Meta[];
  },

  async create(data: MetaInsert): Promise<Meta> {
    return (await storage.create<Meta & { id: string }>(
      "metas_artistas",
      data as Omit<Meta & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as Meta;
  },

  async update(id: string, data: MetaUpdate): Promise<Meta> {
    return (await storage.update<Meta & { id: string }>(
      "metas_artistas",
      id,
      data as Partial<Meta & { id: string }>,
    )) as Meta;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("metas_artistas", id);
  },
};

export const tarefaMarketingService = {
  async list(): Promise<TarefaMarketing[]> {
    return (await storage.list<TarefaMarketing & { id: string }>("tarefas_marketing")) as TarefaMarketing[];
  },

  async findByCampanha(campanhaId: string): Promise<TarefaMarketing[]> {
    return (await storage.list<TarefaMarketing & { id: string }>("tarefas_marketing", {
      filters: { campanha_id: campanhaId },
    })) as TarefaMarketing[];
  },

  async create(data: TarefaMarketingInsert): Promise<TarefaMarketing> {
    return (await storage.create<TarefaMarketing & { id: string }>(
      "tarefas_marketing",
      data as Omit<TarefaMarketing & { id: string }, "id" | "user_id" | "created_at" | "updated_at">,
    )) as TarefaMarketing;
  },

  async update(id: string, data: TarefaMarketingUpdate): Promise<TarefaMarketing> {
    return (await storage.update<TarefaMarketing & { id: string }>(
      "tarefas_marketing",
      id,
      data as Partial<TarefaMarketing & { id: string }>,
    )) as TarefaMarketing;
  },

  async delete(id: string): Promise<void> {
    await storage.delete("tarefas_marketing", id);
  },
};
