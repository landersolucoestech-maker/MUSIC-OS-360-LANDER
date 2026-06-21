import { create } from "zustand";
import type { ContactFiltersState } from "../types";

export const defaultContactFilters: ContactFiltersState = {
  search: "",
  contactType: "all",
  status: "all",
  priority: "all",
  city: "all",
  tag: "all",
};

type ContactFiltersStore = {
  filters: ContactFiltersState;
  setFilters: (filters: Partial<ContactFiltersState>) => void;
  resetFilters: () => void;
};

export const useContactFiltersStore = create<ContactFiltersStore>((set) => ({
  filters: defaultContactFilters,
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultContactFilters }),
}));
