# 📐 MUSIC OS 360 — ARCHITECTURE DECISION RECORDS (ADRs)

**Documentação das decisões arquiteturais principais, contexto, e trade-offs**

---

## ADR-001: Workspaces Contextuais como Padrão Principal

### Status
✅ Aceito (2026-05-20)

### Contexto
Music OS 360 tinha 22 módulos fragmentados, navegação linear em menu, perda de contexto entre operações, UX quebrada.

### Decision
Implementar Workspaces Contextuais como padrão principal de organização.

**Workspace** = Centro operacional contextual de uma entidade (Artist, Release, Campaign, etc)

### Rationale
- ✅ Reduz navegação necessária (menos cliques)
- ✅ Mantém contexto operacional
- ✅ Agrupa operações relacionadas
- ✅ Escalável para novas entidades
- ✅ Melhora UX significativamente

### Alternatives Considered
1. **Dashboard centralizado gigante**: ❌ Poluído, sem contexto
2. **Modular menu expansível**: ❌ Segue sendo fragmentado
3. **SPA com states globais**: ❌ Complexo, difícil de manter

### Trade-offs
- ❌ Requer infraestrutura nova (Context, activity system)
- ❌ Mais componentes reutilizáveis
- ❌ Maior bundle size (mitigado por lazy loading)
- ✅ Experiência é drasticamente melhor

### Implementation
Rotas: `/workspace/:type/:id`  
Context: `WorkspaceContext`  
Tabs: Navegação horizontal integrada

---

## ADR-002: Activity Logging Centralizado

### Status
✅ Aceito (2026-05-20)

### Contexto
Sem rastreamento de operações, usuários não sabem histórico de mudanças, difícil auditoria, sem timeline de eventos.

### Decision
Implementar Activity Logging System centralizado.

**Cada ação gera um `ActivityLog`:**
- Criação, atualização, deletion
- Aprovação, rejeição, publicação
- Qualquer operação significativa

### Rationale
- ✅ Auditoria automática
- ✅ Timeline operacional
- ✅ Rastreamento de mudanças
- ✅ Notificações em tempo real
- ✅ Compliance e regulação

### Schema
```
activity_logs (
  id UUID,
  entity_type VARCHAR,           # 'artist', 'release', etc
  entity_id UUID,
  action VARCHAR,                # 'created', 'updated', etc
  description TEXT,
  metadata JSONB,
  user_id UUID,
  user_name VARCHAR,
  user_avatar_url VARCHAR,
  created_at TIMESTAMP
)
```

### Integration Points
- Middleware NestJS: `ActivityLogMiddleware`
- Service: `ActivityLogService.create()`
- Frontend: `useActivityLog()` hook
- Display: `ActivityTimeline` component

### Trade-offs
- ❌ Storage adicional (mitigado por archiving)
- ❌ Queries podem ficar lentas (índices)
- ✅ Visibilidade operacional

---

## ADR-003: Coexistência de Rotas Antigas e Novas

### Status
✅ Aceito (2026-05-20)

### Contexto
22 módulos já existem em produção com usuários dependentes deles.

### Decision
**Zero-Breaking-Changes Strategy:**
- Rotas antigas continuam funcionando
- Rotas novas (`/workspace/*`) coexistem
- Links podem apontar para um ou outro
- Migração gradual, não disruptiva

### Implementation
```
// Ambas funcionam simultaneamente
/artistas                         # Módulo antigo (mantém funcionando)
/workspace/artist/:id            # Novo workspace

/lancamentos                      # Módulo antigo
/workspace/release/:id           # Novo workspace
```

### Links de Transição
```
// No módulo antigo
<Button onClick={() => navigate(`/workspace/artist/${artistId}`)}>
  Open in new Workspace
</Button>
```

### Deprecation Timeline
```
Semana 1-8:   Ambas rotas funcionam (parallel)
Semana 9-12:  Avisos de deprecation (soft)
Semana 13+:   Remoção de rotas antigas
```

### Rationale
- ✅ Zero risco de quebrar produção
- ✅ Usuários podem migrar no seu tempo
- ✅ Feedback real de produção antes de remover
- ✅ Segurança operacional

### Trade-offs
- ❌ Código duplicado temporariamente
- ❌ Manutenção de ambos
- ✅ Segurança é prioridade

---

## ADR-004: React Context + TanStack Query Para State Management

### Status
✅ Aceito (2026-05-20)

### Contexto
Necessidade de state management para workspaces sem over-engineering.

