// ─── Document Engine v2 — Tipos TypeScript ────────────────────────────────────

export type DocumentStatus =
  | "draft"
  | "pending_signature"
  | "partially_signed"
  | "signed"
  | "cancelled"
  | "expired";

export type SignerRole =
  | "artista"
  | "label"
  | "testemunha"
  | "procurador"
  | "produtor"
  | "advogado";

export type SignerStatus = "pending" | "signed" | "rejected" | "expired";

export type DocumentLogEvent =
  | "created"
  | "template_applied"
  | "sent_for_signature"
  | "signer_viewed"
  | "signer_signed"
  | "signer_rejected"
  | "completed"
  | "cancelled"
  | "expired"
  | "webhook_received";

export type TemplateCategory =
  | "gravacao"
  | "distribuicao"
  | "publishing"
  | "show"
  | "producao"
  | "licenciamento"
  | "outros";

export type WizardStep =
  | "template"
  | "variables"
  | "signers"
  | "preview"
  | "review"
  | "send"
  | "done";

// ─── Template ─────────────────────────────────────────────────────────────────

export interface TemplateVariable {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "currency" | "select";
  required: boolean;
  options?: string[];
  defaultValue?: string;
  helpText?: string;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  content: string;
  created_at: string;
  created_by?: string;
  changelog?: string;
}

export interface DocumentTemplate {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  content: string;
  variables: TemplateVariable[];
  signer_roles: SignerRole[];
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  versions?: TemplateVersion[];
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface DocumentSigner {
  id: string;
  document_id: string;
  role: SignerRole;
  name: string;
  email: string;
  cpf?: string;
  status: SignerStatus;
  signed_at?: string;
  token?: string;
  autentique_signer_id?: string;
  anchor?: string;
}

export interface DocumentLog {
  id: string;
  document_id: string;
  event: DocumentLogEvent;
  payload?: Record<string, unknown>;
  created_at: string;
  user_id?: string;
}

export interface Document {
  id: string;
  org_id: string;
  template_id?: string;
  title: string;
  status: DocumentStatus;
  content_html: string;
  pdf_url?: string;
  autentique_doc_id?: string;
  artista_id?: string;
  contract_id?: string;
  variables: Record<string, string>;
  signers: DocumentSigner[];
  logs: DocumentLog[];
  expires_at?: string;
  signed_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Wizard State ─────────────────────────────────────────────────────────────

export interface WizardState {
  step: WizardStep;
  template?: DocumentTemplate;
  variables: Record<string, string>;
  signers: Omit<DocumentSigner, "id" | "document_id" | "status" | "signed_at" | "token" | "autentique_signer_id">[];
  title: string;
  artista_id?: string;
  contract_id?: string;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateDocumentPayload {
  template_id: string;
  title: string;
  variables: Record<string, string>;
  signers: WizardState["signers"];
  artista_id?: string;
  contract_id?: string;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  category: TemplateCategory;
  content: string;
  variables: TemplateVariable[];
  signer_roles: SignerRole[];
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface ContractReport {
  id: string;
  document_id: string;
  type: "summary" | "audit" | "statement";
  pdf_url: string;
  created_at: string;
}

// ─── Status display helpers ───────────────────────────────────────────────────

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  draft:              "Rascunho",
  pending_signature:  "Aguardando Assinatura",
  partially_signed:   "Parcialmente Assinado",
  signed:             "Assinado",
  cancelled:          "Cancelado",
  expired:            "Expirado",
};

export const SIGNER_STATUS_LABEL: Record<SignerStatus, string> = {
  pending:  "Pendente",
  signed:   "Assinado",
  rejected: "Rejeitado",
  expired:  "Expirado",
};

export const SIGNER_ROLE_LABEL: Record<SignerRole, string> = {
  artista:    "Artista",
  label:      "Gravadora / Label",
  testemunha: "Testemunha",
  procurador: "Procurador",
  produtor:   "Produtor",
  advogado:   "Advogado",
};

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  gravacao:      "Contrato de Gravação",
  distribuicao:  "Contrato de Distribuição",
  publishing:    "Contrato de Publishing",
  show:          "Contrato de Show",
  producao:      "Contrato de Produção",
  licenciamento: "Licenciamento",
  outros:        "Outros",
};

export const WIZARD_STEP_LABEL: Record<WizardStep, string> = {
  template:  "Modelo",
  variables: "Variáveis",
  signers:   "Signatários",
  preview:   "Pré-visualização",
  review:    "Revisão",
  send:      "Enviar",
  done:      "Concluído",
};
