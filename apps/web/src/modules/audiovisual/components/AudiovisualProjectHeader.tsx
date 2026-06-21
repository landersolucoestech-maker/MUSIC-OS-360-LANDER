import { UserRound } from "lucide-react";
import type { AudiovisualProject } from "../types/audiovisual.types";
import { AudiovisualStatusBadge } from "./AudiovisualStatusBadge";

const date = (v?: string | null) => v ? new Date(`${v}`.slice(0,10) + "T00:00:00").toLocaleDateString("pt-BR") : "—";
const money = (v?: string | number | null) => typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : v ? String(v) : "—";
const typeLabel: Record<string, string> = { music_video: "Clipe Oficial", visualizer: "Visualizer", lyric_video: "Lyric Video", teaser: "Teaser em Vídeo", reels: "Reels Gravado", backstage: "Bastidores" };

function Metric({ label, value }: { label: string; value?: string | number | null }) { return <div><p className="mb-2 text-[10px] tracking-wide text-muted-foreground">{label}</p><p className="text-sm font-medium text-foreground">{value ?? "—"}</p></div>; }

export function AudiovisualProjectHeader({ project }: { project: AudiovisualProject }) {
  return <div className="grid grid-cols-[360px_1fr_360px] gap-8 border-b border-border p-5">
    <div className="flex gap-4"><img src={project.thumbnail_url || project.cover_url || project.preview_image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=300&q=80"} className="h-28 w-40 rounded-lg border border-border object-cover" /><div className="min-w-0"><div className="mb-2 flex items-center gap-2"><h2 className="truncate text-lg font-semibold text-foreground">{project.music_title ?? project.title ?? project.name}</h2><AudiovisualStatusBadge value={project.type ?? project.project_type ?? "music_video"} className="bg-primary" /></div><p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" />{project.artist_name ?? project.artist?.name ?? "—"}</p><p className="text-xs text-muted-foreground">Campanha: {project.campaign_name ?? "—"}</p><p className="text-xs text-muted-foreground">Código: {project.code ?? project.id}</p><p className="text-xs text-muted-foreground">Criado por: {project.created_by_name ?? "John Manager"}</p><p className="text-xs text-muted-foreground">Criado em: {project.created_at ? new Date(project.created_at).toLocaleString("pt-BR") : "10/05/2024 às 14:30"}</p></div></div>
    <div className="grid grid-cols-5 items-center gap-8 border-l border-border pl-8"><Metric label="Data da Gravação" value={date(project.shooting_date ?? project.recording_date)} /><Metric label="Local da Gravação" value={project.location ?? "São Paulo - SP"} /><Metric label="Diretor" value={project.director} /><Metric label="Videomaker" value={project.videomaker} /><Metric label="Editor" value={project.editor} /></div>
    <div className="grid grid-cols-3 items-center gap-6 border-l border-border pl-8"><Metric label="Orçamento" value={money(project.budget)} /><Metric label="Custo Real" value={money(project.real_cost)} /><div><p className="mb-2 text-[10px] tracking-wide text-muted-foreground">Status Final</p><AudiovisualStatusBadge value={project.final_status ?? project.status} /></div></div>
  </div>;
}

