import { useEffect, useMemo, useState } from "react";
import { leadsService } from "../services";
import type { Lead } from "../types";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setIsLoading(true);
    try {
      setLeads(await leadsService.list());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    leads,
    isLoading,
    metrics: useMemo(() => ({
      total:         leads.length,
      followUps:     leads.filter((lead) => lead.dadosInternosCRM.proximoFollowUp).length,
      // Corrigido: usar valores do novo sistema (lead-form-options STATUS_LEAD_OPTIONS)
      propostas:     leads.filter((lead) => lead.dadosInternosCRM.statusLead === "proposta_enviada").length,
      contratos:     leads.filter((lead) => lead.dadosInternosCRM.statusLead === "fechado").length,
      valorEstimado: leads.reduce((sum, lead) => sum + Number(lead.dadosInternosCRM.valorEstimado ?? 0), 0),
    }), [leads]),
    createLead: async (data: Parameters<typeof leadsService.create>[0]) => {
      await leadsService.create(data);
      await refresh();
    },
    updateLead: async (id: string, data: Partial<Lead>) => {
      await leadsService.update(id, data);
      await refresh();
    },
    deleteLead: async (id: string) => {
      await leadsService.remove(id);
      await refresh();
    },
    refetch: refresh,
  };
}
