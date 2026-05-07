/**
 * Regras de negócio e constantes do domínio RH.
 *
 * Centraliza setores, tipos de contrato, status e regras
 * relacionadas a funcionários e gestão de pessoas.
 */

export const SETORES = [
  "Administrativo",
  "Financeiro",
  "Marketing",
  "Jurídico",
  "Produção Musical",
  "A&R",
  "TI",
  "RH",
  "Comercial",
  "Operações",
] as const;

export const TIPOS_CONTRATO = [
  "CLT",
  "PJ",
  "Freelancer",
  "Estágio",
  "Temporário",
] as const;

export const STATUS_FUNCIONARIO = [
  "ativo",
  "inativo",
  "férias",
  "afastado",
  "desligado",
] as const;

export const TIPOS_AUSENCIA = [
  "férias",
  "licença médica",
  "licença maternidade",
  "licença paternidade",
  "falta justificada",
  "falta injustificada",
  "day off",
  "folga compensatória",
] as const;

export const STATUS_AUSENCIA = [
  "pendente",
  "aprovado",
  "rejeitado",
  "em andamento",
  "concluído",
] as const;

export const TIPOS_DOCUMENTO = [
  "RG",
  "CPF",
  "CTPS",
  "Contrato",
  "Comprovante de Residência",
  "Certidão",
  "Atestado",
  "Diploma",
  "Outro",
] as const;

/** Calcula o salário líquido com descontos INSS simplificado (estimativa). */
export function calcularSalarioLiquido(salarioBruto: number): number {
  if (salarioBruto <= 1412) return salarioBruto * 0.925;
  if (salarioBruto <= 2666.68) return salarioBruto * 0.91;
  if (salarioBruto <= 4000.03) return salarioBruto * 0.88;
  return salarioBruto * 0.855;
}

/** Retorna label de exibição para um setor. */
export function getSetorLabel(setor: string): string {
  return setor || "—";
}

/** Retorna true se o funcionário está ativo. */
export function isFuncionarioAtivo(status: string | null | undefined): boolean {
  return status === "ativo";
}
