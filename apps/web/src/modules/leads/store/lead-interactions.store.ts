import { create } from "zustand";
import type { LeadInteraction } from "../types";

type LeadInteractionsStore = {
  interactionsByLeadId: Record<string, LeadInteraction[]>;
  setInteractions: (leadId: string, interactions: LeadInteraction[]) => void;
  appendInteraction: (leadId: string, interaction: LeadInteraction) => void;
};

export const useLeadInteractionsStore = create<LeadInteractionsStore>((set) => ({
  interactionsByLeadId: {},
  setInteractions: (leadId, interactions) => set((state) => ({ interactionsByLeadId: { ...state.interactionsByLeadId, [leadId]: interactions } })),
  appendInteraction: (leadId, interaction) => set((state) => ({
    interactionsByLeadId: {
      ...state.interactionsByLeadId,
      [leadId]: [interaction, ...(state.interactionsByLeadId[leadId] ?? [])],
    },
  })),
}));
