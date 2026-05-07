/**
 * Regras de negócio e constantes do domínio Lead.
 *
 * Centraliza toda a lógica de negócio relacionada a leads:
 * opções de status, origem, prioridade, probabilidade etc.
 * Importar daqui em vez de dispersar regras nos hooks/componentes.
 */

export const TIPO_LEAD_OPTIONS = [
  { value: "artista_banda", label: "Artista / Banda" },
  { value: "contratante_show", label: "Contratante de Show" },
  { value: "marca_empresa", label: "Marca / Empresa" },
  { value: "produtora_eventos", label: "Produtora de Eventos" },
  { value: "gravadora_selo", label: "Gravadora / Selo" },
  { value: "agencia", label: "Agência" },
  { value: "influenciador", label: "Influenciador" },
  { value: "outros", label: "Outros" },
] as const;

export const STATUS_LEAD_OPTIONS = [
  { value: "novo", label: "Novo Lead" },
  { value: "qualificado", label: "Qualificado" },
  { value: "contato_realizado", label: "Em Contato" },
  { value: "proposta_enviada", label: "Proposta Enviada" },
  { value: "negociacao", label: "Negociação" },
  { value: "followup", label: "Follow-Up" },
  { value: "confirmado", label: "Confirmado" },
  { value: "fechado", label: "Fechado (Conversão)" },
  { value: "perdido", label: "Perdido" },
  { value: "arquivado", label: "Arquivado" },
] as const;

export const ORIGEM_LEAD_OPTIONS = [
  { value: "site", label: "Website" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google_ads", label: "Google Ads" },
  { value: "instagram_ads", label: "Instagram Ads" },
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "google_search", label: "Google Search" },
  { value: "indicacao", label: "Indicação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "evento", label: "Evento" },
  { value: "parceria", label: "Parceria" },
  { value: "prospeccao_ativa", label: "Prospecção Ativa" },
  { value: "telefone", label: "Telefone" },
  { value: "email", label: "Email" },
  { value: "outro", label: "Outro" },
] as const;

export const PRIORIDADE_OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
] as const;

export const TIPO_CONTRATO_OPTIONS = [
  { value: "show", label: "Show" },
  { value: "festival", label: "Festival" },
  { value: "corporativo", label: "Corporativo" },
  { value: "streaming", label: "Streaming" },
  { value: "gravacao", label: "Gravação" },
  { value: "publicidade", label: "Publicidade" },
  { value: "licenciamento", label: "Licenciamento" },
  { value: "distribuicao", label: "Distribuição" },
  { value: "gestao_360", label: "Gestão 360°" },
  { value: "producao", label: "Produção" },
  { value: "outro", label: "Outro" },
] as const;

export const SERVICOS_LABEL_MAP: Record<string, string> = {
  gestao_360: "Gestão 360°",
  distribuicao_digital: "Distribuição Digital",
  producao_musical: "Produção Musical",
  marketing_digital: "Marketing Digital",
  gestao_show: "Gestão de Show",
  licenciamento: "Licenciamento",
  assessoria_juridica: "Assessoria Jurídica",
  producao_audiovisual: "Produção Audiovisual",
  branding: "Branding / Identidade Visual",
  assessoria_imprensa: "Assessoria de Imprensa",
};

export const ESTRUTURA_EVENTO_OPTIONS = [
  { value: "palco", label: "Palco" },
  { value: "som", label: "Som" },
  { value: "iluminacao", label: "Iluminação" },
  { value: "backline", label: "Backline" },
  { value: "led", label: "LED" },
  { value: "streaming", label: "Streaming" },
] as const;

export const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUS_LEAD_OPTIONS.map((o) => [o.value, o.label]),
);

export const ORIGEM_LABELS: Record<string, string> = Object.fromEntries(
  ORIGEM_LEAD_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Calcula a probabilidade de fechamento com base no status do lead.
 * Aplicada automaticamente ao atualizar o status via leadService.update.
 */
export function getProbabilidadeForStatus(
  status: string,
  current: number | null,
): number {
  if (status === "fechado" || status === "confirmado") return 100;
  if (status === "perdido") return 0;
  if (status === "arquivado") return 0;
  return current ?? 10;
}

export const TIPO_INTERACAO_OPTIONS = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "reuniao", label: "Reunião" },
  { value: "proposta", label: "Proposta Enviada" },
  { value: "followup", label: "Follow-up" },
] as const;

export const TIPO_INTERACAO_LABELS: Record<string, string> = Object.fromEntries(
  TIPO_INTERACAO_OPTIONS.map((o) => [o.value, o.label]),
);
