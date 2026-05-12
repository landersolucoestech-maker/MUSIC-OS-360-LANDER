import { useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  AlertCircle,
  Headphones,
} from "lucide-react";
import { SiApplemusic, SiSoundcloud, SiInstagram, SiTiktok, SiSpotify, SiYoutube } from "react-icons/si";
import { Button } from "@/shared/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { PlatformMiniTrend } from "@/modules/artist/components/PlatformMiniTrend";

interface PlatformDataError { status: number; message?: string }
type SpotifyDataError = PlatformDataError;
type YouTubeDataError = PlatformDataError;
type DeezerDataError = PlatformDataError;
type AppleMusicDataError = PlatformDataError;
type SoundCloudDataError = PlatformDataError;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stubStatus = () => ({ data: null as any, isLoading: false, isFetching: false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stubQuery = () => ({ data: null as any, isLoading: false, isFetching: false, error: null as any });
const stubEvolution = () => ({ data: [] as { date: string; followers?: number | null }[], isLoading: false });

const useSpotifyStatus = stubStatus;
const useYouTubeStatus = stubStatus;
const useAppleMusicStatus = stubStatus;
const useSpotifyArtist = (_id: string | null) => stubQuery();
const useYouTubeChannel = (_id: string | null) => stubQuery();
const useDeezerArtist = (_url: string | null) => stubQuery();
const useAppleMusicArtist = (_url: string | null) => stubQuery();
const useSoundCloudUser = (_url: string | null) => stubQuery();
const useSpotifyEvolution = (_id: string | null, _days: number) => stubEvolution();
const useYouTubeEvolution = (_id: string | null, _days: number) => stubEvolution();
const useDeezerEvolution = (_id: string | null, _days: number) => stubEvolution();
const useAppleMusicEvolution = (_id: string | null, _days: number) => stubEvolution();
const useSoundCloudEvolution = (_id: string | null, _days: number) => stubEvolution();
const extractDeezerArtistIdFromUrl = (_url: string | null | undefined): string | null => null;
const extractAppleMusicArtistIdFromUrl = (_url: string | null | undefined): string | null => null;
const extractSoundCloudHandleFromUrl = (_url: string | null | undefined): string | null => null;

interface ArtistaPlatformMetricsProps {
  artistaId: string;
  instagramUrl?: string | null;
  instagramSeguidores?: number | null;
  tiktokUrl?: string | null;
  tiktokSeguidores?: number | null;
  spotifyArtistId?: string | null;
  spotifyOuvintes?: number | null;
  youtubeChannelId?: string | null;
  youtubeInscritos?: number | null;
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

/**
 * Texto curto exibido no card quando a métrica não pôde ser carregada.
 * 409 = credenciais não configuradas (caso esperado para orgs sem Spotify/YouTube).
 */
function shortErrorLabel(
  err:
    | SpotifyDataError
    | YouTubeDataError
    | DeezerDataError
    | AppleMusicDataError
    | SoundCloudDataError,
): string {
  if (err.status === 409) return "Não configurado";
  if (err.status === 422) return "ID inválido";
  if (err.status === 401) return "Sem acesso";
  if (err.status === 502) return "Falha externa";
  return "Erro";
}

export function ArtistaPlatformMetrics({
  artistaId,
  instagramUrl,
  instagramSeguidores,
  tiktokUrl,
  tiktokSeguidores,
  spotifyArtistId,
  spotifyOuvintes,
  youtubeChannelId,
  youtubeInscritos,
  deezerUrl,
  deezerFas,
  appleMusicUrl,
  appleMusicAlbuns,
  soundcloudUrl,
  soundcloudSeguidores,
}: ArtistaPlatformMetricsProps) {
  const qc = useQueryClient();

  const spotifyStatus = useSpotifyStatus();
  const youtubeStatus = useYouTubeStatus();
  useAppleMusicStatus(); // keep hook call for future use

  const spotifyConfigured =
    spotifyStatus.data?.connected || spotifyStatus.data?.has_global_fallback;
  const youtubeConfigured =
    youtubeStatus.data?.connected || youtubeStatus.data?.has_global_fallback;

  const spotifyEnabledId = spotifyConfigured ? spotifyArtistId ?? null : null;
  const youtubeEnabledId = youtubeConfigured ? youtubeChannelId ?? null : null;

  const spotifyQuery = useSpotifyArtist(spotifyEnabledId);
  const youtubeQuery = useYouTubeChannel(youtubeEnabledId);

  // Deezer / Apple Music / SoundCloud não exigem credenciais por org —
  // as edge functions usam APIs públicas. Por isso os tiles só dependem
  // da URL cadastrada.
  const deezerArtistId = extractDeezerArtistIdFromUrl(deezerUrl);
  const deezerQuery = useDeezerArtist(deezerUrl ?? null);

  const appleMusicArtistId = extractAppleMusicArtistIdFromUrl(appleMusicUrl);
  const appleMusicQuery = useAppleMusicArtist(appleMusicUrl ?? null);

  const soundcloudHandle = extractSoundCloudHandleFromUrl(soundcloudUrl);
  const soundcloudQuery = useSoundCloudUser(soundcloudUrl ?? null);

  // Histórico (snapshots diários — Task #354/#359) usado para mostrar a
  // variação % e a sparkline diretamente nos tiles do card.
  const spotifyEvolution = useSpotifyEvolution(
    spotifyArtistId ? artistaId : null,
    30,
  );
  const youtubeEvolution = useYouTubeEvolution(
    youtubeChannelId ? artistaId : null,
    30,
  );
  const deezerEvolution = useDeezerEvolution(
    deezerArtistId ? artistaId : null,
    30,
  );
  const appleMusicEvolution = useAppleMusicEvolution(
    appleMusicArtistId ? artistaId : null,
    30,
  );
  const soundcloudEvolution = useSoundCloudEvolution(
    soundcloudHandle ? artistaId : null,
    30,
  );

  const spotifyFollowers = spotifyQuery.data?.followers?.total ?? null;
  const youtubeChannel = youtubeQuery.data?.items?.[0];
  const subscriberCount = youtubeChannel?.statistics?.subscriberCount ?? null;
  const hiddenSubscribers = Boolean(
    youtubeChannel?.statistics?.hiddenSubscriberCount,
  );
  const deezerFans = deezerQuery.data?.nb_fan ?? null;
  const appleMusicAlbumCount = appleMusicQuery.data?.albumCount ?? null;
  const appleMusicMonthlyListeners = appleMusicQuery.data?.monthlyListeners ?? null;
  const appleMusicSource = appleMusicQuery.data?.source ?? null;
  const appleMusicLatestRelease = appleMusicQuery.data?.latestRelease ?? null;
  const appleMusicGenre = appleMusicQuery.data?.primaryGenreName ?? null;
  const soundcloudFollowers = soundcloudQuery.data?.followers_count ?? null;
  const soundcloudTracks = soundcloudQuery.data?.track_count ?? null;

  const appleMusicUrlTrimmed = (appleMusicUrl ?? "").trim();
  const soundcloudUrlTrimmed = (soundcloudUrl ?? "").trim();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["spotify", "status"] });
    qc.invalidateQueries({ queryKey: ["youtube", "status"] });
    qc.invalidateQueries({ queryKey: ["apple_music", "status"] });
    qc.invalidateQueries({ queryKey: ["spotify", "artist", spotifyArtistId ?? ""] });
    qc.invalidateQueries({ queryKey: ["youtube", "channel", youtubeChannelId ?? ""] });
    qc.invalidateQueries({ queryKey: ["deezer", "artist", deezerArtistId ?? ""] });
    qc.invalidateQueries({
      queryKey: ["apple-music", "artist", appleMusicArtistId ?? ""],
    });
    qc.invalidateQueries({
      queryKey: ["soundcloud", "user", soundcloudHandle ?? ""],
    });
  };

  const isFetching =
    spotifyQuery.isFetching ||
    youtubeQuery.isFetching ||
    deezerQuery.isFetching ||
    appleMusicQuery.isFetching ||
    soundcloudQuery.isFetching;

  return (
    <div className="border border-t-0 rounded-b-lg bg-card p-4 -mt-1">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">Métricas de Plataformas</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1 h-7"
          onClick={refresh}
          disabled={isFetching}
          data-testid={`button-atualizar-metricas-${artistaId}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {/* Instagram */}
        <div
          className="rounded-lg p-2"
          style={{ background: "linear-gradient(135deg, hsl(271 91% 52%) 0%, hsl(271 91% 38%) 100%)" }}
        >
          <div className="flex items-center gap-1 mb-1">
            <SiInstagram className="h-3 w-3 text-white" />
            <span className="text-[10px] text-white font-medium">Instagram</span>
          </div>
          <>
            <p className="text-sm font-bold text-white" data-testid={`metric-instagram-${artistaId}`}>
              {instagramUrl && instagramSeguidores != null ? formatCount(instagramSeguidores) : "—"}
            </p>
            <p className="text-[10px] text-white/70">Seguidores</p>
          </>
        </div>

        {/* TikTok */}
        <div className="rounded-lg p-2" style={{ background: "linear-gradient(135deg, hsl(222 47% 16%) 0%, hsl(222 47% 10%) 100%)" }}>
          <div className="flex items-center gap-1 mb-1">
            <SiTiktok className="h-3 w-3 text-white" />
            <span className="text-[10px] text-white font-medium">TikTok</span>
          </div>
          <>
            <p className="text-sm font-bold text-white" data-testid={`metric-tiktok-${artistaId}`}>
              {tiktokUrl && tiktokSeguidores != null ? formatCount(tiktokSeguidores) : "—"}
            </p>
            <p className="text-[10px] text-white/70">Seguidores</p>
          </>
        </div>

        {/* Spotify */}
        <div className="rounded-lg p-2" style={{ background: "linear-gradient(135deg, hsl(142 76% 28%) 0%, hsl(142 76% 20%) 100%)" }}>
          <div className="flex items-center gap-1 mb-1">
            <SiSpotify className="h-3 w-3 text-white" />
            <span className="text-[10px] text-white font-medium">Spotify</span>
            {spotifyQuery.error ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle
                    className="h-3.5 w-3.5 text-white/90 ml-auto cursor-help"
                    data-testid={`icon-spotify-error-${artistaId}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[260px]">{spotifyQuery.error.message}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          {!spotifyArtistId ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-spotify-${artistaId}`}
              >
                —
              </p>
              <p className="text-[10px] text-white/70">Ouvintes mensais</p>
            </>
          ) : !spotifyConfigured ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-spotify-${artistaId}`}
              >
                {spotifyOuvintes != null ? formatCount(spotifyOuvintes) : "—"}
              </p>
              <p className="text-[10px] text-white/70">Ouvintes mensais</p>
            </>
          ) : spotifyQuery.isLoading ? (
            <>
              <p
                className="text-sm font-bold text-white animate-pulse"
                data-testid={`metric-spotify-${artistaId}`}
              >
                ···
              </p>
              <p className="text-[10px] text-white/70">Carregando…</p>
            </>
          ) : spotifyQuery.error ? (
            <>
              <p
                className="text-sm font-semibold text-white"
                data-testid={`metric-spotify-${artistaId}`}
              >
                {shortErrorLabel(spotifyQuery.error)}
              </p>
              <p className="text-xs text-white/70 truncate">{spotifyQuery.error.message}</p>
            </>
          ) : (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-spotify-${artistaId}`}
              >
                {formatCount(spotifyFollowers)}
              </p>
              <p className="text-[10px] text-white/70">
                Seguidores
                {typeof spotifyQuery.data?.popularity === "number"
                  ? ` · Pop ${spotifyQuery.data.popularity}`
                  : ""}
              </p>
              <PlatformMiniTrend
                points={spotifyEvolution.data}
                metric="followers"
                variant="white"
                testIdPrefix={`metric-spotify-${artistaId}`}
              />
            </>
          )}
        </div>

        {/* YouTube */}
        <div className="rounded-lg p-2" style={{ background: "linear-gradient(135deg, hsl(217 91% 50%) 0%, hsl(217 91% 38%) 100%)" }}>
          <div className="flex items-center gap-1 mb-1">
            <SiYoutube className="h-3 w-3 text-white" />
            <span className="text-[10px] text-white font-medium">YouTube</span>
            {youtubeQuery.error ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle
                    className="h-3.5 w-3.5 text-white/90 ml-auto cursor-help"
                    data-testid={`icon-youtube-error-${artistaId}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[260px]">{youtubeQuery.error.message}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          {!youtubeChannelId ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-youtube-${artistaId}`}
              >
                —
              </p>
              <p className="text-[10px] text-white/70">Inscritos</p>
            </>
          ) : !youtubeConfigured ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-youtube-${artistaId}`}
              >
                {youtubeInscritos != null ? formatCount(youtubeInscritos) : "—"}
              </p>
              <p className="text-[10px] text-white/70">Inscritos</p>
            </>
          ) : youtubeQuery.isLoading ? (
            <>
              <p
                className="text-sm font-bold text-white animate-pulse"
                data-testid={`metric-youtube-${artistaId}`}
              >
                ···
              </p>
              <p className="text-[10px] text-white/70">Carregando…</p>
            </>
          ) : youtubeQuery.error ? (
            <>
              <p
                className="text-sm font-semibold text-white"
                data-testid={`metric-youtube-${artistaId}`}
              >
                {shortErrorLabel(youtubeQuery.error)}
              </p>
              <p className="text-xs text-white/70 truncate">{youtubeQuery.error.message}</p>
            </>
          ) : !youtubeChannel ? (
            <>
              <p
                className="text-sm font-semibold text-white"
                data-testid={`metric-youtube-${artistaId}`}
              >
                Não encontrado
              </p>
              <p className="text-[10px] text-white/70">Verifique a URL do canal</p>
            </>
          ) : (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-youtube-${artistaId}`}
              >
                {hiddenSubscribers ? "Oculto" : formatCount(subscriberCount)}
              </p>
              <p className="text-[10px] text-white/70">
                Inscritos · {formatCount(youtubeChannel.statistics?.viewCount)} views
              </p>
              <PlatformMiniTrend
                points={youtubeEvolution.data}
                metric="followers"
                variant="white"
                testIdPrefix={`metric-youtube-${artistaId}`}
              />
            </>
          )}
        </div>

        {/* Deezer — usa a edge function pública `deezer-metrics` (Task #354).
            Não depende de credenciais por org, então o tile só pede a URL. */}
        <div
          className="rounded-lg p-2"
          style={{ background: "linear-gradient(135deg, hsl(217 91% 38%) 0%, hsl(222 47% 22%) 100%)" }}
        >
          <div className="flex items-center gap-1 mb-1">
            <Headphones className="h-3 w-3 text-white" />
            <span className="text-[10px] text-white font-medium">Deezer</span>
            {deezerQuery.error ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle
                    className="h-3.5 w-3.5 text-white/90 ml-auto cursor-help"
                    data-testid={`icon-deezer-error-${artistaId}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[260px]">{deezerQuery.error.message}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          {!deezerUrl ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-deezer-${artistaId}`}
              >
                —
              </p>
              <p className="text-[10px] text-white/70">Fãs</p>
            </>
          ) : !deezerArtistId ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-deezer-${artistaId}`}
              >
                {deezerFas != null ? formatCount(deezerFas) : "—"}
              </p>
              <p className="text-[10px] text-white/70">Fãs</p>
            </>
          ) : deezerQuery.isLoading ? (
            <>
              <p
                className="text-sm font-bold text-white animate-pulse"
                data-testid={`metric-deezer-${artistaId}`}
              >
                ···
              </p>
              <p className="text-[10px] text-white/70">Carregando…</p>
            </>
          ) : deezerQuery.error ? (
            <>
              <p
                className="text-sm font-semibold text-white"
                data-testid={`metric-deezer-${artistaId}`}
              >
                {shortErrorLabel(deezerQuery.error)}
              </p>
              <p className="text-xs text-white/70 truncate">{deezerQuery.error.message}</p>
            </>
          ) : (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-deezer-${artistaId}`}
              >
                {formatCount(deezerFans)}
              </p>
              <p className="text-[10px] text-white/70">
                Fãs
                {typeof deezerQuery.data?.nb_album === "number"
                  ? ` · ${deezerQuery.data.nb_album} álbuns`
                  : ""}
              </p>
              <PlatformMiniTrend
                points={deezerEvolution.data}
                metric="followers"
                variant="white"
                testIdPrefix={`metric-deezer-${artistaId}`}
              />
            </>
          )}
        </div>

        {/* Apple Music — dois modos (Task #364):
            - Com MusicKit JWT configurado (Configurações → Integrações → Apple Music for Artists):
              edge function chama Apple Music Catalog API e retorna dados enriquecidos.
              `monthlyListeners` é mostrado se a API retornar esse dado; caso contrário
              mantém o fallback de álbuns (Apple Music Catalog API pública não expõe listeners).
            - Sem JWT: iTunes Lookup API pública — mostra albumCount + último lançamento. */}
        <div
          className="rounded-lg p-2"
          style={{ background: "linear-gradient(135deg, hsl(38 92% 44%) 0%, hsl(25 95% 40%) 100%)" }}
        >
          <div className="flex items-center gap-1 mb-1">
            <SiApplemusic className="h-3 w-3 text-white" />
            <span className="text-[10px] text-white font-medium">Apple Music</span>
            {appleMusicQuery.error ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle
                    className="h-3.5 w-3.5 text-white/90 ml-auto cursor-help"
                    data-testid={`icon-apple-music-error-${artistaId}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[260px]">
                    {appleMusicQuery.error.message}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          {!appleMusicUrlTrimmed ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-apple-music-${artistaId}`}
              >
                —
              </p>
              <p className="text-[10px] text-white/70">Catálogos</p>
            </>
          ) : !appleMusicArtistId ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-apple-music-${artistaId}`}
              >
                {appleMusicAlbuns != null ? formatCount(appleMusicAlbuns) : "—"}
              </p>
              <p className="text-[10px] text-white/70">Catálogos</p>
            </>
          ) : appleMusicQuery.isLoading ? (
            <>
              <p
                className="text-sm font-bold text-white animate-pulse"
                data-testid={`metric-apple-music-${artistaId}`}
              >
                ···
              </p>
              <p className="text-[10px] text-white/70">Carregando…</p>
            </>
          ) : appleMusicQuery.error ? (
            <>
              <p
                className="text-sm font-semibold text-white"
                data-testid={`metric-apple-music-${artistaId}`}
              >
                {shortErrorLabel(appleMusicQuery.error)}
              </p>
              <p className="text-xs text-white/70 truncate">
                {appleMusicQuery.error.message}
              </p>
            </>
          ) : (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-apple-music-${artistaId}`}
              >
                {appleMusicMonthlyListeners !== null
                  ? formatCount(appleMusicMonthlyListeners)
                  : formatCount(appleMusicAlbumCount)}
              </p>
              <p className="text-xs text-white/70 truncate">
                {appleMusicMonthlyListeners !== null
                  ? "Ouvintes mensais"
                  : `Álbuns${appleMusicLatestRelease ? ` · ${appleMusicLatestRelease}` : appleMusicGenre ? ` · ${appleMusicGenre}` : ""}`}
              </p>
              {appleMusicSource === "apple_music_catalog" && appleMusicMonthlyListeners === null && (
                <p className="text-xs text-white/50 truncate">
                  {appleMusicLatestRelease ?? appleMusicGenre ?? ""}
                </p>
              )}
              <PlatformMiniTrend
                points={appleMusicEvolution.data}
                metric="followers"
                variant="white"
                testIdPrefix={`metric-apple-music-${artistaId}`}
              />
            </>
          )}
        </div>

        {/* SoundCloud — usa edge function pública `soundcloud-metrics`
            (Task #359). Lê a contagem de seguidores e faixas direto do
            HTML público do perfil (sem necessidade de OAuth). */}
        <div className="rounded-lg p-2" style={{ background: "linear-gradient(135deg, hsl(38 92% 38%) 0%, hsl(25 95% 32%) 100%)" }}>
          <div className="flex items-center gap-1 mb-1">
            <SiSoundcloud className="h-3 w-3 text-white" />
            <span className="text-[10px] text-white font-medium">SoundCloud</span>
            {soundcloudQuery.error ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle
                    className="h-3.5 w-3.5 text-white/90 ml-auto cursor-help"
                    data-testid={`icon-soundcloud-error-${artistaId}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[260px]">
                    {soundcloudQuery.error.message}
                  </p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          {!soundcloudUrlTrimmed ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-soundcloud-${artistaId}`}
              >
                —
              </p>
              <p className="text-[10px] text-white/70">Seguidores</p>
            </>
          ) : !soundcloudHandle ? (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-soundcloud-${artistaId}`}
              >
                {soundcloudSeguidores != null ? formatCount(soundcloudSeguidores) : "—"}
              </p>
              <p className="text-[10px] text-white/70">Seguidores</p>
            </>
          ) : soundcloudQuery.isLoading ? (
            <>
              <p
                className="text-sm font-bold text-white animate-pulse"
                data-testid={`metric-soundcloud-${artistaId}`}
              >
                ···
              </p>
              <p className="text-[10px] text-white/70">Carregando…</p>
            </>
          ) : soundcloudQuery.error ? (
            <>
              <p
                className="text-sm font-semibold text-white"
                data-testid={`metric-soundcloud-${artistaId}`}
              >
                {shortErrorLabel(soundcloudQuery.error)}
              </p>
              <p className="text-xs text-white/70 truncate">
                {soundcloudQuery.error.message}
              </p>
            </>
          ) : (
            <>
              <p
                className="text-sm font-bold text-white"
                data-testid={`metric-soundcloud-${artistaId}`}
              >
                {formatCount(soundcloudFollowers)}
              </p>
              <p className="text-[10px] text-white/70">
                Seguidores
                {typeof soundcloudTracks === "number"
                  ? ` · ${soundcloudTracks} faixas`
                  : ""}
              </p>
              <PlatformMiniTrend
                points={soundcloudEvolution.data}
                metric="followers"
                variant="white"
                testIdPrefix={`metric-soundcloud-${artistaId}`}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
