import type { IRightsProvider, RightsEntityId } from "@/modules/integrations/dto";
import { createUnavailableRightsProvider } from "./unavailable.provider";

export function getRightsAdapter(entity: RightsEntityId): IRightsProvider {
  return createUnavailableRightsProvider(entity);
}
