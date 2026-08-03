import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ContactsService } from '../contacts/contacts.service';

@Injectable()
export class ContactContractsService {
  private readonly contracts = new Map<string, Map<string, Array<Record<string, unknown>>>>();

  constructor(private readonly contactsService: ContactsService) {}

  async list(tenantId: string, contactId: string) {
    await this.contactsService.assertBelongsToTenant(tenantId, contactId);
    return this.forContact(tenantId, contactId);
  }

  async link(tenantId: string, contactId: string, payload: Record<string, unknown>) {
    await this.contactsService.assertBelongsToTenant(tenantId, contactId);
    const contract = { ...payload, id: randomUUID(), contactId, linkedAt: new Date().toISOString() };
    const current = this.forContact(tenantId, contactId);
    this.forTenant(tenantId).set(contactId, [contract, ...current]);
    return contract;
  }

  private forTenant(tenantId: string) {
    let tenantContracts = this.contracts.get(tenantId);
    if (!tenantContracts) {
      tenantContracts = new Map<string, Array<Record<string, unknown>>>();
      this.contracts.set(tenantId, tenantContracts);
    }
    return tenantContracts;
  }

  private forContact(tenantId: string, contactId: string) {
    return this.forTenant(tenantId).get(contactId) ?? [];
  }
}
