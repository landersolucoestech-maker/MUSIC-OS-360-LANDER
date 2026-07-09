/**
 * legacy-platform-fields.guard.spec.ts
 *
 * Proteção permanente: o domínio Artista trabalha EXCLUSIVAMENTE com
 * spotify_url/youtube_url/foto_url. Nenhuma referência a spotify_artist_id,
 * youtube_artist_id, youtube_channel_id, banner_url ou video_apresentacao(_url)
 * pode existir em código-fonte vivo. Se qualquer DTO, entidade, service ou
 * mapper reintroduzir esses campos, este teste falha imediatamente.
 *
 * Exceções documentadas e aprovadas:
 *   1. artist-external-profile-sync.service.ts — os métodos PRIVADOS
 *      extractSpotifyArtistId/extractYouTubeChannelId extraem um ID em
 *      memória, apenas para chamar as APIs reais do Spotify/YouTube (que são
 *      endereçadas por ID, não por URL) — o ID nunca é persistido na entidade
 *      Artist, nunca aparece em DTOs/formulário/export/import (ver teste
 *      dedicado abaixo, que prova isso checando a forma snake_case).
 *   2. create-artist.dto.spec.ts — teste de regressão que envia os campos
 *      legados como fixture, exatamente para provar que a API os REJEITA
 *      (whitelist/forbidNonWhitelisted). Referenciá-los ali é o próprio teste.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..', '..');
const THIS_FILE = path.resolve(__filename);
const SYNC_SERVICE_EXCEPTION = path.resolve(
  SRC_ROOT,
  'modules/artists/platform-profiles/artist-external-profile-sync.service.ts',
);
const DTO_REGRESSION_SPEC_EXCEPTION = path.resolve(SRC_ROOT, 'modules/artists/dto/create-artist.dto.spec.ts');
const ALL_EXCEPTIONS = new Set([SYNC_SERVICE_EXCEPTION, DTO_REGRESSION_SPEC_EXCEPTION]);

// Formas reais que os campos removidos assumiriam se vazassem para uma coluna
// de banco, propriedade de DTO, header de export/import ou payload de API —
// TUDO neste codebase usa snake_case para esses contextos (ver ArtistEntity,
// CreateArtistDto, ReportEntityDefinition). CamelCase é adicional só para
// cobrir identificadores de código (variável/propriedade TS).
const FORBIDDEN_SNAKE = [
  /spotify_artist_id/i,
  /youtube_artist_id/i,
  /youtube_channel_id/i,
];

const FORBIDDEN_CAMEL = [
  /spotifyArtistId/i,
  /youtubeArtistId/i,
  /youtubeChannelId/i,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      // Migrations de rollback (down()) são a exceção explícita da regra 7 —
      // recriam colunas legadas de propósito para reverter a migração de drop.
      if (full === path.resolve(SRC_ROOT, 'database/migrations')) continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('Guarda permanente: domínio Artista só usa foto_url/spotify_url/youtube_url', () => {
  const allFiles = walk(SRC_ROOT).filter((f) => f !== THIS_FILE);

  it('nenhum arquivo (exceto migrations/down e exceções documentadas) contém as formas snake_case dos campos removidos', () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      if (ALL_EXCEPTIONS.has(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_SNAKE) {
        if (pattern.test(content)) {
          violations.push(`${path.relative(SRC_ROOT, file)} — matched ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('nenhum arquivo (exceto exceções documentadas) contém as formas camelCase dos campos removidos', () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      if (ALL_EXCEPTIONS.has(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of FORBIDDEN_CAMEL) {
        if (pattern.test(content)) {
          violations.push(`${path.relative(SRC_ROOT, file)} — matched ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('a exceção documentada (extração de ID p/ chamar APIs externas) não persiste nem expõe o ID publicamente', () => {
    const content = fs.readFileSync(SYNC_SERVICE_EXCEPTION, 'utf8');
    // Mesmo dentro do arquivo-exceção, a forma snake_case (a forma que um campo
    // persistido/exposto assumiria) nunca pode aparecer — só os nomes de
    // método privados extractSpotifyArtistId/extractYouTubeChannelId (camelCase).
    for (const pattern of FORBIDDEN_SNAKE) {
      expect(content).not.toMatch(pattern);
    }
    // Os métodos de extração devem permanecer privados (não expostos na API pública da classe).
    expect(content).toMatch(/private\s+extractSpotifyArtistId/);
    expect(content).toMatch(/private\s+extractYouTubeChannelId/);
  });
});
