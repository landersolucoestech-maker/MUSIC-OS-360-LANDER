import { create } from "zustand";

export type SettingsTab =
  | "company"
  | "users"
  | "roles"
  | "integrations"
  | "billing"
  | "notifications"
  | "security";

interface SettingsState {
  activeTab: SettingsTab;
  dirtyTabs: Set<SettingsTab>;
  setTab: (tab: SettingsTab) => void;
  markDirty: (tab: SettingsTab) => void;
  clearDirty: (tab: SettingsTab) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  activeTab: "company",
  dirtyTabs: new Set(),

  setTab: (tab) => set({ activeTab: tab }),
  markDirty: (tab) =>
    set((s) => ({ dirtyTabs: new Set([...s.dirtyTabs, tab]) })),
  clearDirty: (tab) =>
    set((s) => {
      const next = new Set(s.dirtyTabs);
      next.delete(tab);
      return { dirtyTabs: next };
    }),
}));
