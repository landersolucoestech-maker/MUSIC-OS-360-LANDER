import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { SiApplemusic, SiSoundcloud, SiInstagram, SiTiktok, SiSpotify, SiYoutube } from "react-icons/si";
import { DeezerIcon } from "@/shared/ui/deezer-icon";
import { Button } from "@/shared/ui/button";
import {
  useArtistPlatformProfiles,
  useSyncArtistPlatformProfile,
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

export function ArtistaPlatformMetrics({
  artistaId,
  spotifyUrl,
  youtubeUrl,
  instagramUrl,
  instagramSeguidores,
  tiktokUrl,
  tiktokSeguidores,
  deezerUrl,
  deezerFas,
  appleMusicUrl,
  appleMusicAlbuns,
  soundcloudUrl,
  soundcloudSeguidores,
}: ArtistaPlatformMetricsProps) {
  const qc = useQueryClient();
  const platformProfiles = useArtistPlatformProfiles(artistaId);
  const syncPlatformProfile = useSyncArtistPlatformProfile(artistaId);

  const snapshots = platformProfiles.data ?? [];
  const spotifySnapshot = snapshots.find((profile) => profile.platform === "spotify") ?? null;
  const youtubeSnapshot = snapshots.find((profile) => profile.platform === "youtube") ?? null;

  const spotifyProfileInput = (spotifyUrl ?? "").trim();
  const youtubeProfileInput = (youtubeUrl ?? "").trim();
  const spotifyProfileUrl = normalizeSpotifyProfileUrl(spotifyProfileInput);
  const youtubeProfileUrl = normalizeYouTubeProfileUrl(youtubeProfileInput);
  const hasSpotifyProfileInput = spotifyProfileInput.length > 0;
  const hasYouTubeProfileInput = youtubeProfileInput.length > 0;
  const hasAnyProfileInput = hasSpotifyProfileInput || hasYouTubeProfileInput;

  const enqueueProfileSync = (platform: SocialPlatform, profileUrl: string) => {
    syncPlatformProfile.mutate({ platform, profileUrl, source: "profile_url" });
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["artists", artistaId, "platform-profiles"] });
    let dispatched = false;
    if (artistaId && spotifyProfileUrl && spotifySnapshot?.sync_status !== "pending") {
      enqueueProfileSync("spotify", spotifyProfileUrl);
      dispatched = true;
    }
    if (artistaId && youtubeProfileUrl && youtubeSnapshot?.sync_status !== "pending") {
      enqueueProfileSync("youtube", youtubeProfileUrl);
      dispatched = true;
    }
    if (!dispatched && hasAnyProfileInput) {
      toast.error("Nenhum link válido de Spotify ou YouTube para sincronizar.");
    }
  };

  const syncNow = (platform: SocialPlatform) => {
    const profileUrl = platform === "spotify" ? spotifyProfileUrl : youtubeProfileUrl;
    if (!profileUrl) {
      toast.error(platform === "spotify" ? "Link do Spotify inválido." : "Link do YouTube inválido.");
      return;
    }
    enqueueProfileSync(platform, profileUrl);
  };

  const isFetching = platformProfiles.isFetching;

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
        {/* Instagram */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiInstagram className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">Instagram</span>
          </div>
          <p className="text-sm font-bold text-foreground" data-testid={`metric-instagram-${artistaId}`}>
            {instagramUrl && instagramSeguidores != null ? formatCount(instagramSeguidores) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Seguidores</p>
        </div>

        {/* TikTok */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiTiktok className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">TikTok</span>
          </div>
          <p className="text-sm font-bold text-foreground" data-testid={`metric-tiktok-${artistaId}`}>
            {tiktokUrl && tiktokSeguidores != null ? formatCount(tiktokSeguidores) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Seguidores</p>
        </div>

        {/* Spotify — backend real: GET/POST /artists/:id/platform-profiles/spotify */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiSpotify className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">Spotify</span>
          </div>
          {!hasSpotifyProfileInput ? (
            <>
              <p className="text-sm font-bold text-foreground" data-testid={`metric-spotify-${artistaId}`}>
                —
              </p>
              <p className="text-[10px] text-muted-foreground">Não configurado</p>
            </>
          ) : spotifySnapshot?.sync_status === "pending" ? (
            <>
              <p
                className="text-sm font-bold text-foreground animate-pulse"
                data-testid={`metric-spotify-${artistaId}`}
              >
                ...
              </p>
              <p className="text-[10px] text-muted-foreground">Sincronizando</p>
            </>
          ) : spotifySnapshot?.sync_status === "failed" ? (
            <>
              <p className="text-sm font-semibold text-foreground" data-testid={`metric-spotify-${artistaId}`}>
                Erro
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {spotifySnapshot.last_error ?? "Falha na sincronização"}
              </p>
            </>
          ) : spotifySnapshot?.sync_status === "success" ? (
            <>
              <p className="text-sm font-bold text-foreground" data-testid={`metric-spotify-${artistaId}`}>
                {formatCount(spotifySnapshot.monthly_listeners)}
              </p>
              <p className="text-[10px] text-muted-foreground">Ouvintes mensais</p>
              <p className="text-[10px] text-muted-foreground">
                {formatCount(spotifySnapshot.followers)} seguidores
                {typeof spotifySnapshot.popularity === "number" ? ` · Pop ${spotifySnapshot.popularity}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground" data-testid={`metric-spotify-${artistaId}`}>
                Não sincronizado
              </p>
              <p className="text-[10px] text-muted-foreground">Clique em "Sincronizar agora"</p>
            </>
          )}
          {hasSpotifyProfileInput ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="mt-2 h-6 w-full px-1 text-[10px]"
              onClick={() => syncNow("spotify")}
              disabled={!artistaId || syncPlatformProfile.isPending || spotifySnapshot?.sync_status === "pending"}
              data-testid={`button-sync-spotify-${artistaId}`}
            >
              <RefreshCw className={`h-3 w-3 ${syncPlatformProfile.isPending ? "animate-spin" : ""}`} />
              Sincronizar agora
            </Button>
          ) : null}
        </div>

        {/* YouTube — backend real: GET/POST /artists/:id/platform-profiles/youtube */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiYoutube className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">YouTube</span>
          </div>
          {!hasYouTubeProfileInput ? (
            <>
              <p className="text-sm font-bold text-foreground" data-testid={`metric-youtube-${artistaId}`}>
                —
              </p>
              <p className="text-[10px] text-muted-foreground">Não configurado</p>
            </>
          ) : youtubeSnapshot?.sync_status === "pending" ? (
            <>
              <p
                className="text-sm font-bold text-foreground animate-pulse"
                data-testid={`metric-youtube-${artistaId}`}
              >
                ...
              </p>
              <p className="text-[10px] text-muted-foreground">Sincronizando</p>
            </>
          ) : youtubeSnapshot?.sync_status === "failed" ? (
            <>
              <p className="text-sm font-semibold text-foreground" data-testid={`metric-youtube-${artistaId}`}>
                Erro
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {youtubeSnapshot.last_error ?? "Falha na sincronização"}
              </p>
            </>
          ) : youtubeSnapshot?.sync_status === "success" ? (
            <>
              <p className="text-sm font-bold text-foreground" data-testid={`metric-youtube-${artistaId}`}>
                {formatCount(youtubeSnapshot.subscribers)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Inscritos · {formatCount(youtubeSnapshot.total_views)} views
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground" data-testid={`metric-youtube-${artistaId}`}>
                Não sincronizado
              </p>
              <p className="text-[10px] text-muted-foreground">Clique em "Sincronizar agora"</p>
            </>
          )}
          {hasYouTubeProfileInput ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="mt-2 h-6 w-full px-1 text-[10px]"
              onClick={() => syncNow("youtube")}
              disabled={!artistaId || syncPlatformProfile.isPending || youtubeSnapshot?.sync_status === "pending"}
              data-testid={`button-sync-youtube-${artistaId}`}
            >
              <RefreshCw className={`h-3 w-3 ${syncPlatformProfile.isPending ? "animate-spin" : ""}`} />
              Sincronizar agora
            </Button>
          ) : null}
        </div>

        {/* Deezer */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <DeezerIcon className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">Deezer</span>
          </div>
          <p className="text-sm font-bold text-foreground" data-testid={`metric-deezer-${artistaId}`}>
            {deezerUrl && deezerFas != null ? formatCount(deezerFas) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Fãs</p>
        </div>

        {/* Apple Music */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiApplemusic className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">Apple Music</span>
          </div>
          <p className="text-sm font-bold text-foreground" data-testid={`metric-apple-music-${artistaId}`}>
            {appleMusicUrl && appleMusicAlbuns != null ? formatCount(appleMusicAlbuns) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Catálogos</p>
        </div>

        {/* SoundCloud */}
        <div className="rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1 mb-1">
            <SiSoundcloud className="h-3 w-3 text-foreground" />
            <span className="text-[10px] text-foreground font-medium">SoundCloud</span>
          </div>
          <p className="text-sm font-bold text-foreground" data-testid={`metric-soundcloud-${artistaId}`}>
            {soundcloudUrl && soundcloudSeguidores != null ? formatCount(soundcloudSeguidores) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">Seguidores</p>
        </div>
      </div>
    </div>
  );
}
