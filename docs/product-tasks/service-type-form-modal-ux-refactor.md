# ServiceTypeFormModal — UX/Layout Refactor

## What & Why
The current `ServiceTypeFormModal` is visually flat: all fields render in a single vertical sequence with no grouping, hierarchy, or breathing room. The modal is also too narrow (`max-w-lg`) for the volume of content. This refactor reorganises the JSX into five labelled sections (Cards) and improves desktop layout without touching any business logic, validation, or submit payload.

## Done looks like
- Modal opens at `max-w-4xl` width — noticeably wider and more comfortable
- Five distinct visual sections, each with a Card header and clear title:
  1. **Informações Básicas** — Nome, Descrição, Tipos de Cliente
  2. **Configuração Financeira** — Modelo Financeiro, checkboxes financeiros in a 2-column grid, Categoria Financeira Padrão
  3. **Cláusulas do Contrato** — existing clause editor with internal scroll area, variable chips instead of inline text
  4. **Personalização do Documento** — Cabeçalho + Rodapé upload (unchanged)
  5. **Configurações Avançadas** — Slug, Ordem de exibição, Status Ativo, inside a Collapsible/Accordion section styled as secondary
- Financial checkboxes render in a 2-column responsive grid instead of a vertical list
- Available template variables are shown as inline badge chips instead of a long text paragraph
- All `data-testid` attributes preserved
- No changes to Zod schema, submit payload, upload logic, hooks, or useEffect

## Out of scope
- Business logic changes
- Zod schema changes
- Submit payload changes
- Adding or removing fields
- Changing upload behaviour for cabeçalho/rodapé
- Any changes outside `ServiceTypeFormModal.tsx`

## Steps
1. **Widen the modal** — Change `max-w-lg` to `max-w-4xl` on the `DialogContent`; adjust `ScrollArea` max-height to `max-h-[85vh]` accordingly.
2. **Section 1 — Informações Básicas** — Wrap Nome, Descrição, Tipos de Cliente in a Card with CardHeader/CardTitle "Informações Básicas". Use a 2-column grid for Nome + (empty or description row).
3. **Section 2 — Configuração Financeira** — Wrap Modelo Financeiro, financial checkboxes, and Categoria Financeira Padrão in a Card with CardHeader/CardTitle "Configuração Financeira". Render checkboxes in a `grid grid-cols-2 gap-2` layout.
4. **Section 3 — Cláusulas do Contrato** — Keep existing clause logic; wrap in a Card with CardHeader/CardTitle "Cláusulas do Contrato". Replace the variables text paragraph with individual `<Badge variant="outline">` chips in a flex-wrap row.
5. **Section 4 — Personalização do Documento** — Wrap cabeçalho/rodapé upload fields in a Card with CardHeader/CardTitle "Personalização do Documento". Grid layout 2 columns.
6. **Section 5 — Configurações Avançadas** — Place Slug, Ordem de exibição, and Status Ativo inside a `Collapsible` (shadcn) with a muted/secondary trigger label "Configurações Avançadas". Collapsed by default when creating; expanded when editing.

## Relevant files
- `apps/web/src/modules/contracts/components/ServiceTypeFormModal.tsx`
- `apps/web/src/shared/ui/card.tsx`
- `apps/web/src/shared/ui/collapsible.tsx`
- `apps/web/src/shared/ui/badge.tsx`
