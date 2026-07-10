/**
 * modules/support/data/support-source.ts
 *
 * Gate de exposição dos mocks de Support que não têm endpoint real ainda.
 * - SUPPORT_SYSTEM_SERVICES, SUPPORT_INCIDENTS, SUPPORT_KNOWLEDGE_CATEGORIES:
 *   sem backend implementado → empty em produção.
 *
 * Tickets reais usam o endpoint /support-tickets via useTickets em useSupport.ts.
 */
import type {
  SystemService, Incident, KnowledgeCategory,
} from "../types";

export const SUPPORT_DATA_IS_MOCK = false as const;

export const SUPPORT_SYSTEM_SERVICES: SystemService[]      = [];
export const SUPPORT_INCIDENTS: Incident[]                 = [];
export const SUPPORT_KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [];
