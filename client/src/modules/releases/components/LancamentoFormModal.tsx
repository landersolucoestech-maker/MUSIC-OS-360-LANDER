import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/card";
import { DatePickerField } from "@/shared/ui/date-picker-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Folder,
  Music,
  Plus,
  Upload,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { useLancamentos } from "@/modules/releases/hooks/useLancamentos";
import type { Lancamento } from "@/modules/releases/types";
import { useProjetos } from "@/modules/projects/hooks/useProjetos";
import type { ProjetoWithRelations } from "@/modules/projects/hooks/useProjetos";
import { useArtistas } from "@/modules/artist/hooks/useArtistas";
import { useObras } from "@/modules/catalog/hooks/useObras";
import { useFonogramas } from "@/modules/catalog/hooks/useFonogramas";
import {
  lancamentoToFormFields,
  emptyLancamentoFormFields,
  formToLancamentoPayload,
  projetoToLancamentoSeed,
} from "@/modules/releases/mappers";

// ─────────────────────────────────────────────────────────────────────────────
// STEP LABELS
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  "Album Info",
  "Track Upload",
  "Album Art",
  "Distribution Preferences",
  "Preview",
];

// ─────────────────────────────────────────────────────────────────────────────
// GENRE HELPERS  (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
const GENERO_OPTS = [
  "funk",
  "pop",
  "rock",
  "sertanejo",
  "trap",
  "rap/hip-hop",
  "pagode",
  "forró",
  "mpb",
  "eletrônica",
  "gospel",
  "reggaeton",
  "r&b",
  "outro",
];
const GENERO_LABELS: Record<string, string> = {
  funk: "Funk",
  pop: "Pop",
  rock: "Rock",
  sertanejo: "Sertanejo",
  trap: "Trap",
  "rap/hip-hop": "Rap / Hip-Hop",
  pagode: "Pagode",
  forró: "Forró",
  mpb: "MPB",
  eletrônica: "Eletrônica",
  gospel: "Gospel",
  reggaeton: "Reggaeton",
  "r&b": "R&B",
  outro: "Outro",
};
const GENERO_ALIASES: Record<string, string> = {
  eletronico: "eletrônica",
  electronico: "eletrônica",
  electronica: "eletrônica",
  "hip hop": "rap/hip-hop",
  "hip-hop": "rap/hip-hop",
  rap: "rap/hip-hop",
  "bossa nova": "mpb",
  "mpb/bossa nova": "mpb",
  forro: "forró",
};
const normStr = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const matchGenero = (raw: string): string => {
  if (!raw) return "";
  const n = normStr(raw);
  const exact = GENERO_OPTS.find((g) => normStr(g) === n);
  if (exact) return exact;
  if (GENERO_ALIASES[n]) return GENERO_ALIASES[n];
  const partial = GENERO_OPTS.find(
    (g) => n.startsWith(normStr(g)) || normStr(g).startsWith(n),
  );
  return partial ?? raw.toLowerCase();
};
const splitNames = (s: string | null | undefined): string[] => {
  if (!s) return [""];
  const parts = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [""];
};

// ─────────────────────────────────────────────────────────────────────────────
// NEW OPTION LISTS
// ─────────────────────────────────────────────────────────────────────────────
const AI_ASSISTANCE_OPTS = [
  { value: "human_no_ai", label: "Human Created, No AI" },
  { value: "human_ai_assisted", label: "Human Created, AI Assisted" },
  { value: "ai_human_edited", label: "AI Generated, Human Edited" },
  { value: "ai_generated", label: "AI Generated" },
];

const EXPLICIT_OPTS = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes (Explicit)" },
  { value: "clean", label: "Clean Version" },
];

const VERSION_TYPE_OPTS = [
  { value: "remix", label: "Remix" },
  { value: "live", label: "Live" },
  { value: "acoustic", label: "Acoustic" },
  { value: "instrumental_ver", label: "Instrumental" },
  { value: "karaoke", label: "Karaoke" },
  { value: "radio_edit", label: "Radio Edit" },
  { value: "extended", label: "Extended Mix" },
  { value: "demo", label: "Demo" },
  { value: "cover", label: "Cover" },
  { value: "other", label: "Other" },
];

const ARTIST_ROLES = [
  "Performer",
  "Featuring",
  "Main Artist",
  "Remixer",
  "DJ",
  "Choir",
];
const PRODUCER_ROLES = [
  "Producer",
  "Co-Producer",
  "Executive Producer",
  "Mixer",
  "Mastering Engineer",
  "Recording Engineer",
];
const INSTRUMENT_OPTS = [
  "Guitar",
  "Bass",
  "Drums",
  "Piano",
  "Keyboard",
  "Violin",
  "Trumpet",
  "Saxophone",
  "DJ",
  "Vocals",
  "Backing Vocals",
  "Percussion",
  "Strings",
  "Other",
];

