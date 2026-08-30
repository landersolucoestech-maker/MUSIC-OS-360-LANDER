# 🎨 MUSIC OS 360 — DESIGN SYSTEM & UI/UX STANDARDS

**Padrões Visuais, Componentes e Experiência de Usuário para Workspaces**

---

## 🎯 PRINCÍPIOS DE DESIGN

### 1. Simplicidade Contextual
- Mostrar apenas o relevante para o contexto atual
- Sem overload de informação
- Hierarquia visual clara

### 2. Consistência Global
- Mesmo padrão em todos os workspaces
- Componentes reutilizáveis
- Tokens de design únicos

### 3. Profundidade Sem Complexidade
- Ações progressivas (básico → avançado)
- Minimizar navegação
- Maximizar contextualização

### 4. Fluidez Operacional
- Transições suaves
- Feedback imediato
- Estado sempre claro

---

## 🎨 PALETA DE CORES E TOKENS

### Design Tokens

```css
/* Status Colors */
--status-success: #10b981;      /* Aprovado, Publicado, Ativo */
--status-warning: #f59e0b;      /* Pendente, Atenção */
--status-error: #ef4444;        /* Erro, Cancelado */
--status-info: #3b82f6;         /* Informação, Processando */
--status-muted: #6b7280;        /* Arquivado, Inativo */

/* Action Colors */
--action-primary: #7c3aed;      /* Ações principais */
--action-secondary: #64748b;    /* Ações secundárias */
--action-success: #10b981;      /* Confirmar, Salvar */
--action-danger: #ef4444;       /* Deletar, Cancelar */

/* Entity Type Colors */
--entity-artist: #8b5cf6;       /* Purple */
--entity-release: #3b82f6;      /* Blue */
--entity-campaign: #ec4899;     /* Pink */
--entity-project: #14b8a6;      /* Teal */
--entity-contract: #f59e0b;     /* Amber */
--entity-work: #6366f1;         /* Indigo */
--entity-event: #06b6d4;        /* Cyan */
```

### Semantic Colors

```css
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
--muted: #6b7280;
```

---

## 📐 TIPOGRAFIA

### Hierarchy

```
Hero Title        (4xl, bold, 42px)
Page Title        (3xl, semibold, 30px)
Section Title     (2xl, semibold, 24px)
Card Title        (lg, semibold, 18px)
Body              (base, regular, 16px)
Small Text        (sm, regular, 14px)
Caption           (xs, regular, 12px)
Mono (Code)       (mono, sm, 14px)
```

### Font Stack

```
Body: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", sans-serif
Mono: "Fira Code", "Monaco", "Courier New", monospace
```

---

## 📦 COMPONENTES PADRONIZADOS

### 1. Card Padrão (Workspace Card)

```
┌─────────────────────────────────┐
│ [Icon] Title       [Status Badge]│
│        Subtitle                  │
├─────────────────────────────────┤
│ Content Area                    │
│                                 │
├─────────────────────────────────┤
│ [Footer]       [Action Button] │
└─────────────────────────────────┘

Specs:
- Radius: 12px
- Border: 1px solid border/40
- Shadow: sm (0 1px 2px)
- Padding: 16px (header), 16px (content)
- Gap between sections: 12px
```

### 2. Badge Padrão

```
Status Badges:
┌──────────────┐
│ ✓ Publicado  │  → Green, filled
└──────────────┘

┌──────────────┐
│ ⏱ Pendente   │  → Amber, filled
└──────────────┘

┌──────────────┐
│ ✗ Cancelado  │  → Red, outline
└──────────────┘

Action Badges:
[New] [In Progress] [Review] [Done]
```

### 3. Button Padronizado

```
PRIMARY (Ação principal)
┌─────────────────┐
│ + Create Release│  → Background: primary, Text: white
└─────────────────┘

SECONDARY (Ação secundária)
┌──────────────┐
│ Edit Details │  → Background: secondary, Text: foreground
└──────────────┘

GHOST (Link-like)
┌─────────────┐
│ View Details│  → No background, Text: primary
└─────────────┘

DESTRUCTIVE (Ações destrutivas)
┌───────────────┐
│ Delete Item   │  → Background: red, Text: white
└───────────────┘

Icon Buttons:
[⋯] [↗] [✎] [✗]  → 32x32px, Ghost variant
```

### 4. Input Padrão

```
Textbox:
┌─────────────────────────┐
│ Label                   │
├─────────────────────────┤
│ [Input field            │
│ with placeholder]       │
│                         │
│ Helper text (optional)  │
└─────────────────────────┘

Select:
┌──────────────────────┐
│ Label                │
├──────────────────────┤
│ [Selected Value ▼]   │
└──────────────────────┘

Checkbox:
☑ Label for checkbox

Radio:
◉ Option 1
○ Option 2
○ Option 3

Toggle Switch:
┌─ Toggle Label
│ [●─────] ON
```

### 5. Tab Navigation

```
┌─────────────────────────────────────────┐
│ Overview │ Releases │ Tasks │ Financial │
└─────────────────────────────────────────┘
    ▲
 Active tab has border-b colored
 
Normal tab: border-b transparent, text muted
Hover tab:  border-b transparent, text foreground
Active tab: border-b primary, text foreground
```

### 6. Dropdown Menu

```
[Button ▼]
    │
    ├─ [🔍] View Details
    ├─ [✎] Edit
    ├─ ─────────────  (separator)
    └─ [✗] Delete
```

### 7. Modais e Drawers

```
Modal (Center):
┌──────────────────────────────────┐
│ Modal Title         [✕]          │
├──────────────────────────────────┤
│ Modal Content                    │
│                                  │
│                                  │
├──────────────────────────────────┤
│ [Cancel]         [Confirm Action]│
└──────────────────────────────────┘

Drawer (Right-side):
┌────────────────┐
│ Title    [✕]   │
├────────────────┤
│ Content        │
│                │
│                │
├────────────────┤
│ [Actions]      │
└────────────────┘

Width: 480px (tablet), 360px (mobile)
```

### 8. Table Padrão

```
┌──┬────────┬──────────┬──────────┬──────────┬────────┐
│☐ │ Item   │ Status   │ Date     │ Owner    │ Action │
├──┼────────┼──────────┼──────────┼──────────┼────────┤
│☐ │ Item 1 │ ✓ Done   │ 2026-01-15 │ @user1 │ [⋯]  │
├──┼────────┼──────────┼──────────┼──────────┼────────┤
│☐ │ Item 2 │ ⏱ Pending│ 2026-01-16 │ @user2 │ [⋯]  │
└──┴────────┴──────────┴──────────┴──────────┴────────┘

- Alternating row colors (zebra striping)
- Hover row: bg slightly darker
- Checkbox para bulk actions
- Status com badge visual
```

### 9. Timeline Activity

```
┌────────────────────────────────────┐
│ ● Released to all platforms        │
│   2 hours ago by João Silva        │
│                                    │
│ ● Assets approved                  │
│   4 hours ago by Maria Santos      │
│                                    │
│ ● Campaign started                 │
│   1 day ago                        │
└────────────────────────────────────┘

Dot color = action type
- Green: Success/approval
- Blue: Update
- Orange: Warning/pending
- Red: Error/rejection
```

### 10. Empty State

```
        ╔════╗
        ║ 📁 ║
        ╚════╝
        
   No items yet
   
"Create your first release to get started"

     [+ Create Release]
```

---

## 🎯 WORKSPACE LAYOUTS

