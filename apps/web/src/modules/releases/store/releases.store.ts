import { create } from "zustand";

export type ReleasesTab = "releases" | "shares";

interface ReleasesFilters {
  status?: string;
  artistId?: string;
  distributor?: string;
  type?: "album" | "single" | "ep";
  search: string;
}

interface ReleasesState {
  tab: ReleasesTab;
  filters: ReleasesFilters;
  selectedReleaseId: string | null;
  setTab: (tab: ReleasesTab) => void;
  setFilters: (filters: Partial<ReleasesFilters>) => void;
  resetFilters: () => void;
  selectRelease: (id: string | null) => void;
}

const DEFAULT_FILTERS: ReleasesFilters = { search: "" };

export const useReleasesStore = create<ReleasesState>((set) => ({
  tab: "releases",
  filters: DEFAULT_FILTERS,
  selectedReleaseId: null,

  setTab: (tab) => set({ tab, filters: DEFAULT_FILTERS }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectRelease: (id) => set({ selectedReleaseId: id }),
}));
