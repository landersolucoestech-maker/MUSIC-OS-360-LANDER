---
title: Layout Template Tab — Painel Variáveis + Formulário à Esquerda
---
# Layout Template Tab — Painel Variáveis + Formulário à Esquerda

## What & Why
Na aba "Template" do modal `ContractImportWorkspace`, as secções "Informações Básicas" e "Identidade Visual do Documento" ficam empilhadas em cima do editor, ocupando altura de forma vertical e comprimindo o painel lateral "Variáveis do Registo". O utilizador quer que essas secções fiquem no lado esquerdo (junto do editor) para que o painel de variáveis tenha mais altura disponível.

## Done looks like
- A aba "Template" usa um layout de 2 colunas lado a lado:
  - **Coluna esquerda** (`flex-1`): secção "Informações Básicas" (nome + categoria) → secção "Identidade Visual" (header/footer image uploaders) → editor de texto (ocupa o restante da altura)
  - **Coluna direita** (largura fixa, igual à actual `w-72`): painel "Variáveis do Registo" ocupa toda a altura do modal, sem ser espremido pelas secções superiores
- O painel de variáveis (ScrollArea) tem significativamente mais altura visível do que antes
- As secções "Informações Básicas" e "Identidade Visual" passam a ter scroll próprio ou ficam fixas no topo da coluna esquerda com overflow controlado
- O visual geral do modal mantém a mesma largura, border-b e estilos existentes; apenas o eixo do layout muda de vertical (top→bottom) para horizontal (left | right)

## Out of scope
- Alterações às abas Variáveis, Categorias ou Preview
- Alterações ao footer fixo (Cancelar + Salvar Template)
- Alterações ao `ImageUploadZone` em si

## Steps
1. **Reestruturar o TabsContent "template"** — trocar o layout actual (stack vertical de secções `shrink-0` + flex row `Editor | Vars`) por um único flex row de 2 colunas que ocupa todo o espaço disponível: coluna esquerda (`flex-1`, `flex flex-col`, `overflow-y-auto`) + coluna direita (largura fixa, `flex flex-col`, `border-l`, altura completa).
2. **Coluna esquerda** — mover para dentro dela, em ordem: "Informações Básicas" (sem `border-b`, com `border-b` interno entre secções ou `px-6 py-4` normal), "Identidade Visual do Documento", e a área do editor de texto com o botão "Analisar com IA". A coluna deve ter `overflow-y-auto` para permitir scroll se o conteúdo crescer.
3. **Coluna direita** — o painel "Variáveis do Registo" fica na coluna direita e cresce para ocupar toda a altura disponível do modal (sem estar limitado pelas secções de formulário). Manter `ScrollArea flex-1` para a lista de variáveis e o bloco "Variável Rápida" fixo no fundo.

## Relevant files
- `apps/web/src/modules/contracts/components/ContractImportWorkspace.tsx:707-886`