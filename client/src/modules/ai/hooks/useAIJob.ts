/**
 * modules/ai/hooks/useAIJob.ts
 *
 * Hook reactivo para acompanhar um job assíncrono da AIJobQueue.
 *
 * Subscreve-se ao job via AIJobQueue.subscribeToJob() e actualiza
 * estado sempre que o worker actualiza o status do job.
 *
 * Uso:
 *   const job = useCase.enqueue(input);
 *   const { status, result, error, isComplete } = useAIJob(job.jobId);
 */

import { useState, useEffect, useCallback } from "react";
import { getAIJobQueue } from "../queues/AIJobQueue";
import type { AIJob, AIJobStatus, AIResponse } from "../domain/ai.types";

// ─── State ────────────────────────────────────────────────────────────────────

interface UseAIJobState {
  job:        AIJob | null;
  status:     AIJobStatus | null;
  result:     AIResponse | null;
  error:      string | null;
  isComplete: boolean;
  isPending:  boolean;
  isFailed:   boolean;
}

const INITIAL_STATE: UseAIJobState = {
  job:        null,
  status:     null,
  result:     null,
  error:      null,
  isComplete: false,
  isPending:  true,
  isFailed:   false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAIJob(jobId: string | null | undefined): UseAIJobState & {
  cancel: () => void;
} {
  const queue = getAIJobQueue();

  const [state, setState] = useState<UseAIJobState>(() => {
    if (!jobId) return INITIAL_STATE;
    const existingJob = queue.getJob(jobId);
    return existingJob ? deriveState(existingJob) : INITIAL_STATE;
  });

  useEffect(() => {
    if (!jobId) return;

    // Estado inicial do job (pode já existir)
    const currentJob = queue.getJob(jobId);
    if (currentJob) {
      setState(deriveState(currentJob));
      if (isTerminal(currentJob.status)) return;
    }

    // Subscrever actualizações
    const unsubscribe = queue.subscribeToJob(jobId, (updatedJob) => {
      setState(deriveState(updatedJob));
    });

    return unsubscribe;
  }, [jobId, queue]);

  const cancel = useCallback(() => {
    if (!jobId) return;
    queue.update(jobId, { status: "failed", error: "Cancelado pelo utilizador." });
  }, [jobId, queue]);

  return { ...state, cancel };
}

// ─── Multi-job hook ────────────────────────────────────────────────────────────

interface UseAIJobsState {
  jobs:       AIJob[];
  allComplete: boolean;
  anyFailed:  boolean;
  progress:   number;
}

export function useAIJobs(jobIds: string[]): UseAIJobsState {
  const queue = getAIJobQueue();

  const getJobs = useCallback(() => {
    return jobIds.map((id) => queue.getJob(id)).filter(Boolean) as AIJob[];
  }, [jobIds, queue]);

  const [jobs, setJobs] = useState<AIJob[]>(getJobs);

  useEffect(() => {
    if (jobIds.length === 0) return;

    const unsubscribes = jobIds.map((id) =>
      queue.subscribeToJob(id, () => {
        setJobs(getJobs());
      }),
    );

    return () => unsubscribes.forEach((fn) => fn());
  }, [jobIds, queue, getJobs]);

  const allComplete = jobs.length > 0 && jobs.every((j) => isTerminal(j.status));
  const anyFailed   = jobs.some((j) => j.status === "failed");
  const doneCount   = jobs.filter((j) => isTerminal(j.status)).length;
  const progress    = jobIds.length > 0 ? Math.round((doneCount / jobIds.length) * 100) : 0;

  return { jobs, allComplete, anyFailed, progress };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveState(job: AIJob): UseAIJobState {
  return {
    job,
    status:     job.status,
    result:     job.response ?? null,
    error:      job.error ?? null,
    isComplete: job.status === "completed",
    isPending:  job.status === "pending" || job.status === "processing" || job.status === "retrying",
    isFailed:   job.status === "failed",
  };
}

function isTerminal(status: AIJobStatus): boolean {
  return status === "completed" || status === "failed";
}
