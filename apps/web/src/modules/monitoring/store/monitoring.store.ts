import { create } from "zustand";

export type MonitoringTab = "alerts" | "platforms" | "ecad" | "takedowns";

interface MonitoringFilters {
  platform?: string;
  status?: string;
  severity?: "low" | "medium" | "high" | "critical";
  search: string;
}

interface MonitoringState {
  tab: MonitoringTab;
  filters: MonitoringFilters;
  selectedAlertId: string | null;
  ecadModalOpen: boolean;
  ecadRecordId: string | null;
  setTab: (tab: MonitoringTab) => void;
  setFilters: (filters: Partial<MonitoringFilters>) => void;
  resetFilters: () => void;
  selectAlert: (id: string | null) => void;
  openEcadModal: (recordId: string) => void;
  closeEcadModal: () => void;
}

const DEFAULT_FILTERS: MonitoringFilters = { search: "" };

export const useMonitoringStore = create<MonitoringState>((set) => ({
  tab: "alerts",
  filters: DEFAULT_FILTERS,
  selectedAlertId: null,
  ecadModalOpen: false,
  ecadRecordId: null,

  setTab: (tab) => set({ tab, filters: DEFAULT_FILTERS }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectAlert: (id) => set({ selectedAlertId: id }),
  openEcadModal: (recordId) => set({ ecadModalOpen: true, ecadRecordId: recordId }),
  closeEcadModal: () => set({ ecadModalOpen: false, ecadRecordId: null }),
}));
