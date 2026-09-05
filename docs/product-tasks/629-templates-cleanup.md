# Task #629 — Limpar página Templates: remover segunda aba + papéis de signatário

## Contexto
A página `/contratos/templates` tem duas abas ("Templates Simples" e "Templates com Variáveis")
porque durante a task #624 os dois sistemas coexistiram. Desde a task #627 o wizard de assinatura
digital foi eliminado — a aba "Templates com Variáveis" (contracts-v2) ficou sem utilidade.

O campo "papel" nos signatários (form de contrato + templates) tem roles que o utilizador quer remover.

## Alterações

### 1. TemplatesContratos.tsx — eliminar tabs
- Remover `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` da page root
- Remover a função `TabTemplatesVariaveis` e toda a sua lógica (useDocumentTemplates, NewTemplateFormV2, TemplateCardV2)
- A page passa a renderizar directamente o conteúdo de `TabTemplatesSimples` (sem wrapper de aba)
- Remover imports que ficam a zero: `useDocumentTemplates`, `useCreateTemplate`, `TEMPLATE_CATEGORY_LABEL`,
  `SIGNER_ROLE_LABEL` (contracts-v2), `TemplateCategory`, `SignerRole`, `createTemplateSchema`,
  `CreateTemplateInput`, `Tabs/*`, `Layers`, `Save`, `Trash2`, `Form/*`, `Textarea`, `toast`
- Remover `SIGNER_ROLE_OPTIONS` e `CATEGORY_OPTIONS` locais (apenas usados na aba removida)

### 2. contrato-schema.ts — remover roles
Remover de `SIGNER_ROLES`, `SIGNER_ROLE_LABEL` e do tipo derivado:
- `testemunha`
- `procurador`
- `advogado`

Resultado: apenas `["artista", "label", "produtor"]`

### 3. contracts-v2/types/index.ts — sincronizar SignerRole
Remover `"testemunha"`, `"procurador"`, `"advogado"` do union type `SignerRole`
(mantém: `"artista" | "label" | "produtor"`)

### 4. contracts-v2/types/index.ts — SIGNER_ROLE_LABEL
Verificar se existe `SIGNER_ROLE_LABEL` exportado neste ficheiro e, se sim,
remover as entradas dos roles removidos.

### 5. Validação
- `cd client && npx tsc --noEmit` → 0 erros

## Ficheiros afectados
- `client/src/modules/contracts/pages/TemplatesContratos.tsx`
- `client/src/modules/contracts/lib/contrato-schema.ts`
- `client/src/modules/contracts-v2/types/index.ts`

## Done when
- `/contratos/templates` mostra apenas uma única lista de templates, sem tabs
- Campo "papel" no formulário de contrato só oferece: Artista, Gravadora / Label, Produtor
- tsc → 0 erros
