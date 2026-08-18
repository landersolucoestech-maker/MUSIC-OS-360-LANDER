import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { SiApplemusic, SiSoundcloud, SiInstagram, SiTiktok, SiSpotify, SiYoutube } from "react-icons/si";
import { DeezerIcon } from "@/shared/ui/deezer-icon";
import { Button } from "@/shared/ui/button";
import {
  useArtistPlatformProfiles,
  useSyncArtistPlatformProfile,
  type ArtistPlatformProfileSnapshot,
  type SocialPlatform,
} from "@/modules/artist/hooks/useArtistPlatformProfiles";
import { toast } from "sonner";

interface ArtistaPlatformMetricsProps {
  artistaId: string;
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  instagramSeguidores?: number | null;
  tiktokUrl?: string | null;
  tiktokSeguidores?: number | null;
  deezerUrl?: string | null;
  deezerFas?: number | null;
  appleMusicUrl?: string | null;
  appleMusicAlbuns?: number | null;
  soundcloudUrl?: string | null;
  soundcloudSeguidores?: number | null;
}

const numberFormatter = new Intl.NumberFormat("pt-BR");

function formatCount(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "N/D";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "N/D";
  return numberFormatter.format(num);
}

function normalizeSpotifyProfileUrl(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (/^[A-Za-z0-9]{22}$/.test(value)) return `https://open.spotify.com/artist/${value}`;
  const match = value.match(/^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?artist\/([A-Za-z0-9]{22})(?:[/?#].*)?$/i);
  return match?.[1] ? `https://open.spotify.com/artist/${match[1]}` : null;
}

function normalizeYouTubeProfileUrl(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (/^UC[A-Za-z0-9_-]{22}$/.test(value)) return `https://www.youtube.com/channel/${value}`;
  const match = value.match(/^https?:\/\/(?:www\.)?youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})(?:[/?#].*)?$/i);
  return match?.[1] ? `https://www.youtube.com/channel/${match[1]}` : null;
}

/** API pública do Deezer — só exige um artist id/URL, sem OAuth. */
function normalizeDeezerProfileUrl(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (/^\d+$/.test(value)) return `https://www.deezer.com/artist/${value}`;
  const match = value.match(/deezer\.com\/(?:[a-z]{2}\/)?artist\/(\d+)/i);
  return match?.[1] ? `https://www.deezer.com/artist/${match[1]}` : null;
}

/** SoundCloud /resolve — só exige client_id de app, sem login do artista/tenant. */
function normalizeSoundCloudProfileUrl(input: string | null | undefined): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  if (/^[A-Za-z0-9_-]+$/.test(value)) return `https://soundcloud.com/${value}`;
  const match = value.match(/^https?:\/\/(?:www\.|m\.)?soundcloud\.com\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i);
  return match?.[1] ? `https://soundcloud.com/${match[1]}` : null;
}

/**
 * Estados comuns aos cards com sync real (perfil público do artista →
 * provider → ArtistPlatformProfileEntity). Sem perfil cadastrado é
 * "Não configurado"; com perfil mas sem sync ainda é "Não sincronizado" —
 * nenhum dos dois vira "0" ou é escondido.
 */
function renderSyncState(
  testId: string,
  hasProfileInput: boolean,
  snapshot: ArtistPlatformProfileSnapshot | null,
  successNode: ReactNode,
): ReactNode {
  if (!hasProfileInput) {
    return (
      <>
        <p className="text-sm font-bold text-foreground" data-testid={testId}>—</p>
        <p className="text-[10px] text-muted-foreground">Não configurado</p>
      </>
    );
  }
  if (snapshot?.sync_status === "pending") {
    return (
      <>
        <p className="text-sm font-bold text-foreground animate-pulse" data-testid={testId}>...</p>
        <p className="text-[10px] text-muted-foreground">Sincronizando</p>
      </>
    );
  }
  if (snapshot?.sync_status === "failed") {
    return (
      <>
        <p className="text-sm font-semibold text-foreground" data-testid={testId}>Erro</p>
        <p className="text-xs text-muted-foreground truncate">{snapshot.last_error ?? "Falha na sincronização"}</p>
      </>
    );
  }
  if (snapshot?.sync_status === "success") {
    return successNode;
  }
  return (
    <>
      <p className="text-sm font-semibold text-foreground" data-testid={testId}>Não sincronizado</p>
      <p className="text-[10px] text-muted-foreground">Clique em "Sincronizar agora"</p>
    </>
  );
}

export function ArtistaPlatformMetrics({
  artistaId,
  spotifyUrl,
  youtubeUrl,
  instagramUrl,
  instagramSeguidores,
  tiktokUrl,
  tiktokSeguidores,
  deezerUrl,
  appleMusicUrl: _appleMusicUrl,
  appleMusicAlbuns: _appleMusicAlbuns,
  soundcloudUrl,
}: ArtistaPlatformMetricsProps) {
  const qc = useQueryClient();
  const platformProfiles = useArtistPlatformProfiles(artistaId);
  const syncPlatformProfile = useSyncArtistPlatformProfile(artistaId);

  const snapshots = platformProfiles.data ?? [];
  const spotifySnapshot = snapshots.find((profile) => profile.platform === "spotify") ?? null;
  const youtubeSnapshot = snapshots.find((profile) => profile.platform === "youtube") ?? null;
  const deezerSnapshot = snapshots.find((profile) => profile.platform === "deezer") ?? null;
  const soundcloudSnapshot = snapshots.find((profile) => profile.platform === "soundcloud") ?? null;

  const spotifyProfileInput = (spotifyUrl ?? "").trim();
  const youtubeProfileInput = (youtubeUrl ?? "").trim();
  const deezerProfileInput = (deezerUrl ?? "").trim();
  const soundcloudProfileInput = (soundcloudUrl ?? "").trim();
  const spotifyProfileUrl = normalizeSpotifyProfileUrl(spotifyProfileInput);
  const youtubeProfileUrl = normalizeYouTubeProfileUrl(youtubeProfileInput);
  const deezerProfileUrl = normalizeDeezerProfileUrl(deezerProfileInput);
  const soundcloudProfileUrl = normalizeSoundCloudProfileUrl(soundcloudProfileInput);
  const hasSpotifyProfileInput = spotifyProfileInput.length > 0;
  const hasYouTubeProfileInput = youtubeProfileInput.length > 0;
  const hasDeezerProfileInput = deezerProfileInput.length > 0;
  const hasSoundCloudProfileInput = soundcloudProfileInput.length > 0;
  const hasAnyProfileInput =
    hasSpotifyProfileInput || hasYouTubeProfileInput || hasDeezerProfileInput || hasSoundCloudProfileInput;

  const enqueueProfileSync = (platform: SocialPlatform, profileUrl: string) => {
    syncPlatformProfile.mutate({ platform, profileUrl, source: "profile_url" });
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["artists", artistaId, "platform-profiles"] });
    let dispatched = false;
    const attempts: Array<[SocialPlatform, string | null, ArtistPlatformProfileSnapshot | null]> = [
      ["spotify", spotifyProfileUrl, spotifySnapshot],
      ["youtube", youtubeProfileUrl, youtubeSnapshot],
      ["deezer", deezerProfileUrl, deezerSnapshot],
      ["soundcloud", soundcloudProfileUrl, soundcloudSnapshot],
    ];
    for (const [platform, profileUrl, snapshot] of attempts) {
      if (artistaId && profileUrl && snapshot?.sync_status !== "pending") {
        enqueueProfileSync(platform, profileUrl);
        dispatched = true;
      }
    }
    if (!dispatched && hasAnyProfileInput) {
      toast.error("Nenhum link válido de plataforma para sincronizar.");
    }
  };

  const profileUrlFor: Record<SocialPlatform, string | null> = {
    spotify: spotifyProfileUrl,
    youtube: youtubeProfileUrl,
    deezer: deezerProfileUrl,
    soundcloud: soundcloudProfileUrl,
  };
  const invalidLinkMessage: Record<SocialPlatform, string> = {
    spotify: "Link do Spotify inválido.",
    youtube: "Link do YouTube inválido.",
    deezer: "Link do Deezer inválido.",
    soundcloud: "Link do SoundCloud inválido.",
  };

  const syncNow = (platform: SocialPlatform) => {
    const profileUrl = profileUrlFor[platform];
    if (!profileUrl) {
      toast.error(invalidLinkMessage[platform]);
      return;
    }
    enqueueProfileSync(platform, profileUrl);
  };

  const isFetching = platformProfiles.isFetching;

  const syncButton = (platform: SocialPlatform, snapshot: ArtistPlatformProfileSnapshot | null) => (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className="mt-2 h-6 w-full px-1 text-[10px]"
      onClick={() => syncNow(platform)}
      disabled={!artistaId || syncPlatformProfile.isPending || snapshot?.sync_status === "pending"}
      data-testid={`button-sync-${platform}-${artistaId}`}
    >
      <RefreshCw className={`h-3 w-3 ${syncPlatformProfile.isPending ? "animate-spin" : ""}`} />
      Sincronizar agora
    </Button>
  );

  return (
    <div className="border border-t-0 rounded-b-lg bg-card p-4 -mt-1">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">Métricas de Plataformas</p>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="text-muted-foreground gap-1 h-7"
          onClick={refresh}
          disabled={isFetching || syncPlatformProfile.isPending || !hasAnyProfileInput}
          data-testid={`button-atualizar-metricas-${artistaId}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching || syncPlatformProfile.isPending ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {/* Instagram — sem endpoint público de followers de terceiros na integração
            atual (Meta Graph API exige OAuth do próprio artista); contador manual. */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiInstagram className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">Instagram</span>
          </div>
          <p className="text-sm font-bold text-foreground" data-testid={`metric-instagram-${artistaId}`}>
            {instagramUrl && instagramSeguidores != null ? formatCount(instagramSeguidores) : "Indisponível"}
          </p>
          <p className="text-[10px] text-muted-foreground">Seguidores</p>
        </div>

        {/* TikTok — nenhum endpoint de followers de terceiros implementado
            (TikTokService só tem Ads API e OAuth orgânico sem leitura de perfil). */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiTiktok className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">TikTok</span>
          </div>
          <p className="text-sm font-bold text-foreground" data-testid={`metric-tiktok-${artistaId}`}>
            {tiktokUrl && tiktokSeguidores != null ? formatCount(tiktokSeguidores) : "Indisponível"}
          </p>
          <p className="text-[10px] text-muted-foreground">Seguidores</p>
        </div>

        {/* Spotify — perfil público do artista: GET/POST /artists/:id/platform-profiles/spotify */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiSpotify className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">Spotify</span>
          </div>
          {renderSyncState(
            `metric-spotify-${artistaId}`,
            hasSpotifyProfileInput,
            spotifySnapshot,
            spotifySnapshot?.monthly_listeners != null ? (
              <>
                <p className="text-sm font-bold text-foreground" data-testid={`metric-spotify-${artistaId}`}>
                  {formatCount(spotifySnapshot.monthly_listeners)}
                </p>
                <p className="text-[10px] text-muted-foreground">Ouvintes</p>
              </>
            ) : (
              <>
                {/* API pública do Spotify (client_credentials) não expõe monthly listeners —
                    nunca usar spotifySnapshot.followers aqui como substituto. */}
                <p className="text-sm font-semibold text-foreground" data-testid={`metric-spotify-${artistaId}`}>
                  Indisponível
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Ouvintes · API do Spotify não fornece este dado
                </p>
              </>
            ),
          )}
          {hasSpotifyProfileInput ? syncButton("spotify", spotifySnapshot) : null}
        </div>

        {/* YouTube — canal público do artista: GET/POST /artists/:id/platform-profiles/youtube */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiYoutube className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">YouTube</span>
          </div>
          {renderSyncState(
            `metric-youtube-${artistaId}`,
            hasYouTubeProfileInput,
            youtubeSnapshot,
            <>
              <p className="text-sm font-bold text-foreground" data-testid={`metric-youtube-${artistaId}`}>
                {formatCount(youtubeSnapshot?.subscribers)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Inscritos · {formatCount(youtubeSnapshot?.total_views)} views
              </p>
            </>,
          )}
          {hasYouTubeProfileInput ? syncButton("youtube", youtubeSnapshot) : null}
        </div>

        {/* Deezer — API pública (nb_fan), sem credencial/OAuth: GET/POST /artists/:id/platform-profiles/deezer */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <DeezerIcon className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">Deezer</span>
          </div>
          {renderSyncState(
            `metric-deezer-${artistaId}`,
            hasDeezerProfileInput,
            deezerSnapshot,
            <>
              <p className="text-sm font-bold text-foreground" data-testid={`metric-deezer-${artistaId}`}>
                {formatCount(deezerSnapshot?.followers)}
              </p>
              <p className="text-[10px] text-muted-foreground">Fãs</p>
            </>,
          )}
          {hasDeezerProfileInput ? syncButton("deezer", deezerSnapshot) : null}
        </div>

        {/* Apple Music — Catalog API (MusicKit) não expõe ouvintes/seguidores,
            só metadados de catálogo; nunca mascarar álbuns/faixas como Ouvintes. */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiApplemusic className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">Apple Music</span>
          </div>
          <p className="text-sm font-bold text-foreground" data-testid={`metric-apple-music-${artistaId}`}>
            Indisponível
          </p>
          <p className="text-[10px] text-muted-foreground">Ouvintes</p>
        </div>

        {/* SoundCloud — /resolve público (só client_id de app): GET/POST /artists/:id/platform-profiles/soundcloud */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiSoundcloud className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">SoundCloud</span>
          </div>
          {renderSyncState(
            `metric-soundcloud-${artistaId}`,
            hasSoundCloudProfileInput,
            soundcloudSnapshot,
            <>
              <p className="text-sm font-bold text-foreground" data-testid={`metric-soundcloud-${artistaId}`}>
                {formatCount(soundcloudSnapshot?.followers)}
              </p>
              <p className="text-[10px] text-muted-foreground">Seguidores</p>
            </>,
          )}
          {hasSoundCloudProfileInput ? syncButton("soundcloud", soundcloudSnapshot) : null}
        </div>
      </div>
    </div>
  );
}
