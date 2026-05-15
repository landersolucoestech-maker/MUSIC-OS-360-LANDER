import { create } from "zustand";

export type LeadsView = "kanban" | "list";

interface LeadsFilters {
  status?: string;
  assigneeId?: string;
  search: string;
}

interface LeadsState {
  view: LeadsView;
  filters: LeadsFilters;
  selectedLeadId: string | null;
  setView: (view: LeadsView) => void;
  setFilters: (filters: Partial<LeadsFilters>) => void;
  resetFilters: () => void;
  selectLead: (id: string | null) => void;
}

const DEFAULT_FILTERS: LeadsFilters = { search: "" };

export const useLeadsStore = create<LeadsState>((set) => ({
  view: "kanban",
  filters: DEFAULT_FILTERS,
  selectedLeadId: null,

  setView: (view) => set({ view }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectLead: (id) => set({ selectedLeadId: id }),
}));
