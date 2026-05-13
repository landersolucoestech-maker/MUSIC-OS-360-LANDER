import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq, and }          from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../../database/database.module';
import { integrations, contracts } from '../../../database/schema';
import { EncryptionService }       from '../../../core/security/encryption.service';

const AUTENTIQUE_API = 'https://api.autentique.com.br/v2';

@Injectable()
export class AutentiqueService {
  private readonly logger = new Logger(AutentiqueService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    private readonly encryption: EncryptionService,
  ) {}

  private async getToken(tenantId: string): Promise<string> {
    const [row] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, 'autentique')))
      .limit(1);

    if (!row?.credentials_encrypted) {
      throw new Error('Autentique não configurado para este tenant');
    }

    const creds = this.encryption.decrypt(row.credentials_encrypted);
    return (JSON.parse(creds) as { api_token: string }).api_token;
  }

  async sendForSignature(params: {
    tenantId:   string;
    contractId: string;
    name:       string;
    fileBase64: string;
    signers:    Array<{ name: string; email: string }>;
  }): Promise<{ documentId: string }> {
    const token = await this.getToken(params.tenantId);

    const mutation = `
      mutation CreateDocument($document: DocumentInput!, $signers: [SignerInput!]!) {
        createDocument(document: $document, signers: $signers) {
          id
          name
        }
      }
    `;

    const res = await fetch(`${AUTENTIQUE_API}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          document: { name: params.name, content_base64: params.fileBase64 },
          signers:  params.signers.map(s => ({ name: s.name, email: s.email, action: 'SIGN' })),
        },
      }),
    });

    const data = await res.json() as any;
    if (data.errors) throw new Error(data.errors[0].message);

    const docId = data.data.createDocument.id as string;

    await this.db.update(contracts)
      .set({ status: 'aguardando_assinatura', autentique_doc_id: docId, signing_platform: 'autentique', updated_at: new Date() })
      .where(and(eq(contracts.id, params.contractId), eq(contracts.tenant_id, params.tenantId)));

    this.logger.log(`Autentique: documento ${docId} enviado para assinatura`);
    return { documentId: docId };
  }

  async handleWebhook(payload: any): Promise<void> {
    if (payload.event !== 'document.signed') return;

    const docId = payload.document_id as string;
    // Buscar contratos com autentiqueDocId no metadata
    const [contract] = await this.db.select().from(contracts)
      .where(eq((contracts.metadata as any), docId))
      .limit(1);

    if (contract) {
      await this.db.update(contracts)
        .set({ status: 'assinado', updated_at: new Date() })
        .where(eq(contracts.id, contract.id));
      this.logger.log(`Contrato assinado via Autentique: ${docId}`);
    }
  }

  async configure(tenantId: string, apiToken: string): Promise<void> {
    const credentials_encrypted = this.encryption.encrypt(JSON.stringify({ api_token: apiToken }));
    const [existing] = await this.db.select().from(integrations)
      .where(and(eq(integrations.tenant_id, tenantId), eq(integrations.provider, 'autentique')))
      .limit(1);

    if (existing) {
      await this.db.update(integrations)
        .set({ credentials_encrypted, status: 'connected', failure_count: 0, updated_at: new Date() })
        .where(eq(integrations.id, existing.id));
    } else {
      await this.db.insert(integrations).values({
        tenant_id: tenantId, provider: 'autentique', status: 'connected', credentials_encrypted,
      });
    }
  }
}
