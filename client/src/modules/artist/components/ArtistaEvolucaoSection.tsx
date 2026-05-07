import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Headphones,
  Minus,
  Music2,
  Youtube,
} from "lucide-react";
import { SiSoundcloud, SiApplemusic, SiTiktok, SiInstagram } from "react-icons/si";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import {
  ArtistaEvolutionCard,
  computeEvolutionSummary,
  type EvolutionSummary,
  type TrendDirection,
} from "@/modules/artist/components/ArtistaEvolutionCard";
import { useSpotifyEvolution } from "@/modules/integrations/hooks/useSpotify";
import { useYouTubeEvolution } from "@/modules/integrations/hooks/useYouTube";
import {
  extractDeezerArtistIdFromUrl,
  useDeezerEvolution,
} from "@/modules/integrations/hooks/useDeezer";
import {
  useSoundCloudEvolution,
  extractSoundCloudHandleFromUrl,
} from "@/modules/integrations/hooks/useSoundCloud";
import {
  useAppleMusicEvolution,
  extractAppleMusicArtistIdFromUrl,
} from "@/modules/integrations/hooks/useAppleMusic";
import { useQuery } from "@tanstack/react-query";
import type { MetricEvolutionPoint } from "@/modules/integrations/hooks/useSpotify";

interface ArtistaEvolucaoSectionProps {
  artista: any;
}

const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

function fmtNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return numberFormatter.format(v);
}

function fmtPercent(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "—";
  const abs = Math.abs(pct);
  return `${pct >= 0 ? "+" : "−"}${percentFormatter.format(abs)}%`;
}

const directionStyle: Record<
  TrendDirection,
  { className: string; iconClass: string; ringClass: string; rotuloPositivo: string; rotuloNegativo: string }
> = {
  up: {
    className: "text-success",
    iconClass: "bg-success/15 text-success",
    ringClass: "ring-success/30",
    rotuloPositivo: "Em crescimento",
    rotuloNegativo: "Em crescimento",
  },
  down: {
    className: "text-destructive",
    iconClass: "bg-destructive/15 text-destructive",
    ringClass: "ring-destructive/30",
    rotuloPositivo: "Em queda",
    rotuloNegativo: "Em queda",
  },
  flat: {
    className: "text-muted-foreground",
    iconClass: "bg-muted text-muted-foreground",
    ringClass: "ring-border",
    rotuloPositivo: "Estável",
    rotuloNegativo: "Estável",
  },
};

interface PlatformInput {
  key: string;
  label: string;
  summary: EvolutionSummary;
  isLoading: boolean;
  isMissingConfig: boolean;
}

function aggregateVerdict(platforms: PlatformInput[]): {
  direction: TrendDirection;
  message: string;
  totalDelta: number | null;
  avgPercent: number | null;
  trackedCount: number;
} {
  const tracked = platforms.filter((p) => p.summary.hasEnoughData);
  if (tracked.length === 0) {
    return {
      direction: "flat",
      message:
        "Ainda não há histórico suficiente para mostrar tendência. Os dados são coletados diariamente — volte em alguns dias.",
      totalDelta: null,
      avgPercent: null,
      trackedCount: 0,
    };
  }

  const totalDelta = tracked.reduce(
    (acc, p) => acc + (p.summary.delta ?? 0),
    0,
  );
  const validPercents = tracked
    .map((p) => p.summary.percent)
    .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
  const avgPercent = validPercents.length
    ? validPercents.reduce((a, b) => a + b, 0) / validPercents.length
    : null;

  const ups = tracked.filter((p) => p.summary.direction === "up").length;
  const downs = tracked.filter((p) => p.summary.direction === "down").length;

  let direction: TrendDirection = "flat";
  if (totalDelta > 0 || ups > downs) direction = "up";
  else if (totalDelta < 0 || downs > ups) direction = "down";

  const fontes = tracked.map((p) => p.label).join(", ");
  const verbo =
    direction === "up"
      ? "está crescendo"
      : direction === "down"
      ? "está caindo"
      : "está estável";

  const message =
    direction === "flat"
      ? `Audiência estável em ${tracked.length} plataforma${tracked.length === 1 ? "" : "s"} acompanhada${tracked.length === 1 ? "" : "s"} (${fontes}).`
      : `O artista ${verbo} no total das ${tracked.length} plataforma${tracked.length === 1 ? "" : "s"} acompanhada${tracked.length === 1 ? "" : "s"} (${fontes}).`;

  return {
    direction,
    message,
    totalDelta,
    avgPercent,
    trackedCount: tracked.length,
  };
}

function useStubEvolution(artistaId: string | null | undefined, key: string) {
  return useQuery<MetricEvolutionPoint[]>({
    queryKey: [key, "evolution", artistaId ?? ""] as const,
    enabled: false,
    queryFn: async () => [],
  });
}

