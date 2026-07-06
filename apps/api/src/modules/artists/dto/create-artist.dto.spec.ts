/**
 * create-artist.dto.spec.ts
 *
 * Regressão: o contrato de criação/edição de Artista trabalha exclusivamente
 * com URLs (spotify_url/youtube_url/foto_url). Reproduz exatamente o
 * ValidationPipe global (whitelist + forbidNonWhitelisted) de main.ts para
 * provar, sem precisar subir a app inteira, que:
 *   - um payload com os campos legados removidos é REJEITADO (400);
 *   - um payload com apenas as URLs corretas é ACEITO.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, getMetadataStorage } from 'class-validator';
import { CreateArtistDto } from './create-artist.dto';
import { UpdateArtistDto } from './update-artist.dto';

/** Nomes de propriedade com pelo menos um decorator class-validator (o contrato real do DTO). */
function decoratedPropertyNames(dto: new () => object): string[] {
  const metas = getMetadataStorage().getTargetValidationMetadatas(dto, '', false, false);
  return Array.from(new Set(metas.map((m) => m.propertyName)));
}

async function validatePayload(dto: object, payload: Record<string, unknown>) {
  const instance = plainToInstance(dto as new () => object, payload);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

describe('CreateArtistDto/UpdateArtistDto — domínio exclusivamente por URL', () => {
  const LEGACY_FIELDS = {
    spotify_artist_id: '4NHQUGzhtTLFvgF5SZesLK',
    youtube_artist_id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    youtube_channel_id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    banner_url: 'https://cdn.example.com/banner.png',
    video_apresentacao_url: 'https://cdn.example.com/video.mp4',
  };

  it.each(Object.entries(LEGACY_FIELDS))(
    'rejeita payload de criação contendo "%s" (propriedade não whitelisted)',
    async (field, value) => {
      const errors = await validatePayload(CreateArtistDto, {
        nome_artistico: 'Teste',
        [field]: value,
      });
      expect(errors.length).toBeGreaterThan(0);
      const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
      expect(messages.some((m) => m.toLowerCase().includes(field.toLowerCase()))).toBe(true);
    },
  );

  it.each(Object.entries(LEGACY_FIELDS))(
    'rejeita payload de atualização contendo "%s" (propriedade não whitelisted)',
    async (field, value) => {
      const errors = await validatePayload(UpdateArtistDto, { [field]: value });
      expect(errors.length).toBeGreaterThan(0);
    },
  );

  it('aceita payload contendo somente foto_url/spotify_url/youtube_url', async () => {
    const errors = await validatePayload(CreateArtistDto, {
      nome_artistico: 'Teste',
      foto_url: 'https://cdn.example.com/foto.png',
      spotify_url: 'https://open.spotify.com/artist/4NHQUGzhtTLFvgF5SZesLK',
      youtube_url: 'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw',
    });
    expect(errors).toEqual([]);
  });

  it('CreateArtistDto/UpdateArtistDto não declaram nenhuma propriedade legada, e declaram as 3 corretas', () => {
    const createProps = decoratedPropertyNames(CreateArtistDto);
    const updateProps = decoratedPropertyNames(UpdateArtistDto);
    for (const legacyField of Object.keys(LEGACY_FIELDS)) {
      expect(createProps).not.toContain(legacyField);
      expect(updateProps).not.toContain(legacyField);
    }
    expect(createProps).toEqual(expect.arrayContaining(['foto_url', 'spotify_url', 'youtube_url']));
  });
});
