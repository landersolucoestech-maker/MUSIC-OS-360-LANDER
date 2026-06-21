import { useQuery } from "@tanstack/react-query";
import { marketingService } from "../services/marketing.service";
import { MARKETING_QUERY_ROOT } from "./useMarketingResource";

export function useMarketingDashboard() {
  return useQuery({
    queryKey: [MARKETING_QUERY_ROOT, "dashboard"],
    queryFn: () => marketingService.getDashboard(),
  });
}

