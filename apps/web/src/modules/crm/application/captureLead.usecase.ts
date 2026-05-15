import { leadService } from "../services/crm.service";
import { stampTenant } from "@/shared/lib/tenant";
import { getCurrentOrgId } from "@/shared/lib/tenant";
import { validateLeadMinimum } from "../domain/lead.entity";
import { ValidationError } from "@/shared/lib/errors";
import { emit, DomainEvents } from "@/shared/domain-events";
import type { LeadInsert } from "../hooks/useLeads";

export { ValidationError as LeadValidationError };

export interface CaptureLeadInput {
  nome: string;
  email?: string;
  telefone?: string;
  servico?: string;
  mensagem?: string;
  origem?: string;
}

export async function captureLeadUseCase(
  input: CaptureLeadInput,
): Promise<{ id: string }> {
  const errors = validateLeadMinimum({
    nome: input.nome,
    email: input.email,
    telefone: input.telefone,
  });
  if (errors.length > 0) {
    throw ValidationError.list(errors);
  }

  const payload: LeadInsert = stampTenant({
    nome: input.nome.trim(),
    email: input.email?.trim() || null,
    telefone: input.telefone?.trim() || null,
    servicos_interesse: input.servico ? [input.servico] : [],
    mensagem: input.mensagem || null,
    status_lead: "novo",
    origem: (input.origem || "website") as string,
  } as LeadInsert);

  const created = await leadService.create(payload);
  const id = created.id as string;

  emit(DomainEvents.LEAD_CAPTURED, {
    id,
    nome: input.nome.trim(),
    org_id: getCurrentOrgId(),
  });

  return { id };
}
