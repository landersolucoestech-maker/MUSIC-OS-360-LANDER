import { useEffect, useState } from "react";
import { clientsService, type ClientTimelineEntry } from "../services/clients.service";

/**
 * Timeline real de um cliente (persistida em activity_logs — sobrevive a
 * reload). Substitui o antigo useContactTimelineStore (Zustand em memória,
 * nunca usado por nenhum componente, removido na Parte 80).
 */
export function useClientTimeline(clientId: string | null) {
  const [entries, setEntries] = useState<ClientTimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function refresh() {
    if (!clientId) { setEntries([]); return; }
    setIsLoading(true);
    try {
      setEntries(await clientsService.getTimeline(clientId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return {
    entries,
    isLoading,
    error,
    addEntry: async (type: string, description: string) => {
      if (!clientId) return;
      await clientsService.addTimelineEntry(clientId, { type, description });
      await refresh();
    },
    refetch: refresh,
  };
}
