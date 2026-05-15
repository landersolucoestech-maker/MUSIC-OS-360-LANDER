import { create } from "zustand";

export type ContractsTab = "list" | "templates" | "signing";

interface ContractsFilters {
  status?: string;
  artistId?: string;
  expiringInDays?: number;
  search: string;
}

interface ContractsState {
  tab: ContractsTab;
  filters: ContractsFilters;
  selectedContractId: string | null;
  templateEditorOpen: boolean;
  setTab: (tab: ContractsTab) => void;
  setFilters: (filters: Partial<ContractsFilters>) => void;
  resetFilters: () => void;
  selectContract: (id: string | null) => void;
  toggleTemplateEditor: (open?: boolean) => void;
}

const DEFAULT_FILTERS: ContractsFilters = { search: "" };

export const useContractsStore = create<ContractsState>((set) => ({
  tab: "list",
  filters: DEFAULT_FILTERS,
  selectedContractId: null,
  templateEditorOpen: false,

  setTab: (tab) => set({ tab }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectContract: (id) => set({ selectedContractId: id }),
  toggleTemplateEditor: (open) =>
    set((s) => ({ templateEditorOpen: open ?? !s.templateEditorOpen })),
}));
