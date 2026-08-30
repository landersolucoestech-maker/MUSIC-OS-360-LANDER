/**
 * modules/integrations/soundcharts/soundcharts.service.ts
 *
 * Client isolado para a Soundcharts API — fonte de métricas públicas de
 * audiência de artista (ver Soundcharts 02: credenciais reais validadas,
 * auth OAuth2 client_credentials confirmada contra a documentação oficial
 * antes de qualquer chamada).
 *
 * Conectado a ArtistPlatformProfile/artist-external-profile-sync — os 7
 * providers em artists/platform-profiles/providers/* delegam a este client.
 *
 * Credenciais: SOUNDCHARTS_CLIENT_ID/SOUNDCHARTS_CLIENT_SECRET são globais
 * (uma conta Soundcharts para todo o Music OS 360, não por tenant) — por
 * isso lidas direto de process.env, no mesmo padrão dos outros providers em
 * artists/platform-profiles/providers/*, em vez do fluxo de credenciais por
 * tenant do IntegrationBaseService (que não se aplica aqui).
 */
import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreaker } from '../../../core/resilience/circuit-breaker';
import { resilientFetch } from '../../../core/resilience/resilient-fetch';
import { assertAllowedHost, assertSafePathSegment } from '../../../core/resilience/safe-url';
import type { SoundchartsMetric } from './soundcharts.types';
import {
  SoundchartsNotConfiguredError,
  SoundchartsApiError,
  SoundchartsNotFoundError,
  SoundchartsRateLimitError,
} from './soundcharts.errors';

const TOKEN_URL = 'https://account.soundcharts.com/oauth/token';
const API_BASE = 'https://customer.api.soundcharts.com';
const ALLOWED_HOSTS = ['account.soundcharts.com', 'customer.api.soundcharts.com'] as const;

// Renova um pouco antes do expires_in real devolvido pela Soundcharts, para
// nunca usar em uma chamada um token que expira no meio do voo.
const TOKEN_REFRESH_SKEW_MS = 30_000;
const DEFAULT_TOKEN_TTL_S = 900; // fallback só se a resposta omitir expires_in

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms, já com o skew de renovação aplicado
}

interface CachedUuid {
  uuid: string;
  expiresAt: number;
}

// Reuso do UUID resolvido por (platform, externalId) durante uma janela curta
// — evita repetir /artist/by-platform/... quando várias plataformas do mesmo
// artista são sincronizadas em sequência (Soundcharts 06).
const UUID_CACHE_TTL_MS = 5 * 60 * 1000;

interface SeriesItem {
  date?: string;
  value?: number;
  followerCount?: number;
  playlistCount?: number;
}

@Injectable()
export class SoundchartsService {
  private readonly logger = new Logger(SoundchartsService.name);
  private readonly cb = new CircuitBreaker({ name: 'SoundchartsService' });
  private cachedToken: CachedToken | null = null;
  private readonly uuidCache = new Map<string, CachedUuid>();

  isConfigured(): boolean {
    return !!(process.env['SOUNDCHARTS_CLIENT_ID'] && process.env['SOUNDCHARTS_CLIENT_SECRET']);
  }

  // ── Autenticação (client_credentials, cache até próximo da expiração) ────

  private async getToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    const clientId = process.env['SOUNDCHARTS_CLIENT_ID'];
    const clientSecret = process.env['SOUNDCHARTS_CLIENT_SECRET'];
    if (!clientId || !clientSecret) {
      throw new SoundchartsNotConfiguredError();
    }

    const url = assertAllowedHost(TOKEN_URL, ALLOWED_HOSTS);
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await resilientFetch(this.cb, url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      // Nunca logar o corpo da resposta de token — pode ecoar client_secret em erros de auth.
      throw new SoundchartsApiError(`Soundcharts token request falhou: HTTP ${res.status}`, res.status);
    }

    let body: { access_token?: string; expires_in?: number; token_type?: string } | null = null;
    try { body = await res.json(); } catch { /* resposta sem corpo JSON */ }

    if (!body?.access_token) {
      throw new SoundchartsApiError('Soundcharts token response sem access_token', res.status);
    }

