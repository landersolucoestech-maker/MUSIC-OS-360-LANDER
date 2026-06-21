import type { Contact } from "../types";
import type { ContatoFormPayload } from "../modals/ContatoFormModal";

const now = new Date().toISOString();

/**
 * Converte o payload emitido pelo `ContatoFormModal` no objeto de criação/edição
 * de um `Contact`. Fonte ÚNICA de verdade para essa transformação — usada tanto
 * pelo painel CRM > Contatos quanto pelo vínculo de contatos no cadastro de
 * artista (EquipeContatosCRM), evitando lógica duplicada.
 */
export function contatoPayloadToContactData(
  payload: ContatoFormPayload,
): Omit<Contact, "id" | "createdAt" | "updatedAt"> {
  const isIndividual = payload.tipo_pessoa === "pessoa_fisica";
  return {
    name: isIndividual ? payload.nome_pf || "" : payload.razao_social || "",
    companyName: !isIndividual ? payload.razao_social : undefined,
    contactType: (payload.categoria || "OTHER") as Contact["contactType"],
    documentType: isIndividual ? "CPF" : "CNPJ",
    documentNumber: isIndividual ? payload.cpf : payload.cnpj,
    phone: payload.telefone,
    whatsapp: payload.telefone,
    email: payload.email,
    instagram: payload.instagram || undefined,
    address: payload.endereco_completo,
    city: payload.cidade,
    state: payload.estado,
    country: "Brasil",
    zipCode: payload.cep,
    responsible: payload.responsavel_nome,
    notes: payload.observacoes,
    tags: [],
    status: (payload.status_contato || "active") as Contact["status"],
    priority: (payload.prioridade_contato || "medium") as Contact["priority"],
    payloadOperacional: {
      tipo_pessoa: payload.tipo_pessoa,
      perfil: payload.perfil ?? "",
      cpf: payload.cpf,
      cnpj: payload.cnpj,
      razao_social: payload.razao_social,
      nome_fantasia: payload.nome_fantasia,
      funcao: payload.funcao,
      foto: payload.foto,
      cep: payload.cep,
      logradouro: payload.logradouro,
      numero: payload.numero,
      complemento: payload.complemento,
      bairro: payload.bairro,
      responsavel_nome: payload.responsavel_nome,
      responsavel_email: payload.responsavel_email,
      responsavel_telefone: payload.responsavel_telefone,
      responsavel_cargo: payload.responsavel_cargo,
      interacoes: payload.interacoes,
    },
    attachments: payload.attachments ?? [],
    timeline: [],
  };
}

let contacts: Contact[] = [
  {
    id: "contact-001",
    name: "Casa Aurora",
    companyName: "Aurora Live",
    contactType: "VENUE",
    phone: "+55 11 3333-1000",
    whatsapp: "+55 11 98888-3000",
    email: "booking@auroralive.example",
    instagram: "@auroralive",
    website: "https://auroralive.example",
    address: "Rua Harmonia, 100",
    city: "Sao Paulo",
    state: "SP",
    country: "Brasil",
    responsible: "Operações",
    notes: "Venue estratégico para showcases e ativações de marca.",
    tags: ["showcase", "venue", "sp"],
    status: "favorite",
    priority: "strategic",
    payloadOperacional: { capacity: 1200, technicalContact: "Mesa e luz próprios" },
    attachments: [],
    timeline: [
      { id: "timeline-001", type: "meeting", summary: "Reunião de alinhamento para calendário de shows.", occurredAt: now },
      { id: "timeline-002", type: "contract", summary: "Minuta de parceria em análise.", occurredAt: now },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "contact-002",
    name: "Lia Campos",
    companyName: "Beat Press",
    contactType: "PRESS",
    email: "lia@beatpress.example",
    whatsapp: "+55 21 97777-4000",
    instagram: "@liacampos",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    responsible: "PR",
    tags: ["imprensa", "release", "rj"],
    status: "active",
    priority: "high",
    payloadOperacional: { editorialBeat: "Música independente, cultura e festivais" },
    attachments: [],
    timeline: [{ id: "timeline-003", type: "email", summary: "Release enviado para pauta de junho.", occurredAt: now }],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "contact-003",
    name: "João Silva",
    contactType: "PHOTOGRAPHER",
    phone: "(31) 99999-1111",
    whatsapp: "(31) 99999-1111",
    email: "joao.silva@fotos.example",
    city: "Belo Horizonte",
    state: "MG",
    country: "Brasil",
    responsible: "Operações",
    tags: ["fotografia", "ensaios"],
    status: "active",
    priority: "medium",
    payloadOperacional: { tipo_pessoa: "pessoa_fisica", funcao: "Fotógrafo" },
    attachments: [],
    timeline: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "contact-004",
    name: "Maria Santos",
    contactType: "PRESS_OFFICE",
    phone: "(11) 98888-2222",
    whatsapp: "(11) 98888-2222",
    email: "maria@assessoria.example",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
    responsible: "PR",
    tags: ["imprensa", "assessoria"],
    status: "active",
    priority: "high",
    payloadOperacional: { tipo_pessoa: "pessoa_fisica", funcao: "Assessora de Imprensa" },
    attachments: [],
    timeline: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "contact-005",
    name: "Pedro Costa",
    contactType: "VIDEOMAKER",
    phone: "(21) 97777-3333",
    whatsapp: "(21) 97777-3333",
    email: "pedro@video.example",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    responsible: "Operações",
    tags: ["video", "clipes"],
    status: "active",
    priority: "medium",
    payloadOperacional: { tipo_pessoa: "pessoa_fisica", funcao: "Videomaker" },
    attachments: [],
    timeline: [],
    createdAt: now,
    updatedAt: now,
  },
];

export const contactsService = {
  async list(): Promise<Contact[]> {
    return [...contacts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async listSimple(): Promise<{ id: string; name: string }[]> {
    return [...contacts]
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
      .map((contact) => ({ id: contact.id, name: contact.name }));
  },
  async create(data: Omit<Contact, "id" | "createdAt" | "updatedAt">): Promise<Contact> {
    const createdAt = new Date().toISOString();
    const contact: Contact = { ...data, id: crypto.randomUUID(), createdAt, updatedAt: createdAt };
    contacts = [contact, ...contacts];
    return contact;
  },
  async update(id: string, data: Partial<Contact>): Promise<Contact> {
    const updatedAt = new Date().toISOString();
    contacts = contacts.map((contact) => (contact.id === id ? { ...contact, ...data, updatedAt } : contact));
    const contact = contacts.find((item) => item.id === id);
    if (!contact) throw new Error("Contato não encontrado");
    return contact;
  },
  async remove(id: string): Promise<void> {
    contacts = contacts.filter((contact) => contact.id !== id);
  },
};
