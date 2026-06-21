import { marketingService } from "../services/marketing.service";
import type { MarketingTask } from "../types/marketing.types";
import { createResourceHooks } from "./useMarketingResource";

const hooks = createResourceHooks<MarketingTask>("tasks", marketingService.tasks, {
  singular: "Tarefa",
});

export const useMarketingTasks = hooks.useList;
export const useCreateTask = hooks.useCreate;
export const useUpdateTask = hooks.useUpdate;
export const useRemoveTask = hooks.useRemove;
