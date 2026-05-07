/**
 * Regras de negócio do domínio Monitoring.
 */

export const TAKEDOWN_STATUS = {
  PENDENTE: "pendente",
  EM_ANDAMENTO: "em_andamento",
  CONCLUIDO: "concluido",
  REJEITADO: "rejeitado",
  CANCELADO: "cancelado",
} as const;

export const PLATAFORMAS_MONITORAMENTO = [
  "YouTube",
  "Spotify",
  "SoundCloud",
  "Deezer",
  "Apple Music",
  "TikTok",
  "Instagram",
  "Facebook",
  "Twitter/X",
  "Outro",
] as const;

export const MOTIVOS_TAKEDOWN = [
  "Uso não autorizado",
  "Violação de direitos autorais",
  "Conteúdo falso/adulterado",
  "Outro",
] as const;

export const REGRA_TIPO = {
  DETECCAO: "deteccao",
  ALERTA: "alerta",
  BLOQUEIO: "bloqueio",
} as const;

/** Retorna o label de cor para o status do takedown. */
export function getTakedownStatusColor(status: string | null | undefined): string {
  switch (status) {
    case TAKEDOWN_STATUS.CONCLUIDO:
      return "green";
    case TAKEDOWN_STATUS.EM_ANDAMENTO:
      return "blue";
    case TAKEDOWN_STATUS.PENDENTE:
      return "yellow";
    case TAKEDOWN_STATUS.REJEITADO:
    case TAKEDOWN_STATUS.CANCELADO:
      return "red";
    default:
      return "gray";
  }
}

/** Retorna true se o takedown precisa de ação. */
export function requiresAction(status: string | null | undefined): boolean {
  return status === TAKEDOWN_STATUS.PENDENTE || status === TAKEDOWN_STATUS.EM_ANDAMENTO;
}