### Decision
- **React Context**: UI state (currentTab, selectedItems, sidebarOpen)
- **TanStack Query**: Server state (entity, activities, financials)
- **Não usar Redux, Zustand**: Over-engineering

### Architecture
```
┌─────────────────────────────┐
│ Server State (React Query)  │
│ - Artist, Release data      │
│ - Activities                │
│ - Financial info            │
└────────────┬────────────────┘
             │ useQuery()
┌────────────▼────────────────┐
│ WorkspaceContext (UI State) │
│ - currentTab                │
│ - selectedItems             │
│ - sidebarOpen               │
└─────────────────────────────┘
```

### Rationale
- ✅ React Query: queries automáticas, caching, retry
- ✅ Context: simples, sem dependências extras
- ✅ Separação clara: server vs UI state
- ✅ Menos boilerplate

### Hooks Pattern
```typescript
const workspaceContext = useWorkspace(type, id);      // Server + UI state
const { activities } = useActivityLog(type, id);      // Server state
const { currentTab, setCurrentTab } = useWorkspaceContext(); // UI state
```

### Trade-offs
- ❌ Sem time-travel debugging (Redux)
- ❌ Sem Redux DevTools
- ✅ Muito mais simples
- ✅ Performance suficiente

---

## ADR-005: Activity Timeline como Primeiro-Class Feature

### Status
✅ Aceito (2026-05-20)

### Contexto
Usuários não veem o que aconteceu com uma operação, histórico invisível, difícil colaboração.

### Decision
**Activity Timeline é exibido em todo workspace:**
- Sidebar direita sempre mostra últimas atividades
- Timeline compacta mas informativa
- Clicável para mais detalhes
- Realtime quando possível

### Components
```
ActivityTimeline          # Exibe lista de atividades
ActivityCard             # Um item de atividade
ActivityFeed             # Feed em tempo real
```

### Display Pattern
```
┌──────────────────────────────┐
│ ACTIVITY (Right Sidebar)     │
├──────────────────────────────┤
│ ● Release distribuído        │ ← Dot indica ação
│   há 2h por João             │ ← Timestamp, autor
│                              │
│ ● Assets aprovados           │
│   há 4h por Maria            │
│                              │
│ ● Campanha iniciada          │
│   há 1d                      │
└──────────────────────────────┘
```

### Rationale
- ✅ Visibilidade operacional
- ✅ Colaboração melhor
- ✅ Rastreamento automático
- ✅ Auditoria built-in

### Trade-offs
- ❌ Requer activity logging system
- ✅ Transparência operacional

---

## ADR-006: Realtime Subscriptions com Supabase (Optional)

### Status
⏳ Opcional na Fase 1 (Implementar Fase 2)

### Contexto
Múltiplos usuários editando o mesmo workspace precisam ver mudanças em tempo real.

### Decision
Usar Supabase Realtime para:
- Atualizar activities em tempo real
- Notificar mudanças de status
- Sincronizar dados entre usuários

### Schema
```
Channel: workspace:{type}:{id}
Events:
  - activity_created
  - entity_updated
  - user_joined / user_left
```

### Implementation
```typescript
// Subscribe
supabase
  .channel(`workspace:artist:${artistId}`)
  .on('postgres_changes', ...)
  .subscribe();

// Broadcast
supabase.channel(`workspace:artist:${artistId}`)
  .send('broadcast', { event: 'activity_created', payload });
```

### Trade-offs
- ❌ Dependência externa (Supabase)
- ❌ Custo adicional
- ✅ Sync em tempo real
- ✅ Melhor UX colaborativa

### Alternative: WebSockets
- Mais controle
- Mais complexo de gerenciar
- Supabase é mais fácil

---

## ADR-007: 5 Workspaces Principais (Não infinitos)

### Status
✅ Aceito (2026-05-20)

### Contexto
Devemos criar exatamente quantos workspaces? Risco de proliferação.

### Decision
Começar com 5 workspaces principais:
1. **Artist**: Carreira do artista
2. **Release**: Lançamento de música
3. **Campaign**: Campanha de marketing
4. **Project**: Projeto genérico (tasks)
5. **Contract**: Gerenciamento de contrato

E 3 secundários:
- **Work**: Obra/Composição
- **Event**: Evento
- **Client**: Cliente (CRM)

### Rationale
- ✅ Cobre 80% dos casos de uso
- ✅ Não é infinito (mantém foco)
- ✅ Extensível para novos tipos
- ✅ Cada um tem propósito claro

