import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, Clock, Lightbulb, Send, Sparkles, TrendingUp, UserRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useTenant } from "@/app/providers/TenantContext";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useFonogramas } from "@/modules/catalog/hooks/useFonogramas";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import { useMarketingAnalytics } from "../../hooks/useMarketingAnalytics";
import { useMarketingCampaigns } from "../../hooks/useMarketingCampaigns";
import { useMarketingContents } from "../../hooks/useMarketingContents";
import { useMarketingProjects } from "../../hooks/useMarketingProjects";
import { useMarketingTasks } from "../../hooks/useMarketingTasks";
import { useAiSuggestions, useGenerateAi } from "../../hooks/useMarketingAI";
import type { AiGenerationPayload } from "../../types/marketing.types";
import type { AiTab, TargetOption } from "./iaCriativa.types";
import { MUSICAL_PROJECT_TYPES } from "./iaCriativa.utils";
import { IdeiasTab } from "./IdeiasTab";
import { PerfilTab } from "./PerfilTab";
import { PitchingTab } from "./PitchingTab";
import { TendenciasTab } from "./TendenciasTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { HistoricoTab } from "./HistoricoTab";
import { PlanejamentoTab } from "./PlanejamentoTab";

const TABS: Array<{ value: AiTab; label: string; icon: typeof Sparkles }> = [
  { value: "ideias", label: "Ideias", icon: Lightbulb },
  { value: "perfil", label: "Perfil", icon: UserRound },
  { value: "pitching", label: "Pitching", icon: Send },
  { value: "tendencias", label: "Tendências", icon: TrendingUp },
  { value: "analytics", label: "Métricas", icon: BarChart3 },
  { value: "planejamento", label: "Planejamento", icon: CalendarDays },
  { value: "historico", label: "Histórico", icon: Clock },
];

function isAiTab(value: string): value is AiTab {
  return TABS.some((tab) => tab.value === value);
}

export function AiCreativeWorkspace() {
  const { tenant } = useTenant();
  const { data: suggestions = [] } = useAiSuggestions();
  const { artistas = [] } = useArtistas();
  const { obras = [] } = useObras();
  const { fonogramas = [] } = useFonogramas();
  const { projetos = [] } = useProjetos();
  const { lancamentos = [] } = useLancamentos();
  const { data: marketingProjects = [] } = useMarketingProjects();
  const { data: campaigns = [] } = useMarketingCampaigns();
  const { data: contents = [] } = useMarketingContents();
  const { data: tasks = [] } = useMarketingTasks();
  const { data: analytics } = useMarketingAnalytics();
  const generate = useGenerateAi();
  const [activeTab, setActiveTab] = useState<AiTab>("ideias");

  const artistOptions = useMemo<TargetOption[]>(() => (
    artistas
      .map((artista) => ({
        id: artista.id,
        label: artista.nome_artistico || artista.nome || artista.id,
        helper: artista.genero_musical || artista.status || undefined,
      }))
      .filter((option) => option.id && option.label)
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }))
  ), [artistas]);

  const projectOptions = useMemo<TargetOption[]>(() => (
    projetos
      .filter((projeto) => MUSICAL_PROJECT_TYPES.has(String(projeto.tipo ?? "").toLowerCase()))
      .map((projeto) => ({
        id: projeto.id,
        label: projeto.titulo,
        helper: [projeto.tipo, projeto.artistas?.nome_artistico || projeto.genero].filter(Boolean).join(" · ") || undefined,
      }))
      .filter((option) => option.id && option.label)
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }))
  ), [projetos]);

  const campaignOptions = useMemo<TargetOption[]>(() => (
    campaigns
      .map((campaign) => ({
        id: campaign.id,
        label: campaign.name,
        helper: campaign.status,
      }))
      .filter((option) => option.id && option.label)
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }))
  ), [campaigns]);

  const handleGenerate = (payload: AiGenerationPayload) => generate.mutate(payload);
  const companyName = tenant.name || "Empresa";

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (isAiTab(value)) setActiveTab(value);
      }}
      className="space-y-6"
    >
      <TabsList className="flex-wrap h-auto">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="ideias">
        <IdeiasTab
          artistOptions={artistOptions}
          projectOptions={projectOptions}
          campaignOptions={campaignOptions}
          suggestions={suggestions}
          onGenerate={handleGenerate}
          isGenerating={generate.isPending}
        />
      </TabsContent>
      <TabsContent value="perfil">
        <PerfilTab
          artistOptions={artistOptions}
          sources={{
            artists: artistas,
            obras,
            fonogramas,
            releases: lancamentos,
            projects: marketingProjects,
            campaigns,
            contents,
            tasks,
            suggestions,
          }}
          onGenerate={handleGenerate}
          isGenerating={generate.isPending}
        />
      </TabsContent>
      <TabsContent value="pitching">
        <PitchingTab
          artistOptions={artistOptions}
          sources={{
            artists: artistas,
            obras,
            fonogramas,
            releases: lancamentos,
            projects: marketingProjects,
            campaigns,
            contents,
            tasks,
            suggestions,
            analytics,
          }}
          onGenerate={handleGenerate}
          isGenerating={generate.isPending}
        />
      </TabsContent>
      <TabsContent value="tendencias">
        <TendenciasTab companyName={companyName} suggestions={suggestions} onGenerate={handleGenerate} isGenerating={generate.isPending} />
      </TabsContent>
      <TabsContent value="analytics">
        <AnalyticsTab
          companyName={companyName}
          analytics={analytics}
          contents={contents}
          campaigns={campaigns}
          suggestions={suggestions}
          onGenerate={handleGenerate}
          isGenerating={generate.isPending}
        />
      </TabsContent>
      <TabsContent value="planejamento">
        <PlanejamentoTab
          artistOptions={artistOptions}
          releaseOptions={lancamentos.map((release) => ({ id: release.id, label: release.titulo, helper: release.genero || undefined }))}
          onGenerate={handleGenerate}
          isGenerating={generate.isPending}
        />
      </TabsContent>
      <TabsContent value="historico">
        <HistoricoTab suggestions={suggestions} onGenerate={handleGenerate} />
      </TabsContent>
    </Tabs>
  );
}


