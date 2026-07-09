import type { IPaymentsProvider } from "@/modules/integrations/dto";
import { createUnavailablePaymentsProvider } from "./unavailable.provider";

export const paymentsAdapter: IPaymentsProvider = createUnavailablePaymentsProvider();