    const ttlS = typeof body.expires_in === 'number' ? body.expires_in : DEFAULT_TOKEN_TTL_S;
    this.cachedToken = {
      token: body.access_token,
      expiresAt: Date.now() + ttlS * 1000 - TOKEN_REFRESH_SKEW_MS,
    };
    return this.cachedToken.token;
  }

  // ── HTTP interno ──────────────────────────────────────────────────────

  private async apiGet(path: string): Promise<{ status: number; body: unknown }> {
    const token = await this.getToken();
    const url = assertAllowedHost(`${API_BASE}${path}`, ALLOWED_HOSTS);
    const res = await resilientFetch(this.cb, url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let body: unknown = null;
    try { body = await res.json(); } catch { /* resposta sem corpo JSON */ }
    return { status: res.status, body };
  }

  private throwForStatus(status: number, context: string): never {
    if (status === 404) throw new SoundchartsNotFoundError(`Soundcharts: não encontrado em ${context}`, status);
    if (status === 429) throw new SoundchartsRateLimitError(`Soundcharts: rate limit em ${context}`, status);
    throw new SoundchartsApiError(`Soundcharts respondeu HTTP ${status} em ${context}`, status);
  }

  /** Item com a data mais recente — nunca assume a ordem do array (endpoints diferentes ordenam diferente). */
  private pickLatest(items: unknown): SeriesItem | null {
    if (!Array.isArray(items) || items.length === 0) return null;
    let latest: SeriesItem | null = null;
    let latestTime = -Infinity;
    for (const raw of items as SeriesItem[]) {
      const t = raw?.date ? new Date(raw.date).getTime() : NaN;
      if (!Number.isNaN(t) && t > latestTime) {
        latestTime = t;
        latest = raw;
      }
    }
    return latest;
  }

  // ── Resolução de artista ─────────────────────────────────────────────

  async resolveArtistByPlatform(platform: string, externalId: string): Promise<string> {
    const p = assertSafePathSegment(platform, 'platform');
    const id = assertSafePathSegment(externalId, 'externalId');

    const cacheKey = `${p}:${id}`;
    const cached = this.uuidCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.uuid;

    const { status, body } = await this.apiGet(`/api/v2.9/artist/by-platform/${p}/${id}`);
    if (status !== 200) this.throwForStatus(status, `resolveArtistByPlatform(${p})`);

    const uuid = (body as { object?: { uuid?: string }; uuid?: string; data?: { uuid?: string } } | null)
      ?.object?.uuid
      ?? (body as { uuid?: string } | null)?.uuid
      ?? (body as { data?: { uuid?: string } } | null)?.data?.uuid;
    if (!uuid) throw new SoundchartsApiError('Soundcharts: resposta sem uuid de artista', status);

    this.uuidCache.set(cacheKey, { uuid, expiresAt: Date.now() + UUID_CACHE_TTL_MS });
    return uuid;
  }

  /**
   * Resolução canônica: tenta os candidatos em ordem (tipicamente
   * spotify → youtube → deezer → soundcloud) e usa o primeiro que resolver
   * — em vez de cada plataforma (ex.: Instagram/TikTok) resolver de novo
   * pelo próprio handle, que é frágil quando a Soundcharts não indexa
   * aquele handle específico mesmo já tendo o artista via Spotify.
   * Todas as métricas do mesmo artista devem reutilizar o UUID retornado
   * aqui (Soundcharts 06).
   */
  async resolveCanonicalArtistUuid(
    candidates: Array<{ platform: string; externalId: string | null | undefined }>,
  ): Promise<string> {
    const attempted: string[] = [];
    for (const candidate of candidates) {
      if (!candidate.externalId) continue;
      try {
        return await this.resolveArtistByPlatform(candidate.platform, candidate.externalId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempted.push(`${candidate.platform}: ${message}`);
      }
    }
    throw new SoundchartsApiError(
      attempted.length > 0
        ? `Soundcharts: não foi possível resolver o artista por nenhum identificador disponível (${attempted.join('; ')})`
        : 'Soundcharts: nenhum identificador de artista disponível para resolução',
      404,
    );
  }

  // ── Métricas ──────────────────────────────────────────────────────────

  /**
   * Ouvintes mensais do Spotify — EXCLUSIVAMENTE via /streaming/spotify/listening.
   * Proibido usar /audience/spotify aqui: esse endpoint devolve followerCount
   * (seguidores), uma métrica diferente (confirmado na validação real —
   * Soundcharts 02).
   */
  async getSpotifyMonthlyListeners(uuid: string): Promise<SoundchartsMetric> {
    const id = assertSafePathSegment(uuid, 'uuid');
    const { status, body } = await this.apiGet(`/api/v2/artist/${id}/streaming/spotify/listening`);
    if (status !== 200) this.throwForStatus(status, 'getSpotifyMonthlyListeners');

    const items = (body as { items?: unknown } | null)?.items;
    const latest = this.pickLatest(items);
    if (!latest || typeof latest.value !== 'number') {
      throw new SoundchartsApiError('Soundcharts: série de monthly listeners vazia/sem value', status);
    }
    return { value: latest.value, observedAt: latest.date ? new Date(latest.date) : new Date(), source: 'soundcharts' };
  }

  private async getAudienceFollowerCount(uuid: string, platform: string, methodName: string): Promise<SoundchartsMetric> {
    const id = assertSafePathSegment(uuid, 'uuid');
    const { status, body } = await this.apiGet(`/api/v2/artist/${id}/audience/${platform}`);
    if (status !== 200) this.throwForStatus(status, methodName);

    const items = (body as { items?: unknown } | null)?.items;
    const latest = this.pickLatest(items);
    if (!latest || typeof latest.followerCount !== 'number') {
      throw new SoundchartsApiError(`Soundcharts: followerCount ausente em ${methodName}`, status);
    }
    return { value: latest.followerCount, observedAt: latest.date ? new Date(latest.date) : new Date(), source: 'soundcharts' };
  }

  async getInstagramFollowers(uuid: string): Promise<SoundchartsMetric> {
    return this.getAudienceFollowerCount(uuid, 'instagram', 'getInstagramFollowers');
  }

  async getTikTokFollowers(uuid: string): Promise<SoundchartsMetric> {
    return this.getAudienceFollowerCount(uuid, 'tiktok', 'getTikTokFollowers');
  }

  async getYouTubeSubscribers(uuid: string): Promise<SoundchartsMetric> {
    return this.getAudienceFollowerCount(uuid, 'youtube', 'getYouTubeSubscribers');
  }

  async getDeezerFans(uuid: string): Promise<SoundchartsMetric> {
    return this.getAudienceFollowerCount(uuid, 'deezer', 'getDeezerFans');
  }

  async getSoundCloudFollowers(uuid: string): Promise<SoundchartsMetric> {
    return this.getAudienceFollowerCount(uuid, 'soundcloud', 'getSoundCloudFollowers');
  }

  /**
   * Apple Music não tem métrica de audiência/ouvintes na Soundcharts.
   * Endpoints verificados contra a API real (Soundcharts 06/07), todos com
   * uuid de um artista real conhecido:
   *   - /audience/apple-music                  → 404 "not a social platform"
   *   - /social/apple-music/followers/ (v2.37) → 404 "not a social platform"
   *   - /streaming/apple-music/listening       → 404 "not a streaming platform"
   *   - /popularity/apple-music                → 404 (endpoint só suporta
   *     Spotify/Tidal/Deezer — confirmado na documentação oficial)
   *   - /charts/song/ranks/apple-music         → 200, mas é uma lista de
   *     posições por FAIXA/país/chart, nunca um número único do ARTISTA.
   *   - /playlist/reach/apple-music            → 200. playlistReach vem
   *     SEMPRE zero para apple-music (reach só é calculado para
   *     Spotify/YouTube/Deezer/Jiosaavn/Boomplay, confirmado na doc e na
   *     API real até com Billie Eilish, 734 playlists e reach=0 em todos os
   *     períodos) — não usável. playlistCount, porém, é real e não-zero:
   *     quantidade de playlists do Apple Music que incluem o artista. Não é
   *     "ouvintes", é presença editorial/de playlist — por isso vive só em
   *     raw_payload.playlist_count, nunca nos campos followers/subscribers/
   *     monthly_listeners (ver AppleMusicArtistProfileProvider).
   */
  /**
   * Capability-check síncrono e sem rede: a Soundcharts não tem métrica de
   * audiência para Apple Music (ver os endpoints verificados no comentário
   * acima). Callers que só precisam decidir o estado do card antes de
   * qualquer tentativa de sync usam isto em vez de round-trip para descobrir
   * o óbvio (Métricas 09 fase 6).
   */
  getAppleMusicSupport(): 'NOT_SUPPORTED' {
    return 'NOT_SUPPORTED';
  }

  async getAppleMusicPlaylistCount(uuid: string): Promise<SoundchartsMetric> {
    const id = assertSafePathSegment(uuid, 'uuid');
    const { status, body } = await this.apiGet(`/api/v2/artist/${id}/playlist/reach/apple-music`);
    if (status !== 200) this.throwForStatus(status, 'getAppleMusicPlaylistCount');

    const items = (body as { items?: unknown } | null)?.items;
    const latest = this.pickLatest(items);
    if (!latest || typeof latest.playlistCount !== 'number') {
      throw new SoundchartsNotFoundError(`Soundcharts: nenhum playlist reach registrado em getAppleMusicPlaylistCount`, status);
    }
    return { value: latest.playlistCount, observedAt: latest.date ? new Date(latest.date) : new Date(), source: 'soundcharts' };
  }
}
