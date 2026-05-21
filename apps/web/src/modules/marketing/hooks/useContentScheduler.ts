import { useCallback } from "react";
import { startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import { useConteudos } from "./useConteudos";
import type { ConteudoInsert, ConteudoWithRelations } from "./useConteudos";
import { publishingService } from "../services/publishing.service";
import type { PublishNowResult, SchedulePostResult } from "../services/publishing.service";

export type { PublishNowResult, SchedulePostResult };

export interface UseContentSchedulerReturn {
  conteudos:          ConteudoWithRelations[];
  isLoading:          boolean;
  scheduleContent:    (payload: ConteudoInsert & { scheduledAt: string }) => Promise<SchedulePostResult>;
  publishNow:         (conteudo: ConteudoWithRelations) => Promise<PublishNowResult>;
  getScheduledForWeek:(weekStart: Date) => ConteudoWithRelations[];
  getByStatus:        (status: string) => ConteudoWithRelations[];
}

export function useContentScheduler(): UseContentSchedulerReturn {
  const { conteudos, isLoading, addConteudo, updateConteudo } = useConteudos();

  const scheduleContent = useCallback(async (
    payload: ConteudoInsert & { scheduledAt: string },
  ): Promise<SchedulePostResult> => {
    const { scheduledAt, ...rest } = payload;

    const newConteudo: ConteudoWithRelations = await addConteudo.mutateAsync({
      ...rest,
      status:             "agendado",
      data_publicacao:    scheduledAt.slice(0, 10),
      horario_publicacao: scheduledAt.slice(11, 16),
    });

    const result = await publishingService.schedulePost(newConteudo, scheduledAt);

    return result;
  }, [addConteudo]);

  const publishNow = useCallback(async (
    conteudo: ConteudoWithRelations,
  ): Promise<PublishNowResult> => {
    const result = await publishingService.publishNow(conteudo);

    if (result.success) {
      await updateConteudo.mutateAsync({
        id:     conteudo.id,
        status: "publicado",
        url:    result.url ?? null,
      });
    }

    return result;
  }, [updateConteudo]);

  const getScheduledForWeek = useCallback((weekStart: Date): ConteudoWithRelations[] => {
    const ws = startOfWeek(weekStart, { weekStartsOn: 1 });
    const we = endOfWeek(weekStart,   { weekStartsOn: 1 });
    return conteudos.filter((c) => {
      const dateStr = c.data_publicacao;
      if (!dateStr) return false;
      try {
        const d = parseISO(dateStr.slice(0, 10));
        return isWithinInterval(d, { start: ws, end: we });
      } catch { return false; }
    });
  }, [conteudos]);

  const getByStatus = useCallback((status: string): ConteudoWithRelations[] => {
    return conteudos.filter((c) => c.status === status);
  }, [conteudos]);

  return { conteudos, isLoading, scheduleContent, publishNow, getScheduledForWeek, getByStatus };
}
