/**
 * STEP 4 + Domain Events — Application Use Case: captureLead
 *
 * Orquestra a captura de um novo lead via formulário público.
 * Emite LEAD_CAPTURED após sucesso.
 */
import { leadService } from "@/modules/crm/services/crm.service";
import { stampTenant } from "@/shared/lib/tenant";
import { getCurrentOrgId } from "@/shared/lib/tenant";
import { validateLeadMinimum } from "../domain/lead.entity";
import { ValidationError } from "@/shared/lib/errors";
import { emit, DomainEvents } from "@/shared/domain-events";
import type { LeadInsert } from "../hooks/useLeads";

// Re-export para compatibilidade
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
  // 1. Validar dados mínimos (invariant de domínio)
  const errors = validateLeadMinimum({
    nome: input.nome,
    email: input.email,
    telefone: input.telefone,
  });
  if (errors.length > 0) {
    throw ValidationError.list(errors);
  }

  // 2. Construir payload com defaults de negócio + tenant stamp
  const payload: LeadInsert = stampTenant({
    nome: input.nome.trim(),
    email: input.email?.trim() || null,
    telefone: input.telefone?.trim() || null,
    servicos_interesse: input.servico ? [input.servico] : [],
    mensagem: input.mensagem || null,
    status_lead: "novo",
    origem: (input.origem || "website") as string,
  } as LeadInsert);

  // 3. Persistir via service
  const created = await leadService.create(payload);
  const id = created.id as string;

  // 4. Emitir evento de domínio
  emit(DomainEvents.LEAD_CAPTURED, {
    id,
    nome: input.nome.trim(),
    org_id: getCurrentOrgId(),
  });

  return { id };
}
