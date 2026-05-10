/**
 * integrations/providers/mock/mock-signing.provider.ts
 *
 * Implementação mock de ISigningProvider.
 * Em modo standalone: simula envio e estado de documentos.
 *
 * MIGRAÇÃO FUTURA: substituir por AutentiqueSigningProvider (GraphQL API via backend).
 */

import type {
  ISigningProvider,
  SigningDocument,
  CreateSigningDocumentParams,
  SigningWebhookEvent,
  SigningStatus,
} from "@/integrations/dto";

const _documents = new Map<string, SigningDocument>();

function makeDoc(
  params: CreateSigningDocumentParams,
  status: SigningStatus = "pending"
): SigningDocument {
  const id = `mock_doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();
  return {
    id,
    external_id:          `autentique_${id}`,
    title:                params.title,
    status,
    signers:              params.signers.map((s) => ({
      ...s,
      signature_url: null,
      signed_at:     null,
    })),
    created_at:           now,
    updated_at:           now,
    expires_at:           params.expires_at ?? new Date(Date.now() + 30 * 86400_000).toISOString(),
    completed_at:         null,
    document_url:         params.document.startsWith("http") ? params.document : "#mock-pdf",
    signed_document_url:  null,
    contrato_id:          params.contrato_id,
  };
}

export class MockSigningProvider implements ISigningProvider {
  async createDocument(params: CreateSigningDocumentParams): Promise<SigningDocument> {
    const doc = makeDoc(params);
    _documents.set(doc.id, doc);
    console.info(
      `[MockSigningProvider] createDocument "${params.title}" → ${doc.id} (${params.signers.length} signers)`
    );
    return doc;
  }

  async getDocument(documentId: string): Promise<SigningDocument> {
    const doc = _documents.get(documentId);
    if (!doc) throw new Error(`[MockSigningProvider] documento não encontrado: ${documentId}`);
    return doc;
  }

  async listDocuments(params?: {
    contrato_id?: string;
    status?: SigningStatus;
  }): Promise<SigningDocument[]> {
    let docs = Array.from(_documents.values());
    if (params?.contrato_id) docs = docs.filter((d) => d.contrato_id === params.contrato_id);
    if (params?.status)      docs = docs.filter((d) => d.status === params.status);
    return docs;
  }

  async cancelDocument(documentId: string): Promise<void> {
    const doc = _documents.get(documentId);
    if (doc) {
      doc.status     = "cancelled";
      doc.updated_at = new Date().toISOString();
      _documents.set(documentId, doc);
    }
    console.info(`[MockSigningProvider] cancelDocument → ${documentId}`);
  }

  async resendInvite(documentId: string, signerEmail: string): Promise<void> {
    console.info(`[MockSigningProvider] resendInvite → ${documentId} → ${signerEmail}`);
  }

  async handleWebhook(event: SigningWebhookEvent): Promise<void> {
    console.info(`[MockSigningProvider] handleWebhook → ${event.type} | doc: ${event.document_id}`);
    const doc = _documents.get(event.document_id);
    if (!doc) return;

    if (event.type === "document.completed") {
      doc.status       = "completed";
      doc.completed_at = event.timestamp;
    } else if (event.type === "document.refused") {
      doc.status = "refused";
    } else if (event.type === "document.expired") {
      doc.status = "expired";
    }
    doc.updated_at = event.timestamp;
    _documents.set(doc.id, doc);
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }
}

export const mockSigningProvider = new MockSigningProvider();
