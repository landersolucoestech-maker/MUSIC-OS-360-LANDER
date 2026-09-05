---
title: Criar variáveis manualmente no Contract Intelligence Engine
---
---
title: Adicionar criação manual de variáveis no Contract Intelligence Engine
---
# Criação manual de variáveis no analisador de contratos

## What & Why

Após a análise semântica da IA, o utilizador só pode editar as variáveis detectadas
automaticamente. Não tem como adicionar variáveis novas que a IA não identificou —
por exemplo, uma cláusula específica que só ele reconhece como variável.

O pedido é: ter um botão "Adicionar Variável" que permita criar variáveis vazias
manualmente e preenchê-las à mão.

## Done looks like

- Botão "+ Adicionar" no cabeçalho do painel de variáveis (ao lado de "Aceitar todas")
- Clicar abre um mini-formulário inline (ou adiciona directamente um `VariableCard` novo
  com campos vazios em modo de edição)
- Nova variável criada com:
  - `id`: `crypto.randomUUID()` ou `nanoid`
  - `originalText`: vazio (utilizador preenche)
  - `placeholder`: vazio (utilizador preenche — sugestão automática ao escrever o texto original)
  - `inferredEntity`: vazio
  - `context`: vazio
  - `accepted: true` (criada manualmente → activa por defeito)
- O card novo é visualmente distinguível das variáveis AI (badge "manual" ou ícone diferente)
- Ao escrever em `originalText`, o campo `placeholder` auto-sugere
  `{{CONTRATO.NOME_EM_CAPS_UNDERSCORED}}` (mesmo padrão das variáveis AI)
- TypeScript EXIT:0

## Out of scope

- Seleccionar texto no editor para criar variável a partir da selecção (feature separada)
- Persistência/edição de variáveis manuais no TemplateEditModal (fora do import workspace)

## Steps

1. **Adicionar handler `handleAddManualVariable` em `ContractImportWorkspace`** —
   cria uma `SemanticVariable` com campos vazios e `accepted: true`, adiciona ao
   estado `variables`, activa-a (`setActiveVariableId`).

2. **Botão "+ Adicionar" no cabeçalho do painel** — ao lado de "Aceitar todas",
   sempre visível (independentemente de haver variáveis ou não).

3. **Badge "manual" no `VariableCard`** — detectar se `originalText` começa vazio ou
   usar um campo `source?: "ai" | "manual"` na interface. Adicionar campo `source` a
   `SemanticVariable` em `contracts.types.ts` como opcional (`source?: "ai" | "manual"`).
   Cards manuais mostram badge pequeno "Manual" na cor `outline`.

4. **Auto-sugestão de placeholder** — no `VariableCard`, quando `originalText` muda e
   `placeholder` está vazio, derivar o placeholder automaticamente:
   `{{CONTRATO.` + texto em maiúsculas, sem espaços (underscored) + `}}`.

5. **TypeCheck** — `cd apps/web && npx tsc --noEmit -p tsconfig.app.json 2>&1; echo "EXIT:$?"`

## Relevant files

- `apps/web/src/modules/contracts/components/ContractImportWorkspace.tsx`
  - linha 195: `VariableCard` component
  - linha 305: estado `variables`
  - linha 695: painel de variáveis (header + lista)
- `apps/web/src/modules/contracts/types/contracts.types.ts:191`
  - `SemanticVariable` interface — adicionar `source?: "ai" | "manual"`