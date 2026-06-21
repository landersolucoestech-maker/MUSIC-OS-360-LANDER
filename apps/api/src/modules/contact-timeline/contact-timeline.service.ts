import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ContactsService } from '../contacts/contacts.service';

@Injectable()
export class ContactTimelineService {
  private readonly events = new Map<string, Map<string, Array<Record<string, unknown>>>>();

  constructor(private readonly contactsService: ContactsService) {}

  list(tenantId: string, contactId: string) {
    this.contactsService.assertBelongsToTenant(tenantId, contactId);
    return this.forContact(tenantId, contactId);
  }

  create(tenantId: string, contactId: string, payload: Record<string, unknown>) {
    this.contactsService.assertBelongsToTenant(tenantId, contactId);
    const now = new Date().toISOString();
    const event = { ...payload, id: randomUUID(), contactId, occurredAt: payload['occurredAt'] ?? now, createdAt: now };
    const current = this.forContact(tenantId, contactId);
    this.forTenant(tenantId).set(contactId, [event, ...current]);
    return event;
  }

  private forTenant(tenantId: string) {
    let tenantEvents = this.events.get(tenantId);
    if (!tenantEvents) {
      tenantEvents = new Map<string, Array<Record<string, unknown>>>();
      this.events.set(tenantId, tenantEvents);
    }
    return tenantEvents;
  }

  private forContact(tenantId: string, contactId: string) {
    return this.forTenant(tenantId).get(contactId) ?? [];
  }
}
