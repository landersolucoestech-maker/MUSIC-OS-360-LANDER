import { create } from "zustand";

export type ContactAgendaItem = {
  id: string;
  contactId: string;
  title: string;
  startsAt: string;
  status: "scheduled" | "done" | "cancelled";
};

type ContactAgendaStore = {
  agendaByContactId: Record<string, ContactAgendaItem[]>;
  setAgenda: (contactId: string, agenda: ContactAgendaItem[]) => void;
};

export const useContactAgendaStore = create<ContactAgendaStore>((set) => ({
  agendaByContactId: {},
  setAgenda: (contactId, agenda) => set((state) => ({ agendaByContactId: { ...state.agendaByContactId, [contactId]: agenda } })),
}));
