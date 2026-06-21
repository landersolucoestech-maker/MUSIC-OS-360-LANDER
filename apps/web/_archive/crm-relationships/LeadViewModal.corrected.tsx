import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge }  from "@/shared/ui/badge";
import {
  AtSign, Briefcase, Building2, Calendar, CalendarClock,
  DollarSign, FileText, Flag, Globe, Hash, Instagram, Mail,
  MapPin, MessageSquare, Music, Phone, Sparkles, Star, Tag,
  Thermometer, User, UserCog, Users,
} from "lucide-react";
import type { Lead } from "../types";
import {
  ORIGEM_LEAD_OPTIONS,
  PRIORIDADE_OPTIONS,
  SERVICOS_OPTIONS,
  STATUS_LEAD_OPTIONS,
  TIPO_EVENTO_OPTIONS,
  TIPO_LEAD_OPTIONS,
} from "../constants/lead-form-options";
import { TIPO_INTERACAO_OPTIONS, type Interacao } from "./LeadFormModal";

// ─────────────────────────────────────────────
// Combos — espelho exato do LeadFormModal
// ─────────────────────────────────────────────
const EVENTO_COMBOS: ReadonlyArray<{ tipo: string; servico: string }> = [
  { tipo: "marca_empresa",        servico: "eventos_corporativos" },
  { tipo: "agencia",              servico: "producao_eventos"     },
  { tipo: "agencia",              servico: "contratacao_artistas" },
  { tipo: "produtora_eventos",    servico: "contratacao_artistas" },
  { tipo: "contratante_show",     servico: "contratacao_artistas" },
  { tipo: "contratante_show",     servico: "eventos_corporativos" },
  { tipo: "empresario_artistico", servico: "contratacao_artistas" },
  { tipo: "empresario_artistico", servico: "eventos_corporativos" },
  { tipo: "influenciador",        servico: "producao_eventos"     },
];

const CAMPANHA_COMBOS: ReadonlyArray<{ tipo: string; servico: string }> = [
  { tipo: "marca_empresa", servico: "campanhas_artistas" },
  { tipo: "agencia",       servico: "campanhas_artistas" },
];

const ARTISTA_EVENTO_COMBOS: ReadonlyArray<{ tipo: string; servico: string }> = [
  { tipo: "marca_empresa",        servico: "eventos_corporativos" },
  { tipo: "agencia",              servico: "producao_eventos"     },
  { tipo: "agencia",              servico: "contratacao_artistas" },
  { tipo: "produtora_eventos",    servico: "contratacao_artistas" },
  { tipo: "contratante_show",     servico: "contratacao_artistas" },
  { tipo: "contratante_show",     servico: "eventos_corporativos" },
  { tipo: "empresario_artistico", servico: "contratacao_artistas" },
  { tipo: "empresario_artistico", servico: "eventos_corporativos" },
];

const matchCombo = (
  list: ReadonlyArray<{ tipo: string; servico: string }>,
  tipo: string,
  servico: string,
) => list.some((c) => c.tipo === tipo && c.servico === servico);

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
interface LeadViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onEdit?: (lead: Lead) => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const lookup = (
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string | null,
) => options.find((o) => o.value === value)?.label ?? (value || "-");

const fmtDate = (value?: string | null) => {
  if (!value) return "-";
  try { return new Date(value).toLocaleDateString("pt-BR"); }
  catch { return value; }
};

const fmtMoney = (value?: number | null) =>
  value == null
    ? "-"
    : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const isEmpty = value == null || value === "" || value === "-";
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        {label}
      </p>
      <p className={
        isEmpty
          ? "text-sm text-muted-foreground italic"
          : "text-sm text-foreground break-words"
      }>
        {isEmpty ? "—" : value}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────
