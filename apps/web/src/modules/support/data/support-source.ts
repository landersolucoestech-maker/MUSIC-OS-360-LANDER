/**
 * modules/support/data/support-source.ts
 *
 * Gate de exposição dos mocks de Support que não têm endpoint real ainda.
 * - SUPPORT_SYSTEM_SERVICES, SUPPORT_INCIDENTS, SUPPORT_KNOWLEDGE_CATEGORIES:
 *   sem backend implementado → empty em produção.
 *
 * Tickets reais usam o endpoint /support-tickets via useTickets em useSupport.ts.
 */
import { IS_PROD } from "@/shared/lib/env";
import type {
  SystemService, Incident, KnowledgeCategory,
} from "../types";
import {
  MOCK_SYSTEM_SERVICES,
  MOCK_INCIDENTS,
  MOCK_KNOWLEDGE_CATEGORIES,
} from "./mockSupport";

export const SUPPORT_DATA_IS_MOCK: boolean = !IS_PROD;

export const SUPPORT_SYSTEM_SERVICES: SystemService[]      = IS_PROD ? [] : MOCK_SYSTEM_SERVICES;
export const SUPPORT_INCIDENTS: Incident[]                 = IS_PROD ? [] : MOCK_INCIDENTS;
export const SUPPORT_KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = IS_PROD ? [] : MOCK_KNOWLEDGE_CATEGORIES;
