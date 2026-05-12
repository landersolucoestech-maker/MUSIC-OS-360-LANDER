import { z } from "zod";

// ─── Template ─────────────────────────────────────────────────────────────────

export const templateVariableSchema = z.object({
  key:          z.string().min(1, "Chave obrigatória"),
  label:        z.string().min(1, "Label obrigatório"),
  type:         z.enum(["text", "number", "date", "currency", "select"]),
  required:     z.boolean().default(true),
  options:      z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
  helpText:     z.string().optional(),
});

export const createTemplateSchema = z.object({
  name:         z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description:  z.string().optional(),
  category:     z.enum(["gravacao", "distribuicao", "publishing", "show", "producao", "licenciamento", "outros"]),
  content:      z.string().min(10, "Conteúdo do template é obrigatório"),
  variables:    z.array(templateVariableSchema).default([]),
  signer_roles: z.array(z.enum(["artista", "label", "testemunha", "procurador", "produtor", "advogado"])).min(1, "Pelo menos 1 signatário"),
});

// ─── Wizard Steps ─────────────────────────────────────────────────────────────

// Step 1: Template selection
export const stepTemplateSchema = z.object({
  template_id: z.string().min(1, "Selecione um modelo"),
  title:       z.string().min(2, "Título obrigatório"),
});

// Step 2: Variables
export const stepVariablesSchema = z.object({
  variables: z.record(z.string(), z.string()),
});

// Step 3: Signers
export const signerSchema = z.object({
  role:  z.enum(["artista", "label", "testemunha", "procurador", "produtor", "advogado"]),
  name:  z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  cpf:   z.string().optional(),
});

export const stepSignersSchema = z.object({
  signers: z.array(signerSchema).min(1, "Pelo menos 1 signatário"),
});

// Step 4: Preview (no extra validation)
export const stepPreviewSchema = z.object({});

// Step 5: Review
export const stepReviewSchema = z.object({
  artista_id:  z.string().optional(),
  contract_id: z.string().optional(),
});

// Step 6: Send
export const stepSendSchema = z.object({
  expires_in_days: z.number().min(1).max(365).default(30),
  message:         z.string().optional(),
});

// ─── Document creation ────────────────────────────────────────────────────────

export const createDocumentSchema = z.object({
  template_id:     z.string().min(1),
  title:           z.string().min(2),
  variables:       z.record(z.string(), z.string()),
  signers:         z.array(signerSchema).min(1),
  artista_id:      z.string().optional(),
  contract_id:     z.string().optional(),
  expires_in_days: z.number().min(1).max(365).default(30),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type SignerInput         = z.infer<typeof signerSchema>;
export type StepTemplateInput   = z.infer<typeof stepTemplateSchema>;
export type StepSignersInput    = z.infer<typeof stepSignersSchema>;
export type StepReviewInput     = z.infer<typeof stepReviewSchema>;
export type StepSendInput       = z.infer<typeof stepSendSchema>;
