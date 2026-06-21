import { marketingService } from "../services/marketing.service";
import type { MarketingCampaign } from "../types/marketing.types";
import { createResourceHooks } from "./useMarketingResource";
import { MARKETING_QUERY_ROOT } from "./useMarketingResource";
import { useQuery } from "@tanstack/react-query";

const hooks = createResourceHooks<MarketingCampaign>("campaigns", marketingService.campaigns, {
  singular: "Campanha",
});

export const useMarketingCampaigns = hooks.useList;
export const useCreateCampaign = hooks.useCreate;
export const useUpdateCampaign = hooks.useUpdate;
export const useRemoveCampaign = hooks.useRemove;

export function useCampaignBuilderConfig() {
  return useQuery({
    queryKey: [MARKETING_QUERY_ROOT, "campaign-builder-config"],
    queryFn: () => marketingService.getCampaignBuilderConfig(),
  });
}

