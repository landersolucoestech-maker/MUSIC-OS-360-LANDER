import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import {
  Upload, FileText, X, Plus, ChevronDown, ChevronUp, Users, DollarSign,
  Music, FileSignature, Palette, Eye, Settings2, AlignLeft, Search,
  AlertCircle,
} from "lucide-react";
import type { ContractServiceType, ContractServiceTypeInsert, ClientType, FinancialModel } from "@/modules/contracts/hooks/useContractServiceTypes";
import type { Participant, ParticipantRole, EntityType, MusicWork, SignatureSettings, BrandingSettings } from "@/modules/contracts/types/contracts.types";
import {
  generateParticipantVariables, resolveAllVariables, SYSTEM_VARIABLES,
  PARTICIPANT_ROLE_OPTIONS, ROLE_LABELS, CATEGORY_LABELS,
} from "@/modules/contracts/utils/contract-variables";

const ACCEPT_DOCS = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
const ACCEPT_IMG = ".png,.jpg,.jpeg,.webp";

interface Clausula {
  id: string;
  titulo: string;
  conteudo: string;
  order: number;
}

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório (mín. 2 caracteres)"),
  slug: z.string().min(2, "Slug obrigatório").regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e _"),
  description: z.string().optional(),
  category: z.string().optional(),
  client_types: z.array(z.enum(["artista", "pessoa_fisica", "pessoa_juridica"])).min(1, "Selecione ao menos um tipo de cliente"),
  financial_model: z.enum(["valor_fixo", "royalties", "misto", "recorrente"]),
  requires_royalties: z.boolean(),
  requires_fixed_value: z.boolean(),
  requires_advance: z.boolean(),
  requires_financial_support: z.boolean(),
  allow_installments: z.boolean(),
  default_financial_category: z.string().optional(),
  active: z.boolean(),
  sort_order: z.number().int().min(1),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).refine(
  (d) => {
    if (d.start_date && d.end_date) return d.start_date <= d.end_date;
    return true;
  },
  { message: "Data de término deve ser após a data de início", path: ["end_date"] },
);

type FormValues = z.infer<typeof schema>;

interface ServiceTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceType: ContractServiceType | null;
  onSave: (data: ContractServiceTypeInsert) => void;
  existingSlugs: string[];
}

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const CONTRACT_CATEGORIES = ["Agenciamento", "Distribuição", "Produção", "Licenciamento", "Publicação", "Gravação", "Outros"];
const MUSIC_GENRES = ["Sertanejo", "Forró", "Funk", "Pagode/Samba", "Axé", "MPB", "Rock", "Pop", "Gospel", "Eletrônico", "Hip Hop", "Jazz", "Clássico", "Outro"];
const MUSIC_LANGUAGES = ["Português", "Inglês", "Espanhol", "Francês", "Outro"];
const MUSIC_PLATFORMS = ["Spotify", "Apple Music", "YouTube Music", "Deezer", "Tidal", "Amazon Music", "Napster", "SoundCloud", "Outros"];
const FONT_OPTIONS = ["Plus Jakarta Sans", "Arial", "Times New Roman", "Georgia", "Helvetica"];

const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: "artista", label: "Artista" },
  { value: "pessoa_fisica", label: "Pessoa Física" },
  { value: "pessoa_juridica", label: "Pessoa Jurídica" },
];

const FINANCIAL_CHECKBOXES: { key: "requires_royalties" | "requires_fixed_value" | "requires_advance" | "requires_financial_support" | "allow_installments"; label: string }[] = [
  { key: "requires_royalties", label: "Royalties (%)" },
  { key: "requires_fixed_value", label: "Valor Fixo (R$)" },
  { key: "requires_advance", label: "Adiantamento (R$)" },
  { key: "requires_financial_support", label: "Suporte Financeiro Mensal (R$)" },
  { key: "allow_installments", label: "Permite parcelamento" },
];

const DEFAULT_MUSIC_WORK: MusicWork = {
  title: "", isrc: "", upc: "", genre: "", language: "", releaseDate: "", platforms: [], distributionType: "",
};
const DEFAULT_SIGNATURE: SignatureSettings = {
  enabled: false, signatureOrder: [], requireWitnesses: false, provider: "", auditTrail: false,
};
const DEFAULT_BRANDING: BrandingSettings = {
  headerImageUrl: null, footerImageUrl: null, logoUrl: null,
  watermarkEnabled: false, watermarkText: "", textAlignment: "justify",
  fontFamily: "Plus Jakarta Sans", pageNumbers: true,
  marginTop: 25, marginBottom: 25, marginLeft: 30, marginRight: 25,
};

function parseClausulasFromContent(content: string): Clausula[] {
  if (!content?.trim()) return [];
  const lines = content.split("\n");
  const result: Clausula[] = [];
  let current: Clausula | null = null;
  for (const line of lines) {
    if (line.match(/^CLÁUSULA|^Cláusula|^\d+\./)) {
      if (current) result.push(current);
      current = { id: crypto.randomUUID(), titulo: line.trim(), conteudo: "", order: result.length + 1 };
    } else if (current) {
      current.conteudo += line + "\n";
    }
  }
  if (current) result.push(current);
  if (result.length === 0 && content.trim()) {
    return [{ id: crypto.randomUUID(), titulo: "", conteudo: content.trim(), order: 1 }];
  }
  return result;
}

