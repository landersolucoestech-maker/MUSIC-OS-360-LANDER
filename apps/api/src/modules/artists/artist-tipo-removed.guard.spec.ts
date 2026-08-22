/**
 * artist-tipo-removed.guard.spec.ts
 *
 * Proteção permanente (Artists Schema 15): o campo "tipo" (formação do
 * artista — solo/banda/duo/trio/grupo/coletivo, e a forma antiga
 * "artista_solo") foi REMOVIDO do domínio Artist em todas as camadas —
 * não normalizado para um vocabulário canônico, não substituído por outro
 * campo, não mantido como enum. Este guard falha se ele reaparecer sem
 * essa ser uma decisão de produto deliberada e revisada.
 *
 * NÃO faz grep ingênuo por "tipo" — a palavra é legítima em dezenas de
 * outros domínios (contracts.tipo, works.tipo, transactions.tipo,
 * ArtistGoalEntity.tipo, ArtistaRelacionamento.tipo, artists.tipo_perfil).
 * Cada checagem aqui é pontual: a propriedade exata no lugar exato.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getMetadataStorage } from 'class-validator';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { getReportFormContract } from '../reports/form-contracts/report-form-contracts';

function decoratedPropertyNames(dto: new () => object): string[] {
  const metas = getMetadataStorage().getTargetValidationMetadatas(dto, '', false, false);
  return Array.from(new Set(metas.map((m) => m.propertyName)));
}

function readArtistEntitySource(): string {
  const entitiesPath = path.resolve(__dirname, '../../database/entities.ts');
  const content = fs.readFileSync(entitiesPath, 'utf8');
  const start = content.indexOf("@Entity('artists')");
  if (start === -1) throw new Error("Não encontrei @Entity('artists') em entities.ts");
  const nextEntity = content.indexOf('@Entity(', start + 1);
  if (nextEntity === -1) throw new Error('Não encontrei o fim de ArtistEntity em entities.ts');
  return content.slice(start, nextEntity);
}

describe('Guarda permanente: artists.tipo (formação do artista) foi removido, não normalizado', () => {
  it('ArtistEntity não declara a propriedade tipo', () => {
    const source = readArtistEntitySource();
    expect(source).not.toMatch(/\btipo\s*[?!]?\s*:\s*/);
  });

  it('CreateArtistDto/UpdateArtistDto não têm "tipo" como propriedade validada', () => {
    expect(decoratedPropertyNames(CreateArtistDto)).not.toContain('tipo');
    expect(decoratedPropertyNames(UpdateArtistDto)).not.toContain('tipo');
  });

  it('o contrato de import/export de artists não expõe a coluna tipo', () => {
    const contract = getReportFormContract('artists');
    expect(contract).not.toBeNull();
    const fieldKeys = contract!.fields.map((f) => f.key);
    expect(fieldKeys).not.toContain('tipo');
    expect(contract!.filterableColumns ?? []).not.toContain('tipo');
  });

  it('LeadEventsHandler não escreve tipo ao criar o ArtistEntity da conversão', () => {
    const handlerPath = path.resolve(__dirname, '../leads/handlers/lead-events.handler.ts');
    const source = fs.readFileSync(handlerPath, 'utf8');
    expect(source).not.toMatch(/\btipo\s*:\s*/);
  });

  it('@music-os-360/types não exporta mais um enum ArtistTipo', () => {
    // Import dinâmico para não quebrar a compilação caso o pacote precise
    // ser reconstruído — o teste falha explicitamente se o símbolo voltar.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const types = require('@music-os-360/types');
    expect(types.ArtistTipo).toBeUndefined();
  });
});
