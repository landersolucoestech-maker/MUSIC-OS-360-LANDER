import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import type { ConteudoWithRelations } from "@/modules/marketing/hooks/useConteudos";
import {
  InstagramIcon, TikTokIcon, YouTubeIcon, FacebookIcon, TwitterXIcon, LinkedInIcon,
} from "./platform-icons";

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  agendado:   { dot: "bg-blue-400",    label: "Agendado" },
  publicado:  { dot: "bg-emerald-400", label: "Publicado" },
  rascunho:   { dot: "bg-slate-400",   label: "Rascunho" },
  pausado:    { dot: "bg-amber-400",   label: "Pausado" },
  programado: { dot: "bg-violet-400",  label: "Programado" },
  falha:      { dot: "bg-rose-500",    label: "Falha" },
};

const PLAT_ICON: Record<string, React.ReactNode> = {
  instagram: <InstagramIcon className="h-3 w-3" />,
  tiktok:    <TikTokIcon    className="h-3 w-3" />,
  youtube:   <YouTubeIcon   className="h-3 w-3" />,
  facebook:  <FacebookIcon  className="h-3 w-3" />,
  twitter:   <TwitterXIcon  className="h-3 w-3" />,
  linkedin:  <LinkedInIcon  className="h-3 w-3" />,
};

const PLAT_COLOR: Record<string, string> = {
  instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  tiktok:    "bg-black",
  youtube:   "bg-red-600",
  facebook:  "bg-blue-600",
  twitter:   "bg-sky-500",
  linkedin:  "bg-blue-700",
};

function getFirstPlataforma(p: string | string[] | null | undefined): string | null {
  if (!p) return null;
  const arr = Array.isArray(p) ? p : [p];
  return arr[0] ?? null;
}

function getHorario(c: ConteudoWithRelations): string | null {
  if (c.horario_publicacao) return c.horario_publicacao.slice(0, 5);
  if (c.data_publicacao && c.data_publicacao.includes("T")) {
    return c.data_publicacao.slice(11, 16);
  }
  return null;
}

interface CalendarCardProps {
  conteudo: ConteudoWithRelations;
  onEdit: (c: ConteudoWithRelations) => void;
  onDelete: (c: ConteudoWithRelations) => void;
  compact?: boolean;
}

export function CalendarCard({ conteudo, onEdit, onDelete, compact = false }: CalendarCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const plat = getFirstPlataforma(conteudo.plataforma);
  const status = conteudo.status ?? "rascunho";
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.rascunho;
  const horario = getHorario(conteudo);
  const thumbnail = (conteudo as any).thumbnail_url as string | null | undefined;

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 hover:bg-muted cursor-pointer transition-colors group"
        onClick={() => onEdit(conteudo)}
        data-testid={`calendar-card-${conteudo.id}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusStyle.dot}`} />
        <span className="text-[10px] font-medium text-foreground truncate flex-1">
          {conteudo.titulo ?? "Sem título"}
        </span>
        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            className="hover:text-foreground text-muted-foreground/60 transition-colors"
            onClick={() => onEdit(conteudo)}
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
          <button
            className="hover:text-destructive text-muted-foreground/60 transition-colors"
            onClick={() => onDelete(conteudo)}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border transition-all cursor-pointer select-none text-xs"
      onClick={() => onEdit(conteudo)}
      data-testid={`calendar-card-${conteudo.id}`}
    >
      {thumbnail ? (
        <div className="relative w-full aspect-video overflow-hidden">
          <img
            src={thumbnail}
            alt={conteudo.titulo ?? ""}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {plat && (
            <span className={`absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-white ${PLAT_COLOR[plat] ?? "bg-muted-foreground"}`}>
              {PLAT_ICON[plat]}
            </span>
          )}
        </div>
      ) : (
        <div className={`w-full aspect-video flex items-center justify-center text-white ${plat ? (PLAT_COLOR[plat] ?? "bg-muted/40") : "bg-muted/40"}`}>
          {plat && <span className="text-white/60">{PLAT_ICON[plat]}</span>}
        </div>
      )}

      <div className="p-2 space-y-1">
        {horario && (
          <p className="font-mono text-muted-foreground leading-none">{horario}</p>
        )}
        <p className="font-semibold text-foreground leading-snug line-clamp-2">
          {conteudo.titulo ?? "Sem título"}
        </p>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
            <span className="text-muted-foreground">{statusStyle.label}</span>
          </div>
          {plat && !thumbnail && (
            <span className="text-muted-foreground capitalize">{plat}</span>
          )}
        </div>
      </div>

      <div
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm"
              data-testid={`button-card-menu-${conteudo.id}`}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => { setMenuOpen(false); onEdit(conteudo); }}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => { setMenuOpen(false); onDelete(conteudo); }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
