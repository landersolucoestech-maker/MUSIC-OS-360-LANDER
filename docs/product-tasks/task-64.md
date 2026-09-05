---
title: Refactorizar Contract Intelligence Engine — AI semântica aberta, UI 3-pane, sem schemas fixos
---
---
title: Refactorizar completamente o módulo de Templates Contratuais — AI-Driven Semantic Engine
---

# Refactorizar o Contract Intelligence Engine

## Problema

A implementação actual viola os princípios arquitecturais do sistema em três camadas:

1. **Tipos fechados** — `SemanticClauseType` é uma union TypeScript fixa com 12 valores; qualquer cláusula fora desses 12 é silenciosamente descartada
2. **Namespaces fechados** — `ALLOWED_NAMESPACES` no `semantic-parser.service.ts` é um `Set` hardcoded; variáveis com namespaces como `AUTOR`, `COMPOSITOR`, `EDITORA`, `CEDENTE` são rejeitadas
3. **UI rígida** — `ContractImportWorkspace.tsx` (898 linhas) é um Dialog com wizard multi-step, abas, formulários rígidos e mapas de cores hardcoded — tudo o que o utilizador proibiu

## Princípio obrigatório

**O documento é a fonte da verdade.** A engine não pode ter:
- schemas pré-definidos
- namespaces fixos
- tipos de cláusula fixos
- formulários rígidos
- wizard multi-step
- abas

A engine **infere tudo** do contexto semântico do documento.

---

## Mudanças obrigatórias

### 1. `contracts.types.ts` — Abrir os tipos

```typescript
// ANTES (fechado):
export type SemanticClauseType =
  | "financeira" | "autoral" | "royalties" | "exclusividade"
  | "confidencialidade" | "inadimplencia" | "distribuicao_digital"
  | "licenciamento" | "rescisao" | "assinatura" | "prazo" | "objeto";

// DEPOIS (aberto):
export type SemanticClauseType = string;
```

`SemanticParseResult` e `SemanticTemplateManifest` herdam automaticamente o tipo aberto.

Remover `BrandingSettings`, `SignatureSettings`, `Participant`, `ContractVariable`, `FinancialConfig`, `ContractTemplate` do scope do engine semântico (podem ficar mas isolados — não são usados na nova UI).

### 2. `semantic-parser.service.ts` — Reescrever system prompt e remover validação fechada

**Remover completamente:**
- `ALLOWED_NAMESPACES` (Set hardcoded)
- `validatePlaceholder()` (verificação de namespace fechado)

**Nova `validatePlaceholder()`** — validação estrutural apenas:
```typescript
function validatePlaceholder(p: string): boolean {
  return /^\{\{[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]+\}\}$/.test(p);
}
```

**Reescrever SYSTEM_PROMPT** completamente:
- Remover lista fechada de namespaces permitidos
- Remover regra "omita se não souber o namespace" → substituir por "use o namespace mais preciso semanticamente — PARTE_A / PARTE_B como último recurso"
- Expandir exemplos para cobrir: AUTOR, COMPOSITOR, EDITORA, CEDENTE, CESSIONARIO, INTERPRETE, GRAVADORA, AGENCIA, REPRESENTANTE, LICENCIANTE, LICENCIADO, EVENT, VIDEO, WORK, PHONOGRAM, BEAT, DISTRIBUTION, CONTRACT, FINANCIAL, PAYMENT
- Instruir a IA a inferir contexto (financeiro, jurídico, operacional) ANTES de gerar o placeholder
- Instruir a IA a incluir todos os envolvidos detectados no documento
- SemanticClauseType no output: campo livre — a IA gera qualquer string descritiva do tipo de cláusula detectada
- Máximo de variáveis: aumentar de 40 para 60 (contratos complexos têm mais dados)

**Prompt financeiro detalhado** — adicionar ao SYSTEM_PROMPT exemplos explícitos para:
- royalties, cachê, multa, juros, mora, IPCA, IGPM, entrada, parcelamento, PIX, TED, boleto
- rider técnico, hospedagem, cronograma
- ISRC, ISWC, UPC, DSP, plataformas

### 3. `ContractImportWorkspace.tsx` — Reescrever completamente (não é Dialog)

**Layout actual:** Dialog modal com wizard multi-step (4 passos)

