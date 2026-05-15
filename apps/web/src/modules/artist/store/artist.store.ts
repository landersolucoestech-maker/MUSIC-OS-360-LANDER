import { create } from "zustand";

export type ArtistView = "list" | "grid" | "360";

interface ArtistFilters {
  status?: string;
  genre?: string;
  search: string;
}

interface ArtistState {
  view: ArtistView;
  filters: ArtistFilters;
  selectedArtistId: string | null;
  visao360Open: boolean;
  setView: (view: ArtistView) => void;
  setFilters: (filters: Partial<ArtistFilters>) => void;
  resetFilters: () => void;
  selectArtist: (id: string | null) => void;
  openVisao360: (id: string) => void;
  closeVisao360: () => void;
}

const DEFAULT_FILTERS: ArtistFilters = { search: "" };

export const useArtistStore = create<ArtistState>((set) => ({
  view: "list",
  filters: DEFAULT_FILTERS,
  selectedArtistId: null,
  visao360Open: false,

  setView: (view) => set({ view }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectArtist: (id) => set({ selectedArtistId: id }),
  openVisao360: (id) => set({ selectedArtistId: id, visao360Open: true }),
  closeVisao360: () => set({ visao360Open: false }),
}));
