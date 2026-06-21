import { marketingService } from "../services/marketing.service";
import type { MarketingContent } from "../types/marketing.types";
import { createResourceHooks } from "./useMarketingResource";

const hooks = createResourceHooks<MarketingContent>("contents", marketingService.contents, {
  singular: "Conteúdo",
});

export const useMarketingContents = hooks.useList;
export const useCreateContent = hooks.useCreate;
export const useUpdateContent = hooks.useUpdate;
export const useRemoveContent = hooks.useRemove;
