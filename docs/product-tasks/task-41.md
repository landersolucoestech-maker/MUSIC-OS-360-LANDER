---
title: Tipos de Contrato dinâmicos — eliminar ARTISTA/EMPRESA_SERVICE_LABELS
---
# Tipos de Contrato Dinâmicos — eliminar ARTISTA/EMPRESA_SERVICE_LABELS

## What & Why
`ARTISTA_SERVICE_LABELS` e `EMPRESA_SERVICE_LABELS` estão hardcoded dentro de `ContratoFormModal.tsx` (linhas 29-51). Adicionar um novo tipo de serviço exige edição de código em vez de configuração administrativa. O formulário condiciona a exibição de campos financeiros (royalties, valor fixo, adiantamento) com base em strings estáticas como `"agenciamento"`, o que torna o sistema frágil e impossível de escalar. Esta task transforma tipos de contrato numa entidade dinâmica configurável com CRUD admin.

## Done looks like
- Nova tabela `contract_service_types` no mock data com os 14 tipos actuais migrados como linhas de dados (Empresariamento, Gestão, Agenciamento, Edição, Distribuição, Marketing, Produção Musical, Produção Audiovisual, Licenciamento, Publicidade, Parceria, Shows, Suporte Financeiro, Outros)
- Cada tipo tem as flags financeiras configuráveis: `requires_royalties`, `requires_fixed_value`, `requires_advance`, `requires_financial_support`, `allow_installments`, `financial_model` (valor_fixo / royalties / misto / recorrente)
- Cada tipo tem `client_types` (array: artista | pessoa_fisica | pessoa_juridica) para o filtro dinâmico
- Hook `useContractServiceTypes.ts` criado com lista, criar, editar, arquivar (não excluir se houver contratos vinculados)
- `ContratoFormModal.tsx` substituí `ARTISTA_SERVICE_LABELS` / `EMPRESA_SERVICE_LABELS` + `getFilteredServiceTypes()` pelo hook; os campos de valor (royalties %, valor fixo, adiantamento, suporte financeiro) são exibidos com base nas flags da entidade seleccionada — não em strings hardcoded
- Página `TemplatesContratos.tsx` ganha duas tabs: **Templates** (conteúdo actual) e **Tipos de Contrato** (nova tabela CRUD)
- A tab "Tipos de Contrato" tem: tabela com colunas Nome / Tipo de Cliente / Modelo Financeiro / Status / Ordem / Acções + modal criar/editar com todos os campos do spec + validação de slug único
- Contratos existentes no localStorage continuam a funcionar — o campo `tipo` é preservado; se não existir entrada em `contract_service_types` com esse slug, o label original é mantido como fallback

## Out of scope
- Geração automática de cláusulas financeiras em templates com base no tipo (futura task)
- Integração com módulo de Accounting para lançamento automático de pagamentos (depende de task #37-#40)
- Backend API endpoint para `contract_service_types` (mock data é suficiente na fase actual)
- Exclusão permanente — apenas arquivamento (ativo = false)

## Steps
1. **Mock data** — adicionar `contract_service_types` a `buildSeedData()` com os 14 tipos migrados; patch em `patchMockData()` para injectar se ausente; campos: `id`, `name`, `slug`, `description`, `client_types[]`, `financial_model`, `requires_royalties`, `requires_fixed_value`, `requires_advance`, `requires_financial_support`, `allow_installments`, `default_financial_category`, `active`, `sort_order`, `created_at`, `updated_at`
2. **Service** — adicionar `listContractServiceTypes`, `createContractServiceType`, `updateContractServiceType` ao `contracts.service.ts` (operações CRUD via `storage`)
3. **Hook** — criar `modules/contracts/hooks/useContractServiceTypes.ts` com TanStack Query: lista activos, filtra por `client_type`, mutações de criar/editar/arquivar com toast sonner
4. **Refactor ContratoFormModal** — substituir os dois mapas hardcoded e `getFilteredServiceTypes()` pelo hook; o select de Tipo de Serviço passa a usar os dados do hook filtrados por `client_type`; a visibilidade dos campos financeiros passa a usar as flags da entidade (`selectedType.requires_royalties` etc.) em vez de verificar strings; manter retrocompatibilidade via fallback para tipos antigos
5. **Tab "Tipos de Contrato" em TemplatesContratos.tsx** — envolver o conteúdo actual numa tab "Templates"; criar segunda tab "Tipos de Contrato" com tabela (Nome, Tipo de Cliente como badges, Modelo Financeiro, Status, Ordem, Acções editar/arquivar) + modal criar/editar com todos os campos do spec
6. **Validações do modal** — slug gerado automaticamente a partir do nome (slugify), editável manualmente; validar unicidade no submit; botão "Arquivar" não disponível se slug for usado em contratos existentes (verificar mock data)

## Relevant files
- `apps/web/src/modules/contracts/components/ContratoFormModal.tsx:29-51`
- `apps/web/src/modules/contracts/pages/TemplatesContratos.tsx`
- `apps/web/src/modules/contracts/services/contracts.service.ts`
- `apps/web/src/modules/contracts/hooks/useContratos.ts`
- `apps/web/src/shared/data/mockData.ts`
- `apps/web/src/modules/contracts/constants/contract-types.ts`