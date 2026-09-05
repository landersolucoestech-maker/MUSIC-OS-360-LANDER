# Design System Enterprise — Spacing + Grids + Loading + Empty States + Formulários

## What & Why
O frontend tem 15+ módulos desenvolvidos incrementalmente sem um design system centralizado aplicado de forma consistente. Isso resulta em: spacing inconsistente (alguns usam `gap-4`, outros `gap-6`, outros `space-y-3`), ausência de empty states padronizados (alguns módulos mostram tabela vazia, outros nada), loading states heterogêneos (alguns usam Skeleton, outros spinner, alguns nada), formulários com density visual diferente entre módulos, e motion/transições ausentes em muitos componentes. O resultado é uma UX com aparência amadora apesar dos dados serem enterprise.

## Done looks like
- `shared/design-system/tokens.ts` documenta todas as decisões: spacing scale, border-radius, shadows, motion durations
- Componente `<EmptyState>` padronizado: icon + title + description + optional CTA; aplicado em todas as tabelas e listas quando `data.length === 0`
- Componente `<PageSkeleton>` e `<TableSkeleton rows={N}>` padronizados; substituem spinners ad-hoc em todos os módulos
- Componente `<SectionCard>` padronizado para cards de conteúdo com header, body e footer opcionais; substituir divs genéricas nos dashboards
- Formulários: todos os formulários críticos (Artist, Fonograma, Contrato, Transação, Lead) usam o mesmo layout 2-col com `fieldset/legend` semântico, espaçamento `gap-6`, labels acima dos campos, helper text e mensagens de erro padronizadas
- `<StatusBadge>` unificado que substitui os múltiplos badge variants espalhados: aceita `status` e `variant` e mapeia para cor semanticamente correta (success=verde, warning=amarelo, destructive=vermelho, pending=azul)
- Motion: transições de modal (fade + scale 200ms), accordion (height 150ms), hover em rows de tabela (bg 100ms) — todos via Tailwind `transition-*`
- Mobile: todos os modais têm `max-h-[90vh] overflow-y-auto`; tabelas têm scroll horizontal em telas < 768px
- Nenhuma regressão funcional: UX operacional preservada integralmente

## Out of scope
- Reescrever módulos inteiros
- Dark mode (já configurado)
- Mudar identidade visual (cores, tipografia definidas)
- Storybook / documentação visual

## Steps
1. **Auditoria de inconsistências** — gerar lista de: todos os empty states existentes (ou ausentes), todos os loading patterns, todos os badge/status components, spacing inconsistente em formulários principais — base para o trabalho dos passos seguintes
2. **EmptyState component** — criar `shared/components/EmptyState.tsx`: props `{ icon, title, description, action?: { label, onClick } }`; aplicar em: ArtistasList, ObrasList, FonogramasList, ContratosList, LeadsList, TransaçõesList, ProjetosList, EventosList, InventárioList
3. **Skeleton components** — criar `shared/components/skeletons/TableSkeleton.tsx` e `PageSkeleton.tsx`; substituir todos os `isLoading && <Spinner>` por `<TableSkeleton rows={5} />` ou `<PageSkeleton />`; garantir que dimensões coincidem com layout real
4. **StatusBadge unificado** — criar `shared/components/StatusBadge.tsx` que consolida `ContratoStatusBadge`, badges de status de releases, de transações, de leads; mapeamento centralizado `status → variant → label`; substituir instâncias espalhadas pelo componente unificado
5. **Formulários críticos** — padronizar layout dos 5 formulários principais (ArtistaFormModal, FonogramaFormModal, ContratoFormModal, TransacaoFormModal, LeadFormModal): grid 2-col consistente, labels acima, helper text via `<FormDescription>`, error via `<FormMessage>`, `gap-6` entre grupos de campos
6. **Motion + mobile** — adicionar `transition-colors duration-100` em todas as table rows; `max-h-[90vh] overflow-y-auto` em todos os Dialog/Sheet com conteúdo longo; `overflow-x-auto` wrapping todas as tabelas; verificar que nenhum modal quebra em 375px

## Relevant files
- `client/src/shared/components/`
- `client/src/shared/design-system/`
- `client/src/modules/artist/components/ArtistaFormModal.tsx`
- `client/src/modules/catalog/components/FonogramaFormModal.tsx`
- `client/src/modules/contracts/components/ContratoFormModal.tsx`
- `client/src/modules/accounting/components/TransacaoFormModal.tsx`
- `client/src/modules/crm/components/LeadFormModal.tsx`
