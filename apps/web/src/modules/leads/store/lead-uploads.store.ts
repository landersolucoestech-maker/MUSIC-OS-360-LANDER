import { create } from "zustand";
import type { LeadUpload } from "../types";

type LeadUploadsStore = {
  uploadsByLeadId: Record<string, LeadUpload[]>;
  setUploads: (leadId: string, uploads: LeadUpload[]) => void;
  clearUploads: (leadId: string) => void;
};

export const useLeadUploadsStore = create<LeadUploadsStore>((set) => ({
  uploadsByLeadId: {},
  setUploads: (leadId, uploads) => set((state) => ({ uploadsByLeadId: { ...state.uploadsByLeadId, [leadId]: uploads } })),
  clearUploads: (leadId) => set((state) => {
    const next = { ...state.uploadsByLeadId };
    delete next[leadId];
    return { uploadsByLeadId: next };
  }),
}));
