/**
 * integrations/services/signing.service.ts
 *
 * Serviço de orquestração de assinatura digital.
 * Coordena: signingAdapter + emailAdapter + storageAdapter + domain events.
 *
 * REGRA: módulos NÃO chamam múltiplos adapters directamente.
 * Usam este serviço para operações que envolvem mais de uma integração.
 *
 * Uso (em hooks/mutations de contratos):
 *   import { signingService } from "@/integrations/services";
 *   await signingService.sendForSigning({ contratoId, title, fileKey, signers });
 */

import { signingAdapter } from "@/integrations/adapters/signing.adapter";
import { emailAdapter }   from "@/integrations/adapters/email.adapter";
import { storageAdapter } from "@/integrations/adapters/storage.adapter";
import { emit }           from "@/shared/domain-events";

export interface SendForSigningInput {
  contratoId: string;
  title:      string;
  fileKey:    string;
  bucket:     string;
  signers: Array<{
    name:  string;
    email: string;
    role?: string;
  }>;
  deadline_days?: number;
}

export interface SendForSigningResult {
  documentId:  string;
  signingUrl:  string;
  status:      "pending";
}

export const signingService = {
  /**
   * Orquestra o envio de um contrato para assinatura digital:
   * 1. Obtém URL de download do ficheiro no storage
   * 2. Cria documento no provider de assinatura
   * 3. Envia email de convite a cada signatário
   * 4. Emite domain event contrato.sent_for_signing
   */
  async sendForSigning(input: SendForSigningInput): Promise<SendForSigningResult> {
    const { contratoId, title, fileKey, bucket, signers, deadline_days = 7 } = input;

    const fileUrl = await storageAdapter.presignedUrl({ bucket, key: fileKey });

    const doc = await signingAdapter.createDocument({
      title,
      document:      { url: fileUrl },
      signers,
      deadline_days,
    });

    for (const signer of signers) {
      await emailAdapter.send({
        to:           { name: signer.name, email: signer.email },
        subject:      `Assinatura digital solicitada: ${title}`,
        template_id:  "signing-invite",
        template_vars: {
          signer_name:  signer.name,
          doc_title:    title,
          signing_url:  doc.signing_url,
          deadline_days,
        },
      });
    }

    emit("contrato.sent_for_signing", {
      contratoId,
      documentId: doc.id,
      signers:    signers.map(s => s.email),
    });

    return {
      documentId: doc.id,
      signingUrl: doc.signing_url,
      status:     "pending",
    };
  },

  /**
   * Cancela um documento de assinatura e notifica signatários.
   */
  async cancelSigning(documentId: string, contratoId: string): Promise<void> {
    await signingAdapter.cancelDocument(documentId);

    emit("contrato.signing_cancelled", { contratoId, documentId });
  },

  /**
   * Consulta o estado actual de um documento de assinatura.
   */
  async getStatus(documentId: string) {
    return signingAdapter.getDocument(documentId);
  },
};
