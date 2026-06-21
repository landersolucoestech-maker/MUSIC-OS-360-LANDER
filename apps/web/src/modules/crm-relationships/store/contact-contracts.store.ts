import { create } from "zustand";

export type ContactContractLink = {
  id: string;
  contactId: string;
  contractId: string;
  relationType: string;
  linkedAt: string;
};

type ContactContractsStore = {
  contractsByContactId: Record<string, ContactContractLink[]>;
  setContracts: (contactId: string, contracts: ContactContractLink[]) => void;
};

export const useContactContractsStore = create<ContactContractsStore>((set) => ({
  contractsByContactId: {},
  setContracts: (contactId, contracts) => set((state) => ({ contractsByContactId: { ...state.contractsByContactId, [contactId]: contracts } })),
}));
