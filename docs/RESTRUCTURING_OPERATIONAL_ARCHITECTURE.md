# 🎵 MUSIC OS 360 — ARQUITETURA OPERACIONAL CONTEXTUAL DEFINITIVA

**Versão**: 1.0 — Reestruturação Completa  
**Data**: 2026-05-20  
**Status**: Planejamento → Implementação Gradual  

---

## 📋 ÍNDICE

1. [Análise da Estrutura Atual](#análise-atual)
2. [Visão Nova: Workspaces Operacionais](#visão-nova)
3. [Arquitetura Contextual](#arquitetura)
4. [Navegação Inteligente](#navegação)
5. [Padrões Globais de UX](#padrões-ux)
6. [Estrutura Técnica](#estrutura-técnica)
7. [Hierarquia de Rotas](#rotas)
8. [Sistema de Componentes](#componentes)
9. [Activity & Realtime System](#activity-system)
10. [Estratégia de Implementação](#implementação)

---

## 1. ANÁLISE DA ESTRUTURA ATUAL {#análise-atual}

### Módulos Existentes (Fragmentados)
```
accounting/     → Transações, Nota Fiscal
admin/          → Admin Panel
ai/             → IA Criativa
artist/         → Artistas
auth/           → Autenticação
catalog/        → Catálogo de Obras
contracts/      → Contratos
crm/            → CRM
dashboard/      → Dashboard genérico
events/         → Agenda
integrations/   → Integrações
inventory/      → Inventário
leads/          → Leads
licensing/      → Licenciamento
marketing/      → Marketing
monitoring/     → Rights Monitoring
projects/       → Projetos
releases/       → Distribuição de Releases
reports/        → Relatórios
rh/             → Recursos Humanos
settings/       → Configurações
support/        → Suporte
```

### Problema Identificado
- **Navegação em menus**: 22+ módulos soltos
- **Perda de contexto**: usuario navega de módulo em módulo
- **Falta de unificação**: Artista, Release, Projeto estão separados
- **UX fragmentada**: cada módulo com seu próprio padrão
- **Sem timelines**: Sem rastreamento de atividade integrada
- **Sem contexto operacional**: tudo isolado

### Entidades Principais Identificadas
- **Artista** (core)
- **Lançamento** (Release - core)
- **Obra** (Composição - core)
- **Contrato** (core)
- **Transação** (financeiro)
- **Campanha** (marketing)
- **Projeto** (generic tasks)
- **Tarefa** (tasks)
- **Evento** (calendar)
- **Nota Fiscal** (fiscal)
- **Compartilhamento** (shares/recebimentos externos de direitos)

---

## 2. VISÃO NOVA: WORKSPACES OPERACIONAIS {#visão-nova}

### Conceito Central

**NÃO** módulos soltos.  
**SIM** contextos operacionais integrados.

```
Workspace = Centro Operacional Contextual de uma Entidade
```

### Os 5 Workspaces Principais

#### **1️⃣ ARTIST WORKSPACE**
Central operacional da carreira do artista.

```
/workspace/artist/:artistId

├── Overview              (KPIs, releases, campanhas ativas)
├── Releases              (todos os lançamentos)
├── Campaigns             (campanhas vinculadas)
├── Collaborations        (parcerias ativas)
├── Financeiro            (receitas, recebimentos externos de direitos)
├── Contracts             (contratos ativos e arquivados)
├── Tasks                 (tarefas do artista)
├── Assets                (avatares, fotos, etc)
├── Team                  (equipe, colaboradores)
├── Calendar              (eventos e datas importantes)
├── Analytics             (streams, performance)
├── Activity Timeline     (histórico de operações)
├── Conversations         (comentários e mentions)
├── Approvals             (pendências de aprovação)
└── Settings              (configurações do artista)
```

**Sensação esperada**: "Tudo da carreira do artista está aqui"

---

#### **2️⃣ RELEASE WORKSPACE**
Central operacional do lançamento.

```
/workspace/release/:releaseId

├── Overview              (status, progresso, KPIs)
├── Distribution          (plataformas, datas de lançamento)
├── Assets                (capas, thumbnails, vídeos)
├── Marketing             (campanhas vinculadas)
├── Content Calendar      (calendário de posts)
├── Tasks                 (tarefas do lançamento)
├── Team                  (artistas, produtores, features)
├── Schedule              (timeline de ações)
├── Pre-release           (pré-save, playlist pitching)
├── Financial             (custos, receitas)
├── Recebimentos externos de direitos             (splits de compositor)
├── Analytics             (streams, listeners)
├── Approvals             (aprovações pendentes)
├── Deliverables          (arquivos necessários)
├── Activity Timeline     (operações do release)
└── Conversations         (discussões do projeto)
```

**Sensação esperada**: "Controlo toda a operação desse lançamento sem sair daqui"

---

#### **3️⃣ CAMPAIGN WORKSPACE**
Central operacional de campanhas de marketing.

```
/workspace/campaign/:campaignId

├── Overview              (metas, budget, KPIs)
├── Goals                 (objetivos e métricas)
├── Budget                (alocação, despesas)
├── Tasks                 (tarefas da campanha)
├── Content               (posts, stories, reels)
├── Assets                (banners, imagens)
├── Creators              (influencers, colaboradores)
├── Timeline              (marcos da campanha)
├── Schedule              (posts agendados)
├── Channels              (Instagram, TikTok, etc)
├── Analytics             (engajamento, conversão)
├── Reports               (relatórios de performance)
├── Activity              (histórico de operações)
└── Conversations         (discussões)
```

**Sensação esperada**: "A campanha toda em um só lugar"

---

#### **4️⃣ PROJECT WORKSPACE**
Central operacional de projetos genéricos.

```
/workspace/project/:projectId

├── Overview              (status, progresso)
├── Tasks                 (tarefas kanban/lista)
├── Timeline              (milestones)
├── Team                  (membros)
├── Assets                (arquivos)
├── Budget                (orçamento)
├── Schedule              (calendário)
├── Analytics             (KPIs customizados)
├── Activity              (histórico)
└── Conversations         (discussões)
```

---

#### **5️⃣ CONTRACT WORKSPACE**
Central operacional de contrato.

```
/workspace/contract/:contractId

├── Overview              (status, datas importantes)
├── Document              (visualizador de contrato)
├── Financial             (valores, pagamentos)
├── Parties               (envolvidos)
├── Obligations           (obrigações)
├── Milestones            (marcos)
├── Tasks                 (tarefas associadas)
├── History               (timeline de eventos)
├── Approvals             (assinaturas)
├── Activity              (mudanças)
└── Conversations         (discussões)
```

---

### Workspaces Secundários (Contextos Menores)

#### **OBRA WORKSPACE** `/workspace/work/:workId`
```
├── Overview              (metadados, ISWC)
├── Registros             (direitos, ECAD)
├── Compartilhamento      (shares de compositor)
├── Releases              (em quais releases usada)
├── Recebimentos externos de direitos             (histórico de recebimentos externos de direitos)
├── Aprovações            (registro, aprovação)
└── Activity              (histórico)
```

#### **EVENTO WORKSPACE** `/workspace/event/:eventId`
```
├── Overview              (data, local, detalhes)
├── Lineup                (artistas)
├── Tasks                 (tarefas do evento)
├── Budget                (custos)
├── Timeline              (cronograma)
├── Team                  (equipe de produção)
├── Logistics             (transporte, hospedagem)
├── Analytics             (comercial, attendance)
└── Activity              (histórico)
```

---

## 3. ARQUITETURA CONTEXTUAL {#arquitetura}

### 3.1 Organização de Rotas

```
/workspace
  /artist/:id
    /overview
    /releases
    /campaigns
    /financial
    /contracts
    /tasks
    /assets
    /team
    /calendar
    /analytics
    /activity
    /conversations
    /approvals
    /settings

  /release/:id
    /overview
    /distribution
    /assets
    /marketing
    /content
    /tasks
    /team
    /schedule
    /financial
    /recebimentos externos de direitos
    /analytics
    /approvals
    /activity
    /conversations

  /campaign/:id
    /overview
    /goals
    /budget
    /tasks
    /content
    /assets
    /creators
    /timeline
    /schedule
    /analytics
    /reports
    /activity

  /project/:id
    /overview
    /tasks
    /timeline
    /team
    /assets
    /budget
    /schedule
    /activity

  /contract/:id
    /overview
    /document
    /financial
    /parties
    /obligations
    /tasks
    /approvals
    /activity

/library (acesso rápido a todos os recursos)
  /artists
  /releases
  /campaigns
  /contracts
  /projects
  /works
  /events

/dashboard (visão geral da organização)
  /overview
  /kpis
  /recent-activity
  /approvals-pending

/settings
  /organization
  /team
  /integrations
  /workflows
  /notifications
```

### 3.2 Estrutura de Pasta de Módulos Reorganizada

```
apps/web/src/modules/
├── workspace/                      # NOVO: Orquestrador de workspaces
│   ├── components/
│   │   ├── WorkspaceShell.tsx
│   │   ├── WorkspaceNav.tsx
│   │   ├── WorkspaceSidebar.tsx
│   │   ├── WorkspaceHeader.tsx
│   │   ├── ActivityTimeline.tsx
│   │   └── ContextualQuickActions.tsx
│   ├── hooks/
│   │   ├── useWorkspaceContext.ts
│   │   ├── useWorkspaceNav.ts
│   │   └── useActivityFeed.ts
│   ├── layouts/
│   │   ├── WorkspaceLayout.tsx
│   │   └── WorkspaceSidebarLayout.tsx
│   └── types/
│       └── workspace.types.ts
│
├── contexts/                       # NOVO: Contextos operacionais
│   ├── artist-workspace/
│   ├── release-workspace/
│   ├── campaign-workspace/
│   ├── project-workspace/
│   └── contract-workspace/
│
├── artist/                         # REFACTOR: De módulo isolado a provedor de dados
│   ├── components/
│   │   └── → movidos para workspace/contexts/artist-workspace
│   ├── pages/
│   │   └── → arquivado (usar workspace)
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── queries/
│
├── releases/                       # REFACTOR: De módulo isolado a provedor de dados
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── queries/
│
├── campaigns/                      # NOVO: Extrair de marketing
│   ├── components/
│   ├── services/
│   ├── types/
│   └── queries/
│
├── activity-log/                   # NOVO: Activity system centralizado
│   ├── components/
│   │   ├── ActivityTimeline.tsx
│   │   ├── ActivityCard.tsx
│   │   └── ActivityFeed.tsx
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── queries/
│
├── shared-workspace-components/    # NOVO: Componentes reutilizáveis
│   ├── OverviewCard.tsx
│   ├── MetricsGrid.tsx
│   ├── TimelineSection.tsx
│   ├── TeamMembersCard.tsx
│   ├── TaskList.tsx
│   ├── FileUploadZone.tsx
│   ├── ContextualQuickActions.tsx
│   └── WorkspaceEmptyState.tsx
│
└── [outros módulos se mantêm, mas descentralizados]
```

---

## 4. NAVEGAÇÃO INTELIGENTE {#navegação}

### 4.1 Sidebar Contextual

**Hoje**: Menu genérico com 22 módulos  
**Amanhã**: Sidebar que muda conforme o contexto

```
ESTRUTURA DO SIDEBAR CONTEXTUAL

┌─────────────────────────────────────┐
│ 🎵 Music OS 360                     │
├─────────────────────────────────────┤
│ [Current Workspace Indicator]       │
│                                     │
│ 🎤 MC Lander                        │  ← Contexto atual
│ Artist Workspace                    │
├─────────────────────────────────────┤
│ WORKSPACE NAVIGATION                │
│ • Overview        [current]         │
│ • Releases        (3)               │
│ • Campaigns       (1)               │
│ • Financial       [pending]         │
│ • Tasks          (5)               │
│ • Calendar                          │
│ • Team                              │
├─────────────────────────────────────┤
│ QUICK ACCESS                        │
│ • Create Release                    │
│ • New Campaign                      │
│ • Upload Asset                      │
├─────────────────────────────────────┤
│ LIBRARY (Global)                    │
│ • Artists                           │
│ • Releases                          │
│ • Projects                          │
│ • Campaigns                         │
│ • Contracts                         │
├─────────────────────────────────────┤
│ SYSTEM                              │
│ • Dashboard                         │
│ • Settings                          │
│ • Help & Support                    │
│ • [User Menu]                       │
└─────────────────────────────────────┘
```

### 4.2 Breadcrumb Operacional

```
Music OS → Workspace: Artist MC Lander → Overview
           Workspace: Release "Noite Fria" → Distribution
           Workspace: Campaign "Summer 2026" → Analytics
```

### 4.3 Command Center (⌘K / Ctrl+K)

```
Fuzzy search global + ações contextuais:

> artist mc lander
  🎤 Go to Artist Workspace
  📊 View Analytics
  📋 Create Release
  👥 Manage Team

> release "noite fria"
  🎵 Open Release
  📊 View Analytics
  🎬 Manage Assets
  ✅ View Approvals

> campaign summer 2026
  📢 Open Campaign
  📊 Analytics
  ✏️ Edit Details
  🗓️ View Schedule
```

### 4.4 Quick Actions Contextual

Em cada workspace, top-right:

```
[+ Add] [⋯ More] [? Help]
```

Que expande para:
```
+ Create Release
+ Add Collaborator
+ Upload Asset
+ Create Task
+ Schedule Post
```

---

## 5. PADRÕES GLOBAIS DE UX {#padrões-ux}

### 5.1 Anatomia de um Workspace

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar  │ Header                                            │
│ (Nav)    ├─────────────────────────────────────────────────┤
│          │ Breadcrumb | Title & Status | Quick Actions      │
│          ├─────────────────────────────────────────────────┤
│          │                                                   │
│          │ Tabs / Navigation (Horizontal)                   │
│          │ Overview | Releases | Tasks | Financial | ...    │
│          │                                                   │
│          ├─────────────────────────────────────────────────┤
│          │                                                   │
│          │              MAIN CONTENT AREA                   │
│          │                                                   │
│          │  (Grid, Cards, Tables, Kanban, Tabs)            │
│          │                                                   │
│          │                                                   │
│          │                                                   │
│          ├─────────────────────────────────────────────────┤
│          │ Contextual Sidebar (Right, Optional)             │
│          │ - Timeline Compacta                              │
│          │ - Quick Stats                                    │
│          │ - Pending Actions                                │
│          │ - Recent Activity                                │
│          │                                                   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Padrão de Card Padronizado

```tsx
// WorkspaceCard - padrão reutilizável
<Card className="workspace-card">
  <CardHeader>
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </div>
      <Badge variant="secondary" className="text-xs">{status}</Badge>
    </div>
    {subtitle && <CardDescription>{subtitle}</CardDescription>}
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter className="flex gap-2">
    {/* Actions */}
  </CardFooter>
</Card>
```

### 5.3 Timeline Activity Padrão

```
Timeline compacta com:
- Ícone de operação
- Timestamp
- Descrição
- Autor (avatar)
- Contexto (link)

Exemplo:
┌─────────────────────────────────────────┐
│ 📤 Release distribuído para DSPs        │
│ há 2 horas por João Silva               │
│                                          │
│ 👤 Asset aprovado                       │
│ há 4 horas por Maria Santos             │
│                                          │
│ 💰 Pagamento processado                 │
│ há 1 dia                                │
└─────────────────────────────────────────┘
```

### 5.4 Estados Visuais Padronizados

```
Estado       | Cor          | Ícone        | Sentido
─────────────┼──────────────┼──────────────┼──────────
Ativo        | Green        | CheckCircle  | Operacional
Pendente     | Amber        | Clock        | Aguardando
Bloqueado    | Red          | AlertCircle  | Atenção
Rascunho     | Gray         | FileText     | Incompleto
Arquivado    | Muted        | Archive      | Histórico
Processando  | Blue         | Loader       | Em progresso
```

### 5.5 Padrão de Tabla Workspace

```
┌──────────────────────────────────────────────┐
│ ☐ Item | Status | Date | Owner | Actions (⋯) │
├──────────────────────────────────────────────┤
│ ☐ ... | ⚡ ... | ... | @... | ⋯             │
│ ☐ ... | ✓  ... | ... | @... | ⋯             │
└──────────────────────────────────────────────┘

Sempre:
- Checkbox para bulk actions
- Status com badge visual
- Data de criação/modificação
- Proprietário/autor
- Menu de ações (⋯)
```

### 5.6 Empty States

```
Ao abrir um workspace vazio:

    🎵
    
Nenhum lançamento registrado

"Comece a criar seu primeiro lançamento"

[+ Create Release] [Learn More]
```

---

## 6. ESTRUTURA TÉCNICA {#estrutura-técnica}

### 6.1 Context Architecture

```typescript
// contexts/WorkspaceContext.tsx
interface WorkspaceContextValue {
  // Identificação
  workspaceType: 'artist' | 'release' | 'campaign' | 'project' | 'contract';
  workspaceId: string;
  
  // Entidade
  entity: Artist | Release | Campaign | Project | Contract;
  isLoading: boolean;
  error: Error | null;
  
  // Navegação
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  
  // Estado de UI
  selectedItems: string[];
  setSelectedItems: (ids: string[]) => void;
  
  // Activity
  activities: Activity[];
  isLoadingActivities: boolean;
  
  // Realtime
  isConnected: boolean;
  subscribers: number;
}

export const WorkspaceContext = React.createContext<WorkspaceContextValue | null>(null);
```

### 6.2 Hook Padrão

```typescript
// hooks/useWorkspaceContext.ts
export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext deve ser usado dentro WorkspaceProvider');
  }
  return context;
}
```

### 6.3 Estrutura de Query

```typescript
// queries/useArtistWorkspace.ts
export function useArtistWorkspace(artistId: string) {
  // Carrega artista
  const artist = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => artistService.getById(artistId),
  });
  
  // Carrega releases
  const releases = useQuery({
    queryKey: ['releases', artistId],
    queryFn: () => releaseService.getByArtist(artistId),
  });
  
  // Carrega activities
  const activities = useQuery({
    queryKey: ['activities', artistId],
    queryFn: () => activityService.getByEntity('artist', artistId),
  });
  
  // Carrega financial
  const financial = useQuery({
    queryKey: ['financial', artistId],
    queryFn: () => financialService.getByArtist(artistId),
  });
  
  return {
    artist: artist.data,
    releases: releases.data,
    activities: activities.data,
    financial: financial.data,
    isLoading: artist.isPending || releases.isPending,
    error: artist.error || releases.error,
  };
}
```

### 6.4 Realtime Integration

```typescript
// hooks/useWorkspaceRealtime.ts
export function useWorkspaceRealtime(
  workspaceType: string,
  entityId: string
) {
  const { supabase } = useSupabase();
  
  useEffect(() => {
    // Inscrever-se a atualizações
    const channel = supabase
      .channel(`workspace:${workspaceType}:${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: workspaceType,
          filter: `id=eq.${entityId}`,
        },
        (payload) => {
          // Atualizar contexto
          invalidateQuery([workspaceType, entityId]);
        }
      )
      .subscribe();
    
    return () => channel.unsubscribe();
  }, [workspaceType, entityId]);
}
```

### 6.5 Activity System

```typescript
// services/activityService.ts
export class ActivityService {
  // Registra uma ação
  async logActivity(data: {
    entityType: 'artist' | 'release' | 'campaign' | 'project' | 'contract';
    entityId: string;
    action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'published';
    description: string;
    userId: string;
    metadata?: Record<string, any>;
  }) {
    return db.insert('activity_logs').values({
      ...data,
      created_at: new Date(),
    });
  }
  
  // Carrega activities de uma entidade
  async getByEntity(entityType: string, entityId: string) {
    return db
      .select()
      .from('activity_logs')
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .orderBy('created_at', 'desc')
      .limit(50);
  }
}
```

---

## 7. HIERARQUIA DE ROTAS {#rotas}

### 7.1 Arquivo de Rotas Reorganizado

```typescript
// app/routes/workspace.routes.tsx
export const workspaceRoutes = [
  // Artist Workspace
  {
    path: "/workspace/artist/:artistId",
    element: <P><ArtistWorkspaceLayout /></P>,
    children: [
      { path: "overview", element: <ArtistOverview /> },
      { path: "releases", element: <ArtistReleases /> },
      { path: "campaigns", element: <ArtistCampaigns /> },
      { path: "financial", element: <ArtistFinancial /> },
      { path: "contracts", element: <ArtistContracts /> },
      { path: "tasks", element: <ArtistTasks /> },
      { path: "assets", element: <ArtistAssets /> },
      { path: "team", element: <ArtistTeam /> },
      { path: "calendar", element: <ArtistCalendar /> },
      { path: "analytics", element: <ArtistAnalytics /> },
      { path: "activity", element: <ArtistActivity /> },
      { path: "conversations", element: <ArtistConversations /> },
      { path: "approvals", element: <ArtistApprovals /> },
      { path: "settings", element: <ArtistSettings /> },
      { path: "", element: <Navigate to="overview" /> },
    ],
  },
  
  // Release Workspace
  {
    path: "/workspace/release/:releaseId",
    element: <P><ReleaseWorkspaceLayout /></P>,
    children: [
      { path: "overview", element: <ReleaseOverview /> },
      { path: "distribution", element: <ReleaseDistribution /> },
      { path: "assets", element: <ReleaseAssets /> },
      { path: "marketing", element: <ReleaseMarketing /> },
      { path: "content", element: <ReleaseContent /> },
      { path: "tasks", element: <ReleaseTasks /> },
      { path: "team", element: <ReleaseTeam /> },
      { path: "schedule", element: <ReleaseSchedule /> },
      { path: "financial", element: <ReleaseFinancial /> },
      { path: "recebimentos externos de direitos", element: <ReleaseRecebimentos externos de direitos /> },
      { path: "analytics", element: <ReleaseAnalytics /> },
      { path: "approvals", element: <ReleaseApprovals /> },
      { path: "activity", element: <ReleaseActivity /> },
      { path: "", element: <Navigate to="overview" /> },
    ],
  },
  
  // Campaign Workspace
  {
    path: "/workspace/campaign/:campaignId",
    element: <P><CampaignWorkspaceLayout /></P>,
    children: [
      { path: "overview", element: <CampaignOverview /> },
      { path: "goals", element: <CampaignGoals /> },
      { path: "budget", element: <CampaignBudget /> },
      { path: "tasks", element: <CampaignTasks /> },
      { path: "content", element: <CampaignContent /> },
      { path: "creators", element: <CampaignCreators /> },
      { path: "timeline", element: <CampaignTimeline /> },
      { path: "schedule", element: <CampaignSchedule /> },
      { path: "analytics", element: <CampaignAnalytics /> },
      { path: "reports", element: <CampaignReports /> },
      { path: "activity", element: <CampaignActivity /> },
      { path: "", element: <Navigate to="overview" /> },
    ],
  },
  
  // Project Workspace
  {
    path: "/workspace/project/:projectId",
    element: <P><ProjectWorkspaceLayout /></P>,
    children: [
      { path: "overview", element: <ProjectOverview /> },
      { path: "tasks", element: <ProjectTasks /> },
      { path: "timeline", element: <ProjectTimeline /> },
      { path: "team", element: <ProjectTeam /> },
      { path: "assets", element: <ProjectAssets /> },
      { path: "activity", element: <ProjectActivity /> },
      { path: "", element: <Navigate to="overview" /> },
    ],
  },
  
  // Contract Workspace
  {
    path: "/workspace/contract/:contractId",
    element: <P><ContractWorkspaceLayout /></P>,
    children: [
      { path: "overview", element: <ContractOverview /> },
      { path: "document", element: <ContractDocument /> },
      { path: "financial", element: <ContractFinancial /> },
      { path: "parties", element: <ContractParties /> },
      { path: "obligations", element: <ContractObligations /> },
      { path: "milestones", element: <ContractMilestones /> },
      { path: "activity", element: <ContractActivity /> },
      { path: "", element: <Navigate to="overview" /> },
    ],
  },
];

// app/routes/library.routes.tsx
export const libraryRoutes = [
  { path: "/library/artists", element: <P><ArtistsLibrary /></P> },
  { path: "/library/releases", element: <P><ReleasesLibrary /></P> },
  { path: "/library/campaigns", element: <P><CampaignsLibrary /></P> },
  { path: "/library/projects", element: <P><ProjectsLibrary /></P> },
  { path: "/library/contracts", element: <P><ContractsLibrary /></P> },
  { path: "/library/works", element: <P><WorksLibrary /></P> },
  { path: "/library/events", element: <P><EventsLibrary /></P> },
];
```

---

## 8. SISTEMA DE COMPONENTES {#componentes}

### 8.1 Componentes Reutilizáveis para Workspaces

```typescript
// components/shared-workspace/WorkspaceCard.tsx
export function WorkspaceCard({
  icon: Icon,
  title,
  subtitle,
  status,
  children,
  action,
  footer,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  status?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {subtitle && <CardDescription>{subtitle}</CardDescription>}
            </div>
          </div>
          {status && <Badge variant="secondary">{status}</Badge>}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {(action || footer) && (
        <CardFooter className="flex items-center justify-between">
          <div>{footer}</div>
          <div>{action}</div>
        </CardFooter>
      )}
    </Card>
  );
}

// components/shared-workspace/WorkspaceMetrics.tsx
export function WorkspaceMetrics({
  metrics,
}: {
  metrics: Array<{
    label: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    trend?: 'up' | 'down' | 'neutral';
    color: 'primary' | 'success' | 'warning' | 'destructive';
  }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {m.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{m.value}</p>
              </div>
              <m.icon className={cn("h-8 w-8", colorClass(m.color))} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// components/shared-workspace/WorkspaceActivityTimeline.tsx
export function WorkspaceActivityTimeline({
  activities,
  isLoading,
}: {
  activities: Activity[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, i) => (
        <div key={activity.id} className="flex gap-3">
          <div className="relative flex flex-col items-center">
            <activity.iconComponent className="h-4 w-4 text-muted-foreground" />
            {i < activities.length - 1 && (
              <div className="absolute top-6 w-0.5 h-6 bg-border" />
            )}
          </div>
          <div className="flex-1 pb-6">
            <p className="text-sm font-medium text-foreground">
              {activity.description}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(activity.created_at), {
                locale: ptBR,
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// components/shared-workspace/WorkspaceTeamCard.tsx
export function WorkspaceTeamCard({
  team,
  onAddMember,
  onRemoveMember,
}: {
  team: TeamMember[];
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Team</CardTitle>
          <Button size="sm" variant="ghost" onClick={onAddMember}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {team.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatarUrl} />
                  <AvatarFallback>{member.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemoveMember(member.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// components/shared-workspace/WorkspaceContextualSidebar.tsx
export function WorkspaceContextualSidebar({
  workspace,
  activities,
  pendingApprovals,
  quickStats,
}) {
  return (
    <div className="sticky top-0 h-screen overflow-y-auto border-l border-border bg-card/50 p-4 space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity
        </h3>
        <WorkspaceActivityTimeline activities={activities.slice(0, 5)} />
      </div>
      
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pending
        </h3>
        {pendingApprovals.map((approval) => (
          <div key={approval.id} className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs">
            {approval.description}
          </div>
        ))}
      </div>
      
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Stats
        </h3>
        {quickStats.map((stat) => (
          <div key={stat.label} className="flex justify-between text-xs py-1">
            <span className="text-muted-foreground">{stat.label}</span>
            <span className="font-semibold">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 8.2 Layout Componentes

```typescript
// layouts/WorkspaceLayout.tsx
export function WorkspaceLayout({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: React.ReactNode;
}) {
  const { currentTab, setCurrentTab } = useWorkspaceContext();
  const tabs = WORKSPACE_TABS[workspace.type];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <WorkspaceSidebar workspace={workspace} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <WorkspaceHeader workspace={workspace} />

        {/* Tabs */}
        <div className="border-b border-border bg-card/50 px-6">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={cn(
                  'py-3 text-sm font-medium border-b-2 transition-colors',
                  currentTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                {tab.badge && (
                  <Badge className="ml-2" variant="secondary">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>

      {/* Contextual Sidebar (Right) */}
      <WorkspaceContextualSidebar workspace={workspace} />
    </div>
  );
}
```

---

## 9. ACTIVITY & REALTIME SYSTEM {#activity-system}

### 9.1 Database Schema

```sql
-- activity_logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entidade e Operação
  entity_type VARCHAR NOT NULL,  -- 'artist', 'release', 'campaign', etc
  entity_id UUID NOT NULL,
  action VARCHAR NOT NULL,       -- 'created', 'updated', 'approved', etc
  
  -- Descrição e Metadata
  description TEXT NOT NULL,
  metadata JSONB,
  
  -- Autor
  user_id UUID NOT NULL,
  user_name VARCHAR,
  user_avatar_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices
  INDEX (entity_type, entity_id, created_at DESC),
  INDEX (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- real-time subscriptions
CREATE TABLE realtime_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id UUID NOT NULL,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (user_id, entity_type, entity_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 9.2 Activity Middleware (Backend)

```typescript
// api/middleware/activityLogger.ts
export async function logActivity(
  entityType: string,
  entityId: string,
  action: string,
  description: string,
  userId: string,
  metadata?: Record<string, any>
) {
  const db = getDatabase();
  
  await db.insert('activity_logs').values({
    entity_type: entityType,
    entity_id: entityId,
    action,
    description,
    user_id: userId,
    user_name: user.name,
    user_avatar_url: user.avatar_url,
    metadata,
    created_at: new Date(),
  });
  
  // Broadcast to realtime subscribers
  await broadcastActivity({
    entityType,
    entityId,
    action,
    description,
    user: { id: userId, name: user.name, avatar: user.avatar_url },
  });
}

// Exemplo de uso:
app.patch('/api/releases/:id', async (req, res) => {
  const release = await updateRelease(req.params.id, req.body);
  
  await logActivity(
    'release',
    req.params.id,
    'updated',
    `Release "${release.nome}" foi atualizada`,
    req.user.id,
    { changes: req.body }
  );
  
  res.json(release);
});
```

---

## 10. ESTRATÉGIA DE IMPLEMENTAÇÃO {#implementação}

### 10.1 Timeline de Implementação (Não-disruptiva)

```
FASE 1: Fundação (Semanas 1-2)
├── [ ] Criar estrutura de pastas para workspace/
├── [ ] Implementar WorkspaceContext
├── [ ] Criar hooks base (useWorkspaceContext, etc)
├── [ ] Implementar ActivityService no backend
├── [ ] Criar tabelas de activity_logs e realtime_subscribers
└── Resultado: Infraestrutura técnica pronta

FASE 2: Artist Workspace (Semanas 3-4)
├── [ ] Criar ArtistWorkspaceLayout
├── [ ] Implementar Artist Overview
├── [ ] Integrar Releases view
├── [ ] Adicionar Activity Timeline
├── [ ] Conectar Financial view
└── Resultado: Artist Workspace funcional

FASE 3: Release Workspace (Semanas 5-6)
├── [ ] Criar ReleaseWorkspaceLayout
├── [ ] Implementar Release Overview
├── [ ] Integrar Distribution view
├── [ ] Adicionar Assets management
├── [ ] Conectar Analytics
└── Resultado: Release Workspace funcional

FASE 4: Campaign Workspace (Semana 7)
├── [ ] Criar CampaignWorkspaceLayout
├── [ ] Implementar Campaign Overview
├── [ ] Integrar Goals e Budget
├── [ ] Adicionar Analytics
└── Resultado: Campaign Workspace funcional

FASE 5: Library & Navigation (Semana 8)
├── [ ] Criar Library pages (Artists, Releases, etc)
├── [ ] Implementar Contextual Sidebar
├── [ ] Adicionar Command Center (⌘K)
├── [ ] Integrar Quick Actions
└── Resultado: Navegação contextual completa

FASE 6: Polish & Optimization (Semana 9)
├── [ ] Testes de performance
├── [ ] Realtime synchronization testing
├── [ ] UI/UX refinements
├── [ ] Documentação
└── Resultado: Sistema pronto para produção
```

### 10.2 Estratégia Zero-Breaking-Changes

**Todos os módulos antigos se mantêm funcionais**

```
Hoje:
/artistas         → Artist List Page
/accounting       → Accounting Page

Depois (adição, não substituição):
/artistas                  → Artist List (mantém funcionando)
/accounting                → Accounting (mantém funcionando)

/workspace/artist/:id      → Artist Workspace (novo)
/workspace/release/:id     → Release Workspace (novo)

Gradualmente:
1. Adicionar links para workspaces nos módulos antigos
2. Atualizar sidebar para mostrar ambas rotas
3. Migrar dados e relacionamentos
4. Deprecar módulos antigos após validação
```

### 10.3 Checklist de Implementação

```
SETUP INICIAL
[ ] Criar pasta /modules/workspace
[ ] Criar /modules/activity-log
[ ] Criar /modules/shared-workspace-components
[ ] Setup de types e interfaces
[ ] Setup de queries e services

PRIMEIRA ENTIDADE (Artist)
[ ] ArtistWorkspaceLayout.tsx
[ ] WorkspaceContext (artist-specific)
[ ] useArtistWorkspace hook
[ ] Artist Overview page
[ ] Artist Releases section
[ ] Artist Financial section
[ ] Artist Activity Timeline
[ ] Artist Settings
[ ] Link do módulo artist → workspace

SEGUNDA ENTIDADE (Release)
[ ] ReleaseWorkspaceLayout.tsx
[ ] useReleaseWorkspace hook
[ ] Release Overview
[ ] Release Distribution
[ ] Release Assets
[ ] Release Analytics
[ ] Link do módulo releases → workspace

TERCEIRA ENTIDADE (Campaign)
[ ] CampaignWorkspaceLayout.tsx
[ ] useCampaignWorkspace hook
[ ] Campaign Overview
[ ] Campaign Goals e Budget
[ ] Campaign Analytics
[ ] Link do módulo marketing → workspace

LIBRARY & NAVIGATION
[ ] /library/artists page
[ ] /library/releases page
[ ] /library/campaigns page
[ ] Contextual Sidebar component
[ ] Command Center component
[ ] Quick Actions component
[ ] Sidebar updates

ACTIVITY SYSTEM
[ ] Activity service backend
[ ] Activity logs table
[ ] Real-time subscriptions
[ ] Activity Timeline component
[ ] Activity feed in workspaces

TESTING & OPTIMIZATION
[ ] Teste de performance
[ ] Teste de realtime
[ ] Teste de UX
[ ] Documentação
[ ] Deploy gradual
```

### 10.4 Prioridades Técnicas

```
MUST HAVE (Semanas 1-4)
✓ WorkspaceContext funcionando
✓ Artist Workspace básico
✓ Activity logging
✓ Performance aceita

SHOULD HAVE (Semanas 5-7)
- Release Workspace
- Campaign Workspace
- Realtime sync
- Contextual sidebar

NICE TO HAVE (Semana 8+)
- Command Center
- Advanced analytics
- Automations leves
- Custom workspaces
```

---

## 11. RESULTADO FINAL ESPERADO

### Como Será a Experiência

```
Usuário abre a aplicação
↓
Navega para Artistas (Library)
↓
Clica em "MC Lander"
↓
Abre Artist Workspace

[Visão de 360° da carreira do artista]
├── Overview com KPIs
├── Releases ativas (3)
├── Campanhas em andamento (1)
├── Financeiro do período
├── Tarefas pendentes (5)
├── Timeline de atividades (últimas 2h)
├── Equipe e colaboradores
└── Quick actions

Usuário clica em um release
↓
Abre Release Workspace

[Visão de 360° daquele lançamento]
├── Status de distribuição
├── Assets pendentes
├── Campanhas vinculadas
├── Tarefas do release
├── Analytics em tempo real
├── Timeline de operações
└── Equipe envolvida

Sensação: "Tudo conectado. Tudo aqui. Operação fluida."
```

---

## 12. PRÓXIMOS PASSOS

1. **Validação da Arquitetura**: Revisão com time
2. **Setup de Estrutura**: Criar pastas e arquivos base
3. **Implementação Phase 1**: Fundação técnica
4. **Prototipagem Artist Workspace**: Validar UX
5. **Rollout Gradual**: Teste, feedback, otimização

---

**Este é o blueprint para transformar Music OS 360 de um conjunto de módulos fragmentados em um sistema operacional musical moderno, contextual, fluido e absolutamente organizado.**
