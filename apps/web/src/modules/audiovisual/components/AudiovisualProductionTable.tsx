import { useEffect, useState } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import type { AudiovisualProject } from "../types/audiovisual.types";
import { AudiovisualStatusBadge } from "./AudiovisualStatusBadge";
import { TablePagination } from "@/shared/ui/table-pagination";
import { usePagination } from "@/shared/hooks/usePagination";
import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const typeLabel: Record<string, string> = {
  music_video: "Clipe Oficial",
  visualizer: "Visualizer",
  lyric_video: "Lyric Vídeo",
  teaser: "Teaser em Vídeo",
  reels: "Reels Gravado",
  backstage: "Bastidores",
  documentary: "Documentário",
  live_session: "Live Session",
  aftermovie: "Aftermovie",
  promo: "Promo",
  commercial: "Comercial",
  social_content: "Social Content",
  other: "Outro",
};

const date = (value?: string | null) =>
  value ? new Date(`${value}`.slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR") : "-";

const money = (value?: string | number | null) =>
  typeof value === "number"
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : value
      ? String(value)
      : "-";

type Action = "view" | "edit" | "delete";

function ActionsMenu({
  project,
  onAction,
}: {
  project: AudiovisualProject;
  onAction: (action: Action, project: AudiovisualProject) => void;
}) {
  const [open, setOpen] = useState(false);
  const actionClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted";

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Ações da produção"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-40 overflow-hidden rounded-lg border border-border bg-card py-1">
          <button
            type="button"
            className={actionClass}
            onClick={() => {
              setOpen(false);
              onAction("view", project);
            }}
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
            Ver
          </button>
          <button
            type="button"
            className={actionClass}
            onClick={() => {
              setOpen(false);
              onAction("edit", project);
            }}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
            Editar
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10"
            onClick={() => {
              setOpen(false);
              onAction("delete", project);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

export function AudiovisualProductionTable({
  projects,
  selectedId,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
}: {
  projects: AudiovisualProject[];
  selectedId?: string;
  onSelect?: (project: AudiovisualProject) => void;
  onView: (project: AudiovisualProject) => void;
  onEdit: (project: AudiovisualProject) => void;
  onDelete: (project: AudiovisualProject) => void;
  onBulkDelete?: (ids: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const availableIds = new Set(projects.map((project) => project.id));
    setSelectedIds((current) => current.filter((id) => availableIds.has(id)));
  }, [projects]);

  const handleAction = (action: Action, project: AudiovisualProject) => {
    if (action === "view") onView(project);
    if (action === "edit") onEdit(project);
    if (action === "delete") onDelete(project);
  };

  const { page, pageSize, total, pageItems, setPage, setPageSize } = usePagination(projects, 10);
  const allSelected = projects.length > 0 && selectedIds.length === projects.length;
  const headerChecked = allSelected ? true : selectedIds.length > 0 ? "indeterminate" : false;

  const toggleSelectAll = () => {
    setSelectedIds((current) => (current.length === projects.length ? [] : projects.map((project) => project.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]));
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    onBulkDelete?.(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4 overflow-hidden rounded-xl border border-border bg-card/95 p-5">
      <ListSectionHeader
        title="Lista de Produções Audiovisuais"
        count={projects.length}
        description="Acompanhe todas as produções, status de captação, edição, aprovação e lançamento"
        action={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Checkbox
              aria-label="Selecionar produções"
              checked={headerChecked}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.length > 0 ? `${selectedIds.length} selecionado(s)` : "Selecionar todos"}
            </span>
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={handleBulkDelete}
                disabled={!onBulkDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir ({selectedIds.length})
              </Button>
            )}
          </div>
        }
      />
      <Table className="min-w-[984px] table-fixed">
        <colgroup>
          <col className="w-12" />
          <col className="w-[190px]" />
          <col className="w-[120px]" />
          <col className="w-[132px]" />
          <col className="w-[108px]" />
          <col className="w-[112px]" />
          <col className="w-[112px]" />
          <col className="w-[116px]" />
          <col className="w-[92px]" />
          <col className="w-[96px]" />
          <col className="w-[104px]" />
          <col className="w-16" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Musica</TableHead>
            <TableHead>Artista</TableHead>
            <TableHead>Tipo de Produção</TableHead>
            <TableHead>Data da Gravação</TableHead>
            <TableHead>Status Captação</TableHead>
            <TableHead>Status Edição</TableHead>
            <TableHead>Status Aprovação</TableHead>
            <TableHead>Pre-Lanç.</TableHead>
            <TableHead>Lançamento</TableHead>
            <TableHead>Orçamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((project) => (
            <TableRow
              key={project.id}
              onClick={() => onSelect?.(project)}
              className={cn(
                "cursor-pointer text-muted-foreground",
              )}
            >
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  aria-label="Selecionar produção"
                  checked={selectedIds.includes(project.id)}
                  onCheckedChange={() => toggleSelect(project.id)}
                />
              </TableCell>
              <TableCell className="truncate font-medium text-foreground">
                {project.music_title ?? project.title ?? project.name ?? "-"}
              </TableCell>
              <TableCell className="truncate">
                {project.artist_name ?? project.artist?.name ?? "-"}
              </TableCell>
              <TableCell className="truncate">
                {typeLabel[String(project.type ?? project.project_type)] ?? "Clipe Oficial"}
              </TableCell>
              <TableCell className="whitespace-nowrap">{date(project.shooting_date ?? project.recording_date)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <AudiovisualStatusBadge value={project.capture_status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <AudiovisualStatusBadge value={project.editing_status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <AudiovisualStatusBadge value={project.approval_status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{date(project.pre_release_date)}</TableCell>
              <TableCell className="whitespace-nowrap">{date(project.release_date)}</TableCell>
              <TableCell className="whitespace-nowrap font-semibold text-foreground">{money(project.budget_estimated ?? project.budget)}</TableCell>
              <TableCell className="text-right">
                <ActionsMenu project={project} onAction={handleAction} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="produções"
      />
    </div>
  );
}
