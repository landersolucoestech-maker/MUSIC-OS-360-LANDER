import type { IEmailProvider } from "@/modules/integrations/dto";
import { createUnavailableEmailProvider } from "./unavailable.provider";

export const emailAdapter: IEmailProvider = createUnavailableEmailProvider();
