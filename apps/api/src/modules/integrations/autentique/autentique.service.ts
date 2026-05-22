import { Injectable, Logger, Inject, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { timingSafeEqual } from 'crypto';
import { DATA_SOURCE } from '../../../database/database.module';
import { IntegrationEntity, ContractEntity } from '../../../database/entities';
import { EncryptionService } from '../../../core/security/encryption.service';
import { IntegrationStatus } from '@music-os-360/types';

const AUTENTIQUE_API = 'https://api.autentique.com.br/v2';

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Injectable()
export class AutentiqueService {
  private readonly logger = new Logger(AutentiqueService.name);
  private readonly integRepo: Repository<IntegrationEntity> | null = null;
  private readonly contractRepo: Repository<ContractEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
  ) {
    if (ds) {
      this.integRepo = ds.getRepository(IntegrationEntity);
      this.contractRepo = ds.getRepository(ContractEntity);
    }
  }

  private assertRepos(): void {
    if (!this.integRepo || !this.contractRepo) {
      throw new ServiceUnavailableException('Autentique persistence unavailable');
    }
  }

  private async getToken(tenantId: string): Promise<string> {
    this.assertRepos();
    const row = await this.integRepo!
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId AND i.provider = :provider', { tenantId, provider: 'autentique' })
      .getOne();

    if (!row?.credentials_encrypted) {
      throw new ServiceUnavailableException('Autentique not configured for this tenant');
    }
    const creds = this.encryption.decrypt(row.credentials_encrypted);
    return (JSON.parse(creds) as { api_token: string }).api_token;
  }

  async sendForSignature(params: {
    tenantId: string;
    contractId: string;
    name: string;
    fileBase64: string;
    signers: Array<{ name: string; email: string }>;
  }): Promise<{ documentId: string }> {
    this.assertRepos();
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
          signers: params.signers.map((s) => ({ name: s.name, email: s.email, action: 'SIGN' })),
        },
      }),
    });

    const data = await res.json() as any;
    if (data.errors) throw new ServiceUnavailableException(data.errors[0].message);
    const docId = data.data.createDocument.id as string;

    if (params.contractId) {
      await this.contractRepo!
        .createQueryBuilder()
        .update(ContractEntity)
        .set({ status: 'aguardando_assinatura', autentique_doc_id: docId, signing_platform: 'autentique', updated_at: new Date() } as any)
        .where('id = :contractId AND tenant_id = :tenantId', { contractId: params.contractId, tenantId: params.tenantId })
        .execute();
    }

    this.logger.log(`Autentique: documento ${docId} enviado para assinatura`);
    return { documentId: docId };
  }

  async handleWebhook(payload: any, secret?: string): Promise<{ received: true }> {
    this.assertRepos();

    const expectedSecret = this.config.get<string>('AUTENTIQUE_WEBHOOK_SECRET');
    if (!expectedSecret) {
      throw new ServiceUnavailableException('AUTENTIQUE_WEBHOOK_SECRET not configured');
    }
    if (!secret || !safeEquals(secret, expectedSecret)) {
      throw new UnauthorizedException('Invalid Autentique webhook secret');
    }

    if (payload.event !== 'document.signed') return { received: true };
    const docId = (payload.document_id ?? payload.document?.id) as string | undefined;
    if (!docId) return { received: true };

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

    return { received: true };
  }

  async configure(tenantId: string, apiToken: string): Promise<void> {
    this.assertRepos();
    const credentials_encrypted = this.encryption.encrypt(JSON.stringify({ api_token: apiToken }));
    const existing = await this.integRepo!
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId AND i.provider = :provider', { tenantId, provider: 'autentique' })
      .getOne();

    if (existing) {
      await this.integRepo!.update({ id: existing.id } as any, { credentials_encrypted, status: IntegrationStatus.CONNECTED, failure_count: 0, updated_at: new Date() } as any);
    } else {
      const entity = this.integRepo!.create({ tenant_id: tenantId, provider: 'autentique', status: IntegrationStatus.CONNECTED, credentials_encrypted });
      await this.integRepo!.save(entity);
    }
  }
}
