import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  InstagramIcon, TikTokIcon, YouTubeIcon, FacebookIcon, TwitterXIcon, LinkedInIcon,
} from "./platform-icons";

const PLATAFORMAS = [
  { value: "instagram", label: "Instagram", icon: <InstagramIcon className="h-3.5 w-3.5" />, color: "text-pink-500" },
  { value: "tiktok",    label: "TikTok",    icon: <TikTokIcon    className="h-3.5 w-3.5" />, color: "text-foreground" },
  { value: "youtube",   label: "YouTube",   icon: <YouTubeIcon   className="h-3.5 w-3.5" />, color: "text-red-500" },
  { value: "facebook",  label: "Facebook",  icon: <FacebookIcon  className="h-3.5 w-3.5" />, color: "text-blue-500" },
  { value: "twitter",   label: "X (Twitter)", icon: <TwitterXIcon className="h-3.5 w-3.5" />, color: "text-sky-500" },
  { value: "linkedin",  label: "LinkedIn",  icon: <LinkedInIcon  className="h-3.5 w-3.5" />, color: "text-blue-700" },
];

const STATUS_OPTIONS = [
  { value: "all",       label: "Todos os status" },
  { value: "agendado",  label: "Agendado",   dot: "bg-blue-400" },
  { value: "publicado", label: "Publicado",  dot: "bg-emerald-400" },
  { value: "rascunho",  label: "Rascunho",   dot: "bg-slate-400" },
  { value: "pausado",   label: "Pausado",    dot: "bg-amber-400" },
  { value: "falha",     label: "Falha",      dot: "bg-rose-500" },
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

type ViewMode = "dia" | "semana" | "mes" | "ano";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "dia",    label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes",    label: "Mês" },
  { value: "ano",    label: "Ano" },
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
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
}

export function CalendarFilters({
  search, onSearchChange,
  plataformas, onPlataformaToggle,
  status, onStatusChange,
  tipo, onTipoChange,
  viewMode, onViewModeChange,
}: CalendarFiltersProps) {
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  const currentTipo   = TIPO_OPTIONS.find((t) => t.value === tipo)     ?? TIPO_OPTIONS[0];

  const plataformaLabel = plataformas.length === 0
    ? "Plataformas"
    : plataformas.length === 1
      ? PLATAFORMAS.find((p) => p.value === plataformas[0])?.label ?? "Plataformas"
      : `${plataformas.length} plataformas`;

  const firstSelected = plataformas.length === 1
    ? PLATAFORMAS.find((p) => p.value === plataformas[0])
    : null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* ── Search ── */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar conteúdo..."
          className="pl-9 h-9 text-sm bg-muted/60 border-border/40 rounded-xl"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          data-testid="input-search-calendar"
        />
      </div>

      {/* ── View mode dropdown ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-xl text-sm font-medium border-border/60 bg-muted/60 hover:bg-muted shrink-0"
            data-testid="dropdown-view-mode"
          >
            {VIEW_OPTIONS.find((v) => v.value === viewMode)?.label ?? "Semana"}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          {VIEW_OPTIONS.map((v) => (
            <DropdownMenuItem
              key={v.value}
              onClick={() => onViewModeChange(v.value)}
              className="flex items-center gap-2 text-sm"
              data-testid={`view-${v.value}`}
            >
              <span className="flex-1">{v.label}</span>
              {viewMode === v.value && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Tipo dropdown ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-xl text-sm font-medium border-border/60 bg-muted/60 hover:bg-muted"
            data-testid="dropdown-tipo"
          >
            {currentTipo.label}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {TIPO_OPTIONS.map((t) => (
            <DropdownMenuItem
              key={t.value}
              onClick={() => onTipoChange(t.value)}
              className="flex items-center gap-2 text-sm"
              data-testid={`filter-tipo-${t.value}`}
            >
              <span className="flex-1">{t.label}</span>
              {tipo === t.value && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Status dropdown ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-xl text-sm font-medium border-border/60 bg-muted/60 hover:bg-muted"
            data-testid="dropdown-status"
          >
            {"dot" in currentStatus && currentStatus.dot && (
              <span className={`h-2 w-2 rounded-full ${currentStatus.dot}`} />
            )}
            {currentStatus.label}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {STATUS_OPTIONS.map((s) => (
            <DropdownMenuItem
              key={s.value}
              onClick={() => onStatusChange(s.value)}
              className="flex items-center gap-2 text-sm"
              data-testid={`filter-status-${s.value}`}
            >
              {"dot" in s && s.dot
                ? <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                : <span className="h-2 w-2" />
              }
              <span className="flex-1">{s.label}</span>
              {status === s.value && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Plataformas dropdown ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-xl text-sm font-medium border-border/60 bg-muted/60 hover:bg-muted"
            data-testid="dropdown-plataformas"
          >
            {firstSelected && (
              <span className={firstSelected.color}>{firstSelected.icon}</span>
            )}
            {plataformaLabel}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              PLATAFORMAS.forEach((p) => {
                if (plataformas.includes(p.value)) onPlataformaToggle(p.value);
              });
            }}
            className="flex items-center gap-2 text-sm"
            data-testid="filter-plat-all"
          >
            <span className="flex-1">Todas as plataformas</span>
            {plataformas.length === 0 && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {PLATAFORMAS.map((p) => {
            const active = plataformas.includes(p.value);
            return (
              <DropdownMenuItem
                key={p.value}
                onClick={() => onPlataformaToggle(p.value)}
                className="flex items-center gap-2 text-sm"
                data-testid={`filter-plat-${p.value}`}
              >
                <span className={p.color}>{p.icon}</span>
                <span className="flex-1">{p.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
