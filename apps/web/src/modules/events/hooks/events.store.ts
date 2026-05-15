import { create } from "zustand";

export type EventsView = "list" | "calendar";

interface EventsFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  search: string;
}

interface EventsState {
  view: EventsView;
  filters: EventsFilters;
  selectedEventId: string | null;
  setView: (view: EventsView) => void;
  setFilters: (filters: Partial<EventsFilters>) => void;
  resetFilters: () => void;
  selectEvent: (id: string | null) => void;
}

const DEFAULT_FILTERS: EventsFilters = { search: "" };

export const useEventsStore = create<EventsState>((set) => ({
  view: "list",
  filters: DEFAULT_FILTERS,
  selectedEventId: null,

  setView: (view) => set({ view }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectEvent: (id) => set({ selectedEventId: id }),
}));