### How to Add New Workspace
```
1. Criar WorkspaceContext
2. Criar hooks
3. Criar layout
4. Criar pages/tabs
5. Adicionar em rotas
6. Linkar de módulo relacionado
```

### Trade-offs
- ❌ Nem tudo pode ser workspace
- ✅ Foco e consistência

---

## ADR-008: Tabs Horizontal para Navegação dentro Workspace

### Status
✅ Aceito (2026-05-20)

### Contexto
Como organizar múltiplas seções dentro de um workspace?

### Decision
Usar **Tabs Horizontal** (não sidebar):
- Overview | Releases | Campaigns | Financial | ...
- Sempre visível
- Rápido switching
- Mobile: scroll horizontal

### Pattern
```
┌─────────────────────────────────┐
│ [Overview] [Releases] [Tasks] ▶ │  ← Tabs com scroll
└─────────────────────────────────┘

Click → Muda conteúdo abaixo
```

### Rationale
- ✅ Menos sidebar visual
- ✅ Mais espaço de conteúdo
- ✅ Fácil descobrir abas
- ✅ Mobile friendly

### Alternative: Sidebar dentro workspace
- Menos espaço de conteúdo
- Mais confuso com sidebar global

### Trade-offs
- ❌ Menos abas visíveis por vez (solução: scroll)
- ✅ Interface limpa

---

## ADR-009: Componentes Reutilizáveis em shared-workspace-components

### Status
✅ Aceito (2026-05-20)

### Contexto
Cada workspace precisa exibir: cards, métricas, timelines, tabelas padrão.

### Decision
Criar pasta `/shared-workspace-components` com componentes reutilizáveis:
- `WorkspaceCard`
- `WorkspaceMetrics`
- `ActivityTimeline`
- `WorkspaceTeamCard`
- `WorkspaceContextualSidebar`
- Etc...

### Rationale
- ✅ DRY: Não repetir código
- ✅ Consistência: Mesmo padrão
- ✅ Manutenção: Fixar bug uma vez
- ✅ Escalabilidade: Novo workspace rápido

### Governance
```
Antes de criar novo componente:
✓ Checkar se existe similar
✓ Se existe, reutilizar
✓ Se não, criar genérico e reutilizável
```

### Trade-offs
- ❌ Mais componentes no início
- ✅ Menos código repetido depois

---

## ADR-010: Formato de URL: /workspace/{type}/{id}/tabs?

### Status
✅ Aceito (2026-05-20)

### Contexto
Como estruturar URLs de workspace?

### Decision
```
/workspace/artist/:artistId
/workspace/artist/:artistId/overview
/workspace/artist/:artistId/releases
/workspace/release/:releaseId
/workspace/release/:releaseId/overview
/workspace/release/:releaseId/distribution
```

**Default**: `/overview` se não especificado

### Query Params (Opcional)
```
?filter=status:active
?sort=date:desc
?view=kanban
```

### Rationale
- ✅ RESTful
- ✅ Fácil deeplink
- ✅ Bookmarkable
- ✅ State na URL

### Implementation
```typescript
// useWorkspaceContext() lê currentTab da URL
// navigate(`/workspace/${type}/${id}/${tab}`) muda URL
```

### Trade-offs
- ❌ URL um pouco longa
- ✅ Todos os estados são compartilháveis

---

## ADR-011: Performance: Lazy Loading e Code Splitting

### Status
✅ Aceito (2026-05-20)

### Contexto
Muitos workspaces, muitos componentes = bundle grande.

### Decision
- Componentes de workspace: `lazy()`
- Tabs: carregam sob demanda
- Activity timeline: virtual scrolling se > 100 items
- Analytics charts: recharts dinâmico

### Implementation
```typescript
// Lazy load workspace pages
const ArtistOverview = lazy(() => import('./pages/ArtistOverview'));
const ArtistReleases = lazy(() => import('./pages/ArtistReleases'));

// In route
<Suspense fallback={<Skeleton />}>
  <ArtistOverview />
</Suspense>
```

### Metrics
- Main bundle: < 500KB
- Workspace bundle: ~100KB (lazy)
- First paint: < 2s
- TTI: < 3.5s

### Trade-offs
- ❌ Mais setup inicial
- ✅ Mais rápido em produção

---

## ADR-012: Não criar workflow engine massivo

### Status
✅ Aceito (2026-05-20)

