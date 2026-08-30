import { describe, it, expect } from 'vitest';
import { ALL_WS_EVENT_NAMES, type WsEventMap, type WsEventName } from './ws-events';

describe('ALL_WS_EVENT_NAMES', () => {
  it('contains every key of WsEventMap and nothing else', () => {
    // `satisfies` in ws-events.ts already guarantees every array entry is a
    // valid WsEventMap key at compile time; this closes the other
    // direction — every WsEventMap key must appear in the array — which
    // TypeScript can't check on its own since interface keys are erased at
    // runtime. Requiring every key here forces this object (and therefore
    // this test) to be updated whenever WsEventMap gains or loses a key.
    const allMapKeys: Record<WsEventName, true> = {
      'artist.created': true,
      'artist.updated': true,
      'artist.deleted': true,
      'catalog.music.registered': true,
      'catalog.phonogram.registered': true,
      'contract.created': true,
      'contract.updated': true,
      'contract.signed': true,
      'crm.lead.captured': true,
      'crm.lead.converted': true,
      'finance.transaction.created': true,
      'finance.transaction.updated': true,
      'finance.calculated': true,
      'audit.entry.created': true,
      'notification:new': true,
      'billing:plan_upgraded': true,
      'billing:trial_ending': true,
      'billing:payment_failed': true,
      'billing:cancelled': true,
      'data:changed': true,
      'conversation:created': true,
      'conversation:updated': true,
      'conversation:message': true,
      'conversation:assigned': true,
      'conversation:transferred': true,
      'conversation:closed': true,
      'conversation:reopened': true,
      'internalConversation:created': true,
      'internalConversation:message': true,
    };

    expect([...ALL_WS_EVENT_NAMES].sort()).toEqual(Object.keys(allMapKeys).sort());
  });

  it('has no duplicate entries', () => {
    expect(new Set(ALL_WS_EVENT_NAMES).size).toBe(ALL_WS_EVENT_NAMES.length);
  });
});
