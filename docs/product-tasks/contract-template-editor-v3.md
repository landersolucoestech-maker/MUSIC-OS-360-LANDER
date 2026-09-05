---
title: Free Contract Template Editor + Variable Registry System
---

# Free Contract Template Editor + Variable Registry

## O que é isto

Refactorização completa do módulo de templates contratuais em 3 partes:

1. **Editor livre** — textarea profissional onde o utilizador escreve/cola contratos e insere placeholders
2. **Variable Registry** — página dedicada para gerir variáveis globais com aliases livres
3. **IA opcional** — botão discreto de sugestões; não controla nada

---

## Parte 1 — Reescrever `ContractImportWorkspace.tsx` como editor livre

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ [←]  [Nome do template: ________________]   [✨ IA]   [Guardar]    │
├────────────────────────────────────────┬────────────────────────────┤
│                                        │  [🔍 Pesquisar...]         │
│  EDITOR LIVRE                          │                            │
│  ─────────────────────                 │  ▾ Envolvidos              │
│                                        │  {{PARTY.NAME}}      [+]   │
│  <textarea> de texto puro              │  {{PARTY.CPF}}       [+]   │
│  (write or paste any contract)         │  {{PARTY.EMAIL}}     [+]   │
│                                        │  ...                        │
│  {{placeholders}} são destacados       │  ▾ Financeiro              │
│  a azul no preview abaixo             │  {{PAYMENT.AMOUNT}}  [+]   │
│                                        │  {{PAYMENT.METHOD}}  [+]   │
│  ─────────────                         │  ...                        │
│  PREVIEW (só leitura)                  │  ▾ Contrato / Obra / Evento│
│  Texto com placeholders                │  ...                        │
│  coloridos/destacados                  │                            │
│                                        │  ── Minhas Variáveis ──    │
│                                        │  (do registry pessoal)     │
│                                        │  {{ARTISTA.NAME}}    [+]   │
│                                        │                            │
│                                        │  ──────────────────────    │
│                                        │  + Nova variável custom    │
│                                        │  [GRUPO.CAMPO]  [Criar]    │
└────────────────────────────────────────┴────────────────────────────┘
```

### Comportamento do editor

- `<textarea>` full-height, font-mono, sem estrutura obrigatória
- O utilizador edita o texto directamente — **nunca alterado automaticamente**
- O botão `[+]` junto a cada variável insere `{{GRUPO.CAMPO}}` na posição do cursor (via `selectionStart`/`selectionEnd`)
- Preview abaixo do editor: usa `renderHighlighted(text)` — split por regex `(\{\{[^}]+\}\})` e destaca a azul (read-only)

### Variáveis default (painel direito, sempre presentes)

```ts
const DEFAULT_VARIABLE_GROUPS = [
  {
    label: "Envolvidos",
    vars: [
      "PARTY.NAME", "PARTY.CPF", "PARTY.CNPJ", "PARTY.RG",
      "PARTY.EMAIL", "PARTY.PHONE", "PARTY.ADDRESS",
      "PARTY.NATIONALITY", "PARTY.MARITAL_STATUS",
      "PARTY.PROFESSION", "PARTY.ARTISTIC_NAME",
    ],
  },
  {
    label: "Financeiro",
    vars: [
      "PAYMENT.AMOUNT", "PAYMENT.CURRENCY", "PAYMENT.METHOD",
      "PAYMENT.DUE_DATE", "PAYMENT.DUE_DAY", "PAYMENT.INSTALLMENTS",
      "PAYMENT.DOWN_PAYMENT", "PAYMENT.FINAL_PAYMENT",
      "PAYMENT.RECURRENCE", "PAYMENT.LATE_INTEREST", "PAYMENT.FINE",
      "PAYMENT.ROYALTIES_PERCENTAGE", "PAYMENT.COMMISSION_PERCENTAGE",
    ],
  },
  {
    label: "Contrato",
    vars: [
      "CONTRACT.START_DATE", "CONTRACT.END_DATE", "CONTRACT.DURATION",
      "CONTRACT.RENEWAL", "CONTRACT.TERRITORY", "CONTRACT.JURISDICTION",
      "CONTRACT.CONFIDENTIALITY_PERIOD",
    ],
  },
  {
    label: "Obra",
    vars: ["WORK.TITLE", "WORK.ISRC", "WORK.ISWC", "WORK.UPC", "WORK.RELEASE_DATE"],
  },
  {
    label: "Evento",
    vars: ["EVENT.DATE", "EVENT.LOCATION", "EVENT.CACHE", "EVENT.HOSPITALITY", "EVENT.RIDER"],
  },
  {
    label: "Audiovisual",
    vars: ["VIDEO.RESOLUTION", "VIDEO.SCRIPT", "VIDEO.DELIVERY_DATE", "VIDEO.FORMAT"],
  },
];
```

### Pesquisa de variáveis

- Input de pesquisa no topo do painel direito
- Filtra em tempo real: mostra apenas variáveis que contêm o texto pesquisado (case-insensitive)
- Pesquisa nos grupos default + variáveis do registry pessoal

### Criação de variável custom inline

- Campo input: utilizador escreve `VIDEO.RESOLUTION`
- Regex de validação: `/^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]+$/i` (aceita lowercase, normaliza para uppercase)
- Botão "Criar" → adiciona ao registry (salva via hook) + insere no cursor opcionalmente
- Aparece na secção "Minhas Variáveis" no painel

### Botão "✨ IA" (opcional)

- No header, botão discreto (variant="outline", size="sm")
- Ao clicar: chama `parseContractText(text)` com loading spinner
- Resultado: mostra um sheet/popover com lista de sugestões
- Cada sugestão: `valor original` → `{{PLACEHOLDER.SUGERIDO}}` + botão "Aceitar" + botão "Ignorar"
- "Aceitar" substitui **apenas essa ocorrência** no textarea via string replace
- O utilizador pode fechar sem aceitar nada — não altera texto automaticamente

### Guardar

```ts
const placeholders = [...new Set(text.match(/\{\{[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]+\}\}/gi) ?? [])];
const manifest = { variables: placeholders, generatedAt: new Date().toISOString() };
onSave({ nome, tipo_servico: "semantico", conteudo: text, ativo: true,
         descricao: `${placeholders.length} variáveis`, variables_manifest: JSON.stringify(manifest) });
