import type { IStorageProvider } from "@/modules/integrations/dto";
import { createUnavailableStorageProvider } from "./unavailable.provider";

export const storageAdapter: IStorageProvider = createUnavailableStorageProvider();
