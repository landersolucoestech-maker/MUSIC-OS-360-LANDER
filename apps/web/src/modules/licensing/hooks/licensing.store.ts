import { create } from "zustand";

export type LicensingTab = "licenses" | "requests" | "recebimentos externos de direitos";

interface LicensingFilters {
  status?: string;
  type?: string;
  search: string;
}

interface LicensingState {
  tab: LicensingTab;
  filters: LicensingFilters;
  selectedLicenseId: string | null;
  setTab: (tab: LicensingTab) => void;
  setFilters: (filters: Partial<LicensingFilters>) => void;
  resetFilters: () => void;
  selectLicense: (id: string | null) => void;
}

const DEFAULT_FILTERS: LicensingFilters = { search: "" };

export const useLicensingStore = create<LicensingState>((set) => ({
  tab: "licenses",
  filters: DEFAULT_FILTERS,
  selectedLicenseId: null,

  setTab: (tab) => set({ tab, filters: DEFAULT_FILTERS }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectLicense: (id) => set({ selectedLicenseId: id }),
}));