**Layout novo:** Página full-screen (ou drawer full-height) com 3 zonas fixas:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [← Voltar]   Contract Intelligence Engine         [Salvar Template]  │
├────────────────────────────┬───────────────────────────────────────────┤
│                            │                                           │
│   ZONA CENTRAL             │   PAINEL LATERAL                          │
│   ─────────────            │   ─────────────                           │
│                            │                                           │
│   Estado 1: DROP ZONE      │   Estado 1: Aguardando análise            │
│   ─────────────────        │   (placeholder animado)                   │
│   [ícone upload]           │                                           │
│   "Arraste ou clique       │   Estado 2: Analisando...                 │
│    para importar"          │   Loader + "A IA está a analisar          │
│   .PDF .DOCX .TXT          │   o documento semanticamente"             │
│                            │                                           │
│   Estado 2: EDITOR         │   Estado 3: Variáveis detectadas          │
│   ────────────────         │   ─────────────────────────               │
│   Texto do contrato        │   [chip: "financeira"] [chip: "autoral"]  │
│   renderizado (read-only   │                                           │
│   mas com highlight dos    │   VariableCard × N                        │
│   valores substituídos     │   ┌──────────────────────────────┐        │
│   por {{placeholders}}     │   │ valor original               │        │
│   em destaque)             │   │ contexto detectado           │        │
│                            │   │ {{PLACEHOLDER.GERADO}}       │        │
│   [Reanalizar] [Limpar]    │   │ [✓ Aceitar] [✗ Rejeitar]    │        │
│                            │   │ [editar placeholder]         │        │
│                            │   └──────────────────────────────┘        │
│                            │   [+ Adicionar variável manual]           │
│                            │                                           │
└────────────────────────────┴───────────────────────────────────────────┘
```

**Remover completamente:**
- Sistema de passos/wizard (`step` state, `setStep`)
- Aba "Financeiro", "Obra Musical", "Assinaturas", "Branding"
- `CLAUSE_TYPE_LABELS` / `CLAUSE_TYPE_COLORS` maps hardcoded
- Formulário de nome no final do wizard
- Qualquer `Select` com tipo fixo de contrato

**Manter (reescrever):**
- Upload de PDF (via mammoth para DOCX, texto puro para TXT, FileReader para PDF)
- Textarea para paste de texto
- Chamada a `parseContractText()`
- `VariableCard` (simplificado: valor original + contexto + placeholder editável + aceitar/rejeitar)
- `handleAddManualVariable`
- `applyVariablesToText()` para preview
- Salvar via `onSave()`

**Novo campo de nome do template:** Input simples no header (não numa aba separada)

**Clause type chips:** Renderizados dinamicamente como strings livres — sem mapa fixo de cores. Usar cor neutra única (outline badge) para todos.

### 4. `TemplatesContratos.tsx` — Remover mapas hardcoded

- Remover `CLAUSE_TYPE_LABELS` e `CLAUSE_TYPE_COLORS` (Record fechado)
- Renderizar clauseTypes como `<Badge variant="outline">{ct}</Badge>` genérico
- Manter stats, grid de cards, delete/view/edit

### 5. `TemplateContratoViewModal.tsx` e `TemplateContratoFormModal.tsx`

- `TemplateContratoFormModal.tsx` — remover (substituído pelo novo workspace)
- `TemplateContratoViewModal.tsx` — simplificar: mostrar texto do template com placeholders em destaque + lista de variáveis do manifest

---

## Ficheiros a modificar

| Ficheiro | Acção |
|----------|-------|
| `contracts/types/contracts.types.ts` | `SemanticClauseType = string` |
| `contracts/services/semantic-parser.service.ts` | Reescrever SYSTEM_PROMPT + abrir validatePlaceholder |
| `contracts/components/ContractImportWorkspace.tsx` | Reescrever completamente (layout 3-pane) |
| `contracts/components/TemplatesContratos.tsx` → page | Remover CLAUSE_TYPE_LABELS/COLORS maps |
| `contracts/components/TemplateContratoViewModal.tsx` | Simplificar |
| `contracts/components/TemplateContratoFormModal.tsx` | Remover ou esvaziar |

---

## Done looks like

1. Abrir `/contratos/templates` → lista de templates (sem mapas fixos)
2. Clicar "Novo Template" → workspace full-screen abre
3. Arrastar qualquer contrato (DOCX, TXT) → texto renderizado no centro
4. Clicar "Analisar com IA" → painel lateral preenche com variáveis detectadas
5. Variáveis incluem TODOS os envolvidos (autor, editora, cedente, etc.)
6. Clause type chips são strings livres (não enum fixo)
7. Utilizador pode aceitar/rejeitar/editar cada variável
8. Clicar "Salvar Template" → volta à lista com novo template
9. TypeScript: `EXIT:0`

---

## Restrições

- Não alterar `contracts.service.ts`, `useTemplatesContratos.ts` (data layer não muda)
- Não alterar a rota nem o `MainLayout`
- Manter `source?: "ai" | "manual"` em `SemanticVariable`
- Toast: `import { toast } from "sonner"`
- Sem parallel tool calls (regra absoluta do utilizador)