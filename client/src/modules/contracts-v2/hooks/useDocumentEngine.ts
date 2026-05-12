import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type {
  Document,
  DocumentTemplate,
  CreateDocumentPayload,
  CreateTemplatePayload,
  WizardState,
  WizardStep,
} from "../types";

// ─── Mock data (MOCK_MODE standalone) ─────────────────────────────────────────

const MOCK_TEMPLATES: DocumentTemplate[] = [
  {
    id: "tpl-001",
    org_id: "ten-gravadora-exemplo-001",
    name: "Contrato de Gravação Exclusiva",
    description: "Modelo padrão para contrato de gravação exclusiva entre artista e gravadora.",
    category: "gravacao",
    content: `
      <h1>CONTRATO DE GRAVAÇÃO EXCLUSIVA</h1>
      <p>Entre <strong>{{NOME_LABEL}}</strong> (CNPJ: {{CNPJ_LABEL}}) e <strong>{{NOME_ARTISTA}}</strong> (CPF: {{CPF_ARTISTA}}),</p>
      <p>fica acordado o contrato de gravação exclusiva pelo período de <strong>{{VIGENCIA}}</strong> anos,
      com royalty de <strong>{{ROYALTY}}%</strong> sobre todas as receitas.</p>
      <br/>
      <p>[ASSIN_ARTISTA]</p>
      <p>[ASSIN_LABEL]</p>
    `,
    variables: [
      { key: "NOME_LABEL",    label: "Nome da Gravadora", type: "text",     required: true },
      { key: "CNPJ_LABEL",    label: "CNPJ da Gravadora", type: "text",     required: true },
      { key: "NOME_ARTISTA",  label: "Nome do Artista",   type: "text",     required: true },
      { key: "CPF_ARTISTA",   label: "CPF do Artista",    type: "text",     required: true },
      { key: "VIGENCIA",      label: "Vigência (anos)",   type: "number",   required: true },
      { key: "ROYALTY",       label: "Royalty (%)",       type: "number",   required: true },
    ],
    signer_roles: ["artista", "label"],
    is_active: true,
    version: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "tpl-002",
    org_id: "ten-gravadora-exemplo-001",
    name: "Contrato de Show",
    description: "Contrato para realização de show ao vivo.",
    category: "show",
    content: `
      <h1>CONTRATO DE APRESENTAÇÃO ARTÍSTICA</h1>
      <p>Contratante: <strong>{{NOME_CONTRATANTE}}</strong></p>
      <p>Artista: <strong>{{NOME_ARTISTA}}</strong></p>
      <p>Data do show: <strong>{{DATA_SHOW}}</strong></p>
      <p>Local: <strong>{{LOCAL_SHOW}}</strong></p>
      <p>Cachê: <strong>{{CACHE}}</strong></p>
      <br/>
      <p>[ASSIN_ARTISTA]</p>
      <p>[ASSIN_LABEL]</p>
      <p>[ASSIN_TESTEMUNHA]</p>
    `,
    variables: [
      { key: "NOME_CONTRATANTE", label: "Nome do Contratante", type: "text",     required: true },
      { key: "NOME_ARTISTA",     label: "Nome do Artista",     type: "text",     required: true },
      { key: "DATA_SHOW",        label: "Data do Show",        type: "date",     required: true },
      { key: "LOCAL_SHOW",       label: "Local do Show",       type: "text",     required: true },
      { key: "CACHE",            label: "Cachê (R$)",          type: "currency", required: true },
    ],
    signer_roles: ["artista", "label", "testemunha"],
    is_active: true,
    version: 1,
    created_at: "2026-01-10T00:00:00.000Z",
    updated_at: "2026-01-10T00:00:00.000Z",
  },
];

