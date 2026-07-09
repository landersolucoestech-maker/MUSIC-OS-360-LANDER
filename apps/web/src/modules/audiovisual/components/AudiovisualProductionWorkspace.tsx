import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ClipboardList,
  Download,
  DollarSign,
  FileText,
  Film,
  Grid2X2,
  History,
  Link2,
  ListFilter,
  MoreVertical,
  PackageCheck,
  Plus,
  Search,
  Share2,
  Users,
  X,
} from "lucide-react";
import { MainLayout } from "@/shared/components/MainLayout";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { useAudiovisualProjects } from "../hooks/useAudiovisual";
import type {
  AudiovisualChecklistItem,
  AudiovisualProject,
  AudiovisualScriptScene,
  AudiovisualShotPlan,
} from "../types/audiovisual.types";
import { AudiovisualStatusBadge } from "./AudiovisualStatusBadge";

const typeLabels: Record<string, string> = {
  music_video: "Clipe Oficial",
  visualizer: "Visualizer",
  lyric_video: "Lyric Video",
  teaser: "Teaser em Vídeo",
  reels: "Reels Gravado",
  backstage: "Bastidores",
  documentary: "Documentário",
  live_session: "Live Session",
  aftermovie: "Aftermovie",
  promo: "Promocional",
  commercial: "Comercial",
  social_content: "Social Content",
  other: "Outro",
};

type WorkspaceProps = {
  mode?: "list" | "details";
};

type TabKey =
  | "Geral"
  | "Roteiro"
  | "Plano de Gravação"
  | "Equipe"
  | "Arquivos"
  | "Edição"
  | "Aprovação"
  | "Entrega"
  | "Publicações"
  | "Histórico";

const tabs: Array<{ label: TabKey; icon: typeof Film }> = [
  { label: "Geral", icon: ClipboardList },
  { label: "Roteiro", icon: FileText },
  { label: "Plano de Gravação", icon: CalendarDays },
  { label: "Equipe", icon: Users },
  { label: "Arquivos", icon: Archive },
  { label: "Edição", icon: Grid2X2 },
  { label: "Aprovação", icon: Share2 },
  { label: "Entrega", icon: PackageCheck },
  { label: "Publicações", icon: Link2 },
  { label: "Histórico", icon: History },
];

function money(value?: string | number | null) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numeric);
}

