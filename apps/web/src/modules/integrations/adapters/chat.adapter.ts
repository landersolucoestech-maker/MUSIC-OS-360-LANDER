import type { IChatProvider } from "@/modules/integrations/dto";
import { createUnavailableChatProvider } from "./unavailable.provider";

export const chatAdapter: IChatProvider = createUnavailableChatProvider();