### Layout Tipo 1: Overview (Artista/Release)

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar │ Header: Artista Name | Status | Quick Actions        │
│         ├─────────────────────────────────────────────────────┤
│         │ Tabs: Overview | Releases | Campaigns | Financial... │
│         ├─────────────────────────────────────────────────────┤
│         │                                                      │
│         │ ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│         │ │ Metric 1     │  │ Metric 2     │  │ Metric 3   │ │
│         │ │ 123,456      │  │ 89,012       │  │ 345        │ │
│         │ └──────────────┘  └──────────────┘  └────────────┘ │
│         │                                                      │
│         │ ┌────────────────────────────────────────────────┐  │
│         │ │ Recent Activity                                │  │
│         │ │ ✓ Released to all platforms  2h ago          │  │
│         │ │ ✓ Assets approved             4h ago          │  │
│         │ └────────────────────────────────────────────────┘  │
│         │                                                      │
│         │ ┌──────────────────┐  ┌──────────────────┐          │
│         │ │ Releases (3)     │  │ Campaigns (1)    │          │
│         │ │ • Item 1         │  │ • Campaign Name  │          │
│         │ │ • Item 2         │  │   Budget: R$1k   │          │
│         │ │ • Item 3         │  │                  │          │
│         │ └──────────────────┘  └──────────────────┘          │
│         │                                                      │
├─────────┼─────────────────────────────────────────────────────┤
│Timeline │ [Activity compacta]                                  │
│Activity │                                                      │
└─────────┴─────────────────────────────────────────────────────┘
```

### Layout Tipo 2: Data-Heavy (Marketing/Analytics)

```
┌──────────────────────────────────────────────────────────┐
│ Sidebar │ Header | Tabs | Filters | Export              │
├──────────────────────────────────────────────────────────┤
│         │                                                │
│         │ ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│         │ │ Stat 1     │  │ Stat 2     │  │ Stat 3   │ │
│         │ └────────────┘  └────────────┘  └──────────┘ │
│         │                                                │
│         │ ┌─────────────────────────────────────────┐  │
│         │ │ [📊 Chart/Graph Area]                   │  │
│         │ │                                         │  │
│         │ │                                         │  │
│         │ └─────────────────────────────────────────┘  │
│         │                                                │
│         │ ┌─────────────────────────────────────────┐  │
│         │ │ Data Table                              │  │
│         │ │ ┌───┬──────┬──────┬──────┬──────┬────┐ │  │
│         │ │ │☑ │ Item │ Val1 │ Val2 │ Val3 │[⋯]│ │  │
│         │ │ ├───┼──────┼──────┼──────┼──────┼────┤ │  │
│         │ │ │☐ │ Item │ Val1 │ Val2 │ Val3 │[⋯]│ │  │
│         │ │ └───┴──────┴──────┴──────┴──────┴────┘ │  │
│         │ └─────────────────────────────────────────┘  │
│         │                                                │
├─────────┼──────────────────────────────────────────────┤
│Sidebar  │ Quick Stats / Pending                        │
│Activity │                                                │
└─────────┴──────────────────────────────────────────────┘
```

### Layout Tipo 3: Task Management (Kanban/List)

```
┌──────────────────────────────────────────────────────────┐
│ Sidebar │ Header | Tabs | View Toggle (List/Board)     │
├──────────────────────────────────────────────────────────┤
│         │                                                │
│         │ [Backlog]  [To Do]  [In Progress]  [Done]     │
│         │   (3)       (5)       (2)           (8)       │
│         │   ┌─────┐  ┌─────┐  ┌──────┐     ┌──────┐   │
│         │   │Task1│  │Task2│  │Task 3│     │Task 8│   │
│         │   │ P1  │  │ P0  │  │ P0   │     │ P2   │   │
│         │   └─────┘  └─────┘  └──────┘     └──────┘   │
│         │   ┌─────┐  ┌─────┐  ┌──────┐     ┌──────┐   │
│         │   │Task2│  │Task3│  │Task 4│     │Task 9│   │
│         │   └─────┘  └─────┘  └──────┘     └──────┘   │
│         │            ┌─────┐  ┌──────┐                 │
│         │            │Task4│  │Task 5│                 │
│         │            └─────┘  └──────┘                 │
│         │                                                │
│         │ [+ Add Task]                                  │
│         │                                                │
├─────────┼──────────────────────────────────────────────┤
│Sidebar  │ Filters | Sort | Assignees                  │
└─────────┴──────────────────────────────────────────────┘
```

---

## 🔄 STATES E TRANSITIONS

### Loading State

```
Skeleton placeholders:
┌──────────────────────┐
│ [█████░░░░]          │  ← Shimmer effect
└──────────────────────┘

Componentes principais shows skeletons
- Cards show 3 cards skeleton
- Table shows 5 rows skeleton
- Timeline shows 3 items skeleton
```

### Error State

```
┌───────────────────────────────────────┐
│ ⚠ Something went wrong                │
│ "Connection lost. Retrying..."        │
│ [Retry]  [Go Back]                    │
└───────────────────────────────────────┘
```

### Empty State

```
┌───────────────────────────────────────┐
│         📁 or relevant icon           │
│ No items to display                   │
│ "Create your first [item]"            │
│ [+ Create]                            │
└───────────────────────────────────────┘
```

### Success State

```
┌───────────────────────────────────────┐
│ ✓ Operation completed successfully    │
│ "Item created"                        │
│ Auto-dismiss após 4 segundos          │
└───────────────────────────────────────┘
```

---

## 🎬 ANIMATIONS & TRANSITIONS

### Durações Padrão

```
Fast:       150ms  (hover states, quick feedback)
Normal:     200ms  (standard transitions)
Slow:       300ms  (modal opens, page transitions)
```

### Easing

```
UI Elements:    ease-in-out
Loading:        ease-out
Modals:         cubic-bezier(0.34, 1.56, 0.64, 1)
```

### Exemplos

```
Hover State:
- opacity: 0.8 → 1
- transform: none → translateY(-2px)
- duration: 150ms

