import { useMemo, useState } from "react";
import { BarChart3, Disc3, Radio, Search, Share2, Target, TrendingUp, UserRound } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { AiGeneratedResult } from "../../types/marketing.types";
import type { ArtistProfileSources, GenerateAiHandler, TargetOption } from "./iaCriativa.types";
import { buildArtistProfilePrompt, loadArtistContext, type ArtistProfileContext } from "../../services/musicIntelligenceEngine";
import { copyResult, EntitySelect, ResultActions, ResultList, ResultText, StructuredResult, WorkflowSection } from "./Shared";
import { getLatestResult, joinPrompt } from "./iaCriativa.utils";

type ArtistProfileBundle = ArtistProfileContext;

export function PerfilTab({
  artistOptions,
  sources,
  onGenerate,
  isGenerating,
}: {
  artistOptions: TargetOption[];
  sources: ArtistProfileSources;
  onGenerate: GenerateAiHandler;
  isGenerating: boolean;
}) {
  const [artist, setArtist] = useState<TargetOption | null>(null);

  const bundle = useMemo<ArtistProfileBundle | null>(
    () => artist ? loadArtistContext(artist, sources) : null,
    [artist, sources],
  );
  const result = useMemo<AiGeneratedResult | null>(() => (
    artist ? getLatestResult(sources.suggestions.filter((item) => item.targetId === artist.id || item.targetName === artist.label), ["analise_artista"]) : null
  ), [artist, sources.suggestions]);
  const canGenerate = Boolean(artist && bundle) && !isGenerating;

  const generate = () => {
    if (!artist || !bundle) return;
    onGenerate({
      kind: "analise_artista",
      targetType: "artista",
      targetId: artist.id,
      targetName: artist.label,
      prompt: buildArtistProfilePrompt(bundle),
      profileData: bundle,
      audience: bundle.publicSignals.join(" | "),
      genre: bundle.predominantGenre,
      references: bundle.references.join(" | "),
    });
  };

  return (
    <WorkflowSection
      question="Quem vamos analisar?"
      result={
        <>
          {result ? <ExecutiveProfileResult result={result} bundle={bundle} /> : <ProfileWaitingState bundle={bundle} />}
          <ResultActions result={result} onCopy={() => copyResult(result)} onRegenerate={generate} canRegenerate={canGenerate} isGenerating={isGenerating} />
        </>
      }
    >
      <EntitySelect
        label="Artista"
        value={artist?.id ?? ""}
        options={artistOptions}
        placeholder="Selecione o artista"
        onChange={setArtist}
      />
      {bundle && <ProfileDataDashboard bundle={bundle} />}
      <Button onClick={generate} disabled={!canGenerate} size="sm" className="w-full gap-2 sm:w-auto">
        <Search className="h-4 w-4" />
        {isGenerating ? "Analisando..." : "Executar análise completa"}
      </Button>
    </WorkflowSection>
  );
}

