import { ValidationError } from "@/shared/lib/errors";
import { STATUS_LEAD_OPTIONS } from "./lead.rules";

export type LeadStatus = (typeof STATUS_LEAD_OPTIONS)[number]["value"];

export interface LeadData {
  id: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  status_lead?: string | null;
  probabilidade?: number | null;
  valor_estimado?: number | null;
  servicos_interesse?: string[] | null;
  origem?: string | null;
  org_id?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export function validateLead(data: Partial<LeadData>): void {
  const errors: Record<string, string> = {};
  if (!data.nome?.trim()) {
    errors.nome = "Nome é obrigatório";
  }
  if (!data.email?.trim() && !data.telefone?.trim()) {
    errors.contato = "Email ou telefone são obrigatórios";
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "E-mail inválido";
  }
  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Dados inválidos para lead", errors);
  }
}

export function buildLeadPayload(
  input: Partial<LeadData>,
): Omit<LeadData, "id" | "created_at" | "updated_at"> {
  validateLead(input);
  return {
    nome: input.nome!.trim(),
    email: input.email?.trim() || null,
    telefone: input.telefone?.trim() || null,
    status_lead: input.status_lead || "novo",
    origem: input.origem || "website",
    probabilidade: input.probabilidade ?? null,
    valor_estimado: input.valor_estimado ?? null,
    servicos_interesse: input.servicos_interesse ?? [],
    org_id: input.org_id || null,
  };
}

export function validateLeadMinimum(data: Partial<LeadData>): string[] {
  const errors: string[] = [];
  if (!data.nome?.trim()) errors.push("Nome é obrigatório");
  if (!data.email?.trim() && !data.telefone?.trim()) {
    errors.push("Email ou telefone são obrigatórios");
  }
  return errors;
}

export function isLeadAtivo(lead: LeadData): boolean {
  return (
    lead.status_lead !== "perdido" &&
    lead.status_lead !== "arquivado" &&
    lead.status_lead !== "fechado"
  );
}

export function isLeadConvertido(lead: LeadData): boolean {
  return lead.status_lead === "fechado" || lead.status_lead === "confirmado";
}

export function getLeadTemperatura(
  probabilidade: number | null | undefined,
): "quente" | "morno" | "frio" {
  const p = probabilidade ?? 0;
  if (p >= 70) return "quente";
  if (p >= 30) return "morno";
  return "frio";
}

export function getLeadStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  const opt = STATUS_LEAD_OPTIONS.find((o) => o.value === status);
  return opt?.label ?? status;
}
