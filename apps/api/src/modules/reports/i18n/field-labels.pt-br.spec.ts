import {
  FIELD_LABELS_PT_BR, FIELD_KEYS_BY_LABEL_PT_BR,
  normalizeFieldKey, getFieldLabelPtBr, fieldKeyForLabelPtBr,
} from './field-labels.pt-br';

/** FASE 2 — garante que nenhum label visível nasce de chave técnica em inglês. */

const FORBIDDEN_ENGLISH = [
  'Name', 'Phone', 'Email', 'Website', 'Address', 'Country', 'State', 'Notes',
  'Priority', 'Timeline', 'Attachments', 'Tags', 'Manager', 'Company',
  'Contact Type', 'Signing Platform', 'Soundcloud Url', 'Apple Music Url', 'Url',
];

describe('field-labels.pt-br — camada central de labels', () => {
  const entries = Object.entries(FIELD_LABELS_PT_BR);

  // ── Teste 1: cobertura — todo label existe e é não-vazio ───────────────────
  it('todo campo do dicionário tem label pt-BR não-vazio', () => {
    for (const [key, label] of entries) {
      expect(typeof label).toBe('string');
      expect(label.trim().length).toBeGreaterThan(0);
      expect(key.trim().length).toBeGreaterThan(0);
    }
  });

  // ── Teste 2: nenhum label expõe a chave técnica crua ───────────────────────
  // (case-sensitive: capitalização/acentuação pt-BR de uma chave pt é válida —
  //  ex.: "vencimento" → "Vencimento"; inglês cru é barrado no Teste 3.)
  it('nenhum label é exatamente a chave técnica crua', () => {
    for (const [key, label] of entries) {
      expect(label).not.toBe(key);
    }
  });

  // ── Teste 3: nenhum termo proibido em inglês ───────────────────────────────
  it('nenhum label contém termo proibido em inglês', () => {
    const offenders: string[] = [];
    for (const [key, label] of entries) {
      for (const term of FORBIDDEN_ENGLISH) {
        if (new RegExp(`\\b${term.replace(/ /g, '\\s')}\\b`, 'i').test(label)) {
          offenders.push(`${key}="${label}" (contém "${term}")`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // ── Teste 4: round-trip label ↔ chave ──────────────────────────────────────
  it('round-trip: chave técnica → label pt-BR → chave canônica', () => {
    const cases: Array<[string, string, string]> = [
      ['manager_name', 'Nome do empresário', 'managerName'],
      ['company_name', 'Empresa', 'companyName'],
      ['signing_platform', 'Plataforma de assinatura', 'signingPlatform'],
      ['spotify_artist_id', 'Link do Spotify', 'spotifyArtistId'],
      ['youtube_channel_id', 'Link do YouTube', 'youtubeChannelId'],
    ];
    for (const [techKey, expectedLabel, canonical] of cases) {
      expect(getFieldLabelPtBr(techKey)).toBe(expectedLabel);
      expect(fieldKeyForLabelPtBr(expectedLabel)).toBe(canonical);
      expect(normalizeFieldKey(techKey)).toBe(canonical);
    }
  });

  // ── Teste 5: label ausente quebra (sem fallback visual) ────────────────────
  it('getFieldLabelPtBr lança erro quando o label não existe', () => {
    expect(() => getFieldLabelPtBr('unknownField')).toThrow(/Label pt-BR ausente/);
    expect(() => getFieldLabelPtBr('shippingMethod')).toThrow();
  });

  it('normalizeFieldKey reconhece snake/camel/Pascal/kebab', () => {
    expect(normalizeFieldKey('manager_name')).toBe('managerName');
    expect(normalizeFieldKey('managerName')).toBe('managerName');
    expect(normalizeFieldKey('ManagerName')).toBe('managerName');
    expect(normalizeFieldKey('manager-name')).toBe('managerName');
    expect(normalizeFieldKey('spotify_artist_id')).toBe('spotifyArtistId');
  });

  it('reverse map não tem ambiguidade nos rótulos críticos', () => {
    expect(FIELD_KEYS_BY_LABEL_PT_BR['link do spotify']).toBe('spotifyArtistId');
    expect(FIELD_KEYS_BY_LABEL_PT_BR['nome do empresário']).toBe('managerName');
  });
});
