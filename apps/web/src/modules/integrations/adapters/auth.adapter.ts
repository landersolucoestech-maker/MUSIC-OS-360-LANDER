import type { IAuthProvider } from "@/modules/integrations/dto";
import { createUnavailableAuthProvider } from "./unavailable.provider";

export const authAdapter: IAuthProvider = createUnavailableAuthProvider();
