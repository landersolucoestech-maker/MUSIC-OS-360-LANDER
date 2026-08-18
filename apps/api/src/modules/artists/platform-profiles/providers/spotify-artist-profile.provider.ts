import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ArtistPlatformProvider,
  ArtistPlatformProviderInput,
  SocialPlatformProfileSnapshot,
} from '../social-platform-sync.types';

const SPOTIFY_WEB = 'https://open.spotify.com';
const SPOTIFY_ARTIST_ID = /^[A-Za-z0-9]{22}$/;

@Injectable()
export class SpotifyArtistProfileProvider implements ArtistPlatformProvider {
  readonly platform = 'spotify' as const;

  async isConfigured(_tenantId?: string): Promise<boolean> {
    // Monthly listeners are collected from the public Spotify artist page.
    // This flow intentionally does not require Spotify Web API credentials.
    return true;
  }

  async resolve(input: ArtistPlatformProviderInput): Promise<SocialPlatformProfileSnapshot> {
    const artistId = input.externalId ?? this.extractArtistId(input.externalUrl ?? '');
    if (!artistId) throw new Error('Spotify artist id ausente ou inválido');

    const profileUrl = `${SPOTIFY_WEB}/artist/${encodeURIComponent(artistId)}`;
    const res = await fetch(profileUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Spotify respondeu 404: artista "${artistId}" não encontrado`);
      }
      if (res.status === 429) {
        throw new ServiceUnavailableException('Spotify respondeu 429: limite temporário ao consultar a página pública');
      }
      throw new ServiceUnavailableException(
        `Spotify respondeu ${res.status} ao consultar a página pública do artista`,
      );
    }

    const html = await res.text();
    const monthlyListeners = this.extractMonthlyListeners(html);

    if (monthlyListeners === null) {
      throw new ServiceUnavailableException(
        'Spotify não expôs ouvintes mensais na página pública neste momento',
      );
    }

    return {
      tenant_id: input.tenantId,
      artist_id: input.artistId,
      platform: 'spotify',
      external_id: artistId,
      external_url: input.externalUrl ?? profileUrl,
      display_name: null,
      username: null,
      profile_url: profileUrl,
      image_url: null,
      followers: null,
      subscribers: null,
      monthly_listeners: monthlyListeners,
      popularity: null,
      total_views: null,
      total_videos: null,
      total_tracks: null,
      total_albums: null,
      raw_payload: {
        source: 'spotify_public_artist_page',
        monthly_listeners: monthlyListeners,
      },
      sync_status: 'success',
      last_synced_at: new Date(),
      last_error: null,
    };
  }

  private extractArtistId(value: string): string | null {
    const normalized = value.trim();
    if (!normalized) return null;
    if (SPOTIFY_ARTIST_ID.test(normalized)) return normalized;

    const urlMatch = normalized.match(
      /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?artist\/([A-Za-z0-9]{22})(?:[/?#].*)?$/i,
    );
    return urlMatch?.[1] ?? null;
  }

  private extractMonthlyListeners(html: string): number | null {
    const candidates = [html, this.decodeHtmlEntities(html)];

    const initialState = this.extractInitialState(html);
    if (initialState) candidates.push(initialState, this.decodeHtmlEntities(initialState));

    for (const candidate of candidates) {
      const structured = candidate.match(/(?:"|\\")monthlyListeners(?:"|\\")\s*:\s*(\d+)/i);
      if (structured?.[1]) return this.toPositiveInteger(structured[1]);

      const snakeCase = candidate.match(/(?:"|\\")monthly_listeners(?:"|\\")\s*:\s*(\d+)/i);
      if (snakeCase?.[1]) return this.toPositiveInteger(snakeCase[1]);

      const englishText = candidate.match(/([\d][\d.,\s]*)\s+monthly\s+listeners/i);
      if (englishText?.[1]) return this.toPositiveInteger(englishText[1]);

      const portugueseText = candidate.match(/([\d][\d.,\s]*)\s+ouvintes\s+mensais/i);
      if (portugueseText?.[1]) return this.toPositiveInteger(portugueseText[1]);
    }

    return null;
  }

  private extractInitialState(html: string): string | null {
    const match = html.match(
      /<script[^>]+id=["']initialState["'][^>]*>([\s\S]*?)<\/script>/i,
    );
    const raw = match?.[1]?.trim();
    if (!raw) return null;

    const normalized = this.decodeHtmlEntities(raw).replace(/^['"]|['"]$/g, '');

    try {
      const decoded = Buffer.from(normalized, 'base64').toString('utf8');
      if (decoded.includes('monthlyListeners') || decoded.trim().startsWith('{')) return decoded;
    } catch {
      // If Spotify changes initialState away from base64, fall back to the raw script body.
    }

    return normalized;
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  private toPositiveInteger(value: string): number | null {
    const digits = value.replace(/\D/g, '');
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
  }
}