const IDIOMA_OPTS = [
  { value: "pt-br", label: "Português (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
  { value: "ar", label: "العربية" },
];

const TIMEZONE_OPTS = [
  {
    value: "America/Sao_Paulo",
    label: "(GMT -3:00) Brazil, Buenos Aires, Georgetown",
  },
  {
    value: "America/New_York",
    label: "(GMT -5:00) Eastern Time (US & Canada)",
  },
  { value: "America/Chicago", label: "(GMT -6:00) Central Time (US & Canada)" },
  {
    value: "America/Los_Angeles",
    label: "(GMT -8:00) Pacific Time (US & Canada)",
  },
  { value: "Europe/London", label: "(GMT +0:00) London, Dublin, Lisbon" },
  { value: "Europe/Paris", label: "(GMT +1:00) Paris, Madrid, Berlin" },
  { value: "Asia/Tokyo", label: "(GMT +9:00) Tokyo, Seoul" },
];

const PRICING_OPTS = [
  { value: "custom", label: "Custom" },
  { value: "standard", label: "Standard" },
  { value: "free", label: "Free" },
];

const STORES_ESSENTIALS = [
  "Apple Music",
  "Spotify",
  "YouTube",
  "Amazon Music",
  "Deezer",
  "Tidal",
  "SoundCloud",
  "Pandora",
  "iHeart Radio",
  "TikTok",
  "Facebook",
  "Facebook Audio Library",
  "KKBOX",
  "Audiomack",
  "Boomplay",
  "Anghami",
  "NetEase",
  "Tencent",
  "Qobuz",
  "Snapchat",
  "Saavn Music",
  "JOOX Music",
  "Slacker",
  "Neurotic Media",
  "TouchTunes",
  "FLO",
  "Rythm",
  "Lissen",
  "Fizy",
  "Soda Music",
  "Kuack",
  "Claro Música",
];
const STORES_NEIGHBOURING = ["SoundExchange"];
const STORES_RINGTONES = ["iTunes Ringtones", "Claro Ringtones", "Algar"];

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ───a��─────────────────────────────────────────────────────────────────────────
interface ArtistEntry {
  nome: string;
  role: string;
}
interface MusicianEntry {
  nome: string;
  instrumento: string;
}

interface Faixa {
  id: number;
  titulo: string;
  artista: string;
  isrc: string;
  // version
  isVersionAlternativa: boolean;
  tipoVersao: string;
  // credits
  artistasAdicionais: ArtistEntry[];
  produtores: ArtistEntry[];
  compositores: string[];
  musicos: MusicianEntry[];
  // AI / content
  aiAssistanceLevel: string;
  instrumental: boolean;
  idioma: string;
  letra: string;
  explicit: string;
  // file
  arquivoAudio: File | null;
}

interface ExtraFields {
  // Album Info
  variosArtistas: boolean;
  artistasAdicionaisAlbum: ArtistEntry[];
  generoSecundario: string;
  copyrightDataLancamento: string;
  copyrightDataGravacao: string;
  ownUpc: boolean;
  // Distribution
  territory: string;
  releaseTime: string;
  releaseTimezone: string;
  preOrder: boolean;
  noPreviewsDuringPreOrder: boolean;
  pricing: string;
  lojasSelecionadas: string[];
}

interface LancamentoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento?: Lancamento;
  mode: "create" | "edit" | "view";
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────
const mkFaixa = (id = Date.now()): Faixa => ({
  id,
  titulo: "",
  artista: "",
  isrc: "",
  isVersionAlternativa: false,
  tipoVersao: "",
  artistasAdicionais: [],
  produtores: [],
  compositores: [""],
  musicos: [],
  aiAssistanceLevel: "",
  instrumental: false,
  idioma: "pt-br",
  letra: "",
  explicit: "no",
  arquivoAudio: null,
});

const DEFAULT_EXTRA: ExtraFields = {
  variosArtistas: false,
  artistasAdicionaisAlbum: [],
  generoSecundario: "",
  copyrightDataLancamento: "",
  copyrightDataGravacao: "",
  ownUpc: false,
  territory: "world",
  releaseTime: "",
  releaseTimezone: "America/Sao_Paulo",
  preOrder: false,
  noPreviewsDuringPreOrder: false,
  pricing: "custom",
  lojasSelecionadas: [...STORES_ESSENTIALS],
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start mb-6 overflow-x-auto pb-1 -mx-1 px-1">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center shrink-0">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                ${
                  i < current
                    ? "bg-primary border-primary text-primary-foreground"
                    : i === current
                      ? "border-primary text-primary bg-background"
                      : "border-muted-foreground/40 text-muted-foreground/60 bg-background"
                }`}
            >
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={`mt-1 text-[10px] font-medium hidden sm:block whitespace-nowrap
                ${i === current ? "text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-px w-4 lg:w-8 mx-1 mb-4 transition-colors
                ${i < current ? "bg-primary" : "bg-border"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO BOX helper
// ─────────────────────────────────────────────────────────────────────────────
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/50 border rounded-md p-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function LancamentoFormModal({
  open,
  onOpenChange,
  lancamento,
  mode,
}: LancamentoFormModalProps) {
  const { addLancamento, updateLancamento } = useLancamentos();
  const { projetos } = useProjetos();
  const { artistas } = useArtistas();
  const { obras } = useObras();
  const { fonogramas } = useFonogramas();

  // ── Core state ────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(emptyLancamentoFormFields);
  const [extraFields, setExtraFields] = useState<ExtraFields>({
    ...DEFAULT_EXTRA,
  });
  const [faixas, setFaixas] = useState<Faixa[]>([mkFaixa(1)]);
  const [capaPrincipal, setCapaPrincipal] = useState<File | null>(null);

  // ── Combobox state (unchanged) ────────────────────────────────────────────
  const [projetoSearch, setProjetoSearch] = useState("");
  const [projetoOpen, setProjetoOpen] = useState(false);
  const [artistaSearch, setArtistaSearch] = useState("");
  const [artistaOpen, setArtistaOpen] = useState(false);
  const [selectedObraId, setSelectedObraId] = useState("");
  const [selectedFonogramaId, setSelectedFonogramaId] = useState("");

  // ── Distributor connections (unchanged) ───────────────────────────────────
  const DIST_STORAGE_KEY = "musicos360_distributor_connections";
  const DISTRIBUTORS = [
    {
      id: "onerpm",
      name: "ONErpm",
      description:
        "Distribuição global com analytics avançados e suporte a label",
    },
    {
      id: "distrokid",
      name: "DistroKid",
      description: "Distribuição rápida para todas as plataformas de streaming",
    },
    {
      id: "symphonic",
      name: "Symphonic",
      description:
        "Distribuição e marketing para artistas e selos independentes",
    },
    {
      id: "soundon",
      name: "SoundOn",
      description: "Distribuidora oficial do TikTok com monetização integrada",
    },
    {
      id: "musicpro",
      name: "MusicPro",
      description:
        "Distribuição profissional com suporte dedicado e royalties mensais",
    },
    {
      id: "somvibe",
      name: "SomVibe",
      description:
        "Distribuidora brasileira independente com foco no mercado nacional",
    },
  ];
  const [distributorConnections] = useState<
    Record<string, { username: string }>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem(DIST_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const connectedDistributors = DISTRIBUTORS.filter((d) =>
    Boolean(distributorConnections[d.id]),
  );

  // ── Helper to update extraFields ──────────────────────────────────────────
  const setExtra = <K extends keyof ExtraFields>(k: K, v: ExtraFields[K]) =>
    setExtraFields((prev) => ({ ...prev, [k]: v }));

  // ── Derived labels ────────────────────────────────────────────────────────
  const projetoLabel = formData.projetoSeed
    ? (projetos.find((p) => p.id === formData.projetoSeed)?.titulo ??
      projetos.find((p) => p.id === formData.projetoSeed)?.nome ??
      "")
    : "";
  const artistaLabel = formData.artista_id
    ? (artistas.find((a) => a.id === formData.artista_id)?.nome_artistico ?? "")
    : "";

  // ── Filtered lists ────────────────────────────────────────────────────────
  const TIPOS_MUSICAIS = ["album", "ep", "single"];
  const projetosFiltrados = projetos
    .filter(
      (p) => !p.tipo || TIPOS_MUSICAIS.includes(String(p.tipo).toLowerCase()),
    )
    .filter(
      (p) =>
        !projetoSearch ||
        normStr(p.titulo ?? p.nome ?? "").includes(normStr(projetoSearch)),
    );
  const artistasFiltrados = artistas.filter(
    (a) =>
      !artistaSearch ||
      normStr(a.nome_artistico ?? "").includes(normStr(artistaSearch)),
  );

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setCurrentStep(0);
    setFormData(lancamentoToFormFields(lancamento ?? null));
    setExtraFields({
      ...DEFAULT_EXTRA,
      lojasSelecionadas: [...STORES_ESSENTIALS],
    });
    setSelectedObraId(lancamento?.obra_id ?? "");
    setSelectedFonogramaId(lancamento?.fonograma_id ?? "");
    setCapaPrincipal(null);
    setProjetoSearch("");
    setArtistaSearch("");
    setProjetoOpen(false);
    setArtistaOpen(false);
    setFaixas([mkFaixa(1)]);
  }, [open, lancamento]);

  const isViewMode = mode === "view";

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-FILL HANDLERS  (unchanged from original)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSelectProjeto = (projetoId: string) => {
    const projeto: ProjetoWithRelations | undefined = projetos.find(
      (p) => p.id === projetoId,
    );
    if (!projeto) {
      setFormData((prev) => ({ ...prev, projetoSeed: projetoId }));
      setProjetoOpen(false);
      setProjetoSearch("");
      return;
    }
    const seed = projetoToLancamentoSeed(projeto);
    const rawGenero =
      seed.genero?.trim() ||
      artistas.find((a) => a.id === projeto.artista_id)?.genero_musical ||
      "";
    const projetoNorm = normStr(projeto.titulo ?? "");
    const fonoDosProjeto = projetoNorm
      ? fonogramas.find((f) => normStr(f.titulo ?? "") === projetoNorm)
      : undefined;
    setFormData((prev) => ({
      ...prev,
      projetoSeed: projetoId,
      titulo: !prev.titulo.trim() ? (seed.titulo ?? "") : prev.titulo,
      artista_id: !prev.artista_id.trim()
        ? (seed.artista_id ?? "")
        : prev.artista_id,
      genero: !prev.genero.trim() ? matchGenero(rawGenero) : prev.genero,
      tipo: !prev.tipo.trim() ? (seed.tipo ?? "") : prev.tipo,
      isrcGlobal: !prev.isrcGlobal.trim()
        ? (fonoDosProjeto?.isrc ?? "")
        : prev.isrcGlobal,
    }));
    if (projeto.descricao) {
      try {
        const musicas = JSON.parse(projeto.descricao) as Array<{
          nome?: string;
          compositores?: string[];
          produtores?: string[];
          isrc?: string;
          letra?: string;
        }>;
        if (musicas.length > 0) {
          const artistaNome = projeto.artista_id
            ? (artistas.find((a) => a.id === projeto.artista_id)
                ?.nome_artistico ?? "")
            : "";
          setFaixas(
            musicas.map((m, i) => {
              const faixaNorm = normStr(m.nome ?? "");
              const isrcFaixa =
                m.isrc?.trim() ||
                (faixaNorm
                  ? (fonogramas.find(
                      (f) => normStr(f.titulo ?? "") === faixaNorm,
                    )?.isrc ?? "")
                  : "");
              return {
                ...mkFaixa(i + 1),
                titulo: m.nome ?? "",
                artista: artistaNome,
                isrc: isrcFaixa,
                compositores: m.compositores?.length ? m.compositores : [""],
                produtores: m.produtores?.length
                  ? m.produtores.map((p) => ({ nome: p, role: "Producer" }))
                  : [],
                letra: m.letra ?? "",
              };
            }),
          );
        }
      } catch {
        /* invalid JSON */
      }
    }
    setProjetoOpen(false);
    setProjetoSearch("");
  };

  const handleSelectArtista = (artistaId: string) => {
    setFormData((prev) => ({ ...prev, artista_id: artistaId }));
    setArtistaOpen(false);
    setArtistaSearch("");
  };

  const handleSelectObra = (obraId: string) => {
    setSelectedObraId(obraId);
    const obra = obras.find((o) => o.id === obraId);
    if (!obra) return;
    const compArr = splitNames(
      Array.isArray(obra.compositores)
        ? (obra.compositores as string[]).join(", ")
        : typeof obra.compositores === "string"
          ? obra.compositores
          : (obra.compositor ?? ""),
    );
    setFormData((prev) => ({
      ...prev,
      titulo: !prev.titulo.trim() ? (obra.titulo ?? "") : prev.titulo,
      genero: !prev.genero.trim()
        ? matchGenero(obra.genero ?? "")
        : prev.genero,
      isrcGlobal: !prev.isrcGlobal.trim() ? (obra.isrc ?? "") : prev.isrcGlobal,
    }));
    setFaixas((prev) =>
      prev.map((f, i) =>
        i !== 0
          ? f
          : {
              ...f,
              titulo: !f.titulo.trim() ? (obra.titulo ?? "") : f.titulo,
              isrc: !f.isrc.trim() ? (obra.isrc ?? "") : f.isrc,
              compositores:
                f.compositores.join("").trim() === ""
                  ? compArr
                  : f.compositores,
            },
      ),
    );
  };

  const handleSelectFonograma = (fonogramaId: string) => {
    setSelectedFonogramaId(fonogramaId);
    const fono = fonogramas.find((f) => f.id === fonogramaId);
    if (!fono) return;
    const compArr = splitNames(fono.compositores ?? "");
    const prodArr = splitNames(fono.produtores ?? "");
    setFormData((prev) => ({
      ...prev,
      artista_id: !prev.artista_id.trim()
        ? (fono.artista_id ?? "")
        : prev.artista_id,
      gravadora: !prev.gravadora.trim()
        ? (fono.gravadora ?? "")
        : prev.gravadora,
      isrcGlobal: !prev.isrcGlobal.trim() ? (fono.isrc ?? "") : prev.isrcGlobal,
    }));
    setFaixas((prev) =>
      prev.map((f, i) =>
        i !== 0
          ? f
          : {
              ...f,
              titulo: !f.titulo.trim() ? (fono.titulo ?? "") : f.titulo,
              isrc: !f.isrc.trim() ? (fono.isrc ?? "") : f.isrc,
              artista: !f.artista.trim()
                ? (artistas.find((a) => a.id === fono.artista_id)
                    ?.nome_artistico ?? f.artista)
                : f.artista,
              compositores:
                f.compositores.join("").trim() === ""
                  ? compArr
                  : f.compositores,
              produtores:
                f.produtores.length === 0
                  ? prodArr.map((p) => ({ nome: p, role: "Producer" }))
                  : f.produtores,
            },
      ),
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP VALIDATION & NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────
  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 0:
        return (
          !!formData.titulo.trim() &&
          (extraFields.variosArtistas || !!formData.artista_id.trim())
        );
      case 1:
        return faixas.every((f) => !!f.titulo.trim() && !!f.aiAssistanceLevel);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!canAdvance()) {
      toast.error("Preencha os campos obrigatórios antes de avançar.");
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const handlePrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  // ─────────────────────────────────────────────────────────────────────────
  // FAIXA HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const addFaixa = () =>
    setFaixas((prev) => [...prev, mkFaixa(prev.length + 1)]);
  const removeFaixa = (id: number) => {
    if (faixas.length > 1) setFaixas((prev) => prev.filter((f) => f.id !== id));
  };
  const updF = <K extends keyof Faixa>(id: number, k: K, v: Faixa[K]) =>
    setFaixas((prev) => prev.map((f) => (f.id === id ? { ...f, [k]: v } : f)));

  // Compositores (string[])
  const addComp = (fid: number) =>
    setFaixas((prev) =>
      prev.map((f) =>
        f.id === fid ? { ...f, compositores: [...f.compositores, ""] } : f,
      ),
    );
  const updComp = (fid: number, i: number, v: string) =>
    setFaixas((prev) =>
      prev.map((f) =>
        f.id === fid
          ? {
              ...f,
              compositores: f.compositores.map((c, idx) => (idx === i ? v : c)),
            }
          : f,
      ),
    );
  const removeComp = (fid: number, i: number) =>
    setFaixas((prev) =>
      prev.map((f) =>
        f.id === fid
          ? { ...f, compositores: f.compositores.filter((_, idx) => idx !== i) }
          : f,
      ),
    );

  // ArtistEntry[] fields
  const addAE = (
    fid: number,
    field: "artistasAdicionais" | "produtores",
    defaultRole: string,
  ) =>
    setFaixas((prev) =>
      prev.map((f) =>
        f.id === fid
          ? { ...f, [field]: [...f[field], { nome: "", role: defaultRole }] }
          : f,
      ),
    );
  const updAE = (
    fid: number,
    field: "artistasAdicionais" | "produtores",
    i: number,
    k: "nome" | "role",
    v: string,
  ) =>
    setFaixas((prev) =>
      prev.map((f) =>
        f.id === fid
          ? {
              ...f,
              [field]: (f[field] as ArtistEntry[]).map((e, idx) =>
                idx === i ? { ...e, [k]: v } : e,
              ),
            }
          : f,
      ),
    );
  const removeAE = (
    fid: number,
    field: "artistasAdicionais" | "produtores",
    i: number,
  ) =>
    setFaixas((prev) =>
      prev.map((f) =>
        f.id === fid
          ? {
              ...f,
              [field]: (f[field] as ArtistEntry[]).filter(
                (_, idx) => idx !== i,
              ),
            }
          : f,
      ),
    );

  // Músicos
  const addMus = (fid: number) =>
    setFaixas((prev) =>
      prev.map((f) =>
        f.id === fid
          ? { ...f, musicos: [...f.musicos, { nome: "", instrumento: "" }] }
          : f,
      ),
    );
  const updMus = (
    fid: number,
    i: number,
    k: "nome" | "instrumento",
    v: string,
  ) =>
    setFaixas((prev) =>
      prev.map((f) =>
        f.id === fid
          ? {
              ...f,
              musicos: f.musicos.map((m, idx) =>
                idx === i ? { ...m, [k]: v } : m,
              ),
            }
          : f,
      ),
    );
  const removeMus = (fid: number, i: number) =>
    setFaixas((prev) =>
      prev.map((f) =>
        f.id === fid
          ? { ...f, musicos: f.musicos.filter((_, idx) => idx !== i) }
          : f,
      ),
    );

  // Album-level additional artists
  const addAlbumArtist = () =>
    setExtra("artistasAdicionaisAlbum", [
      ...extraFields.artistasAdicionaisAlbum,
      { nome: "", role: "Performer" },
    ]);
  const updAlbumArtist = (i: number, k: "nome" | "role", v: string) =>
    setExtra(
      "artistasAdicionaisAlbum",
      extraFields.artistasAdicionaisAlbum.map((e, idx) =>
        idx === i ? { ...e, [k]: v } : e,
      ),
    );
  const removeAlbumArtist = (i: number) =>
    setExtra(
      "artistasAdicionaisAlbum",
      extraFields.artistasAdicionaisAlbum.filter((_, idx) => idx !== i),
    );

  // Store toggles
  const toggleStore = (s: string) =>
    setExtra(
      "lojasSelecionadas",
      extraFields.lojasSelecionadas.includes(s)
        ? extraFields.lojasSelecionadas.filter((x) => x !== s)
        : [...extraFields.lojasSelecionadas, s],
    );
  const toggleStoreGroup = (list: string[], checked: boolean) =>
    setExtra(
      "lojasSelecionadas",
      checked
        ? [...new Set([...extraFields.lojasSelecionadas, ...list])]
        : extraFields.lojasSelecionadas.filter((s) => !list.includes(s)),
    );

  // ─────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (mode === "view") return;
    if (!formData.titulo.trim()) {
      toast.error("Informe o título do lançamento.");
      return;
    }
    try {
      const payload = formToLancamentoPayload(formData);
      if (mode === "edit" && lancamento?.id) {
        await updateLancamento.mutateAsync({ id: lancamento.id, ...payload });
        toast.success("Lançamento atualizado!");
      } else {
        await addLancamento.mutateAsync(payload);
        toast.success("Lançamento criado!");
      }
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar lançamento.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // REUSABLE: ArtistEntry rows
  // ─────────────────────────────────────────────────────────────────────────
  const ArtistRows = ({
    entries,
    roles,
    addLabel,
    onAdd,
    onUpdate,
    onRemove,
    suggestionsListId,
  }: {
    entries: ArtistEntry[];
    roles: string[];
    addLabel: string;
    onAdd: () => void;
    onUpdate: (i: number, k: "nome" | "role", v: string) => void;
    onRemove: (i: number) => void;
    suggestionsListId?: string;
  }) => {
    return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={e.nome}
            onChange={(ev) => onUpdate(i, "nome", ev.target.value)}
            placeholder="Nome"
            disabled={isViewMode}
            className="flex-1"
            list={suggestionsListId}
          />
          <Select
            value={e.role}
            onValueChange={(v) => onUpdate(i, "role", v)}
            disabled={isViewMode}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isViewMode && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(i)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!isViewMode && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </Button>
      )}
    </div>
  );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 0 — ALBUM INFO
  // ─────────────────────────────────────────────────────────────────────────
  const artistSuggestions = artistas.map((a) => a.nome_artistico ?? "").filter(Boolean);

  const renderStep0 = () => (
    <div className="space-y-6">
      <datalist id="artist-ac-list">
        {artistSuggestions.map((s) => <option key={s} value={s} />)}
      </datalist>
      {/* Vinculações */}
      <Card className="bg-muted/30 border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Vinculações</CardTitle>
          </div>
          <CardDescription>
            Selecione o projeto para pré-carregar informações automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Popover
              open={projetoOpen}
              onOpenChange={isViewMode ? undefined : setProjetoOpen}
            >
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={projetoOpen ? projetoSearch : projetoLabel}
                    onChange={(e) => {
                      setProjetoSearch(e.target.value);
                      setProjetoOpen(true);
                    }}
                    onFocus={() => !isViewMode && setProjetoOpen(true)}
                    onClick={() => !isViewMode && setProjetoOpen(true)}
                    disabled={isViewMode}
                    placeholder="Buscar projeto..."
                    className="pl-10"
                    data-testid="input-buscar-projeto"
                  />
                  {formData.projetoSeed && !isViewMode && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((prev) => ({ ...prev, projetoSeed: "" }));
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-[480px] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <ScrollArea className="max-h-[280px]">
                  <div className="p-2">
                    {projetosFiltrados.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum projeto encontrado.
                      </p>
                    ) : (
                      projetosFiltrados.map((p) => (
                        <div
                          key={p.id}
                          role="option"
                          tabIndex={0}
                          className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                          onClick={() => handleSelectProjeto(p.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelectProjeto(p.id);
                            }
                          }}
                          data-testid={`option-projeto-${p.id}`}
                        >
                          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shrink-0">
                            <Folder className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {p.titulo ?? p.nome ?? "—"}
                            </p>
                            {p.artista_id && (
                              <p className="text-xs text-muted-foreground truncate">
                                {artistas.find((a) => a.id === p.artista_id)
                                  ?.nome_artistico ?? ""}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            {formData.projetoSeed && (
              <p className="text-xs text-muted-foreground">
                Faixas, artista e gênero preenchidos a partir do projeto.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card className="bg-muted/30 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Metadata</CardTitle>
          <CardDescription>
            Original Album Information — todos os campos são obrigatórios,
            exceto onde indicado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label>Título do Álbum / Single / EP *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) =>
                setFormData({ ...formData, titulo: e.target.value })
              }
              placeholder="Título do lançamento"
              disabled={isViewMode}
              required
              data-cy="input-album-single-ep-title"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Lançamento *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              disabled={isViewMode}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="ep">EP</SelectItem>
                <SelectItem value="album">Álbum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Various Artists */}
          <div className="space-y-2">
            <Label>Various Artists</Label>
            <InfoBox>
              Marque esta opção se o álbum é uma coletânea com 5 ou mais
              artistas principais diferentes.
            </InfoBox>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={extraFields.variosArtistas}
                onChange={(e) => setExtra("variosArtistas", e.target.checked)}
                disabled={isViewMode}
                className="w-4 h-4 accent-primary"
                data-cy="checkbox-various-artists"
              />
              <span className="text-sm">Various Artists</span>
            </label>
          </div>

          {/* Primary Artist */}
          {!extraFields.variosArtistas && (
            <div className="space-y-2">
              <Label>Artista Principal *</Label>
              <Popover
                open={artistaOpen}
                onOpenChange={isViewMode ? undefined : setArtistaOpen}
              >
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={artistaOpen ? artistaSearch : artistaLabel}
                      onChange={(e) => {
                        setArtistaSearch(e.target.value);
                        setArtistaOpen(true);
                      }}
                      onFocus={() => !isViewMode && setArtistaOpen(true)}
                      onClick={() => !isViewMode && setArtistaOpen(true)}
                      disabled={isViewMode}
                      placeholder="Buscar artista..."
                      className="pl-10"
                      data-testid="input-buscar-artista"
                    />
                    {formData.artista_id && !isViewMode && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData((prev) => ({ ...prev, artista_id: "" }));
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[360px] p-0"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <ScrollArea className="max-h-[280px]">
                    <div className="p-2">
                      {artistasFiltrados.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum artista encontrado.
                        </p>
                      ) : (
                        artistasFiltrados.map((a) => (
                          <div
                            key={a.id}
                            role="option"
                            tabIndex={0}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                            onClick={() => handleSelectArtista(a.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectArtista(a.id);
                              }
                            }}
                            data-testid={`option-artista-${a.id}`}
                          >
                            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shrink-0">
                              <Music className="h-4 w-4 text-white" />
                            </div>
                            <p className="text-sm font-medium truncate">
                              {a.nome_artistico ?? "—"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Additional Artists (album level) */}
          <div className="space-y-2">
            <Label>Artistas Adicionais</Label>
            <InfoBox>
              Adicione artistas no nível do álbum com o papel correspondente.
              Eles aparecerão em <strong>todas</strong> as faixas. Para artistas
              de faixas específicas, adicione na etapa Track Upload. Apenas
              artistas devem ser listados — não inclua selos ou produtoras.
            </InfoBox>
            <ArtistRows
              entries={extraFields.artistasAdicionaisAlbum}
              roles={ARTIST_ROLES}
              addLabel="Adicionar Artista"
              onAdd={addAlbumArtist}
              onUpdate={updAlbumArtist}
              onRemove={removeAlbumArtist}
              suggestionsListId="artist-ac-list"
            />
          </div>

          <Separator />

          {/* Genres */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gênero Principal *</Label>
              <Select
                value={formData.genero}
                onValueChange={(v) => setFormData({ ...formData, genero: v })}
                disabled={isViewMode}
              >
                <SelectTrigger data-testid="select-genero">
                  <SelectValue placeholder="Selecione o gênero" />
                </SelectTrigger>
                <SelectContent>
                  {[...GENERO_OPTS]
                    .sort((a, b) =>
                      (GENERO_LABELS[a] ?? a).localeCompare(
                        GENERO_LABELS[b] ?? b,
                        "pt-BR",
                      ),
                    )
                    .map((g) => (
                      <SelectItem key={g} value={g}>
                        {GENERO_LABELS[g] ?? g}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gênero Secundário *</Label>
              <Select
                value={extraFields.generoSecundario}
                onValueChange={(v) => setExtra("generoSecundario", v)}
                disabled={isViewMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gênero" />
                </SelectTrigger>
                <SelectContent>
                  {[...GENERO_OPTS]
                    .sort((a, b) =>
                      (GENERO_LABELS[a] ?? a).localeCompare(
                        GENERO_LABELS[b] ?? b,
                        "pt-BR",
                      ),
                    )
                    .map((g) => (
                      <SelectItem key={g} value={g}>
                        {GENERO_LABELS[g] ?? g}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label>
              Idioma *{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (idioma do álbum, título e faixas)
              </span>
            </Label>
            <InfoBox>
              Idioma do álbum, título do álbum e títulos das faixas.
            </InfoBox>
            <Select
              value={formData.idioma}
              onValueChange={(v) => setFormData({ ...formData, idioma: v })}
              disabled={isViewMode}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione o idioma" />
              </SelectTrigger>
              <SelectContent>
                {IDIOMA_OPTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Copyright Info */}
      <Card className="bg-muted/30 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Copyright Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Label */}
          <div className="space-y-2">
            <Label>Gravadora / Selo *</Label>
            <InfoBox>
              Se você é um artista independente, pode usar seu nome artístico
              como selo.
            </InfoBox>
            <Input
              value={formData.gravadora}
              onChange={(e) =>
                setFormData({ ...formData, gravadora: e.target.value })
              }
              placeholder="Nome da gravadora ou selo"
              disabled={isViewMode}
            />
          </div>

          {/* Copyright dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ano de Copyright — Lançamento *</Label>
              <Input
                value={extraFields.copyrightDataLancamento}
                onChange={(e) =>
                  setExtra("copyrightDataLancamento", e.target.value)
                }
                placeholder="Ex: 2026"
                disabled={isViewMode}
                maxLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Ano de Copyright — Gravação *</Label>
              <Input
                value={extraFields.copyrightDataGravacao}
                onChange={(e) =>
                  setExtra("copyrightDataGravacao", e.target.value)
                }
                placeholder="Ex: 2025"
                disabled={isViewMode}
                maxLength={4}
              />
            </div>
          </div>

          {/* Titular */}
          <div className="space-y-2">
            <Label>Titular do Copyright</Label>
            <Input
              value={formData.copyright}
              onChange={(e) =>
                setFormData({ ...formData, copyright: e.target.value })
              }
              placeholder="© 2026 Nome do detentor"
              disabled={isViewMode}
            />
          </div>

          {/* UPC */}
          <div className="space-y-2">
            <Label>Bar Code (UPC)</Label>
            <InfoBox>
              Se você não tiver um código UPC, geraremos um automaticamente.
            </InfoBox>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={extraFields.ownUpc}
                onChange={(e) => setExtra("ownUpc", e.target.checked)}
                disabled={isViewMode}
                className="w-4 h-4 accent-primary"
                data-cy="checkbox-own-upc"
              />
              <span className="text-sm">Tenho meu próprio UPC</span>
            </label>
            {extraFields.ownUpc && (
              <Input
                value={formData.codigoUPC}
                onChange={(e) =>
                  setFormData({ ...formData, codigoUPC: e.target.value })
                }
                placeholder="Digite o código UPC"
                disabled={isViewMode}
                maxLength={14}
                data-cy="input-upc"
              />
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status do Lançamento</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v })}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejado">Planejado</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="analise">Em Análise</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="aguardando_distribuicao">
                  Aguardando Distribuição
                </SelectItem>
                <SelectItem value="ativo">Ativo / Publicado</SelectItem>
                <SelectItem value="programado">Programado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — TRACK UPLOAD
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      {faixas.map((faixa, index) => (
        <Card key={faixa.id} className="bg-muted/30 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {index + 1}. {faixa.titulo || "Nova Faixa"}
              </CardTitle>
              {faixas.length > 1 && !isViewMode && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFaixa(faixa.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label>
                Título da Faixa *{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (máx. 200 caracteres)
                </span>
              </Label>
              <Input
                value={faixa.titulo}
                onChange={(e) => updF(faixa.id, "titulo", e.target.value)}
                placeholder="Nome da música"
                disabled={isViewMode}
                maxLength={200}
                data-cy="input-title"
              />
            </div>

            {/* Alternative version */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={faixa.isVersionAlternativa}
                onChange={(e) =>
                  updF(faixa.id, "isVersionAlternativa", e.target.checked)
                }
                disabled={isViewMode}
                className="w-4 h-4 accent-primary"
                data-cy="checkbox-alternative-version"
              />
              <span className="text-sm">
                Marcar como versão alternativa do lançamento original
              </span>
            </label>

            {faixa.isVersionAlternativa && (
              <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                <Label>Tipo de Versão</Label>
                <InfoBox>
                  <strong>Nota:</strong> Tipos como "New Release", "Original",
                  "Studio", "Official" não estão disponíveis para versões
                  alternativas.
                </InfoBox>
                <Select
                  value={faixa.tipoVersao}
                  onValueChange={(v) => updF(faixa.id, "tipoVersao", v)}
                  disabled={isViewMode}
                >
                  <SelectTrigger
                    className="w-64"
                    data-cy="dropdown-version-type"
                  >
                    <SelectValue placeholder="Selecione o tipo de versão" />
                  </SelectTrigger>
                  <SelectContent>
                    {VERSION_TYPE_OPTS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Album-level artists (read-only display) */}
            {(artistaLabel ||
              extraFields.artistasAdicionaisAlbum.length > 0) && (
              <div className="space-y-2">
                <Label>
                  Artistas do Álbum{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (aparecem em todas as faixas — altere na etapa Album Info)
                  </span>
                </Label>
                <div className="bg-muted/50 border rounded-md p-3 space-y-1">
                  {artistaLabel && (
                    <p className="text-sm">
                      <span className="font-medium">{artistaLabel}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — Main Artist
                      </span>
                    </p>
                  )}
                  {extraFields.artistasAdicionaisAlbum.map((a, i) => (
                    <p key={i} className="text-sm">
                      <span className="font-medium">{a.nome || "—"}</span>
                      <span className="text-muted-foreground"> — {a.role}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Additional artists (track level) */}
            <div className="space-y-2">
              <Label>Adicionar Artistas ou Colaboradores</Label>
              <InfoBox>
                Adicione colaboradores no nível da faixa e selecione o papel.
                Artistas do álbum aparecem automaticamente em todas as faixas.
              </InfoBox>
              <ArtistRows
                entries={faixa.artistasAdicionais}
                roles={ARTIST_ROLES}
                addLabel="Adicionar Artista / Colaborador"
                onAdd={() => addAE(faixa.id, "artistasAdicionais", "Performer")}
                onUpdate={(i, k, v) =>
                  updAE(faixa.id, "artistasAdicionais", i, k, v)
                }
                onRemove={(i) => removeAE(faixa.id, "artistasAdicionais", i)}
                suggestionsListId="artist-ac-list"
              />
            </div>

            {/* Producers */}
            <div className="space-y-2">
              <Label>Produtores & Engenharia</Label>
              <InfoBox>
                Adicione produtores e engenheiros que trabalharam nesta faixa.
              </InfoBox>
              <ArtistRows
                entries={faixa.produtores}
                roles={PRODUCER_ROLES}
                addLabel="Adicionar Produtor / Engenheiro"
                onAdd={() => addAE(faixa.id, "produtores", "Producer")}
                onUpdate={(i, k, v) => updAE(faixa.id, "produtores", i, k, v)}
                onRemove={(i) => removeAE(faixa.id, "produtores", i)}
              />
            </div>

            {/* Songwriters */}
            <div className="space-y-2">
              <Label>Compositores</Label>
              <InfoBox>
                Se todos os membros de uma dupla ou banda são compositores,
                liste-os individualmente.
              </InfoBox>
              {faixa.compositores.map((c, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <Input
                    value={c}
                    onChange={(e) => updComp(faixa.id, i, e.target.value)}
                    placeholder="Nome do compositor"
                    disabled={isViewMode}
                    className="flex-1"
                  />
                  {faixa.compositores.length > 1 && !isViewMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeComp(faixa.id, i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!isViewMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => addComp(faixa.id)}
                >
                  <Plus className="h-4 w-4" /> Adicionar Compositor
                </Button>
              )}
            </div>

            {/* Musicians */}
            <div className="space-y-2">
              <Label>Músicos</Label>
              <InfoBox>
                Adicione os músicos que tocaram nesta faixa e o instrumento
                correspondente.
              </InfoBox>
              {faixa.musicos.map((m, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <Input
                    value={m.nome}
                    onChange={(e) =>
                      updMus(faixa.id, i, "nome", e.target.value)
                    }
                    placeholder="Nome do músico"
                    disabled={isViewMode}
                    className="flex-1"
                  />
                  <Select
                    value={m.instrumento}
                    onValueChange={(v) => updMus(faixa.id, i, "instrumento", v)}
                    disabled={isViewMode}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Instrumento" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTRUMENT_OPTS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMus(faixa.id, i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!isViewMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => addMus(faixa.id)}
                >
                  <Plus className="h-4 w-4" /> Adicionar Músico
                </Button>
              )}
            </div>

            <Separator />

            {/* AI-Assisted Materials — REQUIRED by DSPs */}
            <div className="space-y-2">
              <Label>AI-Assisted Materials *</Label>
              <InfoBox>
                Escolha a opção que melhor descreve o processo criativo desta
                faixa. Declarações incorretas podem causar atrasos ou restrições
                nas DSPs.{" "}
                <a
                  href="#"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Saiba mais sobre classificação de uso de IA
                </a>
              </InfoBox>
              <Select
                value={faixa.aiAssistanceLevel}
                onValueChange={(v) => updF(faixa.id, "aiAssistanceLevel", v)}
                disabled={isViewMode}
              >
                <SelectTrigger data-cy="dropdown-ai-assistance-level">
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent>
                  {AI_ASSISTANCE_OPTS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Lyric info */}
            <div className="space-y-4">
              <Label>Informações de Letra</Label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={faixa.instrumental}
                  onChange={(e) =>
                    updF(faixa.id, "instrumental", e.target.checked)
                  }
                  disabled={isViewMode}
                  className="w-4 h-4 accent-primary"
                  data-cy="checkbox-instrumental-track"
                />
                <span className="text-sm">Faixa Instrumental (sem letra)</span>
              </label>

              {!faixa.instrumental && (
                <>
                  <div className="space-y-2">
                    <Label>Idioma da Faixa *</Label>
                    <Select
                      value={faixa.idioma}
                      onValueChange={(v) => updF(faixa.id, "idioma", v)}
                      disabled={isViewMode}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Selecione o idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        {IDIOMA_OPTS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Letra</Label>
                    <p className="text-xs text-muted-foreground">
                      Separe linhas com Enter. Separe estrofes com uma linha em
                      branco.
                    </p>
                    <Textarea
                      value={faixa.letra}
                      onChange={(e) => updF(faixa.id, "letra", e.target.value)}
                      placeholder="Letra da música..."
                      rows={5}
                      disabled={isViewMode}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Explicit *</Label>
                    <Select
                      value={faixa.explicit}
                      onValueChange={(v) => updF(faixa.id, "explicit", v)}
                      disabled={isViewMode}
                    >
                      <SelectTrigger
                        className="w-48"
                        data-cy="dropdown-explicit"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPLICIT_OPTS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* ISRC */}
            <div className="space-y-2">
              <Label>
                ISRC{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                value={faixa.isrc}
                onChange={(e) =>
                  updF(faixa.id, "isrc", e.target.value.toUpperCase())
                }
                placeholder="BR-ABC-26-00001"
                disabled={isViewMode}
                className="w-48 font-mono uppercase"
                maxLength={15}
                data-cy="input-isrc"
              />
            </div>

            {/* Artista da faixa */}
            <div className="space-y-2">
              <Label>
                Nome do Artista na Faixa{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (se diferente do artista principal)
                </span>
              </Label>
              <Input
                value={faixa.artista}
                onChange={(e) => updF(faixa.id, "artista", e.target.value)}
                placeholder="Nome do artista"
                disabled={isViewMode}
              />
            </div>

            {/* Audio upload */}
            <div className="space-y-2">
              <Label>Arquivo de Áudio</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={() =>
                  !isViewMode &&
                  document.getElementById(`audio-${faixa.id}`)?.click()
                }
              >
                <p className="text-sm text-muted-foreground">
                  WAV (recomendado) ou MP3 — máx. 25 MB
                </p>
                {faixa.arquivoAudio ? (
                  <p className="text-sm text-foreground mt-2 font-medium">
                    {faixa.arquivoAudio.name}
                  </p>
                ) : (
                  !isViewMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-2"
                    >
                      <Upload className="h-4 w-4" /> Selecionar Áudio
                    </Button>
                  )
                )}
                <input
                  id={`audio-${faixa.id}`}
                  type="file"
                  accept=".mp3,.wav"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) updF(faixa.id, "arquivoAudio", f);
                  }}
                  disabled={isViewMode}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {!isViewMode && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={addFaixa}
        >
          <Plus className="h-4 w-4" /> Adicionar Faixa
        </Button>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — ALBUM ART
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Upload da Arte do Álbum</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Preview */}
          <div className="shrink-0">
            <div className="w-44 h-44 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
              {capaPrincipal ? (
                <img
                  src={URL.createObjectURL(capaPrincipal)}
                  alt="Capa"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
              )}
            </div>
          </div>

          {/* Requirements + Upload */}
          <div className="flex-1 space-y-4">
            <div>
              <p className="font-semibold text-sm mb-2">Requisitos de Upload</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                <li>
                  Formato: <strong>JPG, PNG</strong> (WebP não aceito)
                </li>
                <li>
                  Tamanho mínimo: <strong>3000 × 3000 pixels</strong>
                </li>
                <li>
                  Tamanho máximo do arquivo: <strong>35 MB</strong>
                </li>
                <li>
                  Modo de cor: <strong>RGB</strong> (incluindo preto e branco)
                </li>
                <li>
                  Resolução: <strong>72 dpi</strong>
                </li>
                <li>
                  A capa <strong>não pode conter</strong> logotipos, URLs, datas
                  de lançamento ou anúncios de qualquer tipo.
                </li>
              </ul>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() =>
                !isViewMode &&
                document.getElementById("capa-principal")?.click()
              }
            >
              {capaPrincipal ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-sm font-medium">{capaPrincipal.name}</p>
                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCapaPrincipal(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    Clique para selecionar ou arraste e solte
                  </p>
                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" /> Selecionar Capa
                    </Button>
                  )}
                </>
              )}
            </div>

            <input
              id="capa-principal"
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCapaPrincipal(f);
              }}
              disabled={isViewMode}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — DISTRIBUTION PREFERENCES
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep3 = () => {
    const StoreRow = ({ name }: { name: string }) => {
      const checked = extraFields.lojasSelecionadas.includes(name);
      return (
        <label
          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors
            ${
              checked
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:bg-muted/40"
            }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => !isViewMode && toggleStore(name)}
              disabled={isViewMode}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm">{name}</span>
          </div>
          {checked && (
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          )}
        </label>
      );
    };

    const allEssentials = STORES_ESSENTIALS.every((s) =>
      extraFields.lojasSelecionadas.includes(s),
    );

    return (
      <div className="space-y-6">
        {/* Distribuidora */}
        <Card className="bg-muted/30 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribuidora *</CardTitle>
            <CardDescription>
              Selecione a distribuidora para envio às plataformas digitais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectedDistributors.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Nenhuma distribuidora conectada. Configure em{" "}
                <span className="font-medium text-foreground">
                  Configurações &gt; Integrações
                </span>
                .
              </div>
            ) : (
              <Select
                value={formData.distribuidora}
                onValueChange={(v) =>
                  setFormData({ ...formData, distribuidora: v })
                }
                disabled={isViewMode}
              >
                <SelectTrigger data-testid="select-distribuidora">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-primary" />
                    <SelectValue placeholder="Selecione uma distribuidora conectada" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {connectedDistributors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(() => {
              const sel = DISTRIBUTORS.find(
                (d) => d.id === formData.distribuidora,
              );
              const conn = sel ? distributorConnections[sel.id] : null;
              if (!sel) return null;
              return (
                <div className="border border-border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Music className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{sel.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {sel.description}
                      </p>
                      {conn?.username && (
                        <p className="text-xs text-muted-foreground">
                          Conta: {conn.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> Conectado
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Release Preferences */}
        <Card className="bg-muted/30 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Preferências de Lançamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Territory */}
            <div className="space-y-2">
              <Label>Território</Label>
              <Select
                value={extraFields.territory}
                onValueChange={(v) => setExtra("territory", v)}
                disabled={isViewMode}
              >
                <SelectTrigger className="w-72" data-cy="dropdown-territory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="world">World (Global)</SelectItem>
                  <SelectItem value="br">Brasil</SelectItem>
                  <SelectItem value="us">Estados Unidos</SelectItem>
                  <SelectItem value="latam">América Latina</SelectItem>
                  <SelectItem value="eu">Europa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Info box */}
            <InfoBox>
              <strong>Data de Lançamento:</strong> Defina com pelo menos 21 dias
              de antecedência para anunciar o lançamento, compartilhar o
              pré-save e fazer o pitching para playlists.
              <br />
              <br />
              <strong>Hora:</strong> O lançamento estará disponível a partir de
              00h em cada território.
              <br />
              <br />
              <strong>Importante:</strong> A Apple não permite lançamentos com
              hora agendada — seu álbum estará disponível à 00h em cada país no
              Apple Music e iTunes.
            </InfoBox>

            {/* Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Lançamento</Label>
                <DatePickerField
                  value={formData.dataLancamento}
                  onChange={(iso) =>
                    setFormData({ ...formData, dataLancamento: iso })
                  }
                  disabled={isViewMode}
                  placeholder="MM/DD/YYYY"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Hora de Lançamento{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (opcional)
                  </span>
                </Label>
                <Input
                  type="time"
                  value={extraFields.releaseTime}
                  onChange={(e) => setExtra("releaseTime", e.target.value)}
                  disabled={isViewMode}
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label>
                Fuso Horário{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Select
                value={extraFields.releaseTimezone}
                onValueChange={(v) => setExtra("releaseTimezone", v)}
                disabled={isViewMode}
              >
                <SelectTrigger
                  className="w-full max-w-md"
                  data-cy="dropdown-release-timezone"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pre-order */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extraFields.preOrder}
                  onChange={(e) => setExtra("preOrder", e.target.checked)}
                  disabled={isViewMode}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium">Pre-order</span>
              </label>
              {extraFields.preOrder && (
                <label className="flex items-center gap-2 cursor-pointer pl-6">
                  <input
                    type="checkbox"
                    checked={extraFields.noPreviewsDuringPreOrder}
                    onChange={(e) =>
                      setExtra("noPreviewsDuringPreOrder", e.target.checked)
                    }
                    disabled={isViewMode}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">
                    Sem prévias durante o pré-lançamento
                  </span>
                </label>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <Label>Precificação</Label>
              <InfoBox>Instruções de precificação.</InfoBox>
              <Select
                value={extraFields.pricing}
                onValueChange={(v) => setExtra("pricing", v)}
                disabled={isViewMode}
              >
                <SelectTrigger className="w-48" data-cy="dropdown-pricing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_OPTS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Store Distribution */}
        <Card className="bg-muted/30 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribuição nas Lojas</CardTitle>
            <CardDescription>
              As lojas são baseadas no território selecionado. Todas
              selecionadas por padrão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Essentials */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-sm">Essentials</h5>
                {!isViewMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() =>
                      toggleStoreGroup(STORES_ESSENTIALS, !allEssentials)
                    }
                  >
                    {allEssentials ? "Desmarcar todas" : "Selecionar todas"}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STORES_ESSENTIALS.map((s) => (
                  <StoreRow key={s} name={s} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Neighbouring Rights */}
            <div>
              <h5 className="font-semibold text-sm mb-3">
                Neighbouring Rights
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STORES_NEIGHBOURING.map((s) => (
                  <StoreRow key={s} name={s} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Ringtone Stores */}
            <div>
              <h5 className="font-semibold text-sm mb-3">Ringtone Stores</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STORES_RINGTONES.map((s) => (
                  <StoreRow key={s} name={s} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-muted/30 border-border">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <Label>Notas de Distribuição</Label>
              <Textarea
                value={formData.notasDistribuicao ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notasDistribuicao: e.target.value,
                  })
                }
                placeholder="Notas especiais (ex: data preferencial, territórios, exclusividades...)"
                rows={3}
                disabled={isViewMode}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4 — PREVIEW / DISTRIBUTE
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep4 = () => {
    const artistaNome =
      artistaLabel || (extraFields.variosArtistas ? "Various Artists" : "—");

    const warnings: string[] = [];
    if (!formData.titulo.trim()) warnings.push("Título do lançamento ausente.");
    if (!extraFields.variosArtistas && !formData.artista_id)
      warnings.push("Artista principal não selecionado.");
    if (!formData.genero) warnings.push("Gênero principal não informado.");
    if (!extraFields.generoSecundario)
      warnings.push("Gênero secundário não informado.");
    if (!formData.gravadora) warnings.push("Gravadora / Selo não informado.");
    if (!extraFields.copyrightDataLancamento)
      warnings.push("Ano de copyright (lançamento) ausente.");
    if (!extraFields.copyrightDataGravacao)
      warnings.push("Ano de copyright (gravação) ausente.");
    if (!capaPrincipal) warnings.push("Capa do álbum não enviada.");
    if (!formData.dataLancamento)
      warnings.push("Data de lançamento não definida.");
    faixas.forEach((f, i) => {
      if (!f.titulo.trim()) warnings.push(`Faixa ${i + 1}: título ausente.`);
      if (!f.aiAssistanceLevel)
        warnings.push(`Faixa ${i + 1}: AI-Assisted Materials não declarado.`);
    });

    return (
      <div className="space-y-6">
        <Card className="bg-muted/30 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prévia do Lançamento</CardTitle>
            <CardDescription>
              Aqui está como seu álbum será exibido nas plataformas. Caso veja
              erros, volte às etapas anteriores para editar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 mb-4">
              <div className="shrink-0">
                {capaPrincipal ? (
                  <img
                    src={URL.createObjectURL(capaPrincipal)}
                    alt="Capa"
                    className="w-36 h-36 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-lg border border-border bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-xl font-bold">
                    {formData.titulo || "—"}
                    {formData.tipo ? ` — ${formData.tipo.toUpperCase()}` : ""}
                  </h3>
                  <p className="text-muted-foreground">por {artistaNome}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Gravadora:</span>
                  <span>{formData.gravadora || "—"}</span>

                  <span className="text-muted-foreground">Gêneros:</span>
                  <span>
                    {[
                      GENERO_LABELS[formData.genero] ?? formData.genero,
                      GENERO_LABELS[extraFields.generoSecundario] ??
                        extraFields.generoSecundario,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </span>

                  <span className="text-muted-foreground">
                    Data de Lançamento:
                  </span>
                  <span>{formData.dataLancamento || "—"}</span>

                  {extraFields.releaseTime && (
                    <>
                      <span className="text-muted-foreground">Hora:</span>
                      <span>{extraFields.releaseTime}</span>
                    </>
                  )}

                  <span className="text-muted-foreground">Fuso horário:</span>
                  <span>
                    {TIMEZONE_OPTS.find(
                      (t) => t.value === extraFields.releaseTimezone,
                    )?.label ?? extraFields.releaseTimezone}
                  </span>

                  <span className="text-muted-foreground">Território:</span>
                  <span>{extraFields.territory}</span>

                  <span className="text-muted-foreground">Lojas:</span>
                  <span>
                    {extraFields.lojasSelecionadas.length} selecionadas
                  </span>

                  {formData.codigoUPC && (
                    <>
                      <span className="text-muted-foreground">UPC:</span>
                      <span className="font-mono">{formData.codigoUPC}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Track list */}
            <div className="space-y-1">
              {faixas.map((f, i) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <span className="text-muted-foreground text-sm w-5 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {f.titulo || "Sem título"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {f.artista || artistaNome}
                    </p>
                  </div>
                  {f.isrc && (
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {f.isrc}
                    </span>
                  )}
                  {f.explicit === "yes" && (
                    <span className="text-xs border border-border rounded px-1 shrink-0">
                      E
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Copyright lines */}
            {(extraFields.copyrightDataLancamento ||
              extraFields.copyrightDataGravacao) && (
              <>
                <Separator className="my-3" />
                <div className="text-xs text-muted-foreground space-y-1">
                  {extraFields.copyrightDataLancamento && (
                    <p>
                      © {extraFields.copyrightDataLancamento}{" "}
                      {formData.gravadora || formData.copyright}
                    </p>
                  )}
                  {extraFields.copyrightDataGravacao && (
                    <p>
                      ℗ {extraFields.copyrightDataGravacao}{" "}
                      {formData.gravadora || formData.copyright}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Validation summary */}
        {warnings.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Tudo certo! O lançamento está pronto para ser criado.
          </div>
        ) : (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {warnings.length} alerta(s) encontrado(s):
            </div>
            {warnings.map((w, i) => (
              <p
                key={i}
                className="text-xs text-yellow-700 dark:text-yellow-400 pl-6"
              >
                • {w}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const stepContent = [
    renderStep0,
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Novo Lançamento"
              : mode === "edit"
                ? "Editar Lançamento"
                : "Detalhes do Lançamento"}
          </DialogTitle>
        </DialogHeader>

        <StepIndicator current={currentStep} />

        <div>{stepContent[currentStep]?.()}</div>

        <DialogFooter className="mt-6 flex flex-row justify-between sm:justify-between gap-2">
          {/* Back / Cancel */}
          <Button
            type="button"
            variant="outline"
            className="gap-1"
            onClick={currentStep === 0 ? () => onOpenChange(false) : handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 0 ? "Cancelar" : STEPS[currentStep - 1]}
          </Button>

          {/* Next / Submit */}
          <div className="flex gap-2">
            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext} className="gap-1">
                {STEPS[currentStep + 1]}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : !isViewMode ? (
              <Button
                type="button"
                onClick={handleSubmit}
                className="bg-primary hover:bg-primary/90"
              >
                {mode === "create" ? "Criar Lançamento" : "Salvar Alterações"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
