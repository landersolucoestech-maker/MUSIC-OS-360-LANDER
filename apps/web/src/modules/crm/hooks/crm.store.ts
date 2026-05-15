import { create } from "zustand";

export type CrmTab = "contacts" | "clients" | "leads";
export type LeadKanbanView = "kanban" | "list";

interface CrmFilters {
  category?: string;
  search: string;
}

interface CrmState {
  tab: CrmTab;
  filters: CrmFilters;
  selectedContactId: string | null;
  leadView: LeadKanbanView;
  setTab: (tab: CrmTab) => void;
  setFilters: (filters: Partial<CrmFilters>) => void;
  resetFilters: () => void;
  selectContact: (id: string | null) => void;
  setLeadView: (view: LeadKanbanView) => void;
}

const DEFAULT_FILTERS: CrmFilters = { search: "" };

export const useCrmStore = create<CrmState>((set) => ({
  tab: "contacts",
  filters: DEFAULT_FILTERS,
  selectedContactId: null,
  leadView: "kanban",

  setTab: (tab) => set({ tab, filters: DEFAULT_FILTERS }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectContact: (id) => set({ selectedContactId: id }),
  setLeadView: (view) => set({ leadView: view }),
}));
