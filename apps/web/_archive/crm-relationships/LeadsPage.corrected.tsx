import { useMemo, useRef, useState } from "react";
import { GitBranch, Plus, Users } from "lucide-react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { LeadFilters } from "../components";
import { useLeads } from "../hooks";
import { useLeadFiltersStore } from "../store";
import { LeadFormModal, type Interacao, type LeadFormPayload } from "../modals/LeadFormModal";
import { LeadViewModal } from "../modals/LeadViewModal";
import { LeadsTable } from "../tables/LeadsTable";
import type { Lead, LeadClientType, LeadServiceType } from "../types";
import { ContatosPanel, type ContatosPanelHandle } from "@/modules/crm-relationships/components/ContatosPanel";
import { useContacts } from "@/modules/crm-relationships/hooks/useContacts";

// ─────────────────────────────────────────────
// Combos condicionais
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

const matchCombo = (
  list: ReadonlyArray<{ tipo: string; servico: string }>,
  tipo: string,
  servico: string,
) => list.some((c) => c.tipo === tipo && c.servico === servico);

// ─────────────────────────────────────────────
// Mapeamentos
// ─────────────────────────────────────────────
const TIPO_LEAD_TO_CLIENT: Record<string, LeadClientType> = {
  artista_banda:        "artist",
  contratante_show:     "eventProducer",
  marca_empresa:        "brand",
  produtora_eventos:    "eventProducer",
  gravadora_selo:       "label",
  empresario_artistico: "agency",
  editora_musical:      "label",
  agencia:              "agency",
  influenciador:        "creator",
  outros:               "other",
};

const SERVICO_TO_TIPO_SERVICO: Record<string, LeadServiceType> = {
  agenciamento_gestao:       "gestaoArtistica",
  producao_musical:          "producaoMusical",
  edicao_musical:            "mixagem",
  distribuicao_digital:      "distribuicaoDigital",
  marketing_digital:         "marketingMusical",
  marketing_influencia:      "marketingMusical",
  producao_audiovisual:      "videoclipe",
  producao_eventos:          "producaoEvento",
  contratacao_artistas:      "producaoEvento",
  eventos_corporativos:      "producaoEvento",
  campanhas_artistas:        "marketingMusical",
  licenciamento_musical:     "licenciamento",
  gestao_imagem:             "gestaoArtistica",
  estrategia_carreira:       "gestaoArtistica",
  divulgacao_eventos:        "producaoEvento",
  administracao_editorial:   "registroAutoral",
  registro_obras:            "registroAutoral",
  arrecadacao_autoral:       "registroAutoral",
  sincronizacao:             "licenciamento",
  gestao_catalogo:           "registroAutoral",
  influenciadores:           "marketingMusical",
  parcerias_comerciais:      "consultoria",
  parcerias:                 "consultoria",
  projetos_especiais:        "consultoria",
  atendimento_personalizado: "consultoria",
  criacao_sites:             "desenvolvimentoSite",
  consultoria:               "consultoria",
};

// ─────────────────────────────────────────────
// payloadToLead
// ─────────────────────────────────────────────
function payloadToLead(
  payload: LeadFormPayload,
): Omit<Lead, "id" | "createdAt" | "updatedAt" | "historicoInteracoes"> {
  const tipoCliente = TIPO_LEAD_TO_CLIENT[payload.tipo_lead]   ?? "other";
  const tipoServico = SERVICO_TO_TIPO_SERVICO[payload.servico] ?? "consultoria";

  const condicional =
    payload.evento        ??
    payload.campanha      ??
    payload.influenciador ??
    payload.empresario    ??
    {};

  return {
    nomeCompleto:  payload.nome,
    nomeArtistico:
      payload.evento?.nome_artista_banda     ??
      payload.campanha?.nome_artista_banda   ??
      payload.empresario?.nome_artista_banda ??
      "",
    empresa:   payload.empresa,
    email:     payload.email,
    whatsapp:  payload.telefone,
    instagram: payload.instagram,
    cidade:    payload.cidade,
    estado:    payload.estado,
    pais:      "Brasil",
    tipoCliente,
    tipoServico,
    payloadServico: {
      tipo_lead:            payload.tipo_lead,
      servico:              payload.servico,
      nome_artista_servico: payload.nome_artista_servico,
      descricao:            payload.descricao,
      cargo:                payload.cargo,
      website:              payload.website,
      endereco:             payload.endereco,
      data_entrada:         payload.data_entrada,
      responsavel:          payload.responsavel,
      interacoes:           payload.interacoes,
      ...condicional,
    },
    dadosInternosCRM: {
      statusLead:  payload.status_lead,
      prioridade:  payload.prioridade,
      origemLead:  payload.origem_lead,
      responsavel: payload.responsavel,
      temperatura: "morno",
    },
    uploads: [],
  };
}

