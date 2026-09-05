---
title: Remover páginas Conciliação, Fluxo de Caixa e Relatórios
---
# Remover páginas do Financeiro

## What & Why
Remover as páginas Conciliação, Fluxo de Caixa e Relatórios do módulo Financeiro (accounting), eliminando rotas, links de navegação e arquivos de página correspondentes.

## Done looks like
- As rotas `/accounting/conciliacao`, `/accounting/fluxo` e `/accounting/relatorios` não existem mais
- Os links para essas páginas foram removidos do sidebar
- Os arquivos de página foram deletados
- O restante do módulo (Transações, Contabilidade, Nota Fiscal) funciona normalmente

## Out of scope
- Alterações em qualquer outra seção do módulo Financeiro
- Remoção de dados mock relacionados

## Steps
1. **Remover rotas** — Excluir as 3 `<Route>` de `accounting.routes.tsx` e os 3 lazy imports correspondentes
2. **Remover nav links** — Remover os itens Conciliação, Fluxo de Caixa e Relatórios do `AppSidebar.tsx`
3. **Deletar arquivos de página** — Remover `FluxoCaixa.tsx`, `Conciliacao.tsx` e `RelatoriosFinanceiros.tsx`

## Relevant files
- `client/src/app/routes/accounting.routes.tsx`
- `client/src/shared/components/layout/AppSidebar.tsx`
- `client/src/modules/accounting/pages/FluxoCaixa.tsx`
- `client/src/modules/accounting/pages/Conciliacao.tsx`
- `client/src/modules/accounting/pages/RelatoriosFinanceiros.tsx`