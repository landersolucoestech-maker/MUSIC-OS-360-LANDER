/**
 * modules/support/data/support-source.ts
 *
 * Gate de exposição dos mocks de Support que não têm endpoint real ainda.
 * - SUPPORT_SYSTEM_SERVICES, SUPPORT_INCIDENTS: sem backend implementado →
 *   empty em produção.
 *
 * Tickets reais usam /support-tickets via useTickets em useSupport.ts.
 * Base de Conhecimento (categorias/artigos) usa backend real via
 * useKnowledgeCategories/useKnowledgeArticles — não lê mais deste arquivo.
 */
import type {
  SystemService, Incident,
} from "../types";

export const SUPPORT_DATA_IS_MOCK = false as const;

export const SUPPORT_SYSTEM_SERVICES: SystemService[]      = [];
export const SUPPORT_INCIDENTS: Incident[]                 = [];