export function LeadViewModal({
  open, onOpenChange, lead, onEdit,
}: LeadViewModalProps) {
  if (!lead) return null;

  const ps  = (lead.payloadServico   ?? {}) as Record<string, unknown>;
  const crm = (lead.dadosInternosCRM ?? {}) as Record<string, unknown>;

  const str = (key: string): string =>
    typeof ps[key] === "string" ? (ps[key] as string) : "";

  const tipoLead = str("tipo_lead");
  const servico  = str("servico");

  const showEvento             = matchCombo(EVENTO_COMBOS,          tipoLead, servico);
  const showCampanha           = matchCombo(CAMPANHA_COMBOS,        tipoLead, servico);
  const showInfluenciador      = tipoLead === "influenciador"        && !showEvento;
  const showEmpresario         = tipoLead === "empresario_artistico" && !showEvento;
  const showArtistaBandaEvento = matchCombo(ARTISTA_EVENTO_COMBOS,  tipoLead, servico);

  const interacoes = Array.isArray(ps.interacoes)
    ? (ps.interacoes as Interacao[])
    : [];

  const cidadeDisplay = str("cidade") || lead.cidade || "";
  const estadoDisplay = str("estado") || lead.estado || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        data-testid="lead-view-modal"
      >
        <DialogHeader>
          <DialogTitle
            data-testid="lead-view-title"
            className="flex items-center gap-3"
          >
            {lead.nomeCompleto || "Lead"}
            {crm.statusLead && (
              <Badge variant="outline" className="text-xs">
                {lookup(STATUS_LEAD_OPTIONS, crm.statusLead as string)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Visualização dos dados do lead</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">

          {/* ══════════════════════════════════════
              IDENTIFICAÇÃO DO LEAD
          ══════════════════════════════════════ */}
          <Section title="Identificação do Lead">
            <Row icon={User}      label="Nome"                  value={lead.nomeCompleto}                        />
            <Row icon={Building2} label="Empresa / Contratante" value={lead.empresa}                             />
            <Row icon={Briefcase} label="Cargo / Função"        value={str("cargo")}                             />
            <Row icon={Mail}      label="Email"                  value={lead.email}                               />
            <Row icon={Phone}     label="Telefone / WhatsApp"   value={lead.whatsapp}                            />
            <Row icon={Instagram} label="Instagram"             value={lead.instagram}                           />
            <Row icon={Globe}     label="Website"               value={str("website")}                           />
            <Row icon={MapPin}    label="Endereço"              value={str("endereco")}                          />
            <Row icon={MapPin}    label="Cidade"                value={lead.cidade}                              />
            <Row icon={Hash}      label="Estado"                value={lead.estado}                              />
            <Row icon={Tag}       label="Tipo de Lead"          value={lookup(TIPO_LEAD_OPTIONS, tipoLead)}      />
            <Row icon={Sparkles}  label="Serviço"               value={lookup(SERVICOS_OPTIONS,  servico)}       />
            {str("nome_artista_servico") && (
              <Row
                icon={Music}
                label="Artista / Influenciador"
                value={str("nome_artista_servico")}
              />
            )}
            <div className="sm:col-span-2">
              <Row icon={FileText} label="Descrição da Demanda" value={str("descricao")} />
            </div>
          </Section>

          {/* ══════════════════════════════════════
              ORIGEM E GESTÃO COMERCIAL
          ══════════════════════════════════════ */}
          <Section title="Origem e Gestão Comercial">
            <Row icon={AtSign}        label="Origem do Lead"        value={lookup(ORIGEM_LEAD_OPTIONS, crm.origemLead  as string)} />
            <Row icon={Flag}          label="Status do Lead"        value={lookup(STATUS_LEAD_OPTIONS, crm.statusLead  as string)} />
            <Row icon={Star}          label="Prioridade"            value={lookup(PRIORIDADE_OPTIONS,  crm.prioridade  as string)} />
            <Row icon={UserCog}       label="Responsável pelo Lead" value={crm.responsavel                             as string}  />
            <Row icon={Calendar}      label="Data de Entrada"       value={fmtDate(str("data_entrada") || lead.createdAt)}        />
            <Row icon={CalendarClock} label="Próximo Follow-up"     value={fmtDate(crm.proximoFollowUp                as string)} />
            <Row icon={DollarSign}    label="Valor Estimado"        value={fmtMoney(crm.valorEstimado                 as number)} />
            <Row icon={Thermometer}   label="Temperatura"           value={crm.temperatura                            as string}  />
          </Section>

          {/* ══════════════════════════════════════
              DETALHES DO EVENTO
          ══════════════════════════════════════ */}
          {showEvento && (
            <Section title="Detalhes do Evento">
              <Row icon={Sparkles} label="Nome do Evento"        value={str("nome_evento")}                               />
              <Row icon={Tag}      label="Tipo de Evento"        value={lookup(TIPO_EVENTO_OPTIONS, str("tipo_evento"))}  />
              <Row icon={Calendar} label="Data do Evento"        value={fmtDate(str("data_evento"))}                     />
              <Row icon={MapPin}   label="Local do Evento"       value={str("local_evento")}                              />
              <Row icon={MapPin}   label="Cidade"                value={cidadeDisplay}                                    />
              <Row icon={Hash}     label="Estado"                value={estadoDisplay}                                    />
              <Row icon={Users}    label="Capacidade de Público" value={str("capacidade_publico")}                        />
              {showArtistaBandaEvento && (
                <Row icon={Music} label="Nome do Artista / Banda" value={str("nome_artista_banda")} />
              )}
              <div className="sm:col-span-2">
                <Row icon={FileText} label="Necessidades Adicionais" value={str("necessidades_adicionais")} />
              </div>
            </Section>
          )}

          {/* ══════════════════════════════════════
              DETALHES DA CAMPANHA
          ══════════════════════════════════════ */}
          {showCampanha && (
            <Section title="Detalhes da Campanha">
              <Row icon={Sparkles} label="Nome da Campanha"        value={str("nome_campanha")}         />
              <Row icon={Tag}      label="Tipo da Campanha"        value={str("tipo_campanha")}         />
              <Row icon={Calendar} label="Data de Início"          value={fmtDate(str("data_inicio"))}  />
              <Row icon={Calendar} label="Data de Fim"             value={fmtDate(str("data_fim"))}     />
              <Row icon={MapPin}   label="Cidade"                  value={cidadeDisplay}                />
              <Row icon={Hash}     label="Estado"                  value={estadoDisplay}                />
              <Row icon={Music}    label="Nome do Artista / Banda" value={str("nome_artista_banda")}    />
              <div className="sm:col-span-2">
                <Row icon={FileText} label="Necessidades Adicionais" value={str("necessidades_adicionais")} />
              </div>
            </Section>
          )}

          {/* ══════════════════════════════════════
              DETALHES DO INFLUENCIADOR
          ══════════════════════════════════════ */}
          {showInfluenciador && (
            <Section title="Detalhes do Influenciador">
              <Row icon={Sparkles} label="Nome da Campanha"  value={str("nome_campanha")}             />
              <Row icon={Tag}      label="Tipo da Campanha"  value={str("tipo_campanha")}             />
              <Row icon={MapPin}   label="Local da Campanha" value={str("local_campanha")}            />
              <Row icon={Calendar} label="Data"              value={fmtDate(str("data"))}             />
              <Row icon={MapPin}   label="Cidade"            value={cidadeDisplay}                    />
              <Row icon={Hash}     label="Estado"            value={estadoDisplay}                    />
              <div className="sm:col-span-2">
                <Row icon={FileText} label="Necessidades Adicionais" value={str("necessidades_adicionais")} />
              </div>
            </Section>
          )}

          {/* ══════════════════════════════════════
              DETALHES DO EMPRESÁRIO ARTÍSTICO
          ══════════════════════════════════════ */}
          {showEmpresario && (
            <Section title="Detalhes do Empresário Artístico">
              <Row icon={Music} label="Nome do Artista / Banda" value={str("nome_artista_banda")} />
              <div className="sm:col-span-2">
                <Row icon={FileText} label="Necessidades Adicionais" value={str("necessidades_adicionais")} />
              </div>
            </Section>
          )}

          {/* ══════════════════════════════════════
              HISTÓRICO DE INTERAÇÕES
          ══════════════════════════════════════ */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              Histórico de Interações
            </h3>
            {interacoes.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Nenhuma interação registrada.
              </p>
            ) : (
              <div className="space-y-3" data-testid="lead-view-interacoes">
                {interacoes.map((it, idx) => (
                  <div
                    key={it.id}
                    className="rounded-md border bg-muted/20 p-3 space-y-1"
                    data-testid={`lead-view-interacao-${it.id}`}
                  >
                    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Interação {idx + 1} · {lookup(TIPO_INTERACAO_OPTIONS, it.tipo)} · {fmtDate(it.data)}{it.horario ? ` ${it.horario}` : ""}
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {it.descricao || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-view"
          >
            Fechar
          </Button>
          {onEdit && (
            <Button
              onClick={() => { onOpenChange(false); onEdit(lead); }}
              data-testid="button-edit-from-view"
            >
              Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}