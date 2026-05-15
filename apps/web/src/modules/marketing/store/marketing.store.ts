import { create } from "zustand";

export type MarketingTab = "campaigns" | "calendar" | "briefing" | "tasks" | "ai";

interface MarketingFilters {
  status?: string;
  platform?: string;
  month?: string;
  search: string;
}

interface MarketingState {
  tab: MarketingTab;
  filters: MarketingFilters;
  selectedCampaignId: string | null;
  setTab: (tab: MarketingTab) => void;
  setFilters: (filters: Partial<MarketingFilters>) => void;
  resetFilters: () => void;
  selectCampaign: (id: string | null) => void;
}

const DEFAULT_FILTERS: MarketingFilters = { search: "" };

export const useMarketingStore = create<MarketingState>((set) => ({
  tab: "campaigns",
  filters: DEFAULT_FILTERS,
  selectedCampaignId: null,

  setTab: (tab) => set({ tab, filters: DEFAULT_FILTERS }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectCampaign: (id) => set({ selectedCampaignId: id }),
}));