// ─────────────────────────────────────────────
// leadToFormInitial
// ─────────────────────────────────────────────
function leadToFormInitial(lead: Lead): Partial<LeadFormPayload> {
  const ps  = (lead.payloadServico   ?? {}) as Record<string, unknown>;
  const crm = (lead.dadosInternosCRM ?? {}) as Record<string, unknown>;

  const str = (k: string): string =>
    typeof ps[k] === "string" ? (ps[k] as string) : "";

  const tipoLead = str("tipo_lead");
  const servico  = str("servico");

  const isEvento        = matchCombo(EVENTO_COMBOS,   tipoLead, servico);
  const isCampanha      = matchCombo(CAMPANHA_COMBOS, tipoLead, servico);
  const isInfluenciador = tipoLead === "influenciador"        && !isEvento;
  const isEmpresario    = tipoLead === "empresario_artistico" && !isEvento;

  return {
    nome:                 lead.nomeCompleto,
    empresa:              lead.empresa   ?? "",
    email:                lead.email     ?? "",
    telefone:             lead.whatsapp  ?? "",
    instagram:            lead.instagram ?? "",
    cidade:               lead.cidade    ?? "",
    estado:               lead.estado    ?? "",
    cargo:                str("cargo"),
    website:              str("website"),
    endereco:             str("endereco"),
    data_entrada:         str("data_entrada"),
    responsavel:          str("responsavel"),
    tipo_lead:            tipoLead as LeadFormPayload["tipo_lead"],
    servico,
    nome_artista_servico: str("nome_artista_servico"),
    descricao:            str("descricao"),
    origem_lead:          (crm.origemLead as string) ?? "",
    status_lead:          (crm.statusLead as string) ?? "novo_lead",
    prioridade:           (crm.prioridade as string) ?? "media",
    interacoes: Array.isArray(ps.interacoes)
      ? (ps.interacoes as Interacao[])
      : [],
    evento: isEvento ? {
      nome_evento:             str("nome_evento"),
      tipo_evento:             str("tipo_evento"),
      data_evento:             str("data_evento"),
      local_evento:            str("local_evento"),
      cidade:                  str("cidade"),
      estado:                  str("estado"),
      capacidade_publico:      str("capacidade_publico"),
      nome_artista_banda:      str("nome_artista_banda"),
      necessidades_adicionais: str("necessidades_adicionais"),
    } : undefined,
    campanha: isCampanha ? {
      nome_campanha:           str("nome_campanha"),
      tipo_campanha:           str("tipo_campanha"),
      data_inicio:             str("data_inicio"),
      data_fim:                str("data_fim"),
      cidade:                  str("cidade"),
      estado:                  str("estado"),
      nome_artista_banda:      str("nome_artista_banda"),
      necessidades_adicionais: str("necessidades_adicionais"),
    } : undefined,
    influenciador: isInfluenciador ? {
      nome_campanha:           str("nome_campanha"),
      tipo_campanha:           str("tipo_campanha"),
      local_campanha:          str("local_campanha"),
      data:                    str("data"),
      cidade:                  str("cidade"),
      estado:                  str("estado"),
      necessidades_adicionais: str("necessidades_adicionais"),
    } : undefined,
    empresario: isEmpresario ? {
      nome_artista_banda:      str("nome_artista_banda"),
      necessidades_adicionais: str("necessidades_adicionais"),
    } : undefined,
  };
}

