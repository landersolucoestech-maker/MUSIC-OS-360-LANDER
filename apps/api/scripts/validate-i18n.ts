/**
 * scripts/validate-i18n.ts  ·  FASE 2.1 — Build guard de i18n (pt-BR) BLOQUEANTE.
 *
 * Falha o build (exit ≠ 0) se houver QUALQUER:
 *   - coluna reportável visível sem label;
 *   - coluna de contrato (export/import/filter/sort/search/identity/display/date)
 *     sem label;
 *   - coluna sensível listada como exportável/importável;
 *   - label vazio / igual à chave crua / com termo proibido em inglês;
 *   - ambiguidade no reverse map dos rótulos críticos.
 *
 * Critério: 0 untranslated · 0 unsafe · 0 ambiguous · 0 forbidden.
 * Uso: npm run validate:i18n   (integrável ao CI)
 */
import {
  FIELD_LABELS_PT_BR, FIELD_KEYS_BY_LABEL_PT_BR, tryGetFieldLabelPtBr,
} from '../src/modules/reports/i18n/field-labels.pt-br';
import { EntityMetadataService } from '../src/modules/reports/entity-metadata.service';
import { ReportEntityDefinitionService } from '../src/modules/reports/definitions/report-entity-definition.service';

const FORBIDDEN_ENGLISH = [
  'Name', 'Phone', 'Email', 'Website', 'Address', 'Country', 'State', 'Notes',
  'Priority', 'Timeline', 'Attachments', 'Tags', 'Manager', 'Company',
  'Contact Type', 'Signing Platform', 'Soundcloud Url', 'Apple Music Url', 'Url',
];

const errors: string[] = [];
const entries = Object.entries(FIELD_LABELS_PT_BR);

// 1: integridade do dicionário.
for (const [key, label] of entries) {
  if (!label || !label.trim()) errors.push(`Label vazio para "${key}".`);
  if (label.trim() === key) errors.push(`Label expõe a chave crua: "${key}".`);
  for (const term of FORBIDDEN_ENGLISH) {
    if (new RegExp(`\\b${term.replace(/ /g, '\\s')}\\b`, 'i').test(label)) {
      errors.push(`Label em inglês: "${key}"="${label}" contém "${term}".`);
    }
  }
}

// 2: reverse map dos rótulos críticos.
for (const [label, expected] of [
  ['link do spotify', 'spotifyArtistId'],
  ['link do youtube', 'youtubeChannelId'],
  ['nome do empresário', 'managerName'],
  ['empresa', 'companyName'],
  ['plataforma de assinatura', 'signingPlatform'],
] as Array<[string, string]>) {
  if (FIELD_KEYS_BY_LABEL_PT_BR[label] !== expected) {
    errors.push(`Reverse map ambíguo: "${label}" → "${FIELD_KEYS_BY_LABEL_PT_BR[label]}" (esperado "${expected}").`);
  }
}

// 3: TODA coluna reportável visível precisa de label (BLOQUEANTE).
const inv = new EntityMetadataService().scan();
for (const e of inv.entities) {
  if (!e.reportable) continue;
  for (const c of e.columns) {
    const internal =
      c.primary || c.generated || c.isTenantId || c.isCreatedAt || c.isUpdatedAt ||
      c.isDeletedAt || /_id$/.test(c.name) ||
      ['created_by', 'updated_by', 'uploaded_by', 'approved_by', 'org_slug', 'metadata'].includes(c.name);
    const sensitive = /_encrypted$|token|password|secret|hash|credential/i.test(c.name);
    if (!internal && !sensitive && c.label === null) {
      errors.push(`Coluna reportável sem label: ${e.tableName}.${c.name}`);
    }
  }
}

// 4: TODA coluna usada nos contratos precisa de label; sensível não exportável.
const defs = new ReportEntityDefinitionService(new EntityMetadataService()).getDefinitions();
for (const d of defs) {
  const contractCols = new Set([
    d.identityColumn, d.displayColumn, d.dateColumn,
    ...d.exportableColumns, ...d.importableColumns, ...d.filterableColumns,
    ...d.sortableColumns, ...d.searchableColumns,
  ]);
  for (const col of contractCols) {
    if (tryGetFieldLabelPtBr(col) === null) {
      errors.push(`Coluna de contrato sem label: ${d.tableName}.${col}`);
    }
  }
  for (const sens of d.sensitiveColumns) {
    if (d.exportableColumns.includes(sens) || d.importableColumns.includes(sens)) {
      errors.push(`Coluna sensível exposta em export/import: ${d.tableName}.${sens}`);
    }
  }
}

console.log(`[validate:i18n] dicionário: ${entries.length} campos · contratos: ${defs.length} entidades`);

if (errors.length > 0) {
  console.error(`\n[validate:i18n] FALHOU — ${errors.length} violação(ões):`);
  for (const e of errors.slice(0, 80)) console.error('  ✗ ' + e);
  if (errors.length > 80) console.error(`  … +${errors.length - 80}`);
  process.exit(1);
}
console.log('[validate:i18n] OK — 0 untranslated · 0 unsafe · 0 ambiguous · 0 forbidden.');
