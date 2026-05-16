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
 *   import { signingService } from "@/modules/integrations/services";
 *   await signingService.sendForSigning({
 *     contratoId, title, fileKey, bucket, signers,
 *     provider: "clicksign",   // "autentique" | "clicksign" | "docusign"
 *   });
 */

import { resolveSigningAdapter } from "@/modules/integrations/adapters/signing.adapter";
import type { SigningProviderId } from "@/modules/integrations/adapters/signing.adapter";
import { emailAdapter }          from "@/modules/integrations/adapters/email.adapter";
import { storageAdapter }        from "@/modules/integrations/adapters/storage.adapter";
import type { StorageBucket }    from "@/shared/integrations/contracts/storage.contract";
import type { SignerRole }       from "@/shared/integrations/contracts/signing.contract";
import { emit }                  from "@/shared/domain-events";

export type { SigningProviderId };

export interface SendForSigningInput {
  contratoId:     string;
  title:          string;
  fileKey:        string;
  bucket:         string;
  signers: Array<{
    name:  string;
    email: string;
    role?: string;
  }>;
  deadline_days?: number;
  /** Provedor de assinatura digital a usar. Default: "autentique" */
  provider?: SigningProviderId;
}

export interface SendForSigningResult {
  documentId:  string;
  signingUrl:  string;
  status:      "pending";
  provider:    SigningProviderId;
}

export const signingService = {
  /**
   * Orquestra o envio de um contrato para assinatura digital:
   * 1. Obtém URL de download do ficheiro no storage
   * 2. Cria documento no provider de assinatura seleccionado
   * 3. Envia email de convite a cada signatário
   * 4. Emite domain event contrato.sent_for_signing
   */
  async sendForSigning(input: SendForSigningInput): Promise<SendForSigningResult> {
    const {
      contratoId,
      title,
      fileKey,
      bucket,
      signers,
      deadline_days = 7,
      provider = "autentique",
    } = input;

    const adapter = resolveSigningAdapter(provider);

    if (provider !== "autentique") {
      const connected = await adapter.verifyConnection();
      if (!connected) {
        throw new Error(
          `O provedor "${provider}" não está configurado. Acesse Integrações para adicionar as credenciais.`
        );
      }
    }

    const fileUrl = await storageAdapter.presignedUrl({ bucket: bucket as StorageBucket, key: fileKey });

    const expiresAt = new Date(Date.now() + deadline_days * 86_400_000).toISOString();

    const typedSigners = signers.map(s => ({
      name:  s.name,
      email: s.email,
      role:  (s.role ?? "signer") as SignerRole,
    }));

    const doc = await adapter.createDocument({
      title,
      document:    fileUrl,
      signers:     typedSigners,
      expires_at:  expiresAt,
      contrato_id: contratoId,
    });

    const signingUrl = doc.signing_url ?? doc.document_url;

    for (const signer of signers) {
      await emailAdapter.send({
        to:           { name: signer.name, email: signer.email },
        subject:      `Assinatura digital solicitada: ${title}`,
        template_id:  "signing-requested",
        template_vars: {
          signer_name:   signer.name,
          doc_title:     title,
          signing_url:   signingUrl,
          deadline_days,
          provider,
        },
      });
    }

    emit("contrato.sent_for_signing", {
      contratoId,
      signers: signers.map(s => s.email) as unknown[],
    });

    return {
      documentId: doc.id,
      signingUrl,
      status:     "pending",
      provider,
    };
  },

  /**
   * Cancela um documento de assinatura e notifica signatários.
   */
  async cancelSigning(
    documentId:  string,
    contratoId:  string,
    provider: SigningProviderId = "autentique"
  ): Promise<void> {
    const adapter = resolveSigningAdapter(provider);
    await adapter.cancelDocument(documentId);
    emit("contrato.signing_cancelled", { contratoId });
  },

  /**
   * Consulta o estado actual de um documento de assinatura.
   */
  async getStatus(documentId: string, provider: SigningProviderId = "autentique") {
    return resolveSigningAdapter(provider).getDocument(documentId);
  },
};
