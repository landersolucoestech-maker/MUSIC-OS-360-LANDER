import { create } from "zustand";

type ContactTagsStore = {
  tagsByContactId: Record<string, string[]>;
  setTags: (contactId: string, tags: string[]) => void;
};

export const useContactTagsStore = create<ContactTagsStore>((set) => ({
  tagsByContactId: {},
  setTags: (contactId, tags) => set((state) => ({ tagsByContactId: { ...state.tagsByContactId, [contactId]: tags } })),
}));