// ─────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────
export default function LeadsPage() {
  const { leads, metrics, createLead, updateLead, deleteLead } = useLeads();
  const { contacts, createContact }                            = useContacts();
  const { filters, setFilters }                                = useLeadFiltersStore();

  const [modalOpen,        setModalOpen]        = useState(false);
  const [editingLead,      setEditingLead]      = useState<Lead | null>(null);
  const [viewLead,         setViewLead]         = useState<Lead | null>(null);
  const contatosPanelRef = useRef<ContatosPanelHandle>(null);
  const [activeTab,        setActiveTab]        = useState<"contatos" | "leads">("contatos");

  const responsaveis = useMemo(
    () => Array.from(
      new Set(leads.map((l) => l.dadosInternosCRM.responsavel).filter(Boolean)),
    ) as string[],
    [leads],
  );

  const origens = useMemo(
    () => Array.from(
      new Set(leads.map((l) => l.dadosInternosCRM.origemLead).filter(Boolean)),
    ) as string[],
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const search = filters.search.toLowerCase();
    return leads.filter((lead) => {
      const values = [
        lead.nomeCompleto, lead.nomeArtistico, lead.empresa,
        lead.email, lead.whatsapp, lead.instagram,
      ].join(" ").toLowerCase();
      return (
        (!search || values.includes(search))                                                           &&
        (filters.tipoServico === "all" || lead.tipoServico                  === filters.tipoServico)   &&
        (filters.statusLead  === "all" || lead.dadosInternosCRM.statusLead  === filters.statusLead)    &&
        (filters.responsavel === "all" || lead.dadosInternosCRM.responsavel === filters.responsavel)   &&
        (filters.origemLead  === "all" || lead.dadosInternosCRM.origemLead  === filters.origemLead)    &&
        (filters.temperatura === "all" || lead.dadosInternosCRM.temperatura === filters.temperatura)
      );
    });
  }, [filters, leads]);

  const contatosKpis = useMemo(() => {
    const countBy = (types: string[]) =>
      contacts.filter((c) => types.includes(c.contactType)).length;
    return {
      total:        contacts.length,
      clientes:     countBy(["CORPORATE_CLIENT"]),
      parceiros:    countBy(["PARTNER"]),
      fornecedores: countBy(["SUPPLIER"]),
      prestadores:  countBy(["SERVICE_PROVIDER"]),
    };
  }, [contacts]);

  function openCreate() {
    setEditingLead(null);
    setModalOpen(true);
  }

  const topbarActions =
    activeTab === "leads" ? (
      <Button size="sm" onClick={openCreate} data-testid="button-novo-lead">
        <Plus className="mr-1 h-4 w-4" />
        Novo Lead
      </Button>
    ) : (
      <Button size="sm" onClick={() => contatosPanelRef.current?.openCreate()} data-testid="button-novo-contato">
        <Plus className="mr-1 h-4 w-4" />
        Novo Contato
      </Button>
    );

  return (
    <MainLayout
      title="CRM"
      description="Central de relacionamento operacional"
      actions={topbarActions}
    >
      {activeTab === "contatos" ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="contatos-kpis">
          <Kpi label="Total de contatos" value={contatosKpis.total}        />
          <Kpi label="Clientes"          value={contatosKpis.clientes}     />
          <Kpi label="Parceiros"         value={contatosKpis.parceiros}    />
          <Kpi label="Fornecedores"      value={contatosKpis.fornecedores} />
          <Kpi label="Prestadores"       value={contatosKpis.prestadores}  />
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="leads-kpis">
          <Kpi label="Total de leads"     value={metrics.total}                                                                         />
          <Kpi label="Em negociação"      value={metrics.followUps}                                                                     />
          <Kpi label="Propostas enviadas" value={metrics.propostas}                                                                     />
          <Kpi label="Contratos fechados" value={metrics.contratos}                                                                     />
          <Kpi label="Valor estimado"     value={metrics.valorEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        </section>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "contatos" | "leads")}
        className="mt-5 space-y-5"
      >
        <TabsList
          className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0"
          data-testid="crm-tabs-list"
        >
          <TabsTrigger
            value="contatos"
            className="relative h-10 gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            data-testid="tab-contatos"
          >
            <Users className="h-4 w-4" />
            Contatos
            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
              {contacts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="leads"
            className="relative h-10 gap-2 rounded-none border-b-2 border-transparent bg-transparent px-4 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            data-testid="tab-leads"
          >
            <GitBranch className="h-4 w-4" />
            Leads
            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
              {leads.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contatos" data-testid="tab-content-contatos">
          <ContatosPanel ref={contatosPanelRef} />
        </TabsContent>

        <TabsContent value="leads" data-testid="tab-content-leads">
          <div className="space-y-5">
            <LeadFilters
              filters={filters}
              onChange={(field, value) => setFilters({ [field]: value })}
              responsaveis={responsaveis}
              origens={origens}
            />
            <LeadsTable
              leads={filteredLeads}
              onView={(lead) => setViewLead(lead)}
              onEdit={(lead) => {
                setEditingLead(lead);
                setModalOpen(true);
              }}
              onDelete={(lead) => void deleteLead(lead.id)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <LeadFormModal
        open={modalOpen}
        mode={editingLead ? "edit" : "create"}
        initialValue={editingLead ? leadToFormInitial(editingLead) : null}
        onOpenChange={(next) => setModalOpen(next)}
        onSubmit={async (formPayload) => {
          const leadPayload = payloadToLead(formPayload);
          if (editingLead) await updateLead(editingLead.id, leadPayload);
          else await createLead(leadPayload);
        }}
      />

      <LeadViewModal
        open={viewLead !== null}
        onOpenChange={(next) => { if (!next) setViewLead(null); }}
        lead={viewLead}
        onEdit={(lead) => {
          setEditingLead(lead);
          setModalOpen(true);
        }}
      />

    </MainLayout>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 truncate text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}