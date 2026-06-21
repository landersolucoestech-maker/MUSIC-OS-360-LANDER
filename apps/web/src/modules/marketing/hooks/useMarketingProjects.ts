import { marketingService } from "../services/marketing.service";
import type { MarketingProject } from "../types/marketing.types";
import { createResourceHooks } from "./useMarketingResource";

const hooks = createResourceHooks<MarketingProject>("projects", marketingService.projects, {
  singular: "Projeto",
});

export const useMarketingProjects = hooks.useList;
export const useCreateProject = hooks.useCreate;
export const useUpdateProject = hooks.useUpdate;
export const useRemoveProject = hooks.useRemove;
