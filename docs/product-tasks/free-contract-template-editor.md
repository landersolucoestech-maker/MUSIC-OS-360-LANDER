---
title: Substituir o Contract Intelligence Engine por um editor livre de templates contratuais
---

# Editor livre de Templates Contratuais

## Mudança de direcção

O sistema anterior era centrado em IA: o utilizador importava um contrato → a IA analisava → detectava variáveis. Isso está errado.

O novo sistema é centrado no **utilizador como autor**:
- O utilizador escreve ou cola livremente qualquer contrato
- O utilizador insere placeholders clicando numa biblioteca lateral
- O utilizador cria variáveis customizadas sem restrições
- A IA é apenas uma sugestão opcional — não controla nada

## Arquitectura obrigatória

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [← Voltar]  Nome do template: [______________]        [Pré-visualizar] [Guardar] │
├──────────────────────────────────────┬───────────────────────────────────┤
│                                      │                                   │
│  EDITOR LIVRE                        │  BIBLIOTECA DE VARIÁVEIS          │
│  ─────────────                       │  ─────────────────────────        │
│                                      │                                   │
│  Textarea de texto livre             │  [🔍 Pesquisar variável...]       │
│  (como Notion/Docs)                  │                                   │
│                                      │  ▾ Envolvidos                     │
│  O utilizador escreve ou cola        │    {{PARTY_1.NAME}}  [+]          │
│  qualquer contrato.                  │    {{PARTY_1.CPF}}   [+]          │
│                                      │    {{PARTY_1.CNPJ}}  [+]         │
│  Os {{placeholders}} são             │    {{PARTY_1.RG}}    [+]          │
│  destacados a azul.                  │    {{PARTY_1.ADDRESS}} [+]        │
│                                      │    {{PARTY_1.EMAIL}} [+]          │
│  [Sugestões IA ▾]                    │    {{PARTY_1.PHONE}} [+]          │
│                                      │                                   │
│                                      │  ▾ Financeiro                     │
│                                      │    {{PAYMENT.AMOUNT}}  [+]        │
│                                      │    {{PAYMENT.CURRENCY}} [+]       │
│                                      │    {{PAYMENT.METHOD}} [+]         │
│                                      │    {{PAYMENT.DUE_DATE}} [+]       │
│                                      │    {{PAYMENT.INSTALLMENTS}} [+]   │
│                                      │    {{PAYMENT.LATE_INTEREST}} [+]  │
│                                      │    {{PAYMENT.FINE}} [+]           │
│                                      │                                   │
│                                      │  ▾ Contrato                       │
│                                      │    {{CONTRACT.START_DATE}} [+]    │
│                                      │    {{CONTRACT.END_DATE}} [+]      │
│                                      │    {{CONTRACT.DURATION}} [+]      │
│                                      │    {{CONTRACT.CITY}} [+]          │
│                                      │                                   │
│                                      │  ▾ Obra                           │
│                                      │    {{WORK.TITLE}} [+]             │
│                                      │    {{WORK.ISRC}} [+]              │
│                                      │    {{WORK.ISWC}} [+]              │
│                                      │    {{WORK.UPC}} [+]               │
│                                      │                                   │
│                                      │  ▾ Evento                         │
│                                      │    {{EVENT.NAME}} [+]             │
│                                      │    {{EVENT.DATE}} [+]             │
│                                      │    {{EVENT.LOCATION}} [+]         │
│                                      │    {{EVENT.CACHE}} [+]            │
│                                      │                                   │
│                                      │  ─────────────────────────        │
│                                      │  + Criar variável customizada      │
│                                      │  [GRUPO.CAMPO]  →  {{GRUPO.CAMPO}} │
└──────────────────────────────────────┴───────────────────────────────────┘
```

## O que REMOVER

- Todo o fluxo de import wizard (fase "upload" → "analyzing" → "review")
- Todo o processamento de ficheiros (FileReader, mammoth, PDF handling)
- A chamada `parseContractText()` como fluxo principal
- O `VariableCard` complexo com accept/reject
- O estado de fase (WorkspacePhase)
- As variáveis como lista editável separada

## O que MANTER / REUTILIZAR

- `applyVariablesToText()` para o preview
- `parseContractText()` como funcionalidade OPCIONAL ("Sugestões IA")
- `semantic-parser.service.ts` (já reescrito com namespaces abertos)
- Layout full-screen Dialog (`w-screen h-screen`)
- Header com campo de nome + botão guardar
- Toast `import { toast } from "sonner"`

## Implementação detalhada

### Editor central

- `<textarea>` redimensionável com scroll, font mono, texto livre
- Destaca {{placeholders}} visualmente: não modifica o texto base — usa um overlay ou aplica a função de highlight no preview separado
- Botão "Sugestões IA" (discreto, collapsible): ao clicar, chama `parseContractText()` e mostra um popover com as sugestões — o utilizador aprova cada uma individualmente
- O texto editado pelo utilizador é a fonte da verdade — nunca é alterado automaticamente

### Biblioteca de variáveis (painel direito)

Grupos pré-definidos (expansíveis/colapsáveis):

| Grupo | Variáveis base |
|-------|---------------|
| Envolvidos | PARTY_1.NAME, PARTY_1.CPF, PARTY_1.CNPJ, PARTY_1.RG, PARTY_1.ADDRESS, PARTY_1.EMAIL, PARTY_1.PHONE |
| Financeiro | PAYMENT.AMOUNT, PAYMENT.CURRENCY, PAYMENT.METHOD, PAYMENT.DUE_DATE, PAYMENT.INSTALLMENTS, PAYMENT.FREQUENCY, PAYMENT.LATE_INTEREST, PAYMENT.FINE |
| Contrato | CONTRACT.START_DATE, CONTRACT.END_DATE, CONTRACT.DURATION, CONTRACT.CITY, CONTRACT.STATE |
| Obra | WORK.TITLE, WORK.ISRC, WORK.ISWC, WORK.UPC |
| Evento | EVENT.NAME, EVENT.DATE, EVENT.LOCATION, EVENT.CACHE |

Botão `[+]` ao lado de cada variável → insere `{{GRUPO.CAMPO}}` na posição do cursor no editor.

Campo de pesquisa filtra variáveis de todos os grupos.

Secção "Customizadas" em baixo: mostra variáveis criadas pelo utilizador.

### Criação de variável customizada

1. Campo de input: utilizador escreve `VIDEO.RESOLUTION`
2. Sistema valida que tem formato `GRUPO.CAMPO` (regex `^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]+$`)
3. Sistema cria `{{VIDEO.RESOLUTION}}` e adiciona à secção "Customizadas"
4. Variável fica disponível para inserção como qualquer outra

### Sugestões IA (opcional)

Botão "✨ Sugestões IA" no header ou no editor:
1. Chama `parseContractText(currentText)` 
2. Mostra um painel dropdown com as variáveis sugeridas pela IA
3. Cada sugestão mostra: valor original + placeholder sugerido + botão "Aceitar" (que insere o placeholder substituindo o texto no editor)
4. O utilizador pode ignorar tudo ou aceitar selectivamente

### Guardar

- Filtra placeholders presentes no texto final: `text.match(/\{\{[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]+\}\}/g)`
- Cria manifest com as variáveis detectadas no texto
- Salva via `onSave(data: TemplateContratoInsert)`

## Ficheiros a modificar

| Ficheiro | Acção |
|----------|-------|
| `contracts/components/ContractImportWorkspace.tsx` | Reescrever completamente — free editor + variable library |
| `contracts/pages/TemplatesContratos.tsx` | Sem mudanças necessárias |
| `contracts/services/semantic-parser.service.ts` | Sem mudanças (já corrigido em #64) |
| `contracts/types/contracts.types.ts` | Sem mudanças (já corrigido em #64) |

## Done looks like

1. Abrir `/contratos/templates` → clicar "Novo Template"
2. Workspace full-screen abre com textarea vazia e biblioteca lateral
3. Utilizador cola um contrato → texto aparece no editor
4. Utilizador clica `[+]` ao lado de `{{PARTY_1.NAME}}` → placeholder inserido no cursor
5. Utilizador escreve `VIDEO.RESOLUTION` → clicar Criar → `{{VIDEO.RESOLUTION}}` disponível para inserção
6. Clicar "Guardar Template" → template guardado, volta à lista
7. TypeScript: EXIT:0

## Restrições

- Toast: `import { toast } from "sonner"` (nunca shadcn useToast)
- Sem parallel tool calls (regra absoluta)
- Manter compatibilidade com `useTemplatesContratos` hook (data layer intacto)