```

---

## Parte 2 — Variable Registry (nova página)

### Nova rota: `/contratos/variaveis`

Adicionar em `contracts.routes.tsx`:
```tsx
const VariableRegistry = lazy(() => import("@/modules/contracts/pages/VariableRegistry"));
<Route path="/contratos/variaveis" element={<P><VariableRegistry /></P>} />
```

### Novo ficheiro: `apps/web/src/modules/contracts/pages/VariableRegistry.tsx`

Página simples com:
- Header: "Variáveis de Template" / "Crie, organize e reutilize placeholders em qualquer contrato"
- Botão "Nova Variável" → abre modal de criação
- Tabela com colunas: **Nome** | **Grupo** | **Campo** | **Placeholder** | **Acções** (copiar, editar, apagar)
- Estado vazio: "Nenhuma variável criada. Clique em 'Nova Variável' para começar."

### Modal "Nova Variável"

3 campos:
1. **Nome amigável** — ex: "Nome do Artista" (label livre)
2. **Grupo / Contexto** — ex: "ARTISTA" (normalizado uppercase)
3. **Campo** — ex: "NAME" (normalizado uppercase)

Preview automático: `{{ARTISTA.NAME}}`

Validação:
- Grupo: `/^[A-Z][A-Z0-9_]+$/` mínimo 2 chars
- Campo: `/^[A-Z][A-Z0-9_]+$/` mínimo 2 chars

### Storage do registry

Novo key no localStorage: `musicos360_variable_registry`

Hook: `apps/web/src/modules/contracts/hooks/useVariableRegistry.ts`

```ts
interface RegistryVariable {
  id: string;
  name: string;       // "Nome do Artista"
  group: string;      // "ARTISTA"
  field: string;      // "NAME"
  placeholder: string; // "{{ARTISTA.NAME}}"
  createdAt: string;
}
```

O hook usa `useState` + `useEffect` com `localStorage` directamente (não precisa de `storage.ts` — é preferências do utilizador, não dados de negócio).

### Sidebar de navegação

Adicionar "Variáveis" como link no sidebar, sob Contratos, entre Templates e o que vier a seguir.

Ficheiro: `apps/web/src/shared/components/MainLayout.tsx` ou onde estão os links do sidebar.

---

## Ficheiros a criar / modificar

| Ficheiro | Acção |
|----------|-------|
| `contracts/components/ContractImportWorkspace.tsx` | Reescrever completamente (free editor) |
| `contracts/pages/VariableRegistry.tsx` | Criar (nova página) |
| `contracts/hooks/useVariableRegistry.ts` | Criar (hook localStorage) |
| `contracts/routes/contracts.routes.tsx` | Adicionar rota `/contratos/variaveis` |
| Sidebar/MainLayout | Adicionar link "Variáveis" |

Não modificar: `semantic-parser.service.ts`, `contracts.types.ts`, `useTemplatesContratos.ts`, `TemplatesContratos.tsx`

---

## Done looks like

1. `/contratos/templates` → lista de templates + botão "Novo Template"
2. Clicar "Novo Template" → editor full-screen com textarea + painel de variáveis
3. Colar texto → aparece no editor; placeholders já no texto ficam destacados no preview
4. Clicar `[+]` em `{{PAYMENT.AMOUNT}}` → inserido no cursor do textarea
5. Pesquisar "ARTISTA" → filtra variáveis do registry pessoal
6. Criar variável custom `SHOW.RIDER` → aparece em "Minhas Variáveis"
7. Botão "✨ IA" → mostra sugestões, utilizador decide individualmente
8. Guardar → template na lista
9. `/contratos/variaveis` → tabela de variáveis com criar/editar/apagar
10. TypeScript: EXIT:0

---

## Restrições

- Toast: `import { toast } from "sonner"` — NUNCA shadcn useToast
- Sem parallel tool calls (regra absoluta do utilizador)
- Grupos NÃO são limitados — qualquer string válida é aceite
- A IA NUNCA altera o texto automaticamente — apenas sugere
- O texto do editor é sempre a fonte da verdade