function buildArtistProfileBundle(artist: TargetOption, sources: ArtistProfileSources) {
  const artistRecord = sources.artists.find((item) => item.id === artist.id);
  const obras = sources.obras.filter((item) => item.artista_id === artist.id || item.artistas?.id === artist.id);
  const fonogramas = sources.fonogramas.filter((item) => item.artista_id === artist.id || item.artistas?.id === artist.id);
  const releases = sources.releases.filter((item) => item.artista_id === artist.id || item.artistas?.id === artist.id);
  const projects = sources.projects.filter((item) => item.artistId === artist.id);
  const campaigns = sources.campaigns.filter((item) => item.targetType === "artista" && item.targetId === artist.id);
  const contents = sources.contents.filter((item) => item.targetType === "artista" && item.targetId === artist.id);
  const tasks = sources.tasks.filter((item) => item.targetType === "artista" && item.targetId === artist.id);
  const pitchings = sources.suggestions.filter((item) => item.targetId === artist.id || item.targetName === artist.label);
  const genreCandidates = [
    artistRecord?.genero_musical,
    ...obras.map((item) => item.genero),
    ...fonogramas.map((item) => item.genero_musical),
    ...releases.map((item) => item.genero),
  ].filter(Boolean).map(String);
  const socialSignals = [
    artistRecord?.instagram ? `Instagram: ${artistRecord.instagram}` : "",
    artistRecord?.instagram_seguidores ? `Instagram seguidores: ${artistRecord.instagram_seguidores}` : "",
    artistRecord?.tiktok ? `TikTok: ${artistRecord.tiktok}` : "",
    artistRecord?.tiktok_seguidores ? `TikTok seguidores: ${artistRecord.tiktok_seguidores}` : "",
    artistRecord?.spotify_ouvintes ? `Spotify ouvintes: ${artistRecord.spotify_ouvintes}` : "",
    artistRecord?.youtube_inscritos ? `YouTube inscritos: ${artistRecord.youtube_inscritos}` : "",
  ].filter(Boolean);
  const releaseDates = releases.map((item) => item.data_lancamento).filter(Boolean).map(String).sort();

  return {
    artist,
    artistRecord,
    predominantGenre: mostCommon(genreCandidates),
    subgenres: uniqueStrings([
      ...fonogramas.map((item) => stringifyValue(item.classificacao)),
      ...releases.map((item) => stringifyValue(item["subgenero"])),
    ]),
    moods: uniqueStrings([
      ...releases.map((item) => stringifyValue(item["mood"])),
      ...fonogramas.map((item) => stringifyValue(item["mood"])),
    ]),
    references: uniqueStrings([
      ...obras.map((item) => stringifyValue(item.compositor || item.compositores)),
      ...fonogramas.map((item) => stringifyValue(item.produtores || item.gravadora || item.agregadora)),
      ...releases.map((item) => stringifyValue(item.distribuidora || item.gravadora)),
    ]),
    publicSignals: socialSignals,
    catalog: {
      releases,
      obras,
      fonogramas,
      totalReleases: releases.length,
      totalTracks: fonogramas.length || obras.length,
      releaseDates,
      frequency: estimateReleaseFrequency(releaseDates),
      isrcs: uniqueStrings([...obras.map((item) => item.isrc), ...fonogramas.map((item) => item.isrc), ...releases.map((item) => item.isrc_global)]),
    },
    operations: {
      projects,
      campaigns,
      contents,
      tasks,
      pitchings,
      completedTasks: tasks.filter((item) => item.status === "concluida").length,
      openTasks: tasks.filter((item) => item.status !== "concluida").length,
    },
    careerStage: inferCareerStage(artistRecord?.spotify_ouvintes, artistRecord?.instagram_seguidores, releases.length),
    growthRhythm: inferGrowthRhythm(releaseDates, socialSignals),
  };
}

function buildPrompt(bundle: ArtistProfileBundle) {
  return joinPrompt([
    `Executar análise completa de perfil artistico para ${bundle.artist.label}.`,
    `Cadastro: ${JSON.stringify({
      nome: bundle.artistRecord?.nome_artistico,
      genero: bundle.artistRecord?.genero_musical,
      faseCarreira: bundle.artistRecord?.fase_carreira,
      tipo: bundle.artistRecord?.tipo,
      status: bundle.artistRecord?.status,
    })}`,
    `Catálogo: ${bundle.catalog.totalReleases} lançamentos, ${bundle.catalog.totalTracks} faixas/fonogramas, frequência ${bundle.catalog.frequency}, ISRCs ${bundle.catalog.isrcs.join(", ") || "pendentes"}.`,
    `Distribuição e gravadoras/agregadoras: ${bundle.references.join(", ") || "não informado"}.`,
    `Streams e redes sociais: ${bundle.publicSignals.join(", ") || "sem sinais cadastrados"}.`,
    `Marketing: ${bundle.operations.campaigns.length} campanhas, ${bundle.operations.contents.length} conteúdos, ${bundle.operations.pitchings.length} pitchings gerados.`,
    `Histórico operacional: ${bundle.operations.tasks.length} tarefas, ${bundle.operations.completedTasks} concluídas, ${bundle.operations.openTasks} abertas.`,
    "Gerar diagnóstico executivo com Perfil Artístico, Carreira, Público, Catálogo, Mercado, Estratégia e Diagnóstico. Identificar gênero, subgêneros, mood, identidade sonora, identidade visual, influências, diferenciais, estágio de carreira, evolução, ritmo de crescimento, consistência, público, catálogo, concorrentes, nichos, frequência ideal, melhor formato, colaborações, potencial de playlists, potencial de viralização, pontos fortes, pontos fracos, oportunidades, riscos, recomendações práticas e próximos passos.",
  ]);
}

