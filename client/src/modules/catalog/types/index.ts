/**
 * Tipos canônicos do módulo catalog.
 * Services e código novo devem importar daqui.
 */
export type {
  Obra,
  ObraInsert,
  ObraUpdate,
  ObraWithRelations,
} from "../hooks/useObras";

export type {
  Fonograma,
  FonogramaInsert,
  FonogramaUpdate,
  FonogramaWithRelations,
} from "../hooks/useFonogramas";
