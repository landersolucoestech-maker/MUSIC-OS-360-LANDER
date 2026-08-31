import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';
import { SoundchartsService } from '../../../integrations/soundcharts/soundcharts.service';
import { primaryIdentityProvenance, soundchartsProvenance } from '../soundcharts-provenance.util';
import { evaluateCrossPlatformEvidence } from '../soundcharts-canonical-candidates.util';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

/**
 * subscribers: EXCLUSIVAMENTE Soundcharts /audience/youtube (Soundcharts 05).
 * total_views/total_videos: EXCLUSIVAMENTE YouTube Data API channels.statistics —
 * a Soundcharts não tem equivalente. A YouTube Data API é usada tanto para
 * RESOLUÇÃO de canal (handle/URL → UC…) quanto para essas duas estatísticas;
 * nunca para subscriberCount, que nunca sobrescreve o valor da Soundcharts
 * (Métricas 09 fase 2 — corrige regressão que zerou views/videos).
 */
@Injectable()
export class YouTubeArtistProfileProvider implements ArtistPlatformProvider {
  readonly platform = 'youtube' as const;
  private readonly logger = new Logger(YouTubeArtistProfileProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly soundcharts: SoundchartsService,
  ) {}

  async isConfigured(_tenantId?: string): Promise<boolean> {
    return !!this.config.get<string>('YOUTUBE_API_KEY') && this.soundcharts.isConfigured();
  }

  async resolve(input: ArtistPlatformProviderInput): Promise<SocialPlatformProfileSnapshot> {
    if (!(await this.isConfigured())) {
      throw new ServiceUnavailableException(
        'YouTube não configurado: defina YOUTUBE_API_KEY, SOUNDCHARTS_CLIENT_ID e SOUNDCHARTS_CLIENT_SECRET no ambiente da API',
      );
    }

    const apiKey = this.config.get<string>('YOUTUBE_API_KEY') ?? '';
    const ref = this.parseRef(input.externalId ?? input.externalUrl ?? '');
    if (!ref) throw new Error('YouTube channel ref ausente ou inválido');
    const channelId = await this.resolveChannelId(ref, apiKey);
    if (!channelId) throw new Error('Canal do YouTube não encontrado para o link informado');

    const uuid = await this.soundcharts.resolveArtistByPlatform('youtube', channelId);

    // Fase 1.3: resolução exata by-platform do channelId cadastrado já é a
    // prova de identidade primária. Divergência cross-platform é diagnóstico.
    const crossPlatform = await evaluateCrossPlatformEvidence(this.soundcharts, input.canonicalUrls, 'youtube', uuid);

    const subscribers = await this.soundcharts.getYouTubeSubscribers(uuid);
    const statistics = await this.fetchChannelStatistics(channelId, apiKey);

    return {
      tenant_id: input.tenantId,
      artist_id: input.artistId,
      platform: 'youtube',
      external_id: channelId,
      external_url: input.externalUrl ?? `https://www.youtube.com/channel/${channelId}`,
      display_name: null,
      username: null,
      profile_url: `https://www.youtube.com/channel/${channelId}`,
      image_url: null,
      followers: null,
      subscribers: subscribers.value,
      monthly_listeners: null,
      popularity: null,
      total_views: statistics?.viewCount ?? null,
      total_videos: statistics?.videoCount ?? null,
      total_tracks: null,
      total_albums: null,
      raw_payload: {
        soundcharts_uuid: uuid,
        observed_at: subscribers.observedAt.toISOString(),
        ...primaryIdentityProvenance(crossPlatform),
        // subscribers vem da Soundcharts; total_views/total_videos vêm de uma
        // fonte DIFERENTE (YouTube Data API) — provenance de cada uma
        // rastreada separadamente, nunca fundida como se fosse uma fonte só.
        subscribers_provenance: soundchartsProvenance('youtube', subscribers),
        views_videos_provenance: statistics ? {
          source_provider: 'youtube_data_api',
          source_platform: 'youtube',
          source_endpoint: `${YOUTUBE_API}/channels?part=statistics&id=${channelId}`,
          source_field: 'items[0].statistics.{viewCount,videoCount}',
          fetched_at: new Date().toISOString(),
          normalized_at: new Date().toISOString(),
          raw_value: { viewCount: statistics.viewCount, videoCount: statistics.videoCount },
          normalized_value: { total_views: statistics.viewCount, total_videos: statistics.videoCount },
        } : null,
      },
      sync_status: 'success',
      last_synced_at: new Date(),
      last_error: null,
    };
  }