Modal Open:
- opacity: 0 → 1
- transform: scale(0.95) → scale(1)
- duration: 200ms

Loading Spinner:
- rotate: 0deg → 360deg
- duration: 1s
- loop infinite
```

---

## 📱 RESPONSIVE BREAKPOINTS

```
Mobile:       < 640px     (sm)
Tablet:       640px-1024px (md/lg)
Desktop:      > 1024px    (xl/2xl)

Grid Changes:
- sm: 1 col
- md: 2 cols
- lg: 3-4 cols
- xl: 4-6 cols

Sidebar:
- sm: Collapsible, overlay
- md+: Fixed, always visible

Contextual Sidebar:
- sm: Hidden
- md: Drawer/overlay
- lg+: Fixed, 320px width
```

---

## ♿ ACESSIBILIDADE

### Keyboard Navigation

```
Tab:        Navegar entre elementos
Shift+Tab:  Navegar reverso
Enter:      Ativar botão/link
Space:      Toggle checkbox
Escape:     Fechar modal/dropdown
Arrow keys: Navegar em dropdowns/tabs
```

### ARIA Labels

```
[aria-label="Close modal"]
[aria-pressed="true"]
[aria-expanded="false"]
[role="navigation"]
[role="main"]
[role="status"]
```

### Color Contrast

```
Mínimo WCAG AA: 4.5:1 (texto normal)
Mínimo WCAG AA: 3:1 (texto grande, elementos UI)
Evitar: só cores para comunicar
Adicionar: ícones, textos, padrões
```

---

## 🎨 WORKSPACE-SPECIFIC STYLING

### Artist Workspace
- Cor primária: Purple (#8b5cf6)
- Ícone: 🎤
- Tema: Carreira e performance

### Release Workspace
- Cor primária: Blue (#3b82f6)
- Ícone: 🎵
- Tema: Distribuição e operação

### Campaign Workspace
- Cor primária: Pink (#ec4899)
- Ícone: 📢
- Tema: Marketing e analytics

### Project Workspace
- Cor primária: Teal (#14b8a6)
- Ícone: 📋
- Tema: Tasks e gerenciamento

### Contract Workspace
- Cor primária: Amber (#f59e0b)
- Ícone: 📄
- Tema: Legal e obrigações

---

## 📚 COMPONENTES REUTILIZÁVEIS

**Todos implementados em:**  
`apps/web/src/modules/shared-workspace-components/`

```
✓ WorkspaceCard
✓ WorkspaceMetrics
✓ WorkspaceActivityTimeline
✓ WorkspaceTeamCard
✓ WorkspaceContextualSidebar
✓ WorkspaceTaskList
✓ WorkspaceBudgetCard
✓ WorkspaceTimelineSection
✓ WorkspaceEmptyState
✓ WorkspaceErrorState
✓ WorkspaceLoadingSkeleton
✓ WorkspaceQuickActions
```

---

## 🔍 EXEMPLO: Artist Workspace - Overview

```
┌─────────────────────────────────────────────────────────┐
│ 🎤 MC Lander | [Online]  [+ Add Release] [⋯]            │
├─────────────────────────────────────────────────────────┤
│ Overview | Releases | Campaigns | Financial | ... │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  KPIs:                                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐ │
│  │ 🎵 Streams   │ │ 💰 Revenue   │ │ 📈 Growth      │ │
│  │ 2.3M         │ │ R$ 45.230    │ │ +23% this month│ │
│  └──────────────┘ └──────────────┘ └────────────────┘ │
│                                                          │
│  Recent Releases (3):                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🎵 Noite Fria           │ 📊 2.3M streams        │ │
│  │ by MC Lander            │ ✓ Publicado há 2 meses│ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 🎵 Sonho Dourado        │ 📊 1.8M streams        │ │
│  │ by MC Lander            │ ✓ Publicado há 4 meses│ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Active Campaigns (1):                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 📢 Summer Campaign 2026                            │ │
│  │ Budget: R$ 5.000 | Status: ⏱ Running             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Activity (Last 24h)                                      │
│ ✓ Release distributed   2h ago                          │
│ 👤 Team member added    6h ago                          │
│ 💰 Payment processed    1d ago                          │
└─────────────────────────────────────────────────────────┘
```

---

**Este design system garante:**
- ✓ Consistência visual
- ✓ Acessibilidade
- ✓ Responsividade
- ✓ Performance
- ✓ Experiência premium