### Contexto
Tentação: criar workflow engine automático complexo.

### Decision
**NÃO fazer:**
- Workflow engine complexo
- BPM (Business Process Management)
- Rules engine
- Automações mágicas

**SIM fazer:**
- Automações simples e óbvias
- Ações manuais claras
- Transições de status explícitas
- Activity logging de tudo

### Automações Simples
```
Release aprovada
  → Criar tarefas de marketing
  → Avisar equipe

Campaign finalizada
  → Gerar relatório
  → Atualizar analytics
```

### Rationale
- ✅ Simples de entender
- ✅ Fácil manutenção
- ✅ Não é "caixa preta"
- ❌ Menos automação que poderia ter

### Trade-offs
- ❌ Menos automação
- ✅ Muito mais simples
- ✅ Usuários entendem o que acontece

---

## ADR-013: Sem "Superpowers" Ocultas

### Status
✅ Aceito (2026-05-20)

### Contexto
Às vezes queremos criar features "escondidas" para power users.

### Decision
**Todos os features devem ser óbvios:**
- Se existe um botão, é visível
- Se existe uma ação, está no menu
- Sem atalhos escondidos
- Sem "Easter eggs" operacionais

### Rationale
- ✅ Interface clara
- ✅ Sem confusão
- ✅ Acessível para todos
- ✅ Documentação simples

### Exception
- Atalhos de teclado (⌘K, etc) podem ser descobertos

---

## ADR-014: Arquivo Único de Activity Log (Não um por entity)

### Status
✅ Aceito (2026-05-20)

### Contexto
Devemos ter uma tabela `activity_logs` ou uma por entity type?

### Decision
**Uma única tabela `activity_logs`** com campos:
- `entity_type` (VARCHAR)
- `entity_id` (UUID)

Não criar tabelas separadas:
- `artist_activities`
- `release_activities`
- `campaign_activities`

### Rationale
- ✅ Queries mais fáceis
- ✅ Busca global possível
- ✅ Menos tabelas
- ✅ Índices simples

### Indices
```sql
INDEX (entity_type, entity_id, created_at DESC)
INDEX (user_id)
```

### Trade-offs
- ❌ Tabela potencialmente grande
- ✅ Mais simples

---

## ADR-015: User Avatar em Activity (Não só nome)

### Status
✅ Aceito (2026-05-20)

### Contexto
Activity log mostra quem fez a ação. Só nome ou incluir avatar?

### Decision
Incluir `user_avatar_url` em cada activity log.

**Schema:**
```
user_id UUID
user_name VARCHAR
user_avatar_url VARCHAR  ← Adicionar isso
```

### Rationale
- ✅ Timeline mais visual
- ✅ Identidade rápida
- ✅ Melhor UX
- ✅ Pouco overhead

### Display
```
┌─────────────┐
│ ● [👤] Release distribuído
│    João Silva
│    2h ago
└─────────────┘
```

### Trade-offs
- ❌ Mais dados armazenados
- ✅ Interface melhor

---

## ADR-016: Não Sobre-Otimizar Cedo

### Status
✅ Aceito (2026-05-20)

### Contexto
Tentação: otimizar tudo desde dia 1.

### Decision
**Implementar simples primeiro:**
- Depois: medir performance
- Depois: otimizar o que realmente é problema

### Roadmap de Performance
- Semana 1-8: Funcional, não otimizado
- Semana 9: Medir com Lighthouse
- Se score < 80: otimizar
- Se score > 80: está bom

### Trade-offs
- ❌ Desenvolvimento mais rápido
- ✅ Melhor do que premature optimization

---

## ADR-017: TypeScript Strict Mode Obrigatório

### Status
✅ Aceito (2026-05-20)

### Contexto
TypeScript config deve ser rigoroso?

### Decision
**Sim, strict mode everywhere:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noImplicitReturns": true
  }
}
```

### Rationale
- ✅ Menos bugs
- ✅ Melhor autocompletar
- ✅ Refactoring seguro
- ✅ Documentação inline

### Trade-offs
- ❌ Mais verboso
- ✅ Mais seguro

---

## Próximas ADRs (Em desenvolvimento)

- ADR-018: Testing Strategy (E2E, Integration, Unit)
- ADR-019: Error Handling Pattern
- ADR-020: Notification System
- ADR-021: Mobile App Strategy

---

**Este documento é evolução. Será atualizado conforme novas decisões forem tomadas.**

**Última atualização**: 2026-05-20