function ProfileDataDashboard({ bundle }: { bundle: ArtistProfileBundle }) {
  const stats = [
    { label: "Lançamentos", value: bundle.catalog.totalReleases, icon: Disc3 },
    { label: "Faixas/Fonogramas", value: bundle.catalog.totalTracks, icon: Radio },
    { label: "Campanhas", value: bundle.operations.campaigns.length, icon: Target },
    { label: "Pitchings", value: bundle.operations.pitchings.length, icon: Share2 },
    { label: "Tarefas", value: bundle.operations.tasks.length, icon: BarChart3 },
    { label: "Estágio", value: bundle.careerStage, icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <stat.icon className="h-3.5 w-3.5" />
              {stat.label}
            </div>
            <p className="mt-1 text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
        Dados carregados automaticamente do cadastro do artista, catálogo, lançamentos, fonogramas, campanhas, pitchings e histórico de tarefas.
      </div>
    </div>
  );
}

function ProfileWaitingState({ bundle }: { bundle: ArtistProfileBundle | null }) {
  if (!bundle) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <UserRound className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="mt-3 text-sm font-medium">Selecione um artista para carregar o dossie automaticamente.</p>
        <p className="mt-1 text-xs text-muted-foreground">A analise usa os dados ja cadastrados no sistema, nao um formulario manual.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
      <p className="mt-3 text-sm font-medium">Dossie carregado para {bundle.artist.label}.</p>
      <p className="mt-1 text-xs text-muted-foreground">Execute a analise para preencher o dashboard executivo com diagnostico estrategico.</p>
    </div>
  );
}

function ExecutiveProfileResult({ result, bundle }: { result: AiGeneratedResult; bundle: ArtistProfileBundle | null }) {
  return (
    <div className="space-y-4">
      <StructuredResult result={result} compact />
      <div className="grid gap-3 md:grid-cols-2">
        <ResultText title="Perfil Artistico" text={[
          bundle?.predominantGenre ? `Gênero predominante: ${bundle.predominantGenre}.` : "Gênero predominante a inferir pela IA.",
          bundle?.subgenres.length ? `Subgêneros: ${bundle.subgenres.join(", ")}.` : "Subgêneros pendentes para inferência.",
          bundle?.moods.length ? `Mood: ${bundle.moods.join(", ")}.` : "Mood pendente para inferência por áudio/letra.",
        ].join(" ")} />
        <ResultText title="Carreira" text={`Estágio atual: ${bundle?.careerStage ?? "Aguardando dados"}. Ritmo: ${bundle?.growthRhythm ?? "Aguardando dados"}. Consistência: ${bundle?.catalog.frequency ?? "Aguardando dados"}.`} />
        <ResultList title="Público" items={result.audience.length ? result.audience : bundle?.publicSignals ?? []} />
        <ResultList title="Catálogo" items={[
          `${bundle?.catalog.totalReleases ?? 0} lançamentos cadastrados.`,
          `${bundle?.catalog.totalTracks ?? 0} faixas/fonogramas cadastrados.`,
          `Frequência: ${bundle?.catalog.frequency ?? "pendente"}.`,
        ]} />
        <ResultList title="Mercado" items={result.positioning} />
        <ResultList title="Estratégia" items={[...result.campaignIdeas, ...result.pitchSuggestions]} />
        <ResultList title="Diagnóstico" items={[...result.strengths, ...result.risks, ...result.nextActions]} />
      </div>
    </div>
  );
}

function mostCommon(values: string[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(stringifyValue).filter(Boolean).join(", ");
  return "";
}

function estimateReleaseFrequency(dates: string[]) {
  if (dates.length < 2) return dates.length === 1 ? "catálogo inicial" : "sem agenda de lançamentos cadastrada";
  const first = new Date(dates[0]).getTime();
  const last = new Date(dates[dates.length - 1]).getTime();
  const months = Math.max(1, Math.round((last - first) / 1000 / 60 / 60 / 24 / 30));
  const releasesPerYear = (dates.length / months) * 12;
  if (releasesPerYear >= 8) return "alta frequência";
  if (releasesPerYear >= 4) return "frequência consistente";
  return "frequência baixa";
}

function inferCareerStage(spotify?: number | null, instagram?: number | null, releases = 0) {
  const reach = Math.max(spotify ?? 0, instagram ?? 0);
  if (reach >= 1_000_000) return "Mainstream";
  if (reach >= 100_000 || releases >= 12) return "Consolidado";
  if (reach >= 10_000 || releases >= 4) return "Em crescimento";
  return "Emergente";
}

function inferGrowthRhythm(dates: string[], socialSignals: string[]) {
  if (dates.length >= 6 && socialSignals.length >= 3) return "crescimento com base de catálogo e canais ativos";
  if (dates.length >= 3) return "crescimento em validação por consistência de lançamentos";
  if (socialSignals.length >= 2) return "crescimento dependente de presenca digital";
  return "ritmo ainda pouco mensurável";
}

