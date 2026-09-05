# Upload Cabeçalho/Rodapé nos Editores de Template

## What & Why
Adicionar upload de imagem de cabeçalho e rodapé ao editor de criação e edição de templates de contrato. Nada mais.

## Done looks like
- No editor de criação (ContractImportWorkspace) existe uma secção "Cabeçalho / Rodapé" no painel lateral direito, abaixo das variáveis
- No editor de edição (TemplateEditModal) a mesma secção aparece no mesmo local
- O utilizador pode fazer upload de uma imagem PNG/JPG/WEBP para cabeçalho e outra para rodapé
- Após upload, aparece uma miniatura (preview) da imagem com botão de remoção (X)
- As imagens são convertidas para base64 e guardadas no payload de save como `header_image` e `footer_image`
- Ao reabrir um template em edição, as imagens guardadas são carregadas e mostradas no preview

## Out of scope
- Estilo A4 no editor
- Topbar contextual com múltiplos painéis
- Qualquer outra mudança visual ao editor

## Steps
1. **Adicionar secção de upload ao painel direito do ContractImportWorkspace** — Adicionar estados `headerImage` e `footerImage` (string base64 | null). Abaixo do criador de variável custom, adicionar dois campos de upload com preview e botão de remover. Incluir `header_image` e `footer_image` no payload do `handleSave`.

2. **Replicar para TemplateEditModal** — Mesmo upload nos mesmos estados. No `useEffect` que preenche o formulário, ler `header_image` e `footer_image` do template e pré-preencher. Incluir no payload do `handleSave`.

## Relevant files
- `apps/web/src/modules/contracts/components/ContractImportWorkspace.tsx`
- `apps/web/src/modules/contracts/components/TemplateEditModal.tsx`
