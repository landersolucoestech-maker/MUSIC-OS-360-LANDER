import { NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactAttachmentsService } from '../contact-attachments/contact-attachments.service';
import { ContactContractsService } from '../contact-contracts/contact-contracts.service';
import { ContactTimelineService } from '../contact-timeline/contact-timeline.service';

describe('Contacts tenant isolation', () => {
  let contacts: ContactsService;
  let attachments: ContactAttachmentsService;
  let contracts: ContactContractsService;
  let timeline: ContactTimelineService;

  beforeEach(() => {
    contacts = new ContactsService();
    attachments = new ContactAttachmentsService(contacts);
    contracts = new ContactContractsService(contacts);
    timeline = new ContactTimelineService(contacts);
  });

  it('isolates contacts by tenant even when ids collide', () => {
    contacts.create('tenant-a', { id: 'shared-contact-id', name: 'Tenant A Contact' });
    contacts.create('tenant-b', { id: 'shared-contact-id', name: 'Tenant B Contact' });

    expect(contacts.getById('tenant-a', 'shared-contact-id')).toMatchObject({ name: 'Tenant A Contact' });
    expect(contacts.getById('tenant-b', 'shared-contact-id')).toMatchObject({ name: 'Tenant B Contact' });
    expect(contacts.list('tenant-a')).toEqual([expect.objectContaining({ name: 'Tenant A Contact' })]);
    expect(contacts.list('tenant-b')).toEqual([expect.objectContaining({ name: 'Tenant B Contact' })]);
  });

  it('does not allow tenant A to access tenant B contact by id', () => {
    contacts.create('tenant-b', { id: 'contact-b', name: 'Tenant B Contact' });

    expect(() => contacts.getById('tenant-a', 'contact-b')).toThrow(NotFoundException);
    expect(() => contacts.update('tenant-a', 'contact-b', { name: 'Changed' })).toThrow(NotFoundException);
  });

  it('scopes attachments, linked contracts and timeline entries to the contact tenant', () => {
    contacts.create('tenant-a', { id: 'contact-a', name: 'Tenant A Contact' });
    contacts.create('tenant-b', { id: 'contact-b', name: 'Tenant B Contact' });

    attachments.create('tenant-a', 'contact-a', {
      mimeType: 'application/pdf',
      extension: 'pdf',
      size: 1234,
      fileName: 'a.pdf',
    });
    contracts.link('tenant-a', 'contact-a', { contractId: 'contract-a' });
    timeline.create('tenant-a', 'contact-a', { type: 'note', description: 'tenant-a note' });

    expect(attachments.list('tenant-a', 'contact-a')).toHaveLength(1);
    expect(contracts.list('tenant-a', 'contact-a')).toHaveLength(1);
    expect(timeline.list('tenant-a', 'contact-a')).toHaveLength(1);

    expect(attachments.list('tenant-b', 'contact-b')).toEqual([]);
    expect(contracts.list('tenant-b', 'contact-b')).toEqual([]);
    expect(timeline.list('tenant-b', 'contact-b')).toEqual([]);
  });

  it('blocks subroute access when contact belongs to another tenant', () => {
    contacts.create('tenant-b', { id: 'contact-b', name: 'Tenant B Contact' });

    expect(() => attachments.list('tenant-a', 'contact-b')).toThrow(NotFoundException);
    expect(() => contracts.list('tenant-a', 'contact-b')).toThrow(NotFoundException);
    expect(() => timeline.list('tenant-a', 'contact-b')).toThrow(NotFoundException);
  });
});
