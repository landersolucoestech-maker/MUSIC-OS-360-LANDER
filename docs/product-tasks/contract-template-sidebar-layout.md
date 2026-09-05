# Layout lado a lado — Informações Básicas + Identidade Visual

## What & Why
No workspace de templates de contrato (`ContractImportWorkspace`), as seções "Informações Básicas" e "Identidade Visual do Documento" estão empilhadas verticalmente, consumindo altura que poderia ser aproveitada pelo editor de conteúdo do contrato. O objetivo é colocá-las lado a lado numa única linha, liberando espaço vertical máximo para o textarea "Conteúdo do Contrato".

## Done looks like
- "Informações Básicas" e "Identidade Visual do Documento" aparecem em duas colunas na mesma linha (lado a lado), separadas por um divider vertical.
- O bloco "Conteúdo do Contrato" (textarea) ocupa toda a altura restante da coluna esquerda, visivelmente maior do que antes.
- A separação entre o bloco de topo e o editor mantém a borda horizontal que já existe.
- O layout não quebra em nenhuma resolução que o modal já suportava.

## Out of scope
- Alterações no painel de variáveis (coluna direita).
- Alterações nos campos em si (inputs, selects, image upload zones).
- Outras abas do workspace (Variáveis, Categorias, Preview).

## Steps
1. **Juntar as duas seções num único row** — Substituir os dois `<div>` com `border-b` independentes por um único container com `display: grid` (ou `flex`) de duas colunas, onde a primeira coluna contém "Informações Básicas" e a segunda "Identidade Visual do Documento". Manter apenas uma `border-b` na parte inferior desse container. Adicionar um divider vertical (`border-l`) entre as duas colunas.

2. **Ajustar alturas e padding** — Garantir que o container do topo seja `shrink-0` e que o bloco do editor (`flex-1 flex flex-col overflow-hidden`) continue crescendo para preencher o espaço restante sem alteração na sua própria estrutura interna.

## Relevant files
- `apps/web/src/modules/contracts/components/ContractImportWorkspace.tsx:710-814`
