/**
 * Tipos canônicos do módulo crm.
 * Lead types vivem em @/modules/leads.
 */
export type {
  Cliente,
  ClienteInsert,
  ClienteUpdate,
} from "../hooks/useClientes";

export type {
  Contato,
  ContatoInsert,
  ContatoUpdate,
  ContatoWithRelations,
} from "../hooks/useContatos";
