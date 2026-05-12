/**
 * integrations/mappers/index.ts
 *
 * Barrel de todos os mappers de integração.
 * Estes mappers são a ÚNICA fonte de verdade para transformações
 * entre entidades de domínio e DTOs de integrações externas.
 *
 * REGRA: nenhum componente ou hook faz transformação inline.
 * Importam sempre daqui.
 */

export { contratoMapper } from "./contrato.mapper";
export type { ContratoEntity }                    from "./contrato.mapper";

export { transacaoMapper } from "./transacao.mapper";
export type {
  TransacaoEntity,
  OfxEntry,
  TransacaoCsvRow,
}                                                 from "./transacao.mapper";
