/**
 * Regras de negócio do domínio Marketing.
 */

export const CAMPANHA_STATUS = {
  PLANEJAMENTO: "planejamento",
  ATIVA: "ativa",
  PAUSADA: "pausada",
  CONCLUIDA: "concluida",
  CANCELADA: "cancelada",
} as const;

export const CAMPANHA_TIPO = [
  "Digital",
  "Lançamento",
  "Promoção",
  "Branding",
  "Engajamento",
  "Conversão",
  "Outro",
] as const;

export const CONTEUDO_STATUS = [
  "rascunho",
  "aprovado",
  "agendado",
  "publicado",
  "arquivado",
] as const;

export const PLATAFORMAS_CONTEUDO = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Facebook",
  "Twitter/X",
  "LinkedIn",
  "Spotify",
  "Outro",
] as const;

export const META_TIPO = [
  "Streams",
  "Seguidores",
  "Ouvintes Mensais",
  "Inscritos",
  "Visualizações",
  "Engajamento",
  "Shows",
  "Receita",
  "Outro",
] as const;

/** Calcula o percentual de progresso de uma meta. */
export function calcularProgressoMeta(valorAtual: number, valorMeta: number): number {
  if (valorMeta <= 0) return 0;
  return Math.min(100, Math.round((valorAtual / valorMeta) * 100));
}

/** Retorna o status de saúde de uma campanha com base no gasto vs orçamento. */
export function getCampanhaHealthStatus(
  gasto: number | null,
  orcamento: number | null,
): "ok" | "warning" | "critical" {
  if (!orcamento || orcamento <= 0) return "ok";
  const ratio = (gasto ?? 0) / orcamento;
  if (ratio > 0.9) return "critical";
  if (ratio > 0.7) return "warning";
  return "ok";
}
