import { create } from "zustand";

type LeadModalStore = {
  isOpen: boolean;
  editingLeadId: string | null;
  openCreate: () => void;
  openEdit: (id: string) => void;
  close: () => void;
};

export const useLeadModalStore = create<LeadModalStore>((set) => ({
  isOpen: false,
  editingLeadId: null,
  openCreate: () => set({ isOpen: true, editingLeadId: null }),
  openEdit: (editingLeadId) => set({ isOpen: true, editingLeadId }),
  close: () => set({ isOpen: false, editingLeadId: null }),
}));