export function ArtistaEvolucaoSection({ artista }: ArtistaEvolucaoSectionProps) {
  const artistaId: string | null = artista?.id ?? null;
  const spotifyArtistId: string | null = artista?.spotify_artist_id ?? null;
  const youtubeChannelId: string | null = artista?.youtube_channel_id ?? null;
  const deezerUrl: string | null = artista?.deezer_url ?? null;
  const soundcloudUrl: string | null = artista?.soundcloud_url ?? null;
  const appleMusicUrl: string | null = artista?.apple_music_url ?? null;
  const instagramHandle: string | null = artista?.instagram ?? null;
  const tiktokHandle: string | null = artista?.tiktok ?? null;

  const spotifyQ = useSpotifyEvolution(artistaId, 30);
  const youtubeQ = useYouTubeEvolution(artistaId, 30);
  const deezerQ = useDeezerEvolution(artistaId, 30);
  const soundcloudQ = useSoundCloudEvolution(artistaId, 30);
  const appleMusicQ = useAppleMusicEvolution(artistaId, 30);
  const instagramQ = useStubEvolution(artistaId, "instagram");
  const tiktokQ = useStubEvolution(artistaId, "tiktok");

  const spotifySummary = useMemo(
    () => computeEvolutionSummary(spotifyQ.data, "followers"),
    [spotifyQ.data],
  );
  const youtubeSummary = useMemo(
    () => computeEvolutionSummary(youtubeQ.data, "followers"),
    [youtubeQ.data],
  );
  const deezerSummary = useMemo(
    () => computeEvolutionSummary(deezerQ.data, "followers"),
    [deezerQ.data],
  );
  const soundcloudSummary = useMemo(
    () => computeEvolutionSummary(soundcloudQ.data, "followers"),
    [soundcloudQ.data],
  );
  const appleMusicSummary = useMemo(
    () => computeEvolutionSummary(appleMusicQ.data, "followers"),
    [appleMusicQ.data],
  );
  const instagramSummary = useMemo(
    () => computeEvolutionSummary(instagramQ.data, "followers"),
    [instagramQ.data],
  );
  const tiktokSummary = useMemo(
    () => computeEvolutionSummary(tiktokQ.data, "followers"),
    [tiktokQ.data],
  );

  const platforms: PlatformInput[] = [
    {
      key: "spotify",
      label: "Spotify",
      summary: spotifySummary,
      isLoading: spotifyQ.isLoading,
      isMissingConfig: !spotifyArtistId,
    },
    {
      key: "youtube",
      label: "YouTube",
      summary: youtubeSummary,
      isLoading: youtubeQ.isLoading,
      isMissingConfig: !youtubeChannelId,
    },
    {
      key: "deezer",
      label: "Deezer",
      summary: deezerSummary,
      isLoading: deezerQ.isLoading,
      isMissingConfig: !extractDeezerArtistIdFromUrl(deezerUrl),
    },
    {
      key: "soundcloud",
      label: "SoundCloud",
      summary: soundcloudSummary,
      isLoading: soundcloudQ.isLoading,
      isMissingConfig: !extractSoundCloudHandleFromUrl(soundcloudUrl),
    },
    {
      key: "apple_music",
      label: "Apple Music",
      summary: appleMusicSummary,
      isLoading: appleMusicQ.isLoading,
      isMissingConfig: !extractAppleMusicArtistIdFromUrl(appleMusicUrl),
    },
    {
      key: "instagram",
      label: "Instagram",
      summary: instagramSummary,
      isLoading: instagramQ.isLoading,
      isMissingConfig: !instagramHandle,
    },
    {
      key: "tiktok",
      label: "TikTok",
      summary: tiktokSummary,
      isLoading: tiktokQ.isLoading,
      isMissingConfig: !tiktokHandle,
    },
  ];

  const verdict = aggregateVerdict(platforms);
  const VerdictIcon =
    verdict.direction === "up"
      ? ArrowUpRight
      : verdict.direction === "down"
      ? ArrowDownRight
      : Minus;
  const verdictStyle = directionStyle[verdict.direction];

  const isAnyLoading = platforms.some((p) => p.isLoading && !p.isMissingConfig);

  if (!artistaId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Não foi possível carregar a evolução: artista sem identificador.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="section-evolucao">
      {/* Veredito agregado */}
      <Card
        className={cn(
          "ring-1 ring-offset-0 transition-colors",
          verdictStyle.ringClass,
        )}
        data-testid="card-evolucao-veredito"
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "h-12 w-12 rounded-xl grid place-items-center shrink-0",
                verdictStyle.iconClass,
              )}
              aria-hidden="true"
            >
              <VerdictIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3
                  className={cn("text-xl font-bold", verdictStyle.className)}
                  data-testid="text-evolucao-status"
                >
                  {verdict.direction === "up"
                    ? "Em crescimento"
                    : verdict.direction === "down"
                    ? "Em queda"
                    : "Estável"}
                </h3>
                <span className="text-sm text-muted-foreground">
                  últimos 30 dias
                </span>
              </div>
              <p
                className="text-sm text-muted-foreground mt-1"
                data-testid="text-evolucao-mensagem"
              >
                {verdict.message}
              </p>

              {verdict.trackedCount > 0 && isAnyLoading ? (
                <div className="mt-3">
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : verdict.trackedCount > 0 ? (
                <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Variação média
                    </dt>
                    <dd
                      className={cn("font-semibold", verdictStyle.className)}
                      data-testid="text-evolucao-pct-medio"
                    >
                      {fmtPercent(verdict.avgPercent)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Saldo absoluto
                    </dt>
                    <dd
                      className={cn("font-semibold", verdictStyle.className)}
                      data-testid="text-evolucao-saldo"
                    >
                      {verdict.totalDelta !== null
                        ? `${verdict.totalDelta >= 0 ? "+" : "−"}${fmtNumber(Math.abs(verdict.totalDelta))}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Plataformas com histórico
                    </dt>
                    <dd
                      className="font-semibold"
                      data-testid="text-evolucao-plataformas"
                    >
                      {verdict.trackedCount} de {platforms.length}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards por plataforma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ArtistaEvolutionCard
          title="Spotify"
          subtitle="Seguidores"
          Icon={Music2}
          accent="#1DB954"
          isLoading={spotifyQ.isLoading}
          isMissingConfig={!spotifyArtistId}
          missingConfigLabel="Sem perfil do Spotify cadastrado para este artista."
          errorMessage={spotifyQ.error ? (spotifyQ.error as Error).message : null}
          points={spotifyQ.data}
          metric="followers"
          metricLabel="Seguidores"
          testIdPrefix="evolucao-spotify"
        />
        <ArtistaEvolutionCard
          title="YouTube"
          subtitle="Inscritos"
          Icon={Youtube}
          accent="#FF0000"
          isLoading={youtubeQ.isLoading}
          isMissingConfig={!youtubeChannelId}
          missingConfigLabel="Sem canal do YouTube cadastrado para este artista."
          errorMessage={youtubeQ.error ? (youtubeQ.error as Error).message : null}
          points={youtubeQ.data}
          metric="followers"
          metricLabel="Inscritos"
          testIdPrefix="evolucao-youtube"
        />
        <ArtistaEvolutionCard
          title="Deezer"
          subtitle="Fãs"
          Icon={Headphones}
          accent="#A238FF"
          isLoading={deezerQ.isLoading}
          isMissingConfig={!extractDeezerArtistIdFromUrl(deezerUrl)}
          missingConfigLabel="Sem perfil do Deezer cadastrado para este artista."
          errorMessage={deezerQ.error ? (deezerQ.error as Error).message : null}
          points={deezerQ.data}
          metric="followers"
          metricLabel="Fãs"
          testIdPrefix="evolucao-deezer"
        />
        <ArtistaEvolutionCard
          title="SoundCloud"
          subtitle="Seguidores"
          Icon={SiSoundcloud as any}
          accent="#FF5500"
          isLoading={soundcloudQ.isLoading}
          isMissingConfig={!extractSoundCloudHandleFromUrl(soundcloudUrl)}
          missingConfigLabel="Sem perfil do SoundCloud cadastrado para este artista."
          errorMessage={soundcloudQ.error ? (soundcloudQ.error as Error).message : null}
          points={soundcloudQ.data}
          metric="followers"
          metricLabel="Seguidores"
          testIdPrefix="evolucao-soundcloud"
        />
        <ArtistaEvolutionCard
          title="Apple Music"
          subtitle="Ouvintes"
          Icon={SiApplemusic as any}
          accent="#FC3C44"
          isLoading={appleMusicQ.isLoading}
          isMissingConfig={!extractAppleMusicArtistIdFromUrl(appleMusicUrl)}
          missingConfigLabel="Sem perfil do Apple Music cadastrado para este artista."
          errorMessage={appleMusicQ.error ? (appleMusicQ.error as Error).message : null}
          points={appleMusicQ.data}
          metric="followers"
          metricLabel="Ouvintes"
          testIdPrefix="evolucao-applemusic"
        />
        <ArtistaEvolutionCard
          title="Instagram"
          subtitle="Seguidores"
          Icon={SiInstagram as any}
          accent="#E1306C"
          isLoading={instagramQ.isLoading}
          isMissingConfig={!instagramHandle}
          missingConfigLabel="Sem perfil do Instagram cadastrado para este artista."
          errorMessage={instagramQ.error ? (instagramQ.error as Error).message : null}
          points={instagramQ.data}
          metric="followers"
          metricLabel="Seguidores"
          testIdPrefix="evolucao-instagram"
        />
        <ArtistaEvolutionCard
          title="TikTok"
          subtitle="Seguidores"
          Icon={SiTiktok as any}
          accent="#010101"
          isLoading={tiktokQ.isLoading}
          isMissingConfig={!tiktokHandle}
          missingConfigLabel="Sem perfil do TikTok cadastrado para este artista."
          errorMessage={tiktokQ.error ? (tiktokQ.error as Error).message : null}
          points={tiktokQ.data}
          metric="followers"
          metricLabel="Seguidores"
          testIdPrefix="evolucao-tiktok"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Os snapshots são gravados automaticamente uma vez por dia (06:15–06:25
        UTC). Plataformas sem perfil vinculado ou recém-cadastradas aparecem
        como "sem histórico ainda".
      </p>
    </div>
  );
}
