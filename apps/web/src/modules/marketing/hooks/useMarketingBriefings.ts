import { marketingService } from "../services/marketing.service";
import type { MarketingBriefing } from "../types/marketing.types";
import { createResourceHooks } from "./useMarketingResource";

const hooks = createResourceHooks<MarketingBriefing>("briefings", marketingService.briefings, {
  singular: "Briefing",
});

export const useMarketingBriefings = hooks.useList;
export const useCreateBriefing = hooks.useCreate;
export const useUpdateBriefing = hooks.useUpdate;
export const useRemoveBriefing = hooks.useRemove;
