import { create } from "zustand";

export type RhTab = "team" | "roles" | "onboarding";

interface RhFilters {
  department?: string;
  status?: string;
  search: string;
}

interface RhState {
  tab: RhTab;
  filters: RhFilters;
  selectedMemberId: string | null;
  setTab: (tab: RhTab) => void;
  setFilters: (filters: Partial<RhFilters>) => void;
  resetFilters: () => void;
  selectMember: (id: string | null) => void;
}

const DEFAULT_FILTERS: RhFilters = { search: "" };

export const useRhStore = create<RhState>((set) => ({
  tab: "team",
  filters: DEFAULT_FILTERS,
  selectedMemberId: null,

  setTab: (tab) => set({ tab, filters: DEFAULT_FILTERS }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectMember: (id) => set({ selectedMemberId: id }),
}));
