import type { Lead } from "../types";

const now = new Date().toISOString();

// CORRIGIDO: valores de statusLead alinhados ao STATUS_LEAD_OPTIONS de lead-form-options.ts
// Antes: "negociacao", "proposta" → Agora: "negociacao", "proposta_enviada"
// tipoServico dos seeds mantido como estava (valores do enum LeadServiceType são válidos)
const seedLeads: Lead[] = [
  {
    id: "lead-001",
    nomeCompleto: "Marina Torres",
    nomeArtistico: "Mavi",
    empresa: "Mavi Music",
    email: "marina@mavi.example",
    whatsapp: "+55 11 98888-1000",
    instagram: "@mavioficial",
    cidade: "Sao Paulo",
    estado: "SP",
    pais: "Brasil",
    tipoCliente: "artist",
    tipoServico: "marketingMusical",
    payloadServico: {
      tipo_lead: "artista_banda",
      servico: "marketing_digital",
      descricao: "Campanha de lançamento para single",
      nome_artista_servico: "Mavi",
    },
    dadosInternosCRM: {
      statusLead: "negociacao",
      responsavel: "Comercial A&R",
      prioridade: "alta",
      temperatura: "quente",
      origemLead: "instagram",
      valorEstimado: 18000,
      probabilidadeFechamento: 72,
      proximoFollowUp: "2026-06-02",
      observacoesInternas: "Lead com urgência para calendário de lançamento.",
    },
    uploads: [],
    historicoInteracoes: [
      { id: "int-001", type: "whatsapp", description: "Briefing inicial recebido via WhatsApp.", occurredAt: now },
      { id: "int-002", type: "proposal", description: "Escopo comercial em revisao.", occurredAt: now },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "lead-002",
    nomeCompleto: "Rafael Azevedo",
    empresa: "Azul Eventos",
    email: "rafael@azuleventos.example",
    whatsapp: "+55 21 97777-2000",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    pais: "Brasil",
    tipoCliente: "eventProducer",
    tipoServico: "producaoEvento",
    payloadServico: {
      tipo_lead: "produtora_eventos",
      servico: "contratacao_artistas",
      descricao: "Contratação artística para festival",
      nome_evento: "Festival Azul 2026",
      tipo_evento: "show_publico",
      data_evento: "2026-07-18",
      local_evento: "Parque da Cidade",
      cidade: "Rio de Janeiro",
      estado: "RJ",
      capacidade_publico: "15000",
      nome_artista_banda: "A definir",
      necessidades_adicionais: "",
    },
    dadosInternosCRM: {
      statusLead: "proposta_enviada",
      responsavel: "Shows",
      prioridade: "media",
      temperatura: "morno",
      origemLead: "indicacao",
      valorEstimado: 85000,
      probabilidadeFechamento: 55,
      proximoFollowUp: "2026-06-05",
    },
    uploads: [],
    historicoInteracoes: [
      { id: "int-003", type: "meeting", description: "Reunião de alinhamento com produtor do evento.", occurredAt: now },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

let leads = [...seedLeads];

export const leadsService = {
  async list(): Promise<Lead[]> {
    return [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async create(data: Omit<Lead, "id" | "createdAt" | "updatedAt" | "historicoInteracoes">): Promise<Lead> {
    const createdAt = new Date().toISOString();
    const lead: Lead = {
      ...data,
      id: crypto.randomUUID(),
      historicoInteracoes: [],
      createdAt,
      updatedAt: createdAt,
    };
    leads = [lead, ...leads];
    return lead;
  },
  async update(id: string, data: Partial<Lead>): Promise<Lead> {
    const updatedAt = new Date().toISOString();
    leads = leads.map((lead) => (lead.id === id ? { ...lead, ...data, updatedAt } : lead));
    const updated = leads.find((lead) => lead.id === id);
    if (!updated) throw new Error("Lead não encontrado");
    return updated;
  },
  async remove(id: string): Promise<void> {
    leads = leads.filter((lead) => lead.id !== id);
  },
};
