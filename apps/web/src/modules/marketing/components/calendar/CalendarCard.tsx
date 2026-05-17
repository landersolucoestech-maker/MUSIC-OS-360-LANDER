import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, SendHorizonal } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { ConteudoWithRelations } from "@/modules/marketing/hooks/useConteudos";
import {
  InstagramIcon, TikTokIcon, YouTubeIcon, FacebookIcon, TwitterXIcon, LinkedInIcon,
} from "./platform-icons";

const STATUS_STYLES: Record<string, { dot: string; label: string; text: string; bg: string }> = {
  agendado:   { dot: "bg-blue-400",    label: "Agendado",   text: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/30" },
  publicado:  { dot: "bg-emerald-400", label: "Publicado",  text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  rascunho:   { dot: "bg-slate-400",   label: "Rascunho",   text: "text-slate-500",                     bg: "bg-slate-50 dark:bg-slate-900/50" },
  pausado:    { dot: "bg-amber-400",   label: "Pausado",    text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  programado: { dot: "bg-violet-400",  label: "Programado", text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
  falha:      { dot: "bg-rose-500",    label: "Falha",      text: "text-rose-600 dark:text-rose-400",   bg: "bg-rose-50 dark:bg-rose-950/30" },
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

const PLAT_PILL_COLOR: Record<string, string> = {
  instagram: "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300",
  tiktok:    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  youtube:   "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  facebook:  "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  twitter:   "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
  linkedin:  "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300",
};

const TIPO_ASPECT: Record<string, string> = {
  reels:    "aspect-[9/16]",
  stories:  "aspect-[9/16]",
  video:    "aspect-video",
  shorts:   "aspect-[9/16]",
  carrossel: "aspect-square",
  post:     "aspect-video",
  anuncio:  "aspect-video",
};

function getFirstPlataforma(p: string | string[] | null | undefined): string | null {
  if (!p) return null;
  const arr = Array.isArray(p) ? p : [p];
  return arr[0] ?? null;
}

function getFirstTipo(t: string | string[] | null | undefined): string | null {
  if (!t) return null;
  const arr = Array.isArray(t) ? t : [t];
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
  onEdit:    (c: ConteudoWithRelations) => void;
  onDelete:  (c: ConteudoWithRelations) => void;
  onPublish?: (c: ConteudoWithRelations) => void;
  compact?: boolean;
}

export function CalendarCard({ conteudo, onEdit, onDelete, onPublish, compact = false }: CalendarCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const plat        = getFirstPlataforma(conteudo.plataforma);
  const tipo        = getFirstTipo(conteudo.tipo_conteudo);
  const status      = conteudo.status ?? "rascunho";
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.rascunho;
  const horario     = getHorario(conteudo);
  const thumbnail   = (conteudo as any).thumbnail_url as string | null | undefined;
  const platColor   = plat ? (PLAT_COLOR[plat] ?? "bg-muted-foreground") : "bg-muted-foreground";
  const platPill    = plat ? (PLAT_PILL_COLOR[plat] ?? "bg-muted text-muted-foreground") : "bg-muted text-muted-foreground";
  const aspectClass = tipo ? (TIPO_ASPECT[tipo] ?? "aspect-video") : "aspect-video";

  /* ── COMPACT MODE (weekly grid pill) ── */
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-all group border",
          platPill, "border-transparent hover:border-current/20 hover:shadow-sm",
        )}
        onClick={() => onEdit(conteudo)}
        data-testid={`calendar-card-${conteudo.id}`}
      >
        {plat && (
          <span className={cn("h-3.5 w-3.5 rounded-full flex items-center justify-center text-white shrink-0", platColor)}>
            <span className="scale-75">{PLAT_ICON[plat]}</span>
          </span>
        )}
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusStyle.dot)} />
        <span className="text-[10px] font-medium truncate flex-1 min-w-0">
          {horario && <span className="font-mono mr-0.5 opacity-70">{horario}</span>}
          {conteudo.titulo ?? "Sem título"}
        </span>
        <div
          className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-0.5 rounded hover:bg-black/10 transition-colors"
            onClick={() => onEdit(conteudo)}
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
          <button
            className="p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors"
            onClick={() => onDelete(conteudo)}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    );
  }

  /* ── NORMAL MODE (day/feed card) ── */
  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-border/60 bg-card shadow-sm hover:shadow-md hover:border-border/80 transition-all cursor-pointer select-none"
      onClick={() => onEdit(conteudo)}
      data-testid={`calendar-card-${conteudo.id}`}
    >
      {/* Thumbnail area */}
      <div className={cn("relative w-full overflow-hidden", aspectClass)}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={conteudo.titulo ?? ""}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center", platColor)}>
            <span className="text-white/20 text-3xl select-none">▶</span>
          </div>
        )}

        {/* Platform badge — top right */}
        {plat && (
          <span className={cn(
            "absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-white shadow-sm",
            platColor,
          )}>
            {PLAT_ICON[plat]}
          </span>
        )}

        {/* Horário overlay — bottom left */}
        {horario && (
          <span className="absolute bottom-1.5 left-1.5 font-mono text-[10px] text-white bg-black/60 rounded-md px-1.5 py-0.5 leading-none">
            {horario}
          </span>
        )}
      </div>

      {/* Info area */}
      <div className="p-2 space-y-1.5">
        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
          {conteudo.titulo ?? "Sem título"}
        </p>
        <div className="flex items-center justify-between gap-1">
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            statusStyle.text, statusStyle.bg,
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", statusStyle.dot)} />
            {statusStyle.label}
          </span>
          {tipo && (
            <span className="text-[10px] text-muted-foreground capitalize">{tipo}</span>
          )}
        </div>
        {onPublish && status !== "publicado" && (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg text-[10px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            onClick={(e) => { e.stopPropagation(); onPublish(conteudo); }}
            data-testid={`button-publish-${conteudo.id}`}
          >
            <SendHorizonal className="h-2.5 w-2.5" />
            Publicar agora
          </button>
        )}
      </div>

      {/* Context menu */}
      <div
        className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
          <DropdownMenuContent align="start" className="w-36">
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
