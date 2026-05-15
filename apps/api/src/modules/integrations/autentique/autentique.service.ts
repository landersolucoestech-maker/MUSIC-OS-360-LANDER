import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE }          from '../../../database/database.module';
import { IntegrationEntity, ContractEntity } from '../../../database/entities';
import { EncryptionService }    from '../../../core/security/encryption.service';

const AUTENTIQUE_API = 'https://api.autentique.com.br/v2';

@Injectable()
export class AutentiqueService {
  private readonly logger = new Logger(AutentiqueService.name);
  private readonly integRepo:    Repository<IntegrationEntity> | null = null;
  private readonly contractRepo: Repository<ContractEntity>    | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly encryption: EncryptionService,
  ) {
    if (ds) {
      this.integRepo    = ds.getRepository(IntegrationEntity);
      this.contractRepo = ds.getRepository(ContractEntity);
    }
  }

  private async getToken(tenantId: string): Promise<string> {
    const row = await this.integRepo!
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId AND i.provider = :provider', { tenantId, provider: 'autentique' })
      .getOne();

    if (!row?.credentials_encrypted) {
      throw new Error('Autentique não configurado para este tenant');
    }
    const creds = this.encryption.decrypt(row.credentials_encrypted);
    return (JSON.parse(creds) as { api_token: string }).api_token;
  }

  async sendForSignature(params: {
    tenantId: string; contractId: string; name: string;
    fileBase64: string; signers: Array<{ name: string; email: string }>;
  }): Promise<{ documentId: string }> {
    const token = await this.getToken(params.tenantId);

    const mutation = `
      mutation CreateDocument($document: DocumentInput!, $signers: [SignerInput!]!) {
        createDocument(document: $document, signers: $signers) { id name }
      }
    `;

    const res = await fetch(`${AUTENTIQUE_API}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

    await this.contractRepo!
      .createQueryBuilder()
      .update(ContractEntity)
      .set({ status: 'aguardando_assinatura', autentique_doc_id: docId, signing_platform: 'autentique', updated_at: new Date() } as any)
      .where('id = :contractId AND tenant_id = :tenantId', { contractId: params.contractId, tenantId: params.tenantId })
      .execute();

    this.logger.log(`Autentique: documento ${docId} enviado para assinatura`);
    return { documentId: docId };
  }

  async handleWebhook(payload: any): Promise<void> {
    if (payload.event !== 'document.signed') return;
    const docId = payload.document_id as string;

    const contract = await this.contractRepo!
      .createQueryBuilder('c')
      .where('c.autentique_doc_id = :docId', { docId })
      .getOne();

    if (contract) {
      await this.contractRepo!
        .createQueryBuilder()
        .update(ContractEntity)
        .set({ status: 'assinado', updated_at: new Date() } as any)
        .where('id = :id', { id: contract.id })
        .execute();
      this.logger.log(`Contrato assinado via Autentique: ${docId}`);
    }
  }

  async configure(tenantId: string, apiToken: string): Promise<void> {
    const credentials_encrypted = this.encryption.encrypt(JSON.stringify({ api_token: apiToken }));
    const existing = await this.integRepo!
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId AND i.provider = :provider', { tenantId, provider: 'autentique' })
      .getOne();

    if (existing) {
      await this.integRepo!.update({ id: existing.id } as any, { credentials_encrypted, status: 'connected', failure_count: 0, updated_at: new Date() } as any);
    } else {
      const entity = this.integRepo!.create({ tenant_id: tenantId, provider: 'autentique', status: 'connected', credentials_encrypted });
      await this.integRepo!.save(entity);
    }
  }
}
