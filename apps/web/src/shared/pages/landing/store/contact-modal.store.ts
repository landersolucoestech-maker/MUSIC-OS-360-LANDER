import { create } from "zustand";

type ContactModalStore = {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
};

export const useContactModalStore = create<ContactModalStore>((set) => ({
  open: false,
  openModal: () => set({ open: true }),
  closeModal: () => set({ open: false }),
}));
