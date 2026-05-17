import type { ContractVariable, EntityType, Participant, ParticipantRole, VariableCategory } from "@/modules/contracts/types/contracts.types";

const ROLE_LABELS: Record<ParticipantRole, string> = {
  CONTRATANTE: "Contratante",
  CONTRATADO: "Contratado",
  ARTISTA: "Artista",
  PRODUTOR: "Produtor",
  EMPRESA: "Empresa",
  LABEL: "Label",
  EMPRESARIO: "Empresário",
  COMPOSITOR: "Compositor",
  TESTEMUNHA: "Testemunha",
  REPRESENTANTE_LEGAL: "Representante Legal",
};

function prefix(role: ParticipantRole): string {
  return role.replace(/_/g, "_");
}

const PF_FIELDS: Array<{ suffix: string; label: string; example: string; type: ContractVariable["type"] }> = [
  { suffix: "NOME_COMPLETO", label: "Nome Completo", example: "João da Silva", type: "text" },
  { suffix: "NOME_ARTISTICO", label: "Nome Artístico", example: "JoãoArt", type: "text" },
  { suffix: "CPF", label: "CPF", example: "000.000.000-00", type: "text" },
  { suffix: "RG", label: "RG", example: "12.345.678-9", type: "text" },
  { suffix: "DATA_NASCIMENTO", label: "Data de Nascimento", example: "01/01/1990", type: "date" },
  { suffix: "NACIONALIDADE", label: "Nacionalidade", example: "Brasileiro(a)", type: "text" },
  { suffix: "ESTADO_CIVIL", label: "Estado Civil", example: "Solteiro(a)", type: "text" },
  { suffix: "PROFISSAO", label: "Profissão", example: "Músico(a)", type: "text" },
  { suffix: "EMAIL", label: "E-mail", example: "joao@exemplo.com", type: "text" },
  { suffix: "TELEFONE", label: "Telefone", example: "(11) 99999-0000", type: "text" },
  { suffix: "ENDERECO", label: "Endereço", example: "Rua das Flores, 100", type: "text" },
  { suffix: "CIDADE", label: "Cidade", example: "São Paulo", type: "text" },
  { suffix: "ESTADO", label: "Estado", example: "SP", type: "text" },
  { suffix: "CEP", label: "CEP", example: "01000-000", type: "text" },
  { suffix: "PAIS", label: "País", example: "Brasil", type: "text" },
  { suffix: "PIX", label: "Chave PIX", example: "joao@exemplo.com", type: "text" },
  { suffix: "BANCO", label: "Banco", example: "Banco do Brasil", type: "text" },
];

const PJ_FIELDS: Array<{ suffix: string; label: string; example: string; type: ContractVariable["type"] }> = [
  { suffix: "RAZAO_SOCIAL", label: "Razão Social", example: "Empresa Ltda", type: "text" },
  { suffix: "NOME_FANTASIA", label: "Nome Fantasia", example: "Empresa Music", type: "text" },
  { suffix: "CNPJ", label: "CNPJ", example: "00.000.000/0001-00", type: "text" },
  { suffix: "INSCRICAO_ESTADUAL", label: "Inscrição Estadual", example: "123.456.789.000", type: "text" },
  { suffix: "REPRESENTANTE_LEGAL", label: "Representante Legal", example: "Maria Souza", type: "text" },
  { suffix: "CPF_REPRESENTANTE", label: "CPF do Representante", example: "000.000.000-00", type: "text" },
  { suffix: "EMAIL", label: "E-mail", example: "contato@empresa.com", type: "text" },
  { suffix: "TELEFONE", label: "Telefone", example: "(11) 3000-0000", type: "text" },
  { suffix: "ENDERECO", label: "Endereço", example: "Av. Paulista, 1000", type: "text" },
  { suffix: "CIDADE", label: "Cidade", example: "São Paulo", type: "text" },
  { suffix: "ESTADO", label: "Estado", example: "SP", type: "text" },
  { suffix: "CEP", label: "CEP", example: "01310-100", type: "text" },
  { suffix: "PAIS", label: "País", example: "Brasil", type: "text" },
];

export function generateParticipantVariables(role: ParticipantRole, entityType: EntityType): ContractVariable[] {
  const fields = entityType === "pessoa_fisica" ? PF_FIELDS : PJ_FIELDS;
  const p = prefix(role);
  return fields.map((f) => ({
    id: `${p}_${f.suffix}`,
    key: `${p}_${f.suffix}`,
    label: `${ROLE_LABELS[role]} — ${f.label}`,
    type: f.type,
    source: "participant" as const,
    category: "participantes" as VariableCategory,
    required: false,
    example: f.example,
    participantReference: role,
  }));
}

