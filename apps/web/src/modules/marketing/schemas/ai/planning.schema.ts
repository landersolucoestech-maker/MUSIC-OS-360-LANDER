import type { PlanningContext } from "../../services/musicIntelligenceEngine";

export function validatePlanningContext(value: PlanningContext) {
  return Boolean(value.period && Array.isArray(value.items));
}
