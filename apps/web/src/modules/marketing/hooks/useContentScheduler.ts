import { useState, useCallback } from "react";
import { publishingService } from "../services/publishing.service";
import type { PublishResult, ScheduleResult } from "../services/publishing.service";
import type { ConteudoWithRelations } from "../types/marketing.types";

export type SchedulerStatus = "idle" | "publishing" | "scheduling" | "success" | "error";

export interface ContentSchedulerState {
  status:        SchedulerStatus;
  publishResult?: PublishResult;
  scheduleResult?: ScheduleResult;
  error?:        string;
}

export interface UseContentSchedulerReturn extends ContentSchedulerState {
  publish:  (conteudo: ConteudoWithRelations, mediaUrl?: string) => Promise<PublishResult>;
  schedule: (conteudo: ConteudoWithRelations, scheduledAt: string, mediaUrl?: string) => Promise<ScheduleResult>;
  reset:    () => void;
}

export function useContentScheduler(): UseContentSchedulerReturn {
  const [state, setState] = useState<ContentSchedulerState>({ status: "idle" });

  const reset = useCallback(() => setState({ status: "idle" }), []);

  const publish = useCallback(async (
    conteudo: ConteudoWithRelations,
    mediaUrl = "",
  ): Promise<PublishResult> => {
    setState({ status: "publishing" });
    const result = await publishingService.publish(conteudo, mediaUrl);
    if (result.success) {
      setState({ status: "success", publishResult: result });
    } else {
      setState({ status: "error", publishResult: result, error: result.error });
    }
    return result;
  }, []);

  const schedule = useCallback(async (
    conteudo: ConteudoWithRelations,
    scheduledAt: string,
    mediaUrl = "",
  ): Promise<ScheduleResult> => {
    setState({ status: "scheduling" });
    const result = await publishingService.schedule(conteudo, scheduledAt, mediaUrl);
    if (result.success) {
      setState({ status: "success", scheduleResult: result });
    } else {
      setState({ status: "error", scheduleResult: result, error: result.error });
    }
    return result;
  }, []);

  return { ...state, publish, schedule, reset };
}
