import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  InstagramIcon, TikTokIcon, YouTubeIcon, FacebookIcon, TwitterXIcon, LinkedInIcon,
} from "./platform-icons";

const PLATAFORMAS = [
  { value: "instagram", icon: <InstagramIcon className="h-3.5 w-3.5" />, color: "text-pink-500" },
  { value: "tiktok",    icon: <TikTokIcon    className="h-3.5 w-3.5" />, color: "text-foreground" },
  { value: "youtube",   icon: <YouTubeIcon   className="h-3.5 w-3.5" />, color: "text-red-500" },
  { value: "facebook",  icon: <FacebookIcon  className="h-3.5 w-3.5" />, color: "text-blue-500" },
  { value: "twitter",   icon: <TwitterXIcon  className="h-3.5 w-3.5" />, color: "text-sky-500" },
  { value: "linkedin",  icon: <LinkedInIcon  className="h-3.5 w-3.5" />, color: "text-blue-700" },
];

const STATUS_OPTIONS = [
  { value: "all",       label: "Todos os status" },
  { value: "agendado",  label: "Agendado" },
  { value: "publicado", label: "Publicado" },
  { value: "rascunho",  label: "Rascunho" },
  { value: "pausado",   label: "Pausado" },
];

const TIPO_OPTIONS = [
  { value: "all",       label: "Todos os tipos" },
  { value: "post",      label: "Post" },
  { value: "stories",   label: "Stories" },
  { value: "video",     label: "Vídeo" },
  { value: "reels",     label: "Reels" },
  { value: "anuncio",   label: "Anúncio" },
  { value: "carrossel", label: "Carrossel" },
];

interface CalendarFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  plataformas: string[];
  onPlataformaToggle: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  tipo: string;
  onTipoChange: (v: string) => void;
}

export function CalendarFilters({
  search, onSearchChange,
  plataformas, onPlataformaToggle,
  status, onStatusChange,
  tipo, onTipoChange,
}: CalendarFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40">
        {PLATAFORMAS.map((p) => {
          const active = plataformas.includes(p.value);
          return (
            <button
              key={p.value}
              onClick={() => onPlataformaToggle(p.value)}
              title={p.value}
              data-testid={`filter-plat-${p.value}`}
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center transition-all",
                active
                  ? `bg-background shadow-sm ${p.color}`
                  : "text-muted-foreground/50 hover:text-muted-foreground",
              )}
            >
              {p.icon}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => onStatusChange(s.value)}
            data-testid={`filter-status-${s.value}`}
            className={cn(
              "px-3 h-7 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
              status === s.value
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/40">
        {TIPO_OPTIONS.map((t) => (
          <button
            key={t.value}
            onClick={() => onTipoChange(t.value)}
            data-testid={`filter-tipo-${t.value}`}
            className={cn(
              "px-3 h-7 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
              tipo === t.value
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar conteúdo..."
          className="pl-9 h-9 text-sm bg-muted/60 border-border/40 rounded-xl"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          data-testid="input-search-calendar"
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground"
        title="Configurações de filtro"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
}