const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc-001",
    org_id: "ten-gravadora-exemplo-001",
    template_id: "tpl-001",
    title: "Contrato de Gravação — MC Levi",
    status: "signed",
    content_html: "<p>Contrato assinado.</p>",
    variables: { NOME_ARTISTA: "MC Levi", ROYALTY: "15" },
    signers: [
      { id: "sgn-001", document_id: "doc-001", role: "artista",    name: "MC Levi",            email: "mc.levi@email.com",        status: "signed", signed_at: "2026-03-15T14:22:00.000Z" },
      { id: "sgn-002", document_id: "doc-001", role: "label",      name: "Gravadora Exemplo",  email: "contratos@gravadora.com",  status: "signed", signed_at: "2026-03-15T15:00:00.000Z" },
    ],
    logs: [
      { id: "log-001", document_id: "doc-001", event: "created",           created_at: "2026-03-10T09:00:00.000Z" },
      { id: "log-002", document_id: "doc-001", event: "sent_for_signature", created_at: "2026-03-12T10:00:00.000Z" },
      { id: "log-003", document_id: "doc-001", event: "completed",          created_at: "2026-03-15T15:00:00.000Z" },
    ],
    signed_at:  "2026-03-15T15:00:00.000Z",
    created_at: "2026-03-10T09:00:00.000Z",
    updated_at: "2026-03-15T15:00:00.000Z",
  },
  {
    id: "doc-002",
    org_id: "ten-gravadora-exemplo-001",
    template_id: "tpl-002",
    title: "Contrato de Show — Ana Lima / São Paulo",
    status: "pending_signature",
    content_html: "<p>Aguardando assinaturas.</p>",
    variables: { NOME_ARTISTA: "Ana Lima", DATA_SHOW: "2026-06-15", LOCAL_SHOW: "Vibra São Paulo", CACHE: "35000" },
    signers: [
      { id: "sgn-003", document_id: "doc-002", role: "artista",    name: "Ana Lima",           email: "ana.lima@email.com",       status: "signed",  signed_at: "2026-05-10T09:00:00.000Z" },
      { id: "sgn-004", document_id: "doc-002", role: "label",      name: "Gravadora Exemplo",  email: "contratos@gravadora.com",  status: "pending"  },
    ],
    logs: [
      { id: "log-004", document_id: "doc-002", event: "created",            created_at: "2026-05-08T09:00:00.000Z" },
      { id: "log-005", document_id: "doc-002", event: "sent_for_signature",  created_at: "2026-05-09T10:00:00.000Z" },
      { id: "log-006", document_id: "doc-002", event: "signer_signed",       created_at: "2026-05-10T09:00:00.000Z" },
    ],
    created_at: "2026-05-08T09:00:00.000Z",
    updated_at: "2026-05-10T09:00:00.000Z",
  },
];

const STORAGE_KEY = "musicos360_contracts_v2";

function loadDocuments(): Document[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Document[]) : MOCK_DOCUMENTS;
  } catch {
    return MOCK_DOCUMENTS;
  }
}

