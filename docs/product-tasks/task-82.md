---
title: Refatorar modal 'Novo Template' — 3 abas (Template · Variáveis · Preview)
---
# Refatorar Modal "Novo Template" — 3 Abas

## What & Why

O modal `ContractImportWorkspace` (aberto por "+ Novo Template" em `/contratos/templates`) tem um layout vertical longo e desorganizado. A refatoração transforma-o num editor profissional com 3 abas horizontais no topo: **Template · Variáveis · Preview**.

## Done looks like

### Modal
- Largura ~980–1100 px, altura máxima 85 vh, sem scroll externo
- Header fixo: título "Novo Template de Contrato" + botão X
- Tabs horizontais pills no topo: **Template · Variáveis · Preview**
- Footer fixo: texto "Alterações salvas automaticamente" à esq. + botões Cancelar + Salvar Template (com loading state) à dir.

### Aba — Template
- **Seção Informações Básicas**: grid 2 colunas — Input "Nome do Template" + Select "Categoria"
- **Seção Cabeçalho e Rodapé**: dois `ImageUploadZone` lado a lado para `header_image` / `footer_image`. Cada um tem: estado vazio elegante (ícone + texto), hover state, preview `object-contain`, overlay com botão Substituir e botão Remover
- **Editor de Cláusulas** (abaixo dos uploads): `<textarea>` contínuo full-height estilo documento (padding generoso, fundo levemente mais claro, tipografia elegante), placeholder "Escreva o conteúdo do contrato…", sem o sistema antigo de múltiplos cards por cláusula. Highlight de `{{VARIAVEL}}` mantido
- **Painel lateral fixo** à direita (largura ~272 px): lista de variáveis agrupadas por categoria (AGÊNCIA, ARTISTA, FINANCEIRO…); clicar numa variável insere-a no editor com toast de confirmação. Painel sempre visível dentro desta aba

### Aba — Variáveis
- Renderiza o conteúdo completo do `VariableRegistry` existente (busca, listagem, criar, editar, apagar, importar XLSX, exportar XLSX) — **sem** o PageHeader da página standalone
- Usar a lógica já existente via `useVariableRegistry`

### Aba — Preview
- Simula uma folha A4 (max-w, sombra, padding interno amplo) com:
  - Cabeçalho: imagem de `header_image` (ou área vazia elegante)
  - Corpo: texto do contrato com variáveis `{{X.Y}}` destacadas
  - Rodapé: imagem de `footer_image` (ou área vazia elegante)
- Visual inspirado em documento Word/PDF

### Limpeza
- Remover o Dialog separado do `VariableRegistry` e o estado `varRegistryOpen` adicionados na tarefa anterior — a funcionalidade vive agora na aba Variáveis
- Remover o botão "Variáveis" que abria esse Dialog do cabeçalho do modal
- Remover imports não usados; confirmar `tsc --noEmit --skipLibCheck` sem erros

## Out of scope
- Alterações na página standalone `/contratos/variaveis`
- Backend / persistência real
- Editor rich-text WYSIWYG
- Edição de templates existentes (outro momento)

## Steps

1. **Reestruturar o modal** — Substituir o layout vertical por: header fixo → `<Tabs>` (shadcn) com 3 triggers → área de conteúdo scrollável → footer fixo. Apagar blocos antigos (cards de cláusulas, campos dispersos).

2. **Aba Template — Informações Básicas** — Grid 2 colunas com Input Nome e Select Categoria usando estado controlado já existente.

3. **Aba Template — Uploaders** — Componente `ImageUploadZone` interno (não exposto) com os dois estados (vazio / com imagem + overlay), usando `FileReader` já presente no código original.

4. **Aba Template — Editor + painel lateral** — Flex row: editor `<textarea>` full-height à esq.; painel `RegistryVarGroup` fixo (w-72) à dir. com variáveis clicáveis que inserem no editor. Preservar lógica de detecção semântica e botão IA.

5. **Aba Variáveis** — Montar o conteúdo do `VariableRegistry` com `asModal={true}` (sem PageHeader) dentro do `TabsContent` respectivo, passando `onClose` como no-op já que não há Dialog wrapper.

6. **Aba Preview** — Componente `A4Preview` interno: container folha A4 com sombra; renderiza header_image, conteúdo com highlight de variáveis e footer_image.

7. **Footer fixo + cleanup** — Footer sticky, remover Dialog `varRegistryOpen`, estado e botão obsoletos, confirmar TypeScript limpo.

## Relevant files

- `apps/web/src/modules/contracts/components/ContractImportWorkspace.tsx`
- `apps/web/src/modules/contracts/pages/VariableRegistry.tsx`
- `apps/web/src/modules/contracts/hooks/useVariableRegistry.ts`
- `apps/web/src/modules/contracts/types/contracts.types.ts`
- `apps/web/src/shared/ui/tabs.tsx`
- `apps/web/src/shared/ui/dialog.tsx`
- `apps/web/src/shared/ui/scroll-area.tsx`