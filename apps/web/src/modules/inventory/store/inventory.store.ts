import { create } from "zustand";

interface InventoryFilters {
  category?: string;
  status?: string;
  search: string;
}

interface InventoryState {
  filters: InventoryFilters;
  selectedItemId: string | null;
  setFilters: (filters: Partial<InventoryFilters>) => void;
  resetFilters: () => void;
  selectItem: (id: string | null) => void;
}

const DEFAULT_FILTERS: InventoryFilters = { search: "" };

export const useInventoryStore = create<InventoryState>((set) => ({
  filters: DEFAULT_FILTERS,
  selectedItemId: null,

  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectItem: (id) => set({ selectedItemId: id }),
}));
