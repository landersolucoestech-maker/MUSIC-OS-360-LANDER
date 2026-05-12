import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VinculadoDocument } from "@/modules/contracts/types/document-types";

const MOCK_DOCUMENTS: VinculadoDocument[] = [
  {
    id: "doc-001",
    org_id: "ten-gravadora-exemplo-001",
    template_id: "tpl-001",
    title: "Contrato de Gravação — MC Levi",
    status: "signed",
    content_html: "<p>Contrato assinado.</p>",
    signing_provider: "autentique",
    variables: { NOME_ARTISTA: "MC Levi", ROYALTY: "15" },
    signers: [
      { id: "sgn-001", document_id: "doc-001", role: "artista", name: "MC Levi",           email: "mc.levi@email.com",       status: "signed", signed_at: "2026-03-15T14:22:00.000Z" },
      { id: "sgn-002", document_id: "doc-001", role: "label",   name: "Gravadora Exemplo", email: "contratos@gravadora.com", status: "signed", signed_at: "2026-03-15T15:00:00.000Z" },
    ],
    logs: [
      { id: "log-001", document_id: "doc-001", event: "created",            created_at: "2026-03-10T09:00:00.000Z" },
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
    signing_provider: "clicksign",
    variables: { NOME_ARTISTA: "Ana Lima", DATA_SHOW: "2026-06-15", LOCAL_SHOW: "Vibra São Paulo", CACHE: "35000" },
    signers: [
      { id: "sgn-003", document_id: "doc-002", role: "artista", name: "Ana Lima",          email: "ana.lima@email.com",      status: "signed",  signed_at: "2026-05-10T09:00:00.000Z" },
      { id: "sgn-004", document_id: "doc-002", role: "label",   name: "Gravadora Exemplo", email: "contratos@gravadora.com", status: "pending" },
    ],
    logs: [
      { id: "log-004", document_id: "doc-002", event: "created",            created_at: "2026-05-08T09:00:00.000Z" },
      { id: "log-005", document_id: "doc-002", event: "sent_for_signature", created_at: "2026-05-09T10:00:00.000Z" },
      { id: "log-006", document_id: "doc-002", event: "signer_signed",      created_at: "2026-05-10T09:00:00.000Z" },
    ],
    created_at: "2026-05-08T09:00:00.000Z",
    updated_at: "2026-05-10T09:00:00.000Z",
  },
];

const STORAGE_KEY = "musicos360_contracts_docs";

function loadDocuments(): VinculadoDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VinculadoDocument[]) : MOCK_DOCUMENTS;
  } catch {
    return MOCK_DOCUMENTS;
  }
}

function saveDocuments(docs: VinculadoDocument[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch { /* ignore */ }
}

export const CONTRACTS_DOC_KEYS = {
  documents: ["contracts", "documents"] as const,
};

export function useDocuments() {
  return useQuery({
    queryKey: CONTRACTS_DOC_KEYS.documents,
    queryFn:  async (): Promise<VinculadoDocument[]> => loadDocuments(),
    staleTime: 1000 * 30,
  });
}

export function useSaveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: VinculadoDocument): Promise<VinculadoDocument> => {
      const existing = loadDocuments();
      const idx = existing.findIndex((d) => d.id === doc.id);
      let updated: VinculadoDocument[];
      if (idx >= 0) {
        updated = existing.map((d) => (d.id === doc.id ? doc : d));
      } else {
        updated = [doc, ...existing];
      }
      saveDocuments(updated);
      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTRACTS_DOC_KEYS.documents });
    },
  });
}
