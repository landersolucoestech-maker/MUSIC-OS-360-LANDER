import { create } from "zustand";
import type { ContactAttachment } from "../types";

type ContactAttachmentsStore = {
  attachmentsByContactId: Record<string, ContactAttachment[]>;
  setAttachments: (contactId: string, attachments: ContactAttachment[]) => void;
  clearAttachments: (contactId: string) => void;
};

export const useContactAttachmentsStore = create<ContactAttachmentsStore>((set) => ({
  attachmentsByContactId: {},
  setAttachments: (contactId, attachments) => set((state) => ({ attachmentsByContactId: { ...state.attachmentsByContactId, [contactId]: attachments } })),
  clearAttachments: (contactId) => set((state) => {
    const next = { ...state.attachmentsByContactId };
    delete next[contactId];
    return { attachmentsByContactId: next };
  }),
}));
