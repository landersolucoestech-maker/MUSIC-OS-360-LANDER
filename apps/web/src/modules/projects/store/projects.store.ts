import { create } from "zustand";

export type ProjectsTab = "list" | "tasks" | "timeline";

interface ProjectsFilters {
  status?: string;
  artistId?: string;
  search: string;
}

interface ProjectsState {
  tab: ProjectsTab;
  filters: ProjectsFilters;
  selectedProjectId: string | null;
  setTab: (tab: ProjectsTab) => void;
  setFilters: (filters: Partial<ProjectsFilters>) => void;
  resetFilters: () => void;
  selectProject: (id: string | null) => void;
}

const DEFAULT_FILTERS: ProjectsFilters = { search: "" };

export const useProjectsStore = create<ProjectsState>((set) => ({
  tab: "list",
  filters: DEFAULT_FILTERS,
  selectedProjectId: null,

  setTab: (tab) => set({ tab }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  selectProject: (id) => set({ selectedProjectId: id }),
}));
