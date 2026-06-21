import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ContactsService {
  private readonly contacts = new Map<string, Map<string, Record<string, unknown>>>();

  list(tenantId: string) {
    return Array.from(this.forTenant(tenantId).values());
  }

  getById(tenantId: string, id: string) {
    const contact = this.forTenant(tenantId).get(id);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  create(tenantId: string, payload: Record<string, unknown>) {
    const now = new Date().toISOString();
    const id = typeof payload['id'] === 'string' ? payload['id'] : randomUUID();
    const contact = { ...payload, id, createdAt: now, updatedAt: now };
    this.forTenant(tenantId).set(id, contact);
    return contact;
  }

  update(tenantId: string, id: string, payload: Record<string, unknown>) {
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
}
