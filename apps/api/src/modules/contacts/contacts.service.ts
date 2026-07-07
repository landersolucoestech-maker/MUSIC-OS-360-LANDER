import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { EncryptionService } from '../../core/security/encryption.service';

@Injectable()
export class ContactsService {
  private readonly contacts = new Map<string, Map<string, Record<string, unknown>>>();

  constructor(
    @Optional() @Inject(DATA_SOURCE) private readonly ds?: DataSource | null,
    @Optional() private readonly encryption?: EncryptionService,
  ) {}

  list(tenantId: string) {
    if (this.ds) return this.listDb(tenantId);
    return Array.from(this.forTenant(tenantId).values());
  }

  getById(tenantId: string, id: string) {
    if (this.ds) return this.getByIdDb(tenantId, id);
    const contact = this.forTenant(tenantId).get(id);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  create(tenantId: string, payload: Record<string, unknown>) {
    if (this.ds) return this.createDb(tenantId, payload);
    const now = new Date().toISOString();
    const id = typeof payload['id'] === 'string' ? payload['id'] : randomUUID();
    const contact = { ...payload, id, createdAt: now, updatedAt: now };
    this.forTenant(tenantId).set(id, contact);
    return contact;
  }

  update(tenantId: string, id: string, payload: Record<string, unknown>) {
    if (this.ds) return this.updateDb(tenantId, id, payload);
    const current = this.getById(tenantId, id);
    const contact = { ...current, ...payload, id, updatedAt: new Date().toISOString() };
    this.forTenant(tenantId).set(id, contact);
    return contact;
  }

  assertBelongsToTenant(tenantId: string, id: string) {
    return this.getById(tenantId, id);
  }

  private forTenant(tenantId: string) {
    let tenantContacts = this.contacts.get(tenantId);
    if (!tenantContacts) {
      tenantContacts = new Map<string, Record<string, unknown>>();
      this.contacts.set(tenantId, tenantContacts);
    }
    return tenantContacts;
  }

  private async listDb(tenantId: string) {
    const rows = await this.ds!.query(
      `SELECT * FROM contacts WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`,
      [tenantId],
    );
    return rows.map((row: Record<string, unknown>) => this.toResponse(row));
  }

  private async getByIdDb(tenantId: string, id: string) {
    const rows = await this.ds!.query(
      `SELECT * FROM contacts WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
      [tenantId, id],
    );
    const contact = rows[0] as Record<string, unknown> | undefined;
    if (!contact) throw new NotFoundException('Contact not found');
    return this.toResponse(contact);
  }

  private async createDb(tenantId: string, payload: Record<string, unknown>) {
    const id = typeof payload['id'] === 'string' ? payload['id'] : randomUUID();
    const contact = this.normalizePayload(payload);
    const rows = await this.ds!.query(
      `INSERT INTO contacts (
        id, tenant_id, name, company_name, contact_type, document_type, document_number,
        phone, whatsapp, email_encrypted, instagram, website, address, city, state,
        country, zip_code, responsible, notes, tags, status, priority, linked_artist_id,
        payload_operacional, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20::text[], $21, $22, $23,
        $24::jsonb, $25, $26
      )
      RETURNING *`,
      [
        id,
        tenantId,
        contact.name,
        contact.company_name,
        contact.contact_type,
        contact.document_type,
        contact.document_number,
        contact.phone,
        contact.whatsapp,
        contact.email_encrypted,
        contact.instagram,
        contact.website,
        contact.address,
        contact.city,
        contact.state,
        contact.country,
        contact.zip_code,
        contact.responsible,
        contact.notes,
        contact.tags,
        contact.status,
        contact.priority,
        contact.linked_artist_id,
        JSON.stringify(contact.payload_operacional),
        contact.created_by,
        contact.updated_by,
      ],
    );
    return this.toResponse(rows[0]);
  }

  private async updateDb(tenantId: string, id: string, payload: Record<string, unknown>) {
    await this.getByIdDb(tenantId, id);
    const contact = this.normalizePayload(payload, true);
    const updates: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [tenantId, id];
    for (const [column, value] of Object.entries(contact)) {
      values.push(column === 'payload_operacional' ? JSON.stringify(value) : value);
      const cast = column === 'tags' ? '::text[]' : column === 'payload_operacional' ? '::jsonb' : '';
      updates.push(`${column} = $${values.length}${cast}`);
    }
    const rows = await this.ds!.query(
      `UPDATE contacts SET ${updates.join(', ')}
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values,
    );
    const updated = rows[0] as Record<string, unknown> | undefined;
    if (!updated) throw new NotFoundException('Contact not found');
    return this.toResponse(updated);
  }

  private normalizePayload(payload: Record<string, unknown>, partial = false) {
    const normalized: Record<string, unknown> = {};
    const set = (column: string, ...keys: string[]) => {
      for (const key of keys) {
        if (payload[key] !== undefined) {
          normalized[column] = payload[key];
          return;
        }
      }
    };

    set('name', 'name', 'nome');
    set('company_name', 'company_name', 'companyName');
    set('contact_type', 'contact_type', 'contactType', 'type');
    set('document_type', 'document_type', 'documentType');
    set('document_number', 'document_number', 'documentNumber');
    set('phone', 'phone', 'telefone');
    set('whatsapp', 'whatsapp');
    set('instagram', 'instagram');
    set('website', 'website');
    set('address', 'address', 'endereco');
    set('city', 'city', 'cidade');
    set('state', 'state', 'estado');
    set('country', 'country', 'pais');
    set('zip_code', 'zip_code', 'zipCode', 'cep');
    set('responsible', 'responsible', 'assignedTo');
    set('notes', 'notes', 'observacoes');
    set('status', 'status');
    set('priority', 'priority');
    set('linked_artist_id', 'linked_artist_id', 'linkedArtistId');
    set('created_by', 'created_by', 'createdBy');
    set('updated_by', 'updated_by', 'updatedBy');

    if (payload['email'] !== undefined) {
      normalized['email_encrypted'] = this.encryption
        ? this.encryption.encryptNullable(payload['email'] as string | null)
        : payload['email'];
    }
    if (payload['email_encrypted'] !== undefined) normalized['email_encrypted'] = payload['email_encrypted'];
    if (payload['tags'] !== undefined) normalized['tags'] = Array.isArray(payload['tags']) ? payload['tags'] : [];
    if (payload['payload_operacional'] !== undefined) normalized['payload_operacional'] = payload['payload_operacional'];
    if (payload['metadata'] !== undefined) normalized['payload_operacional'] = payload['metadata'];

    if (!partial) {
      if (normalized['name'] === undefined) normalized['name'] = 'Contato sem nome';
      if (normalized['contact_type'] === undefined) normalized['contact_type'] = 'person';
      if (normalized['tags'] === undefined) normalized['tags'] = [];
      if (normalized['status'] === undefined) normalized['status'] = 'active';
      if (normalized['priority'] === undefined) normalized['priority'] = 'medium';
      if (normalized['payload_operacional'] === undefined) normalized['payload_operacional'] = {};
    }

    Object.keys(normalized).forEach((key) => {
      if (normalized[key] === undefined) delete normalized[key];
    });
    return normalized;
  }

  private toResponse(row: Record<string, unknown>) {
    const emailEncrypted = row['email_encrypted'] as string | null | undefined;
    const email = this.encryption ? this.encryption.decryptNullable(emailEncrypted) : emailEncrypted ?? null;
    return {
      ...row,
      email,
      companyName: row['company_name'],
      contactType: row['contact_type'],
      documentType: row['document_type'],
      documentNumber: row['document_number'],
      zipCode: row['zip_code'],
      linkedArtistId: row['linked_artist_id'],
      metadata: row['payload_operacional'],
      createdAt: row['created_at'],
      updatedAt: row['updated_at'],
      deletedAt: row['deleted_at'],
    };
  }
}
