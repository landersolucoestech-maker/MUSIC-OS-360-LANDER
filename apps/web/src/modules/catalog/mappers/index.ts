/**
 * catalog/mappers/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Barrel export — re-exports the canonical catalog mapper source of truth.
 * Import from here, not directly from components/.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type {
  ParticipanteForm,
  FonogramaParticipante,
  ParticipacaoCategoria,
  DuracaoParts,
  IsrcParts,
  ObraIAElement,
  ObraFormFields,
  FormToObraInput,
  FonogramaFormFields,
} from "./registro-musicas.mapper";

export {
  dbStatusToSelect,
  normalizeStatusForDb,
  parseDuracao,
  formatDuracao,
  parseIsrc,
  joinIsrc,
  obraToParticipantes,
  participantesToCompositoresLetristas,
  obraTitulo,
  obraOutrosTitulos,
  obraReferenciasConexas,
  obraLetraCompleta,
  obraCriadaPorIA,
  obraTipoIAValue,
  obraIaHarmonia,
  obraIaMelodia,
  obraIaLetra,
  exportInstrumental,
  exportCriadaPorIA,
  exportTipoIA,
  exportElementosIA,
  exportParticipantes,
  exportOutrosTitulos,
  exportReferenciasConexas,
  exportLetraCompleta,
  importParseParticipantes,
  importSplitArray,
  importParseElementosIA,
  obraToFormFields,
  formToObraPayload,
  fonogramaToFormFields,
  projetoToObraSeed,
  fonogramaToParticipacao,
} from "./registro-musicas.mapper";