function dateBR(value?: string | null) {
  if (!value) return "—";
  const [date] = value.split("T");
  const parts = date.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

function createdAtBR(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return (
    date.toLocaleDateString("pt-BR") +
    " às " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

function projectType(project?: AudiovisualProject | null) {
  const raw = String(project?.project_type ?? project?.type ?? "other");
  return typeLabels[raw] ?? raw;
}

function song(project: AudiovisualProject): string {
  return String(project.music_title ?? project.title ?? project.name ?? "Sem título");
}

function artist(project: AudiovisualProject): string {
  return String(project.artist_name ?? project.artist?.name ?? "—");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringFrom(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function booleanFrom(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function normalizeScriptScene(value: unknown, index: number): AudiovisualScriptScene | null {
  if (!isRecord(value)) return null;

  return {
    id: stringFrom(value.id, `scene-${index}`),
    scene: stringFrom(value.scene),
    environment: stringFrom(value.environment),
    description: stringFrom(value.description),
    participants: stringFrom(value.participants),
    shot_type: stringFrom(value.shot_type),
    camera_movement: stringFrom(value.camera_movement),
    estimated_duration: stringFrom(value.estimated_duration),
    status: stringFrom(value.status),
  };
}

function normalizeShotPlan(value: unknown, index: number): AudiovisualShotPlan | null {
  if (!isRecord(value)) return null;

  return {
    id: stringFrom(value.id, `shot-${index}`),
    shot: stringFrom(value.shot),
    shot_type: stringFrom(value.shot_type),
    movement: stringFrom(value.movement),
    duration: stringFrom(value.duration),
    status: stringFrom(value.status),
  };
}

function normalizeChecklistItem(value: unknown, index: number): AudiovisualChecklistItem | null {
  if (!isRecord(value)) return null;

  return {
    id: stringFrom(value.id, `checklist-${index}`),
    label: stringFrom(value.label),
    checked: booleanFrom(value.checked),
  };
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeArray<T>(value: unknown, normalizer: (item: unknown, index: number) => T | null): T[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => normalizer(item, index))
    .filter((item): item is T => item !== null);
}

function SelectLike({ label }: { label: string }) {
  return (
    <button className="flex h-10 min-w-[142px] items-center justify-between gap-3 rounded-lg border border-border bg-card/90 px-3 text-left text-[12px] text-muted-foreground transition hover:border-primary/35 hover:bg-card">
      <span className="truncate">{label}</span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-8 text-center">
      <Film className="mb-3 h-8 w-8 text-muted-foreground" />
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FilterBar() {
  return (
    <section className="rounded-xl border border-border bg-card/88 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <SelectLike label="Todos os Artistas" />
        <SelectLike label="Todas as Músicas" />
        <SelectLike label="Tipo de Produção" />
        <SelectLike label="Status de Captação" />
        <SelectLike label="Status de Edição" />
        <SelectLike label="Período" />

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-lg border-border bg-card px-4 text-[12px] font-semibold text-foreground hover:bg-muted"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>

          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-muted">
            <ListFilter className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function ProjectTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: AudiovisualProject[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card/96">
      <ListSectionHeader
        title="Lista de Produções Audiovisuais"
        count={rows.length}
        description="Acompanhe produções, responsáveis, orçamento, prazos e status operacional"
        className="px-4 pt-4"
      />

      {rows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="Nenhuma produção audiovisual encontrada"
            description="A API não retornou produções para os filtros atuais. Nenhum dado mockado será exibido como fallback."
          />
        </div>
      ) : (
        <>
          <Table className="min-w-[1244px]">
            <TableHeader>
              <TableRow>
                <TableHead data-no-sort="true" className="w-9">
                  <Checkbox />
                </TableHead>
                <TableHead data-no-sort="true">ID</TableHead>
                <TableHead data-no-sort="true">Música</TableHead>
                <TableHead data-no-sort="true">Artista</TableHead>
                <TableHead data-no-sort="true">Tipo de Produção</TableHead>
                <TableHead data-no-sort="true">Formato</TableHead>
                <TableHead data-no-sort="true">Data da Gravação</TableHead>
                <TableHead data-no-sort="true">Status Captação</TableHead>
                <TableHead data-no-sort="true">Status Edição</TableHead>
                <TableHead data-no-sort="true">Status Aprovação</TableHead>
                <TableHead data-no-sort="true">Pré-Lanç.</TableHead>
                <TableHead data-no-sort="true">Lançamento</TableHead>
                <TableHead data-no-sort="true">Orçamento</TableHead>
                <TableHead data-no-sort="true">Status Final</TableHead>
                <TableHead data-no-sort="true" className="w-8" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((project) => {
                const selected = project.id === selectedId;

                return (
                  <TableRow
                    key={project.id}
                    onClick={() => onSelect(project.id)}
                    className={`cursor-pointer ${selected ? "bg-primary/10" : ""}`}
                  >
                    <TableCell>
                      <Checkbox checked={selected} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {project.code ?? project.id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-foreground">{song(project)}</TableCell>
                    <TableCell className="whitespace-nowrap">{artist(project)}</TableCell>
                    <TableCell className="whitespace-nowrap">{projectType(project)}</TableCell>
                    <TableCell className="whitespace-nowrap">{project.format ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {dateBR(project.recording_date ?? project.shooting_date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <AudiovisualStatusBadge kind="capture" value={project.capture_status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <AudiovisualStatusBadge kind="editing" value={project.editing_status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <AudiovisualStatusBadge kind="approval" value={project.approval_status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{dateBR(project.pre_release_date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{dateBR(project.release_date)}</TableCell>
                    <TableCell className="whitespace-nowrap font-semibold text-foreground">
                      {money(project.budget)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <AudiovisualStatusBadge kind="final" value={project.final_status} />
                    </TableCell>
                    <TableCell>
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <footer className="flex items-center border-t border-border px-4 py-3 text-[12px] text-muted-foreground">
            <span>Total: {rows.length} {rows.length === 1 ? "produção" : "produções"}</span>

            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Linhas por página:</span>
                <button className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-foreground">
                  {rows.length}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-foreground">
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                <button className="h-8 min-w-8 rounded-lg bg-primary px-3 font-semibold text-primary-foreground">
                  1
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <ChevronsRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[112px]">
      <div className="mb-2 text-[10px] tracking-[.04em] text-muted-foreground">{label}</div>
      <div className="text-[14px] font-medium text-foreground">{value}</div>
    </div>
  );
}

function ThumbStack({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <div className="mt-2 text-[12px] text-muted-foreground">Nenhuma referência cadastrada.</div>;
  }

  return (
    <div className="mt-2 flex items-center gap-1.5">
      {items.slice(0, 3).map((item) => (
        <div
          key={item}
          className="h-[58px] w-[64px] rounded-lg border border-border bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${item})` }}
        />
      ))}

      {items.length > 3 && (
        <div className="grid h-[58px] w-[64px] place-items-center rounded-lg border border-border bg-card text-[13px] font-semibold text-foreground">
          +{items.length - 3}
        </div>
      )}
    </div>
  );
}

function MiniTableStatus({ children }: { children: string }) {
  return <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">{children}</span>;
}

function ScriptTab({ project }: { project: AudiovisualProject }) {
  const scenes = normalizeArray<AudiovisualScriptScene>(project.scenes, normalizeScriptScene);
  const shotList = normalizeArray<AudiovisualShotPlan>(project.shot_list, normalizeShotPlan);
  const checklist = normalizeArray<AudiovisualChecklistItem>(project.checklist, normalizeChecklistItem);
  const references = normalizeStringArray(project.references);
  const moodboard = normalizeStringArray(project.moodboard);

  return (
    <div className="grid grid-cols-1 gap-3 p-3 xl:grid-cols-[300px_minmax(520px,1fr)_420px]">
      <section className="rounded-lg border border-border bg-card/85 p-3">
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">Roteiro Criativo</h3>

        <div className="space-y-5 text-[12px] leading-relaxed text-muted-foreground">
          <div>
            <div className="mb-2 text-[10px] text-muted-foreground">Conceito</div>
            <p>{project.concept || "—"}</p>
          </div>

          <div>
            <div className="mb-2 text-[10px] text-muted-foreground">Objetivo</div>
            <p>{project.objective || "—"}</p>
          </div>

          <div>
            <div className="mb-2 text-[10px] text-muted-foreground">Referências</div>
            <ThumbStack items={references} />
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 text-[10px] text-muted-foreground">Moodboard</div>
            <ThumbStack items={moodboard} />
          </div>
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="overflow-hidden rounded-lg border border-border bg-card/85">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <h3 className="text-[14px] font-semibold text-foreground">Roteiro de Gravação (Storyboard)</h3>
            <Button
              variant="outline"
              className="h-8 rounded-md border-border bg-card px-3 text-[12px] text-foreground hover:bg-muted"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar Cena
            </Button>
          </div>

          <div className="overflow-x-auto">
            <ListSectionHeader
              title="Roteiro de Gravação"
              count={scenes.length}
              description="Acompanhe cenas, ambientes, participantes, planos e duração estimada"
              className="px-4 pt-4"
            />

            {scenes.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Nenhuma cena cadastrada"
                  description="Este projeto não possui cenas reais retornadas pela API."
                />
              </div>
            ) : (
              <table className="w-full min-w-[720px] text-left text-[12px] text-muted-foreground">
                <thead className="text-[10px] text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 font-medium">Cena</th>
                    <th className="px-3 py-2 font-medium">Ambiente</th>
                    <th className="px-3 py-2 font-medium">Descrição da Cena</th>
                    <th className="px-3 py-2 font-medium">Participantes</th>
                    <th className="px-3 py-2 font-medium">Tipo de Plano</th>
                    <th className="px-3 py-2 font-medium">Mov. de Câmera</th>
                    <th className="px-3 py-2 font-medium">Duração Est.</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {scenes.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3">{row.scene}</td>
                      <td className="px-3 py-3">{row.environment}</td>
                      <td className="px-3 py-3">{row.description}</td>
                      <td className="px-3 py-3">{row.participants}</td>
                      <td className="px-3 py-3">{row.shot_type}</td>
                      <td className="px-3 py-3">{row.camera_movement}</td>
                      <td className="px-3 py-3">{row.estimated_duration}</td>
                      <td className="px-3 py-3">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/85">
          <h3 className="border-b border-border px-3 py-3 text-[14px] font-semibold text-foreground">
            Observações do Roteiro
          </h3>
          <p className="px-3 py-3 text-[12px] text-muted-foreground">
            {String(project.observations ?? project.notes ?? "—")}
          </p>
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="overflow-hidden rounded-lg border border-border bg-card/85">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <h3 className="text-[14px] font-semibold text-foreground">Shot List</h3>
            <Button
              variant="outline"
              className="h-8 rounded-md border-border bg-card px-3 text-[12px] text-foreground hover:bg-muted"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar Shot
            </Button>
          </div>

          <ListSectionHeader
            title="Shot List"
            count={shotList.length}
            description="Acompanhe planos, movimentos, duração e status de cada shot"
            className="px-4 pt-4"
          />

          {shotList.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nenhum shot cadastrado" description="Este projeto não possui shot list real retornada pela API." />
            </div>
          ) : (
            <table className="w-full text-left text-[12px] text-muted-foreground">
              <thead className="text-[10px] text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">Shot</th>
                  <th className="px-3 py-2 font-medium">Tipo de Plano</th>
                  <th className="px-3 py-2 font-medium">Movimento</th>
                  <th className="px-3 py-2 font-medium">Duração</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {shotList.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-3">{row.shot}</td>
                    <td className="px-3 py-3">{row.shot_type}</td>
                    <td className="px-3 py-3">{row.movement}</td>
                    <td className="px-3 py-3">{row.duration}</td>
                    <td className="px-3 py-3">
                      <MiniTableStatus>{row.status}</MiniTableStatus>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card/85 p-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-foreground">Checklist de Gravação</h3>
            <Button
              variant="outline"
              className="h-8 rounded-md border-border bg-card px-3 text-[12px] text-foreground hover:bg-muted"
            >
              Editar Checklist
            </Button>
          </div>

          {checklist.length === 0 ? (
            <EmptyState
              title="Nenhum item de checklist"
              description="Este projeto não possui checklist real retornado pela API."
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[12px] text-muted-foreground">
              {checklist.map((item) => (
                <label key={item.id} className="flex items-center gap-2">
                  <Checkbox checked={item.checked} />
                  {item.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      Área operacional de {label}. Estrutura preservada para integração com dados reais do módulo.
    </div>
  );
}

function DetailPanel({ project, onClose }: { project: AudiovisualProject; onClose: () => void }) {
  const [tab, setTab] = useState<TabKey>("Roteiro");

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card/96">
      <div className="relative flex flex-col gap-5 border-b border-border p-4 xl:flex-row xl:items-center">
        <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="flex min-w-[440px] items-center gap-4">
          <div
            className="h-[118px] w-[156px] shrink-0 rounded-lg border border-border bg-muted bg-cover bg-center"
            style={{
              backgroundImage: project.thumbnail_url
                ? `url(${project.thumbnail_url})`
                : project.cover_url
                  ? `url(${project.cover_url})`
                  : project.preview_image
                    ? `url(${project.preview_image})`
                    : undefined,
            }}
          />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-foreground">{song(project)}</h2>
              <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
                {projectType(project)}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {artist(project)}
              <span className="text-muted-foreground">•</span>
            </div>

            <p className="mt-1 text-[12px] text-muted-foreground">Campanha: {project.campaign_name ?? "—"}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Código: <span className="text-muted-foreground">{project.code ?? project.id}</span>
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Criado por: <span className="text-muted-foreground">{project.created_by_name ?? "—"}</span>
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Criado em: <span className="text-muted-foreground">{createdAtBR(project.created_at)}</span>
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-6 border-l border-border pl-6 md:grid-cols-5">
          <Metric label="Data da Gravação" value={dateBR(project.recording_date ?? project.shooting_date)} />
          <Metric label="Local da Gravação" value={project.location ?? "—"} />
          <Metric label="Diretor" value={project.director ?? "—"} />
          <Metric label="Videomaker" value={project.videomaker ?? "—"} />
          <Metric label="Editor" value={project.editor ?? "—"} />
        </div>

        <div className="grid min-w-[330px] grid-cols-3 gap-4 border-l border-border pl-6">
          <Metric label="Orçamento" value={money(project.budget)} />
          <Metric label="Custo Real" value={money(project.real_cost)} />

          <div>
            <div className="mb-2 text-[10px] tracking-[.04em] text-muted-foreground">Status Final</div>
            <AudiovisualStatusBadge kind="final" value={project.final_status} />
          </div>
        </div>
      </div>

      <nav className="flex overflow-x-auto border-b border-border px-3">
        {tabs.map(({ label, icon: Icon }) => {
          const active = label === tab;

          return (
            <button
              key={label}
              onClick={() => setTab(label)}
              className={`relative flex h-11 items-center gap-2 whitespace-nowrap px-4 text-[12px] transition ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {active && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      {tab === "Roteiro" ? <ScriptTab project={project} /> : <PlaceholderTab label={tab} />}
    </section>
  );
}

function NewProductionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Nova Produção</h2>
            <p className="text-sm text-muted-foreground">
              Cadastre uma produção audiovisual seguindo o padrão operacional.
            </p>
          </div>

          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-4 p-5 md:grid-cols-4">
          {[
            "Música",
            "Artista",
            "Tipo de Produção",
            "Formato",
            "Diretor",
            "Videomaker",
            "Editor",
            "Data da Gravação",
            "Local da Gravação",
            "Status de Captação",
            "Status de Edição",
            "Status de Aprovação",
            "Pré-Lançamento",
            "Lançamento",
            "Orçamento",
            "Custo Real",
          ].map((label) => (
            <label key={label} className="space-y-2">
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
              <input
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary"
                placeholder={label}
              />
            </label>
          ))}

          <label className="space-y-2 md:col-span-2">
            <span className="text-[11px] font-medium text-muted-foreground">Observações</span>
            <textarea className="h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-[11px] font-medium text-muted-foreground">Roteiro inicial</span>
            <textarea className="h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
          </label>
        </div>

        <footer className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <Button variant="outline" onClick={onClose} className="border-border bg-transparent text-foreground hover:bg-muted">
            Cancelar
          </Button>
          <Button onClick={onClose}>Salvar Produção</Button>
        </footer>
      </div>
    </div>
  );
}

function KpiCards({ rows }: { rows: AudiovisualProject[] }) {
  const total = rows.length;
  const emProducao = rows.filter((p) => ["production", "post_production"].includes(String(p.final_status ?? p.status))).length;
  const aguardando = rows.filter((p) => ["pending", "review"].includes(String(p.approval_status))).length;
  const concluidas = rows.filter((p) => ["finished", "published", "delivered"].includes(String(p.final_status ?? p.status))).length;
  const orcamento = rows.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

  const cards = [
    { label: "Total de produções", value: String(total), icon: Film },
    { label: "Em produção", value: String(emProducao), icon: ClipboardList },
    { label: "Aguardando aprovação", value: String(aguardando), icon: CalendarDays },
    { label: "Concluídas", value: String(concluidas), icon: PackageCheck },
    { label: "Orçamento total", value: money(orcamento), icon: DollarSign },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.label} className="rounded-xl border border-border bg-card/88 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">{card.label}</p>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>

            <p className="mt-2 text-xl font-semibold text-foreground">{card.value}</p>
          </div>
        );
      })}
    </section>
  );
}

export function AudiovisualProductionWorkspace({ mode = "list" }: WorkspaceProps) {
  const navigate = useNavigate();
  const { data } = useAudiovisualProjects();

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return rows;

    return rows.filter((project) =>
      `${song(project)} ${artist(project)} ${project.code ?? ""}`.toLowerCase().includes(normalizedSearch),
    );
  }, [rows, search]);

  useEffect(() => {
    if (filteredRows.length === 0) {
      setSelectedId(undefined);
      return;
    }

    const selectedStillExists = filteredRows.some((project) => project.id === selectedId);

    if (!selectedStillExists) {
      setSelectedId(filteredRows[0]?.id);
    }
  }, [filteredRows, selectedId]);

  const selectedProject = filteredRows.find((project) => project.id === selectedId);

  return (
    <MainLayout
      title="Produção Audiovisual"
      description="Gerencie todas as produções de vídeo da sua operação."
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setModalOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova Produção
        </Button>
      }
    >
      <main className="min-h-screen bg-background px-3 pb-6 pt-4 text-foreground">
        <div className="mx-auto max-w-[1760px] space-y-3">
          <div className="flex justify-end">
            <div className="relative w-full max-w-[420px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar produções, músicas, artistas..."
                className="h-11 rounded-xl border-border bg-card pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              />
            </div>
          </div>

          {mode === "list" && <KpiCards rows={rows} />}
          {mode === "list" && <FilterBar />}
          {mode === "list" && <ProjectTable rows={filteredRows} selectedId={selectedProject?.id} onSelect={setSelectedId} />}

          {selectedProject ? (
            <DetailPanel project={selectedProject} onClose={() => navigate("/audiovisual/projects")} />
          ) : (
            <EmptyState
              title="Nenhum projeto selecionado"
              description="Não há produção audiovisual real disponível para exibir no painel de detalhes."
            />
          )}
        </div>

        <NewProductionModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </main>
    </MainLayout>
  );
}
