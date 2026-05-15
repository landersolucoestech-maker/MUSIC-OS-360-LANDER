import { create } from "zustand";

export type CatalogTab = "obras" | "fonogramas" | "shares" | "licenses";

interface CatalogFilters {
  status?: string;
  artistId?: string;
  search: string;
}

interface CatalogState {
  tab: CatalogTab;
  filters: CatalogFilters;
  selectedWorkId: string | null;
  setTab: (tab: CatalogTab) => void;
  setFilters: (filters: Partial<CatalogFilters>) => void;
  resetFilters: () => void;
  selectWork: (id: string | null) => void;
}

const DEFAULT_FILTERS: CatalogFilters = { search: "" };

export const useCatalogStore = create<CatalogState>((set) => ({
  tab: "obras",
  filters: DEFAULT_FILTERS,
  selectedWorkId: null,

  setTab: (tab) => set({ tab, filters: DEFAULT_FILTERS }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectWork: (id) => set({ selectedWorkId: id }),
}));