function VariableAutocomplete({
  variables, onInsert, open, onOpenChange, search, onSearchChange,
}: {
  variables: ReturnType<typeof resolveAllVariables>;
  onInsert: (key: string) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const categories = Object.keys(CATEGORY_LABELS);
  const filtered = variables.filter(
    (v) => !search || v.label.toLowerCase().includes(search.toLowerCase()) || v.key.toLowerCase().includes(search.toLowerCase()),
  );
  const grouped = categories.reduce<Record<string, typeof filtered>>((acc, cat) => {
    const items = filtered.filter((v) => v.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className="hidden" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start" side="bottom">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar variável..."
            className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-56">
          {Object.entries(grouped).map(([cat, vars]) => (
            <div key={cat} className="mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1">
                {CATEGORY_LABELS[cat]}
              </p>
              {vars.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => { onInsert(v.key); onOpenChange(false); onSearchChange(""); }}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-primary shrink-0 mt-0.5">{`{{${v.key}}}`}</span>
                    <div className="min-w-0">
                      <p className="text-foreground truncate leading-tight">{v.label}</p>
                      {(v.description || v.example) && (
                        <p className="text-muted-foreground text-[10px] leading-tight truncate">
                          {v.description ? v.description : `Ex: ${v.example}`}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma variável encontrada</p>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function TabErrorDot() {
  return <span className="ml-1 h-1.5 w-1.5 rounded-full bg-destructive inline-block align-middle" />;
}

export function ServiceTypeFormModal({ open, onOpenChange, serviceType, onSave, existingSlugs }: ServiceTypeFormModalProps) {
  const isEditing = !!serviceType;

  const [activeTab, setActiveTab] = useState("geral");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newPartRole, setNewPartRole] = useState<ParticipantRole>("CONTRATANTE");
  const [newPartEntity, setNewPartEntity] = useState<EntityType>("pessoa_fisica");
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [participantError, setParticipantError] = useState("");

  const [clausulas, setClausulas] = useState<Clausula[]>([]);
  const [clausulaErrors, setClausulaErrors] = useState<Record<string, string>>({});
  const [activeClausulaId, setActiveClausulaId] = useState<string | null>(null);
  const [varPopoverOpen, setVarPopoverOpen] = useState(false);
  const [varSearch, setVarSearch] = useState("");
  const clausulaTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const [musicWork, setMusicWork] = useState<MusicWork>(DEFAULT_MUSIC_WORK);
  const [signatureSettings, setSignatureSettings] = useState<SignatureSettings>(DEFAULT_SIGNATURE);
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);

  const [financialCurrency, setFinancialCurrency] = useState("BRL");
  const [financialFrequency, setFinancialFrequency] = useState<"unico" | "mensal" | "trimestral" | "anual">("unico");
  const [financialPenalty, setFinancialPenalty] = useState<string>("");
  const [financialInterest, setFinancialInterest] = useState<string>("");
  const [financialDueDays, setFinancialDueDays] = useState<string>("");

  const headerRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const allVariables = resolveAllVariables(participants);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", slug: "", description: "", category: "",
      client_types: ["artista"], financial_model: "valor_fixo",
      requires_royalties: false, requires_fixed_value: true,
      requires_advance: false, requires_financial_support: false,
      allow_installments: false, default_financial_category: "",
      active: true, sort_order: 1, start_date: "", end_date: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setParticipantError("");
    setClausulaErrors({});
    if (serviceType) {
      form.reset({
        name: serviceType.name, slug: serviceType.slug,
        description: serviceType.description ?? "", category: serviceType.category ?? "",
        client_types: serviceType.client_types as ClientType[],
        financial_model: serviceType.financial_model as FinancialModel,
        requires_royalties: serviceType.requires_royalties,
        requires_fixed_value: serviceType.requires_fixed_value,
        requires_advance: serviceType.requires_advance,
        requires_financial_support: serviceType.requires_financial_support,
        allow_installments: serviceType.allow_installments,
        default_financial_category: serviceType.default_financial_category ?? "",
        active: serviceType.active, sort_order: serviceType.sort_order,
        start_date: "", end_date: "",
      });
      setParticipants(serviceType.participants ?? []);
      setClausulas(parseClausulasFromContent(serviceType.conteudo ?? ""));
      setMusicWork(serviceType.music_work ?? DEFAULT_MUSIC_WORK);
      setSignatureSettings(serviceType.signature_settings ?? DEFAULT_SIGNATURE);
      setBranding(serviceType.branding_settings ?? { ...DEFAULT_BRANDING, headerImageUrl: serviceType.header_image_url, footerImageUrl: serviceType.footer_image_url });
      setFinancialCurrency(serviceType.financial_currency ?? "BRL");
      setFinancialFrequency((serviceType.financial_payment_frequency as typeof financialFrequency) ?? "unico");
      setFinancialPenalty(serviceType.financial_penalty_percentage != null ? String(serviceType.financial_penalty_percentage) : "");
      setFinancialInterest(serviceType.financial_interest_percentage != null ? String(serviceType.financial_interest_percentage) : "");
      setFinancialDueDays(serviceType.financial_due_days != null ? String(serviceType.financial_due_days) : "");
      setAdvancedOpen(true);
    } else {
      form.reset({ name: "", slug: "", description: "", category: "", client_types: ["artista"], financial_model: "valor_fixo", requires_royalties: false, requires_fixed_value: true, requires_advance: false, requires_financial_support: false, allow_installments: false, default_financial_category: "", active: true, sort_order: 1, start_date: "", end_date: "" });
      setParticipants([]); setClausulas([]);
      setMusicWork(DEFAULT_MUSIC_WORK); setSignatureSettings(DEFAULT_SIGNATURE); setBranding(DEFAULT_BRANDING);
      setFinancialCurrency("BRL"); setFinancialFrequency("unico");
      setFinancialPenalty(""); setFinancialInterest(""); setFinancialDueDays("");
      setAdvancedOpen(false);
    }
    setActiveTab("geral");
    setShowAddParticipant(false);
  }, [open, serviceType, form]);

  const nameValue = form.watch("name");
  useEffect(() => {
    if (!isEditing) form.setValue("slug", slugify(nameValue || ""));
  }, [nameValue, isEditing, form]);

  const clientTypes = form.watch("client_types");
  const toggleClientType = (ct: ClientType) => {
    const current = form.getValues("client_types");
    if (current.includes(ct)) {
      if (current.length === 1) return;
      form.setValue("client_types", current.filter((c) => c !== ct));
    } else {
      form.setValue("client_types", [...current, ct]);
    }
  };

  const buildConteudo = () => clausulas.map((c) => `${c.titulo}\n${c.conteudo.trim()}`).join("\n\n");

  const validateExtraState = (): boolean => {
    let valid = true;

    if (participants.length === 0) {
      setParticipantError("Adicione ao menos 1 participante ao contrato.");
      valid = false;
    } else {
      setParticipantError("");
    }

    const clausErrors: Record<string, string> = {};
    if (clausulas.length === 0) {
      clausErrors["__empty"] = "Adicione ao menos 1 cláusula ao contrato.";
    } else {
      for (const c of clausulas) {
        if (!c.titulo.trim()) clausErrors[c.id] = "Título da cláusula é obrigatório.";
        else if (!c.conteudo.trim()) clausErrors[c.id] = "Conteúdo da cláusula não pode estar vazio.";
      }
    }
    setClausulaErrors(clausErrors);
    if (Object.keys(clausErrors).length > 0) valid = false;

    return valid;
  };

  const handleSubmit = form.handleSubmit((values) => {
    if (existingSlugs.includes(values.slug)) {
      form.setError("slug", { message: "Já existe um tipo com este slug" });
      setActiveTab("geral");
      setAdvancedOpen(true);
      return;
    }

    const extraValid = validateExtraState();

    if (!extraValid) {
      if (participantError || participants.length === 0) { setActiveTab("envolvidos"); return; }
      if (Object.keys(clausulaErrors).length > 0) { setActiveTab("clausulas"); return; }
      return;
    }

    onSave({
      ...values,
      description: values.description || null,
      category: values.category || null,
      default_financial_category: values.default_financial_category || null,
      header_image_url: branding.headerImageUrl,
      footer_image_url: branding.footerImageUrl,
      conteudo: buildConteudo(),
      participants,
      variables: allVariables,
      music_work: musicWork,
      signature_settings: signatureSettings,
      branding_settings: branding,
      financial_currency: financialCurrency,
      financial_payment_frequency: financialFrequency,
      financial_penalty_percentage: financialPenalty ? Number(financialPenalty) : null,
      financial_interest_percentage: financialInterest ? Number(financialInterest) : null,
      financial_due_days: financialDueDays ? Number(financialDueDays) : null,
    });
  });

  const addParticipant = () => {
    const vars = generateParticipantVariables(newPartRole, newPartEntity);
    setParticipants((prev) => [...prev, { id: crypto.randomUUID(), role: newPartRole, entityType: newPartEntity, variables: vars }]);
    setParticipantError("");
    setShowAddParticipant(false);
    setNewPartRole("CONTRATANTE");
    setNewPartEntity("pessoa_fisica");
  };

  const moveParticipant = (idx: number, dir: -1 | 1) => {
    setParticipants((prev) => {
      const copy = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= copy.length) return prev;
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter((ev.target?.result as string) ?? null);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const insertVariable = (key: string) => {
    if (!activeClausulaId) return;
    const el = clausulaTextareaRefs.current[activeClausulaId];
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = clausulas.find((c) => c.id === activeClausulaId)?.conteudo ?? "";
    const before = current.substring(0, start);
    const after = current.substring(end);
    const lastBraces = before.lastIndexOf("{{");
    const insertion = `{{${key}}}`;
    const newContent = lastBraces >= 0 && !before.substring(lastBraces).includes("}}")
      ? before.substring(0, lastBraces) + insertion + after
      : before + insertion + after;
    setClausulas((prev) => prev.map((c) => c.id === activeClausulaId ? { ...c, conteudo: newContent } : c));
    setTimeout(() => {
      const pos = (lastBraces >= 0 && !before.substring(lastBraces).includes("}}") ? lastBraces : start) + insertion.length;
      el.setSelectionRange(pos, pos);
      el.focus();
    }, 0);
  };

  const highlightVariables = (text: string, validKeys: Set<string>) => {
    if (!text) return null;
    const parts = text.split(/({{[^}]+}})/g);
    return parts.map((part, i) => {
      const match = part.match(/^{{([^}]+)}}$/);
      if (!match) return <span key={i}>{part}</span>;
      const key = match[1];
      const valid = validKeys.has(key);
      return (
        <span key={i} className={`rounded px-0.5 font-mono text-[11px] ${valid ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          {part}
        </span>
      );
    });
  };

  const validKeys = new Set(allVariables.map((v) => v.key));

  const formErrors = form.formState.errors;
  const tabHasError: Record<string, boolean> = {
    geral: !!(formErrors.name || formErrors.slug || formErrors.client_types || formErrors.start_date || formErrors.end_date),
    envolvidos: participants.length === 0 || !!participantError,
    financeiro: false,
    obra: false,
    clausulas: Object.keys(clausulaErrors).length > 0,
    assinaturas: false,
    branding: false,
    preview: false,
  };

  const sectionLabel = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

  const TAB_CONFIG = [
    { value: "geral", label: "Geral", icon: Settings2 },
    { value: "envolvidos", label: "Envolvidos", icon: Users },
    { value: "financeiro", label: "Financeiro", icon: DollarSign },
    { value: "obra", label: "Obra Musical", icon: Music },
    { value: "clausulas", label: "Cláusulas", icon: FileText },
    { value: "assinaturas", label: "Assinaturas", icon: FileSignature },
    { value: "branding", label: "Branding", icon: Palette },
    { value: "preview", label: "Preview", icon: Eye },
  ];

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
            <DialogTitle>{isEditing ? "Editar Tipo de Contrato" : "Novo Tipo de Contrato"}</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 pt-3 pb-0 shrink-0 border-b border-border">
              <TabsList className="h-9 gap-0 bg-transparent border-0 p-0 overflow-x-auto w-full justify-start">
                {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground text-xs px-3 gap-1.5"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {tabHasError[value] && <TabErrorDot />}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="px-6 py-4 space-y-4">

                  {/* ── Tab 1: Informações Gerais ── */}
                  <TabsContent value="geral" className="mt-0 space-y-4">
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className={sectionLabel}>Identificação</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome *</Label>
                          <Input id="name" {...form.register("name")} placeholder="Ex: Agenciamento Artístico" data-testid="input-type-name" />
                          {formErrors.name && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{formErrors.name.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tipo de Contrato *</Label>
                            <Select
                              value={form.watch("financial_model")}
                              onValueChange={(v) => form.setValue("financial_model", v as FinancialModel)}
                            >
                              <SelectTrigger data-testid="select-financial-model">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="valor_fixo">Valor Fixo</SelectItem>
                                <SelectItem value="royalties">Royalties</SelectItem>
                                <SelectItem value="misto">Misto</SelectItem>
                                <SelectItem value="recorrente">Recorrente</SelectItem>
                              </SelectContent>
                            </Select>
                            {formErrors.financial_model && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />{formErrors.financial_model.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={form.watch("category") || ""} onValueChange={(v) => form.setValue("category", v)}>
                              <SelectTrigger data-testid="select-category"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {CONTRACT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Descrição</Label>
                          <Textarea id="description" {...form.register("description")} placeholder="Descreva o tipo de contrato..." rows={3} data-testid="textarea-type-description" />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipos de Cliente *</Label>
                          <div className="flex flex-wrap gap-4">
                            {CLIENT_TYPES.map((ct) => (
                              <div key={ct.value} className="flex items-center gap-2">
                                <Checkbox id={`ct-${ct.value}`} checked={clientTypes.includes(ct.value)} onCheckedChange={() => toggleClientType(ct.value)} data-testid={`checkbox-client-type-${ct.value}`} />
                                <Label htmlFor={`ct-${ct.value}`} className="font-normal cursor-pointer">{ct.label}</Label>
                              </div>
                            ))}
                          </div>
                          {formErrors.client_types && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{formErrors.client_types.message}</p>}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3"><CardTitle className={sectionLabel}>Vigência Padrão</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="start_date">Data de Início Padrão</Label>
                            <Input id="start_date" type="date" {...form.register("start_date")} data-testid="input-start-date" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="end_date">Data de Término Padrão</Label>
                            <Input id="end_date" type="date" {...form.register("end_date")} data-testid="input-end-date" />
                            {formErrors.end_date && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />{formErrors.end_date.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Datas pré-preenchidas ao criar um contrato deste tipo. A data de início deve ser anterior à data de término.</p>
                      </CardContent>
                    </Card>

                    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="pb-3 cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg">
                            <div className="flex items-center justify-between">
                              <CardTitle className={sectionLabel}>Configurações Avançadas</CardTitle>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="slug">Slug (identificador único)</Label>
                                <Input id="slug" {...form.register("slug")} placeholder="agenciamento_artistico" data-testid="input-type-slug" />
                                <p className="text-xs text-muted-foreground">Gerado automaticamente. Apenas letras minúsculas, números e _.</p>
                                {formErrors.slug && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{formErrors.slug.message}</p>}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="sort_order">Ordem de exibição</Label>
                                <Input id="sort_order" type="number" min={1} {...form.register("sort_order", { valueAsNumber: true })} data-testid="input-sort-order" />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox id="active" checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", !!v)} data-testid="checkbox-active" />
                              <Label htmlFor="active" className="font-normal cursor-pointer">Ativo</Label>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </TabsContent>

                  {/* ── Tab 2: Envolvidos ── */}
                  <TabsContent value="envolvidos" className="mt-0 space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className={sectionLabel}>Participantes do Contrato</CardTitle>
                          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setShowAddParticipant((v) => !v)}>
                            <Plus className="h-4 w-4" />Adicionar Envolvido
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {participantError && (
                          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {participantError}
                          </div>
                        )}

                        {showAddParticipant && (
                          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                            <p className="text-sm font-medium">Novo Participante</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Função / Role</Label>
                                <Select value={newPartRole} onValueChange={(v) => setNewPartRole(v as ParticipantRole)}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {PARTICIPANT_ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Tipo de Entidade</Label>
                                <div className="flex gap-2">
                                  {(["pessoa_fisica", "pessoa_juridica"] as EntityType[]).map((et) => (
                                    <button
                                      key={et}
                                      type="button"
                                      onClick={() => setNewPartEntity(et)}
                                      className={`flex-1 h-9 rounded-md border text-xs transition-colors ${newPartEntity === et ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-border/80"}`}
                                    >
                                      {et === "pessoa_fisica" ? "Pessoa Física" : "Pessoa Jurídica"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddParticipant(false)}>Cancelar</Button>
                              <Button type="button" size="sm" onClick={addParticipant}>Confirmar</Button>
                            </div>
                          </div>
                        )}

                        {participants.length === 0 && !showAddParticipant ? (
                          <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                            Nenhum participante adicionado. Clique em "Adicionar Envolvido" para começar.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {participants.map((p, idx) => (
                              <div key={p.id} className="rounded-lg border border-border p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{ROLE_LABELS[p.role]}</span>
                                    <Badge variant="secondary" className="text-xs">{p.entityType === "pessoa_fisica" ? "PF" : "PJ"}</Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => moveParticipant(idx, -1)} disabled={idx === 0}><ChevronUp className="h-3.5 w-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => moveParticipant(idx, 1)} disabled={idx === participants.length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setParticipants((prev) => prev.filter((x) => x.id !== p.id))}><X className="h-3.5 w-3.5" /></Button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {p.variables.slice(0, 6).map((v) => (
                                    <Badge key={v.key} variant="outline" className="font-mono text-[10px] font-normal">{`{{${v.key}}}`}</Badge>
                                  ))}
                                  {p.variables.length > 6 && <Badge variant="secondary" className="text-[10px]">+{p.variables.length - 6} mais</Badge>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ── Tab 3: Financeiro ── */}
                  <TabsContent value="financeiro" className="mt-0 space-y-4">
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className={sectionLabel}>Campos Financeiros</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Campos exibidos no formulário de contrato</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {FINANCIAL_CHECKBOXES.map(({ key, label }) => (
                              <div key={key} className="flex items-center gap-2">
                                <Checkbox id={key} checked={form.watch(key)} onCheckedChange={(v) => form.setValue(key, !!v)} data-testid={`checkbox-${key}`} />
                                <Label htmlFor={key} className="font-normal cursor-pointer text-sm">{label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3"><CardTitle className={sectionLabel}>Condições Financeiras</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Moeda Padrão</Label>
                            <Select value={financialCurrency} onValueChange={setFinancialCurrency}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BRL">BRL — Real Brasileiro</SelectItem>
                                <SelectItem value="USD">USD — Dólar Americano</SelectItem>
                                <SelectItem value="EUR">EUR — Euro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Frequência de Pagamento</Label>
                            <Select value={financialFrequency} onValueChange={(v) => setFinancialFrequency(v as typeof financialFrequency)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unico">Único</SelectItem>
                                <SelectItem value="mensal">Mensal</SelectItem>
                                <SelectItem value="trimestral">Trimestral</SelectItem>
                                <SelectItem value="anual">Anual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fin-penalty">Multa por Descumprimento (%)</Label>
                            <Input id="fin-penalty" type="number" min={0} step={0.1} value={financialPenalty} onChange={(e) => setFinancialPenalty(e.target.value)} placeholder="Ex: 10" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fin-interest">Juros de Mora (% ao mês)</Label>
                            <Input id="fin-interest" type="number" min={0} step={0.01} value={financialInterest} onChange={(e) => setFinancialInterest(e.target.value)} placeholder="Ex: 1" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fin-due">Vencimento Padrão (dias)</Label>
                            <Input id="fin-due" type="number" min={1} value={financialDueDays} onChange={(e) => setFinancialDueDays(e.target.value)} placeholder="Ex: 30" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="default_financial_category">Categoria Financeira Padrão</Label>
                            <Input id="default_financial_category" {...form.register("default_financial_category")} placeholder="Ex: receitas-musicais" data-testid="input-default-category" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ── Tab 4: Obra Musical ── */}
                  <TabsContent value="obra" className="mt-0 space-y-4">
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className={sectionLabel}>Dados da Obra</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Título da Obra</Label>
                            <Input value={musicWork.title} onChange={(e) => setMusicWork((w) => ({ ...w, title: e.target.value }))} placeholder="Ex: Minha Música" />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo de Distribuição</Label>
                            <Select value={musicWork.distributionType} onValueChange={(v) => setMusicWork((w) => ({ ...w, distributionType: v as MusicWork["distributionType"] }))}>
                              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="exclusiva">Exclusiva</SelectItem>
                                <SelectItem value="nao_exclusiva">Não Exclusiva</SelectItem>
                                <SelectItem value="licenca">Licença</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>ISRC</Label>
                            <Input value={musicWork.isrc} onChange={(e) => setMusicWork((w) => ({ ...w, isrc: e.target.value }))} placeholder="Ex: BRBMG2400001" />
                          </div>
                          <div className="space-y-2">
                            <Label>UPC</Label>
                            <Input value={musicWork.upc} onChange={(e) => setMusicWork((w) => ({ ...w, upc: e.target.value }))} placeholder="Ex: 012345678905" />
                          </div>
                          <div className="space-y-2">
                            <Label>Gênero</Label>
                            <Select value={musicWork.genre} onValueChange={(v) => setMusicWork((w) => ({ ...w, genre: v }))}>
                              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>{MUSIC_GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Idioma</Label>
                            <Select value={musicWork.language} onValueChange={(v) => setMusicWork((w) => ({ ...w, language: v }))}>
                              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>{MUSIC_LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Data de Lançamento</Label>
                            <Input type="date" value={musicWork.releaseDate} onChange={(e) => setMusicWork((w) => ({ ...w, releaseDate: e.target.value }))} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Plataformas de Distribuição</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {MUSIC_PLATFORMS.map((p) => {
                              const checked = musicWork.platforms.includes(p);
                              return (
                                <div key={p} className="flex items-center gap-2">
                                  <Checkbox id={`plat-${p}`} checked={checked} onCheckedChange={(v) => setMusicWork((w) => ({ ...w, platforms: v ? [...w.platforms, p] : w.platforms.filter((x) => x !== p) }))} />
                                  <Label htmlFor={`plat-${p}`} className="font-normal cursor-pointer text-sm">{p}</Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ── Tab 5: Cláusulas ── */}
                  <TabsContent value="clausulas" className="mt-0 space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className={sectionLabel}>Variáveis Disponíveis</CardTitle>
                          <span className="text-xs text-muted-foreground">{allVariables.length} variáveis</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {(participants.length > 0 ? allVariables : SYSTEM_VARIABLES).slice(0, 20).map((v) => (
                            <Badge key={v.key} variant="outline" className="font-mono text-[10px] font-normal cursor-pointer hover:bg-primary/10" title={v.example}>{`{{${v.key}}}`}</Badge>
                          ))}
                          {allVariables.length > 20 && <Badge variant="secondary" className="text-[10px]">+{allVariables.length - 20} mais</Badge>}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className={sectionLabel}>Cláusulas do Contrato</CardTitle>
                          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setClausulas((prev) => [...prev, { id: crypto.randomUUID(), titulo: `CLÁUSULA ${prev.length + 1}ª`, conteudo: "", order: prev.length + 1 }])} data-testid="button-add-clausula">
                            <Plus className="h-4 w-4" />Adicionar Cláusula
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {clausulas.length === 0 ? (
                          <div className={`text-center py-10 text-sm border border-dashed rounded-lg ${clausulaErrors["__empty"] ? "border-destructive/50 bg-destructive/5 text-destructive" : "border-border text-muted-foreground"}`}>
                            {clausulaErrors["__empty"]
                              ? <span className="flex items-center justify-center gap-1"><AlertCircle className="h-4 w-4" />{clausulaErrors["__empty"]}</span>
                              : "Nenhuma cláusula adicionada. Clique em \"Adicionar Cláusula\" para começar."}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {clausulas.map((clausula, index) => (
                              <div key={clausula.id} className={`rounded-lg border p-4 space-y-3 ${clausulaErrors[clausula.id] ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">Cláusula {index + 1}</span>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setClausulas((prev) => prev.filter((c) => c.id !== clausula.id))} data-testid={`remove-clausula-${clausula.id}`}><X className="h-4 w-4" /></Button>
                                </div>
                                {clausulaErrors[clausula.id] && (
                                  <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{clausulaErrors[clausula.id]}</p>
                                )}
                                <div className="space-y-2">
                                  <Label>Título *</Label>
                                  <Input
                                    value={clausula.titulo}
                                    onChange={(e) => {
                                      setClausulas((prev) => prev.map((c) => c.id === clausula.id ? { ...c, titulo: e.target.value } : c));
                                      if (clausulaErrors[clausula.id]) setClausulaErrors((prev) => { const n = { ...prev }; delete n[clausula.id]; return n; });
                                    }}
                                    placeholder="Ex: DO OBJETO"
                                    className={clausulaErrors[clausula.id] && !clausula.titulo.trim() ? "border-destructive" : ""}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Conteúdo *</Label>
                                    <button
                                      type="button"
                                      className="text-xs text-primary hover:text-primary/80 font-mono flex items-center gap-1"
                                      onClick={() => { setActiveClausulaId(clausula.id); setVarPopoverOpen(true); }}
                                    >
                                      <Plus className="h-3 w-3" />inserir variável
                                    </button>
                                  </div>
                                  <Textarea
                                    ref={(el) => { clausulaTextareaRefs.current[clausula.id] = el; }}
                                    value={clausula.conteudo}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setClausulas((prev) => prev.map((c) => c.id === clausula.id ? { ...c, conteudo: val } : c));
                                      if (clausulaErrors[clausula.id] && val.trim()) setClausulaErrors((prev) => { const n = { ...prev }; delete n[clausula.id]; return n; });
                                      const lastTwo = val.substring(Math.max(0, e.target.selectionStart - 2), e.target.selectionStart);
                                      if (lastTwo === "{{") { setActiveClausulaId(clausula.id); setVarPopoverOpen(true); }
                                    }}
                                    onFocus={() => setActiveClausulaId(clausula.id)}
                                    placeholder="Texto da cláusula... Digite {{ para inserir uma variável."
                                    rows={5}
                                    className={`text-sm font-mono resize-y ${clausulaErrors[clausula.id] && !clausula.conteudo.trim() ? "border-destructive" : ""}`}
                                  />
                                  {clausula.conteudo && (
                                    <div className="rounded-md bg-muted/30 border border-border/50 px-3 py-2 text-sm leading-relaxed min-h-8">
                                      {highlightVariables(clausula.conteudo, validKeys)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <VariableAutocomplete
                      variables={allVariables.length > 0 ? allVariables : SYSTEM_VARIABLES}
                      onInsert={insertVariable}
                      open={varPopoverOpen}
                      onOpenChange={setVarPopoverOpen}
                      search={varSearch}
                      onSearchChange={setVarSearch}
                    />
                  </TabsContent>

                  {/* ── Tab 6: Assinaturas ── */}
                  <TabsContent value="assinaturas" className="mt-0 space-y-4">
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className={sectionLabel}>Configuração de Assinatura Digital</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div>
                            <p className="text-sm font-medium">Habilitar Assinatura Digital</p>
                            <p className="text-xs text-muted-foreground">Ativa o fluxo de assinatura digital neste tipo de contrato</p>
                          </div>
                          <Checkbox checked={signatureSettings.enabled} onCheckedChange={(v) => setSignatureSettings((s) => ({ ...s, enabled: !!v }))} />
                        </div>

                        {signatureSettings.enabled && (
                          <>
                            <div className="space-y-2">
                              <Label>Provedor de Assinatura</Label>
                              <Select value={signatureSettings.provider} onValueChange={(v) => setSignatureSettings((s) => ({ ...s, provider: v as SignatureSettings["provider"] }))}>
                                <SelectTrigger><SelectValue placeholder="Selecione um provedor..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="autentique">Autentique</SelectItem>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="w-full">
                                        <SelectItem value="docusign" disabled className="opacity-50 cursor-not-allowed">
                                          DocuSign <span className="text-xs text-muted-foreground ml-1">(em breve)</span>
                                        </SelectItem>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Integração com DocuSign em desenvolvimento</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="w-full">
                                        <SelectItem value="clicksign" disabled className="opacity-50 cursor-not-allowed">
                                          ClickSign <span className="text-xs text-muted-foreground ml-1">(em breve)</span>
                                        </SelectItem>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Integração com ClickSign em desenvolvimento</TooltipContent>
                                  </Tooltip>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-3">
                              <Label className="text-xs text-muted-foreground">Ordem de Assinatura</Label>
                              {participants.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">Adicione participantes na aba "Envolvidos" para configurar a ordem.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {participants.map((p) => {
                                    const checked = signatureSettings.signatureOrder.includes(p.id);
                                    return (
                                      <div key={p.id} className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2">
                                        <Checkbox checked={checked} onCheckedChange={(v) => setSignatureSettings((s) => ({ ...s, signatureOrder: v ? [...s.signatureOrder, p.id] : s.signatureOrder.filter((x) => x !== p.id) }))} />
                                        <span className="text-sm">{ROLE_LABELS[p.role]}</span>
                                        <Badge variant="secondary" className="text-xs ml-auto">{p.entityType === "pessoa_fisica" ? "PF" : "PJ"}</Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <Checkbox id="sig-witnesses" checked={signatureSettings.requireWitnesses} onCheckedChange={(v) => setSignatureSettings((s) => ({ ...s, requireWitnesses: !!v }))} />
                              <Label htmlFor="sig-witnesses" className="font-normal cursor-pointer">Exigir Testemunhas</Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <Checkbox id="sig-audit" checked={signatureSettings.auditTrail} onCheckedChange={(v) => setSignatureSettings((s) => ({ ...s, auditTrail: !!v }))} />
                              <Label htmlFor="sig-audit" className="font-normal cursor-pointer">Habilitar Trilha de Auditoria</Label>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ── Tab 7: Branding ── */}
                  <TabsContent value="branding" className="mt-0 space-y-4">
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className={sectionLabel}>Identidade Visual</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          {([
                            { label: "Cabeçalho", key: "headerImageUrl", ref: headerRef, testId: "input-file-cabecalho", uploadTestId: "button-upload-cabecalho", removeTestId: "remove-cabecalho" },
                            { label: "Rodapé", key: "footerImageUrl", ref: footerRef, testId: "input-file-rodape", uploadTestId: "button-upload-rodape", removeTestId: "remove-rodape" },
                            { label: "Logo", key: "logoUrl", ref: logoRef, testId: "input-file-logo", uploadTestId: "button-upload-logo", removeTestId: "remove-logo" },
                          ] as const).map(({ label, key, ref, testId, uploadTestId, removeTestId }) => (
                            <div key={key} className="space-y-2">
                              <Label>{label}</Label>
                              <input ref={ref} type="file" accept={key === "logoUrl" ? ACCEPT_IMG : ACCEPT_DOCS} className="hidden" onChange={(e) => handleFileChange(e, (url) => setBranding((b) => ({ ...b, [key]: url })))} data-testid={testId} />
                              {branding[key] ? (
                                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                                  <span className="flex-1 truncate text-xs">{label.toLowerCase()}</span>
                                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setBranding((b) => ({ ...b, [key]: null }))} data-testid={removeTestId}><X className="h-4 w-4" /></button>
                                </div>
                              ) : (
                                <Button type="button" variant="outline" className="w-full gap-2 text-muted-foreground text-xs h-9" onClick={() => ref.current?.click()} data-testid={uploadTestId}>
                                  <Upload className="h-3.5 w-3.5" />Anexar {label.toLowerCase()}
                                </Button>
                              )}
                              <p className="text-xs text-muted-foreground">PNG, JPG ou PDF</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-3">
                          <Checkbox id="watermark" checked={branding.watermarkEnabled} onCheckedChange={(v) => setBranding((b) => ({ ...b, watermarkEnabled: !!v }))} />
                          <Label htmlFor="watermark" className="font-normal cursor-pointer">Marca d'água</Label>
                          {branding.watermarkEnabled && (
                            <Input value={branding.watermarkText} onChange={(e) => setBranding((b) => ({ ...b, watermarkText: e.target.value }))} placeholder="Texto da marca d'água..." className="flex-1 h-8 text-sm" />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3"><CardTitle className={sectionLabel}>Formatação do Documento</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Fonte</Label>
                            <Select value={branding.fontFamily} onValueChange={(v) => setBranding((b) => ({ ...b, fontFamily: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Alinhamento do Texto</Label>
                            <Select value={branding.textAlignment} onValueChange={(v) => setBranding((b) => ({ ...b, textAlignment: v as BrandingSettings["textAlignment"] }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left"><span className="flex items-center gap-2"><AlignLeft className="h-3.5 w-3.5" />Esquerda</span></SelectItem>
                                <SelectItem value="center">Centralizado</SelectItem>
                                <SelectItem value="justify">Justificado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-3 pt-6">
                            <Checkbox id="page-numbers" checked={branding.pageNumbers} onCheckedChange={(v) => setBranding((b) => ({ ...b, pageNumbers: !!v }))} />
                            <Label htmlFor="page-numbers" className="font-normal cursor-pointer">Numeração de páginas</Label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Margens (mm)</Label>
                          <div className="grid grid-cols-4 gap-3">
                            {(["marginTop", "marginBottom", "marginLeft", "marginRight"] as const).map((k) => (
                              <div key={k} className="space-y-1">
                                <Label className="text-xs">{k === "marginTop" ? "Superior" : k === "marginBottom" ? "Inferior" : k === "marginLeft" ? "Esquerda" : "Direita"}</Label>
                                <Input type="number" min={0} max={100} value={branding[k]} onChange={(e) => setBranding((b) => ({ ...b, [k]: Number(e.target.value) }))} className="h-8 text-sm" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ── Tab 8: Preview ── */}
                  <TabsContent value="preview" className="mt-0">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className={sectionLabel}>Preview do Contrato</CardTitle>
                          <Badge variant="secondary" className="text-xs">Mock — valores de exemplo</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div
                          className="relative rounded-lg border border-border bg-white dark:bg-zinc-950 text-foreground p-8 min-h-[500px]"
                          style={{ fontFamily: branding.fontFamily, textAlign: branding.textAlignment as "left" | "center" | "justify" }}
                        >
                          {branding.headerImageUrl && (
                            <div className="mb-6 border-b border-border pb-4">
                              <img src={branding.headerImageUrl} alt="Cabeçalho" className="max-h-24 object-contain" />
                            </div>
                          )}

                          {branding.logoUrl && (
                            <div className="flex justify-center mb-4">
                              <img src={branding.logoUrl} alt="Logo" className="max-h-16 max-w-32 object-contain" />
                            </div>
                          )}

                          <h1 className="text-lg font-bold text-center mb-1">{form.watch("name") || "NOME DO CONTRATO"}</h1>
                          {form.watch("category") && <p className="text-xs text-center text-muted-foreground mb-6">{form.watch("category")}</p>}

                          {clausulas.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Adicione cláusulas na aba "Cláusulas" para visualizar o preview.</p>
                          ) : (
                            <div className="space-y-4">
                              {clausulas.map((c) => {
                                const varMap = new Map(
                                  (allVariables.length > 0 ? allVariables : SYSTEM_VARIABLES).map((v) => [v.key, v.example]),
                                );
                                const rendered = c.conteudo.replace(/{{([^}]+)}}/g, (_, key) => varMap.get(key) ?? `[${key}]`);
                                return (
                                  <div key={c.id} className="space-y-1">
                                    <p className="font-semibold text-sm">{c.titulo || "(sem título)"}</p>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{rendered || "(sem conteúdo)"}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {branding.footerImageUrl && (
                            <div className="mt-8 pt-4 border-t border-border">
                              <img src={branding.footerImageUrl} alt="Rodapé" className="max-h-16 object-contain" />
                            </div>
                          )}

                          {branding.pageNumbers && (
                            <div className="mt-4 text-xs text-muted-foreground text-center">— 1 —</div>
                          )}

                          {branding.watermarkEnabled && branding.watermarkText && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
                              <span className="text-4xl font-bold rotate-[-30deg] text-foreground">{branding.watermarkText}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                </div>
              </ScrollArea>
            </div>
          </Tabs>

          <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-type">Cancelar</Button>
            <Button onClick={handleSubmit} data-testid="button-save-type">
              {isEditing ? "Salvar Alterações" : "Criar Tipo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
