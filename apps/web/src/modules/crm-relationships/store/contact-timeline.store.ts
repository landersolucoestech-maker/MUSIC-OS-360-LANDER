import { create } from "zustand";
import type { ContactTimelineItem } from "../types";

type ContactTimelineStore = {
  timelineByContactId: Record<string, ContactTimelineItem[]>;
  setTimeline: (contactId: string, timeline: ContactTimelineItem[]) => void;
  appendTimelineItem: (contactId: string, item: ContactTimelineItem) => void;
};

export const useContactTimelineStore = create<ContactTimelineStore>((set) => ({
  timelineByContactId: {},
  setTimeline: (contactId, timeline) => set((state) => ({ timelineByContactId: { ...state.timelineByContactId, [contactId]: timeline } })),
  appendTimelineItem: (contactId, item) => set((state) => ({
    timelineByContactId: {
      ...state.timelineByContactId,
      [contactId]: [item, ...(state.timelineByContactId[contactId] ?? [])],
    },
  })),
}));