export const SYSTEM_VARIABLES: ContractVariable[] = [
  {
    id: "START_DATE", key: "START_DATE", label: "Data de Início",
    type: "date", source: "system", category: "vigencia",
    required: false, example: "01/01/2025",
  },
  {
    id: "END_DATE", key: "END_DATE", label: "Data de Término",
    type: "date", source: "system", category: "vigencia",
    required: false, example: "31/12/2025",
  },
  {
    id: "DURATION_MONTHS", key: "DURATION_MONTHS", label: "Duração (meses)",
    type: "number", source: "system", category: "vigencia",
    required: false, example: "12",
  },
  {
    id: "FIXED_VALUE", key: "FIXED_VALUE", label: "Valor Fixo",
    type: "currency", source: "financial", category: "financeiro",
    required: false, example: "R$ 5.000,00",
  },
  {
    id: "ROYALTIES_PERCENTAGE", key: "ROYALTIES_PERCENTAGE", label: "Royalties (%)",
    type: "percentage", source: "financial", category: "financeiro",
    required: false, example: "15%",
  },
  {
    id: "ADVANCE_AMOUNT", key: "ADVANCE_AMOUNT", label: "Adiantamento",
    type: "currency", source: "financial", category: "financeiro",
    required: false, example: "R$ 2.000,00",
  },
  {
    id: "FINANCIAL_SUPPORT", key: "FINANCIAL_SUPPORT", label: "Suporte Financeiro Mensal",
    type: "currency", source: "financial", category: "financeiro",
    required: false, example: "R$ 1.500,00",
  },
  {
    id: "PAYMENT_FREQUENCY", key: "PAYMENT_FREQUENCY", label: "Frequência de Pagamento",
    type: "text", source: "financial", category: "financeiro",
    required: false, example: "Mensal",
  },
  {
    id: "WORK_TITLE", key: "WORK_TITLE", label: "Título da Obra",
    type: "text", source: "work", category: "obra_musical",
    required: false, example: "Minha Música",
  },
  {
    id: "WORK_ISRC", key: "WORK_ISRC", label: "ISRC da Obra",
    type: "text", source: "work", category: "obra_musical",
    required: false, example: "BRBMG2400001",
  },
  {
    id: "WORK_GENRE", key: "WORK_GENRE", label: "Gênero Musical",
    type: "text", source: "work", category: "obra_musical",
    required: false, example: "Sertanejo",
  },
  {
    id: "CONTRACT_DATE", key: "CONTRACT_DATE", label: "Data do Contrato",
    type: "date", source: "system", category: "sistema",
    required: false, example: new Date().toLocaleDateString("pt-BR"),
  },
  {
    id: "CONTRACT_CITY", key: "CONTRACT_CITY", label: "Cidade do Contrato",
    type: "text", source: "system", category: "sistema",
    required: false, example: "São Paulo",
  },
  {
    id: "CONTRACT_STATE", key: "CONTRACT_STATE", label: "Estado do Contrato",
    type: "text", source: "system", category: "sistema",
    required: false, example: "SP",
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  participantes: "Participantes",
  financeiro: "Financeiro",
  obra_musical: "Obra Musical",
  vigencia: "Vigência",
  assinatura: "Assinatura",
  sistema: "Sistema",
  personalizada: "Personalizadas",
};

export function resolveAllVariables(participants: Participant[]): ContractVariable[] {
  const participantVars = participants.flatMap((p) =>
    generateParticipantVariables(p.role, p.entityType),
  );
  const all = [...participantVars, ...SYSTEM_VARIABLES];
  const seen = new Set<string>();
  return all.filter((v) => {
    if (seen.has(v.key)) return false;
    seen.add(v.key);
    return true;
  });
}

export const PARTICIPANT_ROLE_OPTIONS: Array<{ value: ParticipantRole; label: string }> = [
  { value: "CONTRATANTE", label: "Contratante" },
  { value: "CONTRATADO", label: "Contratado" },
  { value: "ARTISTA", label: "Artista" },
  { value: "PRODUTOR", label: "Produtor" },
  { value: "EMPRESA", label: "Empresa" },
  { value: "LABEL", label: "Label" },
  { value: "EMPRESARIO", label: "Empresário" },
  { value: "COMPOSITOR", label: "Compositor" },
  { value: "TESTEMUNHA", label: "Testemunha" },
  { value: "REPRESENTANTE_LEGAL", label: "Representante Legal" },
];

export { ROLE_LABELS };
