import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AUTOMATION_FLOWS,
  runAutomationFlow,
  type RunFlowOptions,
} from "../services/marketing-automation.service";
import { MARKETING_QUERY_ROOT } from "./useMarketingResource";

export function useAutomationFlows() {
  return AUTOMATION_FLOWS;
}

export function useRunAutomationFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: RunFlowOptions) => runAutomationFlow(options),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [MARKETING_QUERY_ROOT] });
      toast.success(`${result.tasks.length} tarefas geradas pela automação`);
    },
    onError: () => toast.error("Erro ao executar automação"),
  });
}