  /**
   * total_views/total_videos via YouTube Data API — best-effort: se a API
   * falhar (quota, rede, etc.) retorna null para os dois campos SEM lançar,
   * porque isso não pode derrubar subscribers já obtido via Soundcharts.
   */
  private async fetchChannelStatistics(
    channelId: string,
    apiKey: string,
  ): Promise<{ viewCount: string | null; videoCount: number | null } | null> {
    try {
      const res = await fetch(
        `${YOUTUBE_API}/channels?part=statistics&id=${encodeURIComponent(channelId)}&key=${apiKey}`,
      );
      if (!res.ok) {
        this.logger.warn(await this.describeYouTubeError(res, `buscar estatísticas do canal "${channelId}"`));
        return null;
      }
      const data = (await res.json()) as {
        items?: Array<{ statistics?: { viewCount?: string; videoCount?: string } }>;
      };
      const statistics = data.items?.[0]?.statistics;
      if (!statistics) return null;
      return {
        viewCount: statistics.viewCount ?? null,
        videoCount: this.toNumber(statistics.videoCount),
      };
    } catch (err) {
      this.logger.warn(
        `Falha ao buscar estatísticas do canal "${channelId}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Parses any YouTube identifier/URL into a typed channel reference.
   * Supports: bare `UC…` id, `@handle`, and URLs `/channel/UC…`, `/@handle`,
   * `/user/NAME` (legacy), `/c/NAME` (custom) and bare `/NAME` (legacy custom).
   */
  parseRef(raw: string): { kind: 'id' | 'handle' | 'username' | 'custom'; value: string } | null {
    const value = (raw ?? '').trim();
    if (!value) return null;

    if (/^UC[A-Za-z0-9_-]{20,}$/.test(value)) return { kind: 'id', value };
    if (/^@[A-Za-z0-9._-]+$/.test(value)) return { kind: 'handle', value: value.slice(1) };

    let path = value;
    try {
      if (/^https?:\/\//i.test(value)) path = new URL(value).pathname;
    } catch { /* treat as raw path */ }
    path = path.replace(/^\/+|\/+$/g, '');

    const channel = path.match(/^channel\/(UC[A-Za-z0-9_-]{20,})/);
    if (channel) return { kind: 'id', value: channel[1] };
    const handle = path.match(/^@([A-Za-z0-9._-]+)/);
    if (handle) return { kind: 'handle', value: handle[1] };
    const user = path.match(/^user\/([A-Za-z0-9._-]+)/i);
    if (user) return { kind: 'username', value: user[1] };
    const custom = path.match(/^c\/([A-Za-z0-9._-]+)/i);
    if (custom) return { kind: 'custom', value: custom[1] };
    const bare = path.match(/^([A-Za-z0-9._-]+)$/);
    if (bare) return { kind: 'custom', value: bare[1] };
    return null;
  }

  /** Resolves a typed reference to a concrete `UC…` channel id via the YouTube Data API. */
  private async resolveChannelId(
    ref: { kind: 'id' | 'handle' | 'username' | 'custom'; value: string },
    apiKey: string,
  ): Promise<string | null> {
    if (ref.kind === 'id') return ref.value;

    if (ref.kind === 'handle' || ref.kind === 'username') {
      const param =
        ref.kind === 'handle'
          ? `forHandle=@${encodeURIComponent(ref.value)}`
          : `forUsername=${encodeURIComponent(ref.value)}`;
      const res = await fetch(`${YOUTUBE_API}/channels?part=id&${param}&key=${apiKey}`);
      if (!res.ok) throw new Error(await this.describeYouTubeError(res, `resolver o canal por ${ref.kind}`));
      const data = (await res.json()) as { items?: Array<{ id?: string }> };
      const id = data.items?.[0]?.id;
      if (id) return id;
      if (ref.kind === 'username') return null;
      // handle not resolvable via forHandle → fall through to search
    }

    // custom (/c/NAME) or unresolved handle → search the channel by name
    const res = await fetch(
      `${YOUTUBE_API}/search?part=id&type=channel&maxResults=1&q=${encodeURIComponent(ref.value)}&key=${apiKey}`,
    );
    if (!res.ok) throw new Error(await this.describeYouTubeError(res, `pesquisar o canal "${ref.value}"`));
    const data = (await res.json()) as { items?: Array<{ id?: { channelId?: string } }> };
    return data.items?.[0]?.id?.channelId ?? null;
  }

  /**
   * Erro específico da YouTube Data API: status + reason/message do corpo
   * (ex.: 403 quotaExceeded, 400 API key not valid) — nunca um genérico.
   */
  private async describeYouTubeError(res: Response, action: string): Promise<string> {
    let reason = '';
    try {
      const body = (await res.json()) as {
        error?: { message?: string; errors?: Array<{ reason?: string }> };
      };
      const apiReason = body.error?.errors?.[0]?.reason;
      const apiMessage = body.error?.message;
      reason = [apiReason, apiMessage].filter(Boolean).join(' — ');
    } catch { /* corpo não-JSON: mantém só o status */ }
    return `YouTube API respondeu ${res.status} ao ${action}${reason ? `: ${reason}` : ''}`;
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  }
}