function saveDocuments(docs: Document[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const CONTRACTS_V2_KEYS = {
  templates: ["contracts-v2", "templates"] as const,
  template:  (id: string) => ["contracts-v2", "templates", id] as const,
  documents: ["contracts-v2", "documents"] as const,
  document:  (id: string) => ["contracts-v2", "documents", id] as const,
};

// ─── Hooks — Templates ────────────────────────────────────────────────────────

export function useDocumentTemplates() {
  return useQuery({
    queryKey: CONTRACTS_V2_KEYS.templates,
    queryFn:  async (): Promise<DocumentTemplate[]> => MOCK_TEMPLATES,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDocumentTemplate(id: string) {
  return useQuery({
    queryKey: CONTRACTS_V2_KEYS.template(id),
    queryFn:  async (): Promise<DocumentTemplate | undefined> =>
      MOCK_TEMPLATES.find(t => t.id === id),
    enabled:  !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload): Promise<DocumentTemplate> => {
      const tpl: DocumentTemplate = {
        ...payload,
        id:         `tpl-${Date.now()}`,
        org_id:     "ten-gravadora-exemplo-001",
        is_active:  true,
        version:    1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_TEMPLATES.push(tpl);
      return tpl;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CONTRACTS_V2_KEYS.templates });
    },
  });
}

// ─── Hooks — Documents ────────────────────────────────────────────────────────

export function useDocuments() {
  return useQuery({
    queryKey: CONTRACTS_V2_KEYS.documents,
    queryFn:  async (): Promise<Document[]> => loadDocuments(),
    staleTime: 1000 * 30,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: CONTRACTS_V2_KEYS.document(id),
    queryFn:  async (): Promise<Document | undefined> =>
      loadDocuments().find(d => d.id === id),
    enabled:  !!id,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDocumentPayload): Promise<Document> => {
      const docs = loadDocuments();
      const template = MOCK_TEMPLATES.find(t => t.id === payload.template_id);
      const doc: Document = {
        id:           `doc-${Date.now()}`,
        org_id:       "ten-gravadora-exemplo-001",
        template_id:  payload.template_id,
        title:        payload.title,
        status:       "draft",
        content_html: template?.content ?? "",
        variables:    payload.variables,
        artista_id:   payload.artista_id,
        contract_id:  payload.contract_id,
        signers:      payload.signers.map((s, i) => ({
          ...s,
          id:          `sgn-${Date.now()}-${i}`,
          document_id: `doc-${Date.now()}`,
          status:      "pending" as const,
        })),
        logs: [{
          id:          `log-${Date.now()}`,
          document_id: `doc-${Date.now()}`,
          event:       "created" as const,
          created_at:  new Date().toISOString(),
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      docs.push(doc);
      saveDocuments(docs);
      return doc;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CONTRACTS_V2_KEYS.documents });
    },
  });
}

export function useSendForSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string): Promise<Document> => {
      const docs = loadDocuments();
      const idx = docs.findIndex(d => d.id === documentId);
      if (idx === -1) throw new Error("Documento não encontrado");
      docs[idx] = {
        ...docs[idx],
        status:     "pending_signature",
        updated_at: new Date().toISOString(),
        logs: [
          ...(docs[idx].logs ?? []),
          { id: `log-${Date.now()}`, document_id: documentId, event: "sent_for_signature", created_at: new Date().toISOString() },
        ],
      };
      saveDocuments(docs);
      return docs[idx];
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: CONTRACTS_V2_KEYS.document(id) });
      void qc.invalidateQueries({ queryKey: CONTRACTS_V2_KEYS.documents });
    },
  });
}

export function useCancelDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string): Promise<Document> => {
      const docs = loadDocuments();
      const idx = docs.findIndex(d => d.id === documentId);
      if (idx === -1) throw new Error("Documento não encontrado");
      docs[idx] = { ...docs[idx], status: "cancelled", updated_at: new Date().toISOString() };
      saveDocuments(docs);
      return docs[idx];
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: CONTRACTS_V2_KEYS.document(id) });
      void qc.invalidateQueries({ queryKey: CONTRACTS_V2_KEYS.documents });
    },
  });
}

// ─── Wizard hook ──────────────────────────────────────────────────────────────

const INITIAL_WIZARD: WizardState = {
  step:      "template",
  variables: {},
  signers:   [],
  title:     "",
};

export function useDocumentWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD);

  const setStep     = (step: WizardStep) => setState(s => ({ ...s, step }));
  const setTemplate = (template: DocumentTemplate) =>
    setState(s => ({ ...s, template, title: template.name, step: "variables" }));
  const setVariables = (variables: Record<string, string>) =>
    setState(s => ({ ...s, variables, step: "signers" }));
  const setSigners = (signers: WizardState["signers"]) =>
    setState(s => ({ ...s, signers, step: "preview" }));
  const reset = () => setState(INITIAL_WIZARD);

  return { state, setStep, setTemplate, setVariables, setSigners, reset };
}
