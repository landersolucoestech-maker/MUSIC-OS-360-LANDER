import { PRIORITY_LABEL, PRIORITY_TONE } from "../constants/marketing.constants";
import type { Priority } from "../types/marketing.types";
import { MarketingBadge } from "./MarketingStatusBadge";

export function MarketingPriorityBadge({ priority }: { priority: Priority }) {
  return <MarketingBadge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</MarketingBadge>;
}
