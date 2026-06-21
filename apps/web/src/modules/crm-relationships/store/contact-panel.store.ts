import { create } from "zustand";

type ContactPanelStore = {
  selectedContactId: string | null;
  selectContact: (id: string | null) => void;
};

export const useContactPanelStore = create<ContactPanelStore>((set) => ({
  selectedContactId: null,
  selectContact: (selectedContactId) => set({ selectedContactId }),
}));
