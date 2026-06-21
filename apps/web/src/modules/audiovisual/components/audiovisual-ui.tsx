import type { ReactNode } from "react";
import { Calendar, CheckSquare, Clapperboard, FileText, Grid2X2, History, LinkIcon, Scissors, Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { AudiovisualProject, AudiovisualProjectType } from "../types/audiovisual.types";

export const ALL = "__all__";

export const typeOptions: Array<{ value: AudiovisualProjectType; label: string }> = [
  { value: "music_video", label: "Clipe Oficial" },
  { value: "visualizer", label: "Visualizer" },
  { value: "lyric_video", label: "Lyric Video" },
  { value: "teaser", label: "Teaser" },
  { value: "reels", label: "Reels" },
  { value: "backstage", label: "Bastidores" },
  { value: "documentary", label: "Documentário" },
  { value: "live_session", label: "Live Session" },
  { value: "aftermovie", label: "Aftermovie" },
  { value: "promo", label: "Promo" },
  { value: "commercial", label: "Comercial" },
  { value: "social_content", label: "Social Content" },
  { value: "other", label: "Outro" },
];

export const statusOptions = [
  { value: "draft", label: "Planejado" },
  { value: "briefing", label: "Briefing" },
  { value: "pre_production", label: "Pré-Produção" },
  { value: "production", label: "Em Produção" },
  { value: "post_production", label: "Em Edição" },
  { value: "approval", label: "Em Revisão" },
  { value: "delivered", label: "Finalizado" },
  { value: "published", label: "Publicado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

export const audiovisualTabs = [
  { id: "geral", label: "Geral", icon: Grid2X2 },
  { id: "roteiro", label: "Roteiro", icon: FileText },
  { id: "gravacao", label: "Plano de Gravação", icon: Calendar },
  { id: "equipe", label: "Equipe", icon: Users },
  { id: "arquivos", label: "Arquivos", icon: FileText },
  { id: "edicao", label: "Edição", icon: Scissors },
  { id: "aprovacao", label: "Aprovação", icon: CheckSquare },
  { id: "entrega", label: "Entrega", icon: Clapperboard },
  { id: "publicacoes", label: "Publicações", icon: LinkIcon },
  { id: "historico", label: "Histórico", icon: History },
] as const;

export type AudiovisualTabId = (typeof audiovisualTabs)[number]["id"];

export function typeLabel(value?: string | null) {
  return typeOptions.find((item) => item.value === value)?.label ?? value?.replace(/_/g, " ") ?? "—";
}

export function money(value?: number | string | null) {
  if (value === undefined || value === null || value === "") return "—";
  const parsed = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(parsed)) return String(value);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parsed);
}

export function dateLabel(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function getProjectMeta(project: AudiovisualProject | null | undefined, key: string, fallback?: unknown) {
  if (!project) return fallback;
  const direct = (project as unknown as Record<string, unknown>)[key];
  const meta = project.metadata as Record<string, unknown> | null | undefined;
  return direct ?? meta?.[key] ?? fallback;
}

export function projectArtist(project: AudiovisualProject) {
  return project.artist_name ?? project.artist?.name ?? "Artista não informado";
}

export function projectTitle(project: AudiovisualProject) {
  return project.music_title ?? project.title ?? "Produção sem título";
}

export function projectRecordingDate(project: AudiovisualProject) {
  return project.recording_date ?? project.shooting_date ?? project.start_date ?? null;
}

export function projectBudget(project: AudiovisualProject) {
  return project.budget ?? project.budget_estimated ?? null;
}

export function projectFinalStatus(project: AudiovisualProject) {
  return project.final_status ?? project.status ?? "draft";
}

export function projectThumbnail(project: AudiovisualProject) {
  return project.thumbnail_url ?? project.cover_url ?? project.preview_image ?? null;
}

const labelMap: Record<string, string> = {
  scheduled: "Agendada",
  recording: "Em Gravação",
  recorded: "Gravada",
  pending: "Pendente",
  not_started: "Não Iniciada",
  editing: "Em Edição",
  finished: "Finalizada",
  review: "Em Revisão",
  approved: "Aprovado",
  rejected: "Reprovado",
  draft: "Planejado",
  briefing: "Briefing",
  pre_production: "Pré-Produção",
  production: "Em Produção",
  post_production: "Em Edição",
  approval: "Em Revisão",
  delivered: "Finalizado",
  published: "Publicado",
  cancelled: "Cancelado",
  ready: "Pronto",
};

const classMap: Record<string, string> = {
  scheduled: "border-warning/20 bg-warning/10 text-warning",
  recording: "border-info/20 bg-info/10 text-info",
  recorded: "border-success/20 bg-success/10 text-success",
  pending: "border-warning/20 bg-warning/10 text-warning",
  not_started: "border-border bg-muted text-muted-foreground",
  editing: "border-info/20 bg-info/10 text-info",
  finished: "border-success/20 bg-success/10 text-success",
  review: "border-warning/20 bg-warning/10 text-warning",
  approved: "border-success/20 bg-success/10 text-success",
  rejected: "border-destructive/20 bg-destructive/10 text-destructive",
  draft: "border-border bg-muted text-muted-foreground",
  briefing: "border-info/20 bg-info/10 text-info",
  pre_production: "border-primary/30 bg-primary/15 text-primary",
  production: "border-primary/30 bg-primary/20 text-primary",
  post_production: "border-info/20 bg-info/10 text-info",
  approval: "border-warning/20 bg-warning/10 text-warning",
  delivered: "border-success/20 bg-success/10 text-success",
  published: "border-success/20 bg-success/10 text-success",
  cancelled: "border-destructive/20 bg-destructive/10 text-destructive",
  ready: "border-primary/30 bg-primary/15 text-primary",
};

export function statusLabel(value?: string | null) {
  if (!value) return "—";
  return labelMap[value] ?? value;
}

export function AudiovisualStatusBadge({ value, className }: { value?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center justify-center whitespace-nowrap rounded-md border px-2 text-[10px] font-bold tracking-[0.02em]", value ? classMap[value] ?? classMap.draft : "border-border bg-muted text-muted-foreground", className)}>
      {statusLabel(value)}
    </span>
  );
}

export function EnterprisePanel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-2xl border border-border bg-card", className)}>{children}</section>;
}

export function MetricBlock({ label, value, helper }: { label: string; value: ReactNode; helper?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-muted px-3 py-2">
      <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground">{label}</p>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
      {helper ? <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

export const mockProjects: AudiovisualProject[] = [
  {
    id: "av-001",
    code: "AV-2026-001",
    title: "Noite de Neon",
    music_title: "Noite de Neon",
    artist_name: "Lander Records",
    campaign_name: "Campanha Single 2026",
    type: "music_video",
    format: "16:9 / 4K",
    director: "Marcos Viana",
    videomaker: "Equipe Cine A",
    editor: "Daniel Costa",
    location: "Galpão Industrial - SP",
    recording_date: "2026-06-18",
    pre_release_date: "2026-07-02",
    release_date: "2026-07-12",
    budget: 28000,
    cost_real: 24500,
    capture_status: "recorded",
    editing_status: "editing",
    approval_status: "review",
    status: "post_production",
    created_by_name: "Operação Audiovisual",
    created_at: "2026-05-20T14:30:00Z",
    script: {
      concept: "Videoclipe noturno com estética urbana, luzes neon, performance central do artista e narrativa visual de ascensão criativa.",
      objective: "Entregar uma peça premium para lançamento no YouTube, cortes verticais e campanha de tráfego pago.",
      references: ["Ref. Neon", "Ref. Performance", "Ref. Cidade", "Ref. Close"],
      moodboard: ["Luz Roxa", "Contraste Azul", "Textura Industrial", "Plano Aberto", "Movimento"],
      notes: "Priorizar planos fechados no refrão e manter variações verticais para Reels/TikTok. Confirmar autorização do local antes da diária.",
      storyboard: [
        { id: "c1", scene: "Cena 01", environment: "Rua externa", description: "Artista caminha sob luz neon com cidade ao fundo.", participants: "Artista + 2 figurantes", shot_type: "Plano Aberto", camera_movement: "Travelling lateral", estimated_duration: "00:18", status: "ready" },
        { id: "c2", scene: "Cena 02", environment: "Galpão", description: "Performance principal no refrão com fumaça e contra-luz.", participants: "Artista", shot_type: "Plano Médio", camera_movement: "Gimbal frontal", estimated_duration: "00:32", status: "recorded" },
        { id: "c3", scene: "Cena 03", environment: "Carro", description: "Detalhes de lifestyle e transições para cortes verticais.", participants: "Artista + elenco", shot_type: "Close-up", camera_movement: "Handheld", estimated_duration: "00:22", status: "pending" },
      ],
      shot_list: [
        { id: "s1", shot: "Shot 01", shot_type: "Plano Geral", movement: "Drone in", duration: "00:08", status: "ready" },
        { id: "s2", shot: "Shot 02", shot_type: "Close", movement: "Push in", duration: "00:06", status: "recorded" },
        { id: "s3", shot: "Shot 03", shot_type: "Plano Detalhe", movement: "Tilt", duration: "00:05", status: "pending" },
      ],
      checklist: [
        { id: "ck1", label: "Câmera Principal", checked: true },
        { id: "ck2", label: "Lentes", checked: true },
        { id: "ck3", label: "Iluminação", checked: true },
        { id: "ck4", label: "Microfone", checked: false },
        { id: "ck5", label: "Bateria Extra", checked: true },
        { id: "ck6", label: "Cartão de Memória", checked: true },
        { id: "ck7", label: "Tripé/Gimbal", checked: true },
        { id: "ck8", label: "Props/Figurino", checked: false },
      ],
    },
  },
  { id: "av-002", code: "AV-2026-002", title: "Depois das 3", music_title: "Depois das 3", artist_name: "MC Aurora", campaign_name: "EP Aurora", type: "visualizer", format: "9:16", director: "Clara Nunes", videomaker: "Rafael Lima", editor: "Nina Prado", location: "Estúdio 2", recording_date: "2026-06-25", pre_release_date: "2026-07-05", release_date: "2026-07-19", budget: 9000, cost_real: 0, capture_status: "scheduled", editing_status: "not_started", approval_status: "pending", status: "pre_production", created_by_name: "Produção", created_at: "2026-05-22T10:00:00Z" },
  { id: "av-003", code: "AV-2026-003", title: "Linha de Frente", music_title: "Linha de Frente", artist_name: "DJ Norte", campaign_name: "Conteúdo Social", type: "reels", format: "9:16", director: "Interno", videomaker: "Lucas M.", editor: "Bianca R.", location: "Rua Central", recording_date: "2026-05-30", pre_release_date: "2026-06-03", release_date: "2026-06-06", budget: 3200, cost_real: 2900, capture_status: "recorded", editing_status: "finished", approval_status: "approved", status: "published", created_by_name: "Social Media", created_at: "2026-05-12T09:00:00Z" },
];


