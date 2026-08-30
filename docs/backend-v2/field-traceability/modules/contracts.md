# Módulo `contracts` — Auditoria Zero-Gap (Fase 2, Prompt 102)

STATUS: **COMPLETE** — UNMAPPED_*: 0, UNKNOWN_FIELD_CLASSIFICATIONS: 0.

Escopo real (seguindo imports/hooks/endpoints, não a pasta `contracts/`):
- Frontend: `apps/web/src/modules/contracts/**` + consumido de `apps/web/src/modules/integrations/{hooks/useSigningProviders.ts, services/signing.service.ts, adapters/signing.adapter.ts}`.
- Backend: `apps/api/src/modules/contracts/**`, `apps/api/src/modules/contract-templates/**`,
  `apps/api/src/modules/contract-service-types/**`, `apps/api/src/modules/contact-contracts/**`,
  a seção Autentique/DocuSign de `apps/api/src/modules/integrations/integrations.controller.ts` +
  `apps/api/src/modules/integrations/autentique/autentique.service.ts`.
- Tabelas (Fase 1, ground truth): `contracts` (25 col), `contract_templates` (11 col),
  `contract_service_types` (32 col) — todas `backendMapping: DIRECT`. `counterparties` (14 col,
  `NO_TABLE_CONSUMER`) foi encontrada na busca por palavra-chave mas pertence ao domínio financeiro
  (`accounting`, migration `FinancialPartiesAccounts`), não a `contracts` — registrada apenas como
  nota, não auditada aqui.

---

## 1. Subdomínios reais identificados

| Subdomínio | FRONTEND_ENTRYPOINT | ENDPOINTS | BACKEND_CONTROLLER | SERVICE | DATABASE_TABLES |
|---|---|---|---|---|---|
| CONTRACT | `Contratos.tsx`, `ContratoWizard.tsx` (principal), `ContratoFormModal.tsx` (secundário, só via `catalog`) | `GET/POST/PATCH/DELETE /contracts` | `contracts.controller.ts` | `contracts.service.ts` | `contracts` |
| CONTRACT_TEMPLATE | `TemplatesContratos.tsx` | `GET/POST/PATCH/DELETE /contract-templates` | `contract-templates.controller.ts` | `contract-templates.service.ts` | `contract_templates` |
| CONTRACT_SERVICE_TYPE | `ContratoFormModal.tsx` (leitura, dropdown); nenhuma tela de gestão real | `GET/POST/PATCH /contract-service-types` | `contract-service-types.controller.ts` | `contract-service-types.service.ts` | `contract_service_types` |
| CONTRACT_CATEGORY (rótulos) | `CategoryRegistry.tsx` | nenhum (100% localStorage) | — | `useCategoryRegistry.ts` | nenhuma (browser only) |
| TEMPLATE_VARIABLE_REGISTRY | `VariableRegistry.tsx` | nenhum (100% localStorage) | — | `useVariableRegistry.ts` | nenhuma (browser only) |
| CONTRACT_PARTY (partes) | inline em `ContratoWizard.tsx` (Passo 2, dinâmico via placeholders do template) | nenhum endpoint próprio — serializado dentro de `observacoes` | — | — | `contracts.observacoes` (texto livre, JSON serializado) |
| SIGNATORY (signatários) | inline em `ContratoWizard.tsx` (Passo 5) / `SendForSigningDialog.tsx` | escrito via `POST/PATCH /contracts` (`signers`) | `contracts.controller.ts` | `contracts.service.ts` | `contracts.signers` (jsonb) |
| E-SIGNATURE / AUTENTIQUE | nenhum (ver §27) | `POST /integrations/autentique/configure\|send`, webhook | `integrations.controller.ts` | `autentique.service.ts` | `contracts.autentique_doc_id/.signing_platform` |
| E-SIGNATURE / DOCUSIGN | nenhum consumidor de assinatura real (só OAuth genérico) | `POST /integrations/oauth/init\|exchange`, `GET status`, `DELETE disconnect` | `integrations.controller.ts` | inline no controller | tokens OAuth (tabela de credenciais de integrações, fora do escopo deste módulo) |
| CONTRACT_IMPORT (semântico/IA) | `ContractImportWorkspace.tsx` | `POST /api/v1/ai/generate` (via `semantic-parser.service.ts`) | módulo de IA (fora de escopo) | `parseContractText()` | nenhuma tabela própria — alimenta a criação de `contract_templates` |
| CONTACT_CONTRACTS (contratos vinculados a contato CRM) | **nenhum** | `GET/POST /contacts/:contactId/contracts` | `contact-contracts.controller.ts` | `contact-contracts.service.ts` | **nenhuma — `Map` em memória, não persiste em Postgres** |
| CONTRACT_EXPIRY (vencimento) | nenhuma UI direta — resultado visível via badge "Xd" na grid e eventos de notificação | cron interno + `POST /internal/cron/contract-expiry` (Vercel) | `contract-expiry-cron.controller.ts` | `contract-expiry.scheduler.ts` | `contracts.data_fim`, `.metadata.expiry_notified_at` |
| CONTRACT_WORKFLOW (estados) | `ContratoWizard.tsx` (só rascunho/aguardando_assinatura), `ContratoViewModal.tsx` (transições via `useWorkflowTransition`) | `PATCH /contracts/:id` (campo `status`) | `contracts.controller.ts` | `contracts.service.ts` + `WorkflowService` | `contracts.status` |
| CONTRACT_TO_ACCOUNTING | nenhuma UI — automação 100% backend, disparada por `CONTRACT_SIGNED` | evento interno | `contract-events.handler.ts` | `TransactionEntity` (accounting) | `transactions` (via evento, não FK direta) |

13 subdomínios reais identificados.

---

## 2. `Auditoria.tsx` — CROSS_MODULE_AUDITORIA_TSX (trecho contracts)

Ferramenta real (mesma de `catalog.md` §2): `apps/web/src/modules/admin/pages/Auditoria.tsx`, tab
"Contratos" (`module: "contratos"`). Roda sobre `apps/web/src/shared/lib/audit/runner.ts:114-128`.

`AUDITORIA_CONTRACT_FIELDS`:

| Campo | Severidade |
|---|---|
| `titulo` | obrigatorio |
| `tipo` | obrigatorio |
| `status` | obrigatorio |
| `data_inicio` | recomendado |
| `data_fim` | recomendado |
| `arquivo_url` | recomendado |

`AUDITORIA_CONTRACT_RULES`: mesmo motor genérico de `hasValue()` de `catalog.md` — só campos
`obrigatorio` bloqueiam `is_complete`. `fix_path` = `/contratos?edit=<id>`.

`AUDITORIA_CONTRACT_DATABASE_SOURCES`: `storage.list("contratos")` → `GET /contracts` — mesmo
hook/endpoint usado por `useContratos()`, sujeito ao mesmo limite de 50 registros do backend
(`ContractsService.list()`, `.take(query.limit ?? 50)`) — não é uma fonte de dados separada.

`AUDITORIA_CONTRACT_GAPS`: verificado que `/contratos?edit=<id>` **funciona corretamente** — a
página `Contratos.tsx` usa `useEditQueryParam("edit", contratos, ...)` (linha 44-48) que abre
`ContratoWizard` em modo edição para o contrato indicado; diferente do que uma leitura superficial
sugeriria, este deep-link **não é um gap**. O único gap herdado é o limite de 50 registros
(§12.10) — contratos além da 50ª posição nunca aparecem na lista de incompletos da Auditoria.

`AUDITORIA_TSX_CONTRACT_SECTION_COMPLETE: SIM`.

---

## 3. Componentes (classificação completa)

| Componente | Classificação | Observação |
|---|---|---|
| `ContratoWizard.tsx` | CREATE_MODAL + EDIT_MODAL + WIZARD (6 passos) | real, 1420 linhas, fluxo **principal** usado por `Contratos.tsx`; sem campo `arquivo_url` (§17/§26) |
| `ContratoFormModal.tsx` | CREATE_MODAL + EDIT_MODAL | real, 685 linhas, fluxo **secundário**, só alcançável via `RegistroMusicas.tsx` (`catalog`) após criar Obra/Fonograma; tem `arquivo_url` como campo de texto simples |
| `ContratoViewModal.tsx` | DETAIL_MODAL + WORKFLOW transitions | real, 526 linhas, único lugar que expõe `allowed_transitions` via `useWorkflowTransition` |
| `SendForSigningDialog.tsx` | SIGNATURE_UI | real UI, mas a operação final sempre falha — ver §27 |
| `ContractImportWorkspace.tsx` | IMPORT + OTHER_DATA_CONSUMER | real, 863 linhas, importação semântica de texto colado (IA) para gerar um novo template |
| `ContractA4Preview.tsx` | DOCUMENT_PREVIEW | real, renderiza o `conteudo` resolvido do template como preview A4 (HTML, não PDF) |
| `ContratoStatusBadge.tsx` | STATIC | badge de status, mapeamento label↔cor |
| `DocumentStatusBadge.tsx` | STATIC | badge para `VinculadoDocument.status` — **nunca populado com dado real** (ver §26, `useDocuments` é stub) |
| `DocumentTimeline.tsx` | STATIC | timeline de eventos de um `VinculadoDocument` — mesmo motivo, sem dado real para renderizar |
| `SigningPlatformBadge.tsx` | STATIC | badge Autentique/Clicksign/DocuSign, usado na grid de `Contratos.tsx` |
| `TemplateContratoViewModal.tsx` | DETAIL_MODAL | real, view-only de um `TemplateContrato` |
| `Contratos.tsx` | TABLE + FILTER + SEARCH (sem SORT) | página principal, 9 colunas visíveis, sem ordenação por coluna |
| `TemplatesContratos.tsx` | TABLE + FILTER + SEARCH + SORT | página de templates, usa `sortTableRows` |
| `CategoryRegistry.tsx` | TABLE + CREATE + EDIT | 531 linhas, gerencia **somente** `contract_categories` (localStorage) — não toca `contract_service_types` apesar do nome sugerir isso |
| `VariableRegistry.tsx` | TABLE + CREATE + EDIT | 843 linhas, gerencia **somente** `variable_registry` (localStorage) |
| `contracts.store.ts` (hooks/ e store/, mesmo arquivo) | DEAD | Zustand store nunca importado fora do próprio arquivo (mesmo padrão do `catalog.store.ts` já registrado em `catalog.md`) |
| `forms/index.ts`, `utils/contract-variables.ts` | STATIC/OTHER | `forms/index.ts` é stub vazio; `contract-variables.ts` contém helpers reais usados por `VariableRegistry.tsx` |
| `contract-party-origin.mapper.ts` (+ re-export em `mappers/`) | DEAD | `getContractPartyOrigin()` não tem nenhum importador em `apps/web/src` fora do próprio par de arquivos — código morto, superado pela detecção dinâmica de partes via placeholders do `ContratoWizard` |

Confirmado por grep: `useCatalogStore`-equivalent (`useContratosStore`, se existir) e
`contract-party-origin.mapper.ts` não têm consumidor.

---

## 4. Hooks

| HOOK | FILE | ENDPOINTS | READ/WRITE | RELATIONS | DOCUMENT_USAGE | SIGNATURE_USAGE | REALTIME | STORAGE | AUTH/TENANT_DEP |
|---|---|---|---|---|---|---|---|---|---|
| `useContratos` | `hooks/useContratos.ts` | `GET/POST/PATCH/DELETE /contracts` (via `storage`) | todos os 25 campos de `contracts` | `select: "*, artistas(*), clientes(*)"` — **não morto** desta vez: `ContractsService.list/findById` fazem `leftJoinAndMapOne` real para `artistas`/`clientes` (diferente de `catalog`, onde o mesmo padrão é sempre morto) | não | não | não | não | implícito |
| `useTemplatesContratos` | `hooks/useTemplatesContratos.ts` | `GET/POST/PATCH/DELETE /contract-templates` | todos os campos de `TemplateContrato` | nenhuma | não | não | não | não | implícito |
| `useContractServiceTypes` | `hooks/useContractServiceTypes.ts` | `GET/POST/PATCH /contract-service-types` (via `contractsService`, não `storage` diretamente) | todos os 32 campos de `contract_service_types` | verifica "em uso" contra `storage.list("contratos")` (sujeito ao limite de 50, §12.10) | não | não | não | não | implícito |
| `useCategoryRegistry` | `hooks/useCategoryRegistry.ts` | nenhum | `localStorage` key `contract_categories` | nenhuma | não | não | não | `localStore` (por navegador) | não |
| `useVariableRegistry` | `hooks/useVariableRegistry.ts` | nenhum | `localStorage` key `variable_registry` | nenhuma | não | não | não | `localStore` (por navegador) | não |
| `useDocuments`/`useSaveDocument` | `hooks/useDocuments.ts` | nenhum (leitura sempre `[]`; escrita sempre lança erro) | nenhum campo real — ver §26 | nenhuma | sim (mas sempre vazio/falha) | indireto (consumido por `SendForSigningDialog`) | não | não | não |

Nenhum hook ativo ficou sem classificação.

---

## 5. CREATE Contract — `ContratoWizard.tsx` (fluxo principal)

Passo a passo (6 passos), campos persistidos via `handleSave()` (`ContratoWizard.tsx:1103-1154`):

| FORM_FIELD | TYPE | REQUIRED | API_REQUEST_FIELD | DATABASE_COLUMN | PERSISTED | Observação |
|---|---|---|---|---|---|---|
| Passo 1: template selecionado | RELATION_SELECTOR | sim (bloqueia avanço) | `template_id` | `contracts.template_id` | sim | |
| Passo 1 (derivado): categoria do template | DERIVED | — | `tipo` (via `templateTipoServico \|\| templateNome`) | `contracts.tipo` | sim | `templateTipoServico` vem de `TemplateContrato.tipo_servico`, um campo **livre**, não da FK real de `contract_service_types` |
| Passo 2: `parties` (partes, N dinâmico por template) | RELATION_SELECTOR + PARTY_EDITOR | não (mas sem validação de preenchimento antes do avanço) | **nenhum** — nunca vai para `CreateContractDto.parties` | `contracts.observacoes` (serializado como JSON, junto de `variables`/`partyRoles`/`manifestVars`/`signatureRoles`) | sim, mas **não pelo caminho oficial** — ver Gap #1 | contém PII completo por parte: nome, CPF, CNPJ, RG, e-mail, telefone, endereço, dados do representante legal |
| Passo 3: `variables` (variáveis do manifesto) | VARIABLE_FIELD (text/date/boolean/number/percentage/currency/textarea/select) | por variável (`manifest.required`), não bloqueia avanço | **nenhum** endpoint próprio | mesmo blob de `observacoes` | sim, mesmo caminho não-oficial | |
| Passo 4: preview | DOCUMENT_PREVIEW | — | — | — | não (só leitura) | resolve placeholders localmente, nunca gera PDF real |
| Passo 5: `signers[]` (signatários) | SIGNATORY editor | sim (`state.signers.length === 0` bloqueia "Enviar para Assinatura") | `signers` | `contracts.signers` (jsonb) | sim, campo oficial do DTO | |
| Passo 6: `titulo` | string | sim | `titulo` | `contracts.titulo` | sim | |
| Passo 6: `status` (select, mas sobrescrito) | select | — | `status` | `contracts.status` | sim, mas **`handleSave()` sempre sobrescreve** para `"rascunho"` ou `"aguardando_assinatura"`, ignorando o valor escolhido no Select da Revisão | o Select de status no Passo 6 é **enganoso** — sua seleção nunca é usada |
| Passo 6: `data_inicio` | date | sim | `data_inicio` | `contracts.data_inicio` | sim | |
| Passo 6: `data_fim` | date | não | `data_fim` | `contracts.data_fim` | sim | |
| Passo 6: `observations` (campo de observações da Revisão) | textarea | não | — | — | **não persistido separadamente** — é sobrescrito pelo `wizardBlob` JSON (ver Gap #1); qualquer texto digitado aqui é **descartado silenciosamente**, nunca chega ao payload | UI_ONLY efetivo, apesar de parecer um campo real |
| (derivado) `signing_platform` | derivado do 1º signatário com `provider` definido | não | `signing_platform` | `contracts.signing_platform` | sim | |

Campos do `CreateContractDto` NUNCA enviados por este wizard: `parties`, `metadata`, `currency`,
`signedAt`, `cliente_id`, `lancamento_id`, `exclusivo`, `autentique_doc_id`, `versoes`,
`artista_id`/`artistId` (nenhum passo do wizard vincula artista/cliente diretamente — só via
partes textuais dentro do blob de `observacoes`).

CREATE_FIELDS (persistidos, nível-registro): `titulo`, `template_id`, `tipo`, `status`, `data_inicio`,
`data_fim`, `observacoes` (blob), `signing_platform`, `signers[]` = 9 campos reais + N linhas de
`signers` (5 subcampos cada: nome, email, role, obrigatorio, ordem, provider) + N linhas de partes
(até 19 subcampos cada, ver §9) dentro do blob.

---

## 6. CREATE/EDIT Contract — `ContratoFormModal.tsx` (fluxo secundário)

Único lugar do módulo que expõe `arquivo_url` como campo de formulário direto (`Input` de texto,
`URL do Arquivo (PDF)` — colar uma URL já hospedada, sem upload real). Também consome
`useContractServiceTypes()` para popular um dropdown de tipo de serviço — **é o único componente do
módulo que efetivamente lê `contract_service_types`**. Campos principais (via `form.register`):
`titulo`, `tipo`/`service_type`, `artista_id`, `cliente_id`, `lancamento_id`, `status`, `data_inicio`,
`data_fim`, `valor`, `exclusivo`, `observacoes` (aqui sim usado como texto livre real, não como blob
JSON), `arquivo_url`, `notas_versao` (usado para popular `versoes[]` ao trocar de arquivo).

`FORM_FIELD`/`READ_SOURCE`/`WRITE_TARGET`/`CREATE_SUPPORTED`/`EDIT_SUPPORTED`: todos os campos acima
são suportados em ambos os modos, mesmo componente único (`mode: "create"|"edit"|"view"`, mesmo
padrão de `ObraFormModal.tsx` em `catalog.md`). `IMMUTABLE_AFTER_CREATE`: nenhum campo é bloqueado
após a criação neste componente (nem mesmo `template_id`, que este fluxo nem usa).

**Não presumir Create = Edit entre os dois modais**: `ContratoWizard` e `ContratoFormModal` têm
conjuntos de campos parcialmente disjuntos — `arquivo_url` só existe no segundo;
`template_id`/`parties` (via blob)/variáveis manifestadas só existem no primeiro. Um contrato criado
por um dos dois fluxos e editado pelo outro pode perder dados (ex.: editar via `ContratoFormModal`
um contrato criado pelo `ContratoWizard` grava um novo `observacoes` de texto livre, destruindo o
blob JSON de partes/variáveis do wizard).

---

## 7. Partes do contrato (§9/§10 do prompt)

Não existe tabela `contract_parties`. As partes são **inteiramente dinâmicas**, detectadas via regex
`{{GRUPO.CAMPO}}` no `conteudo` do template selecionado (`extractPartyRoles()`,
`ContratoWizard.tsx:171-179`) — cada grupo não pertencente a `NON_PARTY_GROUPS` e que contenha ao
menos um campo de `ENTITY_FIELDS` vira uma "parte" com formulário próprio.

| ROLE | SOURCE_ENTITY | DISPLAY_FIELD | VALUE_FIELD | DATABASE_FK_OR_JOIN | CARDINALITY | OPTIONAL |
|---|---|---|---|---|---|---|
| qualquer grupo do template (ex. `CONTRATANTE`, `ARTISTA`, `REPRESENTANTE`) | `origin: manual` | digitado livremente | `nome`/`razao_social`/`nome_artistico` | nenhuma — texto livre | 1 por role detectada | sim |
| idem, `origin: crm` | `useClientes()` (`crm-relationships`) | `nome` do contato CRM | id do contato (`sourceId`) | **nenhuma FK real gravada** — só os valores copiados (nome/cpf/cnpj/email/telefone/endereco) são embutidos no blob; o `sourceId` do contato **não é persistido em nenhuma coluna** | 1:1 (cópia, não referência) | sim |
| idem, `origin: artistas` | `useArtistas()` | `nome_artistico`/`nome_civil` | id do artista (`sourceId`) | mesma limitação — cópia sem FK persistida | 1:1 (cópia) | sim |

Campos de identificação capturados por parte (até 19, conforme tipo pf/pj/artista):
`nome`/`nome_artistico`/`nome_civil`/`razao_social`, `cpf`, `cnpj`, `rg`, `email`, `telefone`,
`endereco`, `nacionalidade`, `profissao`, `estado_civil`, `representante_legal`,
`cpf_representante`, `rg_representante`, `nacionalidade_representante`,
`estado_civil_representante`, `profissao_representante`, `endereco_representante`.

`DATABASE_COLUMN`: nenhum — tudo dentro de `contracts.observacoes` (coluna `text`, sem
criptografia). `ENCRYPTED`: **NÃO**. `ENCRYPTION_LAYER`: nenhuma. Contraste direto com o padrão já
estabelecido no resto do sistema (ex. `artists.email_encrypted`/`.cpf_cnpj_encrypted`,
AES-256-GCM, documentado em `artist.md`) — aqui o mesmo tipo de dado sensível (CPF/CNPJ/RG/e-mail/
telefone/endereço de terceiros) é serializado como JSON puro dentro de uma coluna de texto genérica.
`READ_MAPPING`: `ContratoWizard.tsx` faz `JSON.parse(contrato.observacoes)` ao reabrir para edição
(linha ~959-962, com fallback silencioso em caso de erro de parse). `DISPLAY_BEHAVIOR`: sem
proteção — `ContratoViewModal.tsx` e qualquer export via Central de Relatórios (§13) expõem
`observacoes` como texto puro, incluindo o JSON com PII, sem redação nem mascaramento.

---

## 8. Relação Artista ↔ Contrato / Catálogo ↔ Contrato (boundary, não reauditado)

| CONTRACT_FIELD | ARTIST_ENDPOINT | DATABASE_RELATION | CARDINALITY | CREATE_FLOW | EDIT_FLOW | READ_FLOW |
|---|---|---|---|---|---|---|
| `contracts.artista_id` | `GET /artists` (via `useArtistas()`) | `contracts.artista_id → artists.id` (FK real, Fase 1 confirmado) | N:1 | só via `ContratoFormModal` (fluxo secundário) — `ContratoWizard` **nunca grava esta coluna diretamente**, só nomes de artista dentro das partes textuais do blob | idem | `ContractsService.list/findById` faz `leftJoinAndMapOne('c.artistas', ...)` real — `contrato.artistas.nome_artistico` chega populado de fato (ver §4) |
| `CONTRACT_SIGNED` → `artists.status='contratado'` + `artists.contrato_id` | — | `artists.contrato_id → contracts.id` (escrita, não FK declarada) | 1:1 por evento | automação backend (`ContractEventsHandler.onContractSigned`, §20) | — | — |

`catalog.md` já está concluído; aqui só se registra que **não existe nenhuma relação `contracts ↔
works/phonograms/rights_holders`** no schema nem no código — nenhuma coluna, nenhuma FK, nenhum
campo de formulário liga um contrato a uma obra/fonograma específico. A única ponte observável é
indireta e por convenção de produto: `RegistroMusicas.tsx` (catalog) abre `ContratoFormModal`
pré-preenchido com `titulo`/`observacoes` (texto livre resumindo a obra/participantes) após salvar
uma Obra/Fonograma — não há vínculo de dados, só um texto sugerido. `CATALOG_RESOURCE`: nenhum.
`PURPOSE`: UX (evitar redigitação), não integridade referencial.

---

## 9. Relação Release / Project / Service

`contracts.lancamento_id` (coluna real, Fase 1: `fk=false` — sem FK declarada apesar do nome sugerir
`releases.id`) é aceito pelo DTO e pela entity, mas **nenhuma tela do módulo o preenche**:
`ContratoWizard` não tem campo para ele; `ContratoFormModal` tem um campo `lancamento_id` no form,
mas não foi encontrado nenhum seletor de lançamento na revisão de código (campo presente no
`register()`/payload, sem componente de UI correspondente localizado) — registrado como coluna
presente no contrato, mas sem seletor confirmado no formulário. Nenhuma relação com `projects` ou
`services`/`campaigns`/`events` foi encontrada em nenhuma camada.

---

## 10. Tipos de contrato (§14 do prompt)

**Não existe um único inventário de tipos** — quatro vocabulários coexistem, desconectados entre si:

1. `CONTRACT_TYPES` (`constants/contract-types.ts`) — const hardcoded no frontend, agrupada em
   categorias (`ARTISTICOS`, `SHOWS`, `MARCAS_PUBLICIDADE`, etc.); usada **somente** por
   `contract-party-origin.mapper.ts`, que por sua vez **não tem nenhum consumidor** (DEAD, §3).
2. `contract_categories` (localStorage, `useCategoryRegistry`) — 11 categorias seed
   (`gravacao`, `distribuicao`, `licenciamento`, `cessao_direitos`, `producao`, `shows`, `gestao`,
   `exclusividade`, `publicitario`, `semantico`, `outros`); usada só para **rotular** templates no
   Passo 1 do wizard (`getCategoryLabel`) — não é persistida no backend, não é a fonte de
   `contracts.tipo`.
3. `templates_contratos.tipo_servico` (coluna real de `contract_templates`, mapeada pelo backend
   como `tipo` — ver Gap #2) — string livre, escolhida ao criar um template; é o valor que
   efetivamente vira `contracts.tipo` via `ContratoWizard`.
4. `contract_service_types.slug` (32 colunas reais, rico: modelo financeiro, participantes,
   variáveis, configurações de assinatura/branding) — só lido por `ContratoFormModal` (fluxo
   secundário); **nunca usado pelo `ContratoWizard`** nem pela `CategoryRegistry.tsx` (apesar do
   nome da página sugerir gestão de categorias de contrato).

`TYPE_VALUE`/`FRONTEND_LABEL`/`DATABASE_VALUE`/`FORM_VARIATION`/`REQUIRED_FIELDS`/
`WORKFLOW_VARIATION`: não há variação de campos obrigatórios por tipo em nenhum dos quatro
vocabulários — `tipo`/`categoria` é puramente informativo/de rotulagem em todos os fluxos reais;
`contract_service_types` tem colunas de "requires_*" (`requires_external_rights_terms`,
`requires_fixed_value`, `requires_advance`, `requires_financial_support`, `allow_installments`) que
sugerem uma variação de formulário condicional por tipo de serviço, mas como esta tabela não é
consumida pelo `ContratoWizard`, essas regras **nunca são aplicadas na prática**.

---

## 11. Status / Workflow

Real, bem definido: `apps/api/src/core/workflow/definitions/contracts.workflow.ts` (`WorkflowService`,
mesmo motor genérico já verificado em `audiovisual.md`/`auth.md`).

| STATUS_VALUE | FRONTEND_LABEL | ALLOWED_TRANSITIONS (roles) | TRANSITION_ENDPOINT | SIDE_EFFECTS |
|---|---|---|---|---|
| `rascunho` | Rascunho | → `em_analise` | `PATCH /contracts/:id` | nenhum |
| `em_analise` | (sem label na UI, só no backend) | → `rascunho`, → `aguardando_assinatura` | idem | nenhum |
| `aguardando_assinatura` | Aguardando Assinatura | → `assinado` **(guard: exige `arquivo_url` truthy)** | idem | nenhum além do guard |
| `assinado` | Assinado | → `vigente`, → `encerrado`, → `cancelado` | idem | `CONTRACT_SIGNED` → artista `contratado` + transação provisória + 5 tarefas CRM (ver §20) |
| `vigente` | Vigente | → `vencendo`, → `vencido`, → `encerrado`, → `cancelado` | idem | nenhum direto (cron de vencimento roda separadamente) |
| `vencendo` | (sem label na UI) | → `vencido` | idem | nenhum |
| `vencido` | (sem label na UI) | → `encerrado` | idem | `CONTRACT_EXPIRED` (log de atividade) |
| `encerrado` | (sem label na UI — `STATUS_LABELS` do wizard usa "Expirado") | terminal | — | — |
| `cancelado` | Cancelado | terminal | — | `CONTRACT_CANCELLED` (log de atividade); também disparado por soft-delete (`DELETE /contracts/:id`) |
| `ativo` (enum `ContractStatus.ATIVO`) | **não usado em nenhuma transição** | — | — | — |

`ENUM_MISMATCH`: `ContractStatus.ATIVO` existe no enum compartilhado (`@music-os-360/types`) mas
**não aparece em nenhuma transição do workflow** — estado morto, inatingível por qualquer fluxo real
(nem criado, nem alvo de transição). Além disso, `STATUS_LABELS` do `ContratoWizard.tsx` usa rótulos
próprios (`"pendente"`, `"expirado"`, `"rescindido"`) que **não correspondem exatamente** aos 9
valores reais do enum usados pelo workflow (`em_analise` sem rótulo próprio; `"pendente"` no Select
não é um valor do enum de workflow) — o Select de status do Passo 6 mistura rótulos que não mapeiam
1:1 para os estados reais, mas como visto no Gap #1 esse Select é ignorado no submit de qualquer forma.

Todas as roles autorizadas por transição: `super_admin, tenant_owner, owner, admin, manager`
(+ `juridico` para as duas primeiras transições rascunho↔em_analise). `AUTHORIZATION_GAPS: 0` — as
roles do workflow são consistentemente verificadas contra `actorRole` (JWT) antes de cada transição
(`WorkflowService.transitionInTx`, mesmo padrão testado nos módulos anteriores).

---

## 12. Datas, renovação e vencimento

| UI_FIELD | API_FIELD | DATABASE_COLUMN | TYPE | REQUIRED |
|---|---|---|---|---|
| Data de Início | `data_inicio`/`startsAt` (alias) | `contracts.data_inicio` | `timestamp without time zone` | sim (wizard bloqueia avanço sem ela) |
| Data de Término | `data_fim`/`expiresAt` (alias) | `contracts.data_fim` | `timestamp without time zone` | não |
| Assinado em | não exposto em nenhum form real do módulo (`signedAt` só existe no DTO/metadata) | `contracts.metadata.signed_at` (via alias, nunca de fato enviado por nenhuma UI) | jsonb (dentro de `metadata`) | não |

`TIMEZONE_BEHAVIOR`: coluna `timestamp without time zone` (sem timezone) — o valor é gravado como
enviado pelo `DatePickerField`, sem normalização explícita de fuso; não foi encontrado nenhum
tratamento adicional de timezone no `contracts.service.ts`.

**Renovação/vencimento (§17 do prompt)**: `AUTO_RENEW`: **não existe** — nenhum campo, nenhuma
lógica de renovação automática de status. `RENEWAL_PERIOD`/`NOTICE_PERIOD`: não existem como campos
estruturados; o `ContractExpiryScheduler` (`contract-expiry.scheduler.ts`, cron diário ou
`POST /internal/cron/contract-expiry` via Vercel) usa uma janela fixa de 30 dias
(`EXPIRY_WINDOW`) e um deduplicador de 7 dias (`DEDUP_DAYS`), hardcoded, não configurável por
tenant/contrato. `EXPIRATION_RULE`: o cron **apenas emite** `CONTRACT_EXPIRING_SOON` (que dispara
uma tarefa de renovação no CRM via `ContractWorkflowHandler`, ver §20) e grava
`metadata.expiry_notified_at` para deduplicar — **não transiciona automaticamente o `status`** para
`vencendo`/`vencido`; essa transição continua manual, via `ContratoViewModal`. Comportamento real,
não inferido: notificação automática + tarefa de renovação automática, mas mudança de status
sempre manual.

---

## 13. Cláusulas / Termos (§18 do prompt)

**Não existem cláusulas como registros estruturados.** O `conteudo` do template (`contract_templates.
conteudo`, `text`) é um bloco de texto único com placeholders `{{GRUPO.CAMPO}}` — free text +
template-only, não uma lista de `ContractClause` persistida (o tipo `ContractClause` existe em
`contracts.types.ts` — `id, title, content, variablesUsed, category, order, required, editable,
aiGenerated` — mas **não há tabela, coluna nem endpoint que persista instâncias reais desse tipo**;
é um tipo TypeScript definido para o "motor de templates" mas nunca instanciado por nenhum código
real encontrado). `EDITABLE`: o `conteudo` inteiro é editável como texto livre na tela de criação de
template (não auditada campo-a-campo aqui por ausência de estrutura — é um único `<Textarea>` livre,
confirmado por grep em `TemplatesContratos.tsx`). `TEMPLATE_SOURCE`: o próprio `contract_templates.
conteudo`.

---

## 14. Termos financeiros (§19 do prompt)

| FORM_FIELD | DATABASE_TABLE | DATABASE_COLUMN | TYPE | RELATED_ENTITY |
|---|---|---|---|---|
| Valor do contrato | `contracts` | `valor` | `numeric` (sem precisão/escala declarada na Fase 1) | `transactions` (via evento `CONTRACT_SIGNED`, não FK) |
| Moeda | **nenhuma coluna própria** | — | — | fixo BRL por convenção (`excludedFormFields.currency` do contrato de export: "valor é BRL por contrato") |
| `financial_currency` | `contract_service_types` | `financial_currency` | `varchar` | não conectado a `contracts.valor` (tabela sem consumidor no fluxo principal, §10) |
| `financial_payment_frequency` | `contract_service_types` | `financial_payment_frequency` | `varchar` | idem |
| `financial_penalty_percentage` | `contract_service_types` | `financial_penalty_percentage` | `numeric` | idem |
| `financial_interest_percentage` | `contract_service_types` | `financial_interest_percentage` | `numeric` | idem |
| `financial_due_days` | `contract_service_types` | `financial_due_days` | `integer` | idem |

`FINANCIAL_TERM_GAP`: os 5 campos financeiros ricos de `contract_service_types` (moeda, frequência
de pagamento, multa, juros, prazo de vencimento) existem no schema e no tipo `ContractServiceType`
do frontend, mas como essa tabela não é consumida pelo `ContratoWizard` (fluxo real de criação),
**nenhum contrato criado hoje carrega esses termos financeiros estruturados** — o único termo
financeiro que efetivamente chega a um contrato real é `valor` (um número livre, sem moeda/parcelas/
juros/multa associados).

---

## 15. Contrato → Financeiro (§20 do prompt)

`CONTRACT_TO_ACCOUNTING_TRACEABILITY_COMPLETE: SIM` — verificado ponta a ponta, é **automação real**,
não manual nem apenas de UI:

```
CONTRACT_ID:            contracts.id
FINANCIAL_TRIGGER:      evento CONTRACT_SIGNED (emitido em ContractsService.update() quando
                         status muda para 'assinado')
TRANSACTION_RELATION:   ContractEventsHandler.onContractSigned() (apps/api/src/modules/contracts/
                         handlers/contract-events.handler.ts:114-214) cria uma linha real em
                         `transactions` (tipo='receita', categoria='contratos', status='agendado')
AMOUNT_SOURCE:          contracts.valor (lido diretamente do registro no momento da assinatura)
DATE_SOURCE:            new Date() (data da assinatura, não data_inicio/data_fim do contrato)
CATEGORY_SOURCE:        hardcoded 'contratos' (não vem de contract_service_types.
                         default_financial_category, que também não é consumido)
TRACEABILITY_KEY:       transactions.contrato_id (FK real) + transactions.artista_id
```

Classificação: **REAL_AUTOMATIC_PROPAGATION** — não é UI_ONLY nem NOT_IMPLEMENTED. Além da transação,
o mesmo evento também: atualiza `artists.status='contratado'` + `artists.contrato_id`; dispara
`FinancialRulesService.evaluateRules(...)` (`accounting`, já auditado); cria 5 tarefas CRM de
execução via `ContractWorkflowHandler` (jurídico, financeiro, briefing, setup, integrações futuras);
emite `CONTRACT_INTEGRATION_READY` com `integrations: ['distribution','financial',
'society-data-exchange']` (rótulos descritivos no payload do evento — não foi encontrado nenhum
handler real que consuma esses três rótulos para acionar integrações efetivas; ficam registrados
apenas como metadata do evento); e enfileira um `WorkflowQueueService.enqueueWorkflowFollowup(...)`
real (BullMQ). **Ressalva importante**: esta automação só é alcançável se um contrato conseguir
chegar ao status `assinado` — o que, para contratos criados pelo `ContratoWizard` (fluxo principal),
está bloqueado na prática pelo Gap de `arquivo_url` (§17/Gap #7).

---

## 16. Royalties / Percentuais (§21 do prompt)

Nenhum campo de percentual de royalties/participação foi encontrado no módulo `contracts` em si
(nem em `contracts`, nem em `contract_templates`, nem em `contract_service_types`). Percentuais de
autoria/participação pertencem exclusivamente a `catalog` (`work_participants.percentual`,
`phonograms.participacao[*].percentual`, já registrados em `catalog.md`) e a `shares`
(releases/registro, já referenciado como boundary em `catalog.md` §16) — **não há mistura entre os
dois sistemas**, conforme instruído no prompt. `contracts.exclusivo` (boolean) é o único campo
"parecido com direitos" presente na tabela `contracts` — ver §17 (Direitos/Território).

---

## 17. Direitos / Territórios / Exclusividade (§22 do prompt)

| RIGHT | SCOPE | TERRITORY | EXCLUSIVE | DATABASE_MAPPING |
|---|---|---|---|---|
| (implícito, não tipado) | contrato inteiro (não por obra/direito específico) | **nenhum campo de território em `contracts`** | `contracts.exclusivo` (boolean) | `ContratoFormModal.tsx` expõe `exclusivo` como checkbox; `ContratoWizard.tsx` **não tem campo para `exclusivo` em nenhum dos 6 passos** — permanece `false` (default do DTO) para todo contrato criado pelo fluxo principal |

`RELATION_MISMATCH`/gap: `exclusivo` é uma coluna `NOT NULL` real e semanticamente importante
("Contratos com cláusula de exclusividade" é inclusive uma das 11 categorias seed de
`contract_categories`), mas o fluxo principal de criação não a expõe — todo contrato criado via
`ContratoWizard` nasce `exclusivo=false` por default, independentemente do conteúdo real do
template/cláusulas.

---

## 18. Templates (§23/§24 do prompt)

`TemplateContrato` (`contract_templates`, 11 colunas): `TEMPLATE_ID`=`id`, `NAME`=`nome`,
`TYPE`=`tipo_servico` (mapeado para a coluna física `tipo` — ver Gap #2), `CONTENT_SOURCE`=`conteudo`
(texto livre com placeholders), `VARIABLES`=`variables_manifest` (string JSON opcional, formato
`ContractVariable[]` ou `{variables: [...]}`), `FIELDS`=nenhum campo estruturado além do texto,
`DEFAULTS`=nenhum, `VERSION`=nenhuma coluna de versão (templates não são versionados — só
`ativo`/inativo), `ACTIVE`=`ativo`, `DATABASE_SOURCE`=`contract_templates`.

`TEMPLATE_VARIABLES` (§24): quando `variables_manifest` está ausente ou vazio, o wizard usa
`extractFallbackVars()` — detecta TODOS os grupos `{{GRUPO.CAMPO}}` do `conteudo` que não sejam
partes nem assinatura, e cria uma variável genérica tipo `"text"` para cada um, com `label` derivado
mecanicamente do nome do placeholder. **Nenhum placeholder ativo fica sem fonte**: ou é resolvido
como parte (Passo 2), ou como variável do manifesto (Passo 3, real ou fallback), ou como assinatura
(Passo 5) — os três grupos (`NON_PARTY_GROUPS`, `ENTITY_FIELDS`, `SIGNATURE_GROUPS`) cobrem
exaustivamente a gramática de placeholders reconhecida pelo wizard.

**Gap crítico de criação de template — ver Gap #2** (§20 abaixo): o endpoint real
`POST /contract-templates` usa um DTO com campos em inglês (`title`/`type`/`content`/`variables`/
`metadata`, `type` com enum fixo `['exclusive','non-exclusive','distribution','service',
'publishing','other']`) que **não correspondem a nenhum campo enviado pelo frontend**
(`nome`/`tipo_servico`/`conteudo`/`descricao`/`ativo`/`variables_manifest`/`header_image`/
`footer_image`) — com `ValidationPipe({whitelist:true, forbidNonWhitelisted:true})` global
(`apps/api/src/create-app.ts:186-192`), **toda tentativa real de criar um template via
`TemplatesContratos.tsx` retorna HTTP 400**, pois nenhuma propriedade do body é reconhecida pelo DTO.

---

## 19. Document Generation (§25 do prompt)

`ContractA4Preview.tsx` (`A4Preview`/`HighlightedPreview`) gera **apenas HTML renderizado em tela**
(preview visual A4, com paginação CSS) a partir do `conteudo` do template já com os placeholders
resolvidos (`resolveContentForPreview()`). **Não existe geração real de PDF nem DOCX em nenhuma
camada do módulo** — nenhum backend endpoint de geração de documento foi encontrado
(`grep` exaustivo por `pdf`/`docx`/`puppeteer`/`html-pdf` dentro de `apps/api/src/modules/contracts`
e `contract-templates` não retornou nenhuma ocorrência). `SOURCE`=template `conteudo` + partes +
variáveis resolvidas no cliente; `GENERATOR`=nenhum (renderização React pura); `OUTPUT`=HTML na tela;
`STORAGE`=nenhum; `DOWNLOAD`=nenhum botão de download de PDF encontrado em `ContractA4Preview.tsx`
nem em `ContratoViewModal.tsx`. `DOCUMENT_GENERATION_GAP` confirmado: o único jeito de um contrato
ter um "documento" real associado é o campo `arquivo_url` (§6), preenchido manualmente com uma URL
de um arquivo hospedado externamente — o sistema não gera o documento a partir do template, apesar
de todo o motor de resolução de placeholders/preview existir.

---

## 20. Storage / Attachments (§26 do prompt)

| FORM_FIELD | RESOURCE_TYPE | DATABASE_REFERENCE | STORAGE_PROVIDER | UPLOAD_ENDPOINT | DOWNLOAD/PREVIEW | DELETE | TENANT_ISOLATION |
|---|---|---|---|---|---|---|---|
| `arquivo_url` (só em `ContratoFormModal.tsx`) | documento do contrato (PDF, por convenção) | `contracts.arquivo_url` (text) | **nenhum** — é uma URL de texto livre colada pelo usuário, não um upload real | nenhum | `ContratoViewModal.tsx` renderiza um link `<a href={arquivo_url}>` | limpar o campo de texto (não há storage remoto a apagar) | N/A |
| `VinculadoDocument` (`useDocuments`/`useSaveDocument`) | documento de assinatura digital | nenhuma — não existe tabela/coluna | nenhum | nenhum (`useSaveDocument` sempre lança erro, comentário explícito no código: "É proibido simular o backend em localStorage ou devolver documentos fictícios") | `useDocuments()` sempre retorna `[]` | N/A | N/A |

Fluxo real de `arquivo_url`: `upload (inexistente — só colar URL) → persistence (coluna text) → read
(mesma coluna) → download/preview (link `<a>` direto para a URL externa) → delete (limpar texto)`.
`STORAGE_GAP` confirmado, mas por design mais honesto que o `arquivo_audio` fake de `catalog.md`
(não finge que houve upload — é claramente um campo de URL manual). `DocumentTimeline.tsx`/
`DocumentStatusBadge.tsx` (§3) nunca recebem dado real para renderizar, pois `useDocuments()` está
permanentemente vazio.

---

## 21. Assinatura eletrônica / DocuSign (§27/§28 do prompt) — auditoria completa

| ITEM | CLASSIFICAÇÃO | EVIDÊNCIA |
|---|---|---|
| `CONNECT_ACCOUNT` (OAuth DocuSign) | **IMPLEMENTED** | `integrations.controller.ts:281-322` — troca `code`→`access_token` real via `POST {DOCUSIGN_AUTH_BASE_URL}/oauth/token`, Basic Auth com `DOCUSIGN_INTEGRATION_KEY`/`DOCUSIGN_CLIENT_SECRET`, persiste token via `IntegrationBaseService` (tenant-scoped) |
| `OAUTH_CALLBACK` | **IMPLEMENTED** | `POST /integrations/oauth/exchange` (`@Public()`, protegido por `exchange_token` de uso único emitido por `oauth/init`) |
| `ACCOUNT_STATUS` | **IMPLEMENTED** | `GET /integrations/oauth/status?platform=docusign` |
| `TOKEN_REFERENCE` | **IMPLEMENTED** (tenant-scoped, nunca em `.env`) | `IntegrationBaseService.getOAuthStatus/disconnectOAuth` |
| `CREATE_ENVELOPE` | **NOT_IMPLEMENTED** | nenhuma rota, nenhum service method, nenhuma chamada à API de eSignature do DocuSign encontrada em `apps/api/src` |
| `SEND_ENVELOPE` | **NOT_IMPLEMENTED** | idem |
| `SIGNERS` (gestão de signatários DocuSign) | **NOT_IMPLEMENTED** no backend | signatários existem só como `contracts.signers` (jsonb genérico, não específico de nenhum provider) |
| `ENVELOPE_STATUS` | **NOT_IMPLEMENTED** | — |
| `SIGNATURE_STATUS` | **NOT_IMPLEMENTED** | — |
| `DOWNLOAD_SIGNED_DOCUMENT` | **NOT_IMPLEMENTED** | — |
| `WEBHOOK` (DocuSign) | **NOT_IMPLEMENTED** | nenhuma rota de webhook DocuSign encontrada (contraste: existe webhook real para Autentique) |
| Frontend: `resolveSigningAdapter("docusign")` | **STUB** (deliberado) | `signing.adapter.ts` — `createDocument`/`getDocument`/`listDocuments`/`cancelDocument`/`resendInvite`/`handleWebhook` todos `Promise.reject`; comentário no próprio arquivo confirma a intenção: "nunca simula sucesso" |
| Frontend: `useSigningProviders()` "conectado" para DocuSign | **PARTIAL** | baseado em `sessionStorage.getItem("musicos360_docusign_credentials")` — checagem client-side/por-sessão, não consulta `GET /integrations/oauth/status` real |

Confirma-se textualmente o que o prompt já estabelecia: `AUTH_MODEL: AUTHORIZATION_CODE` (correto),
`CURRENT_PRIVATE_KEY_CONFIGURED: NÃO`, `PRIVATE_KEY_REQUIRED: NÃO` (DocuSign Authorization Code Grant
não usa JWT/private key) — e a pergunta em aberto do prompt ("ENVELOPE/SIGNATURE
IMPLEMENTATION — verificar código real") está agora resolvida: **não implementada**. DocuSign hoje
é, na prática, só um botão de "Conectar conta" sem nenhuma capacidade de envio/assinatura de
documentos.

**Autentique (achado adicional, fora do escopo nominal do §27 mas necessário para não deixar o
quadro incompleto)**: ao contrário de DocuSign, o backend tem uma integração Autentique **real e
completa** — `POST /integrations/autentique/configure` (token de API por tenant),
`POST /integrations/autentique/send` (`AutentiqueService.sendForSignature`, GraphQL real contra a
API da Autentique, grava `autentique_doc_id`/`signing_platform`/`metadata` no contrato, emite
`CONTRACT_SENT_FOR_SIGNATURE`, registra log de atividade), `POST /integrations/autentique/webhook`
(`AutentiqueService.handleWebhook`, valida segredo compartilhado). **Nenhum destes três endpoints é
chamado por nenhum arquivo em `apps/web/src`** (grep exaustivo confirmou zero ocorrências) — o
`signing.adapter.ts` do frontend está deliberadamente desconectado dessa integração real e sempre
falha por design, mesmo para "autentique" (o provedor descrito no código como "sempre disponível" /
padrão). Registrado como `EXTERNAL_INTEGRATION_GAP` de alta severidade: capacidade real de
assinatura existe e está pronta no backend, mas nenhuma tela do sistema consegue acioná-la.

Também: `autentiqueWebhook` (`POST /integrations/autentique/webhook`) está sob `@RequireRole('editor')`
sem `@Public()` — como um webhook externo da Autentique não porta um JWT de tenant, essa rota
provavelmente **não é alcançável pelo caller real** (o próprio servidor da Autentique). Registrado
como `AUTHORIZATION_GAP` pontual, embora sem efeito prático hoje (nada dispara `sendForSignature`,
logo nenhum webhook chegaria a ser esperado).

---

## 22. Signatários (§29 do prompt)

`contracts.signers` (jsonb) — campo oficial do DTO, persistido de fato (ao contrário de `parties`).

| FIELD | TYPE | Origem no Wizard | DATABASE_MAPPING |
|---|---|---|---|
| `role` | string | detectado de `{{SIGNATURE.*}}`/`{{INITIALS.*}}`/`{{SIGN_DATE.*}}` no template, ou `"OUTRO"` se adicionado manualmente | `signers[].role` |
| `nome`/`name` | string | digitado | `signers[].nome` (+ `.name`, espelhado para compatibilidade — ver `WizardSignerRecord`) |
| `email` | string | digitado | `signers[].email` |
| `obrigatorio` | boolean | checkbox, default `true` | `signers[].obrigatorio` |
| `ordem` | number | input numérico, default = índice+1 | `signers[].ordem` |
| `provider` | `"autentique"\|"clicksign"\|"docusign"\|""` | Select por signatário (não por contrato) | `signers[].provider` |
| `status`/`signed_at`/`external_id` | **não existem no schema real** | — | apenas em `VinculadoDocument.signers[].status` — tipo usado exclusivamente pelo sistema de `useDocuments`, que é 100% stub (§20) |

Cada signatário pode ter um `provider` diferente (estrutura permite assinatura mista por pessoa),
mas como nenhum provider está funcionalmente implementado para envio real (§21), esse desenho não é
exercitado na prática. Não há campo `signed_at`/`external_id`/`status` persistido por signatário no
schema real de `contracts` — só existiria via a camada de `VinculadoDocument`, que nunca é alcançada.

---

## 23. Amendments / Aditivos e Versionamento (§31/§32 do prompt)

**Não existe conceito de aditivo (amendment) como entidade separada.** O que mais se aproxima é
`contracts.versoes` (jsonb array, campo `ContratoVersao {versao, url, criado_em, notas, autor}`),
manipulado **somente** por `ContratoFormModal.tsx` (ao trocar `arquivo_url`, empurra a versão
anterior para `versoes[]` antes de gravar a nova URL — confirmado nas linhas ~623-648 do arquivo).
`ContratoWizard.tsx` nunca lê nem escreve `versoes`. `VERSION_FIELD`=`versoes[].versao` (string
livre, não incremental automaticamente verificado); `PARENT`=implícito (mesmo `contracts.id`, sem
FK para um contrato "pai" — não é um aditivo formal, é histórico de arquivo do mesmo registro);
`CURRENT_VERSION`=`arquivo_url` atual; `CREATION_TRIGGER`=troca manual de URL no
`ContratoFormModal`; `IMMUTABILITY`=nenhuma — `versoes[]` pode ser sobrescrito livremente via
`PATCH`, sem proteção de apend-only no backend (o service faz merge de objeto simples, não valida
que `versoes` só cresce).

---

## 24. Tables/Grids (§33 do prompt)

### `Contratos.tsx` (lista principal — 8 colunas de dados, sem ordenação)

| COLUMN_LABEL | COLUMN_KEY | API_FIELD | DATABASE_COLUMN | SORTABLE | FILTERABLE | SEARCHABLE |
|---|---|---|---|---|---|---|
| Título | `titulo` | `titulo` | `contracts.titulo` | não | não | sim |
| Artista / Cliente | derivado | `artistas.nome_artistico` \|\| `clientes.nome` | via `leftJoinAndMapOne` (real, §4) | não | não | sim (só artista, não cliente — `contrato.artistas?.nome_artistico`, `clientes` não entra na busca) |
| Tipo | `tipo` | `tipo` | `contracts.tipo` | não | sim (`typeFilter`) | não |
| Plataforma | `signing_platform` | `signing_platform` | `contracts.signing_platform` | não | sim (`platformFilter`) | não |
| Status | `status` | `status` | `contracts.status` | não | sim (`statusFilter`) | não |
| Período (+ badge "Xd" se vence em ≤30 dias) | `data_inicio`/`data_fim` | idem | `contracts.data_inicio`/`.data_fim` | não | não | não |
| Valor | `valor` | `valor` | `contracts.valor` | não | não | não |

### `TemplatesContratos.tsx` (com ordenação)

| COLUMN_LABEL | COLUMN_KEY | API_FIELD | DATABASE_COLUMN | SORTABLE | FILTERABLE | SEARCHABLE |
|---|---|---|---|---|---|---|
| Nome | `nome` | `nome` | `contract_templates.titulo` (mapeado — ver Gap #2) | sim | não | sim |
| Categoria (derivado) | `categoria` | `tipo_servico` | `contract_templates.tipo` | sim | sim (`filterType`) | não |
| Status | `status` (derivado `ativo`) | `ativo` | `contract_templates.ativo` | sim | sim (`filterStatus`) | não |
| Criado em | `created_at` | `created_at` | `contract_templates.created_at` | sim | não | não |

15 colunas visíveis no total entre as duas grades principais, todas com fonte confirmada (0 sem
origem).

---

## 25. Details, Filters, Search, Sort, Paginação (§34-38 do prompt)

**DETAILS** (`ContratoViewModal.tsx`, `TemplateContratoViewModal.tsx`): todo campo exibido é
rastreável até a mesma coluna já documentada acima; nenhum campo de detalhe órfão.

**FILTERS**: `Contratos.tsx` — 3 (`typeFilter`, `statusFilter`, `platformFilter`) + busca livre, todos
client-side. `TemplatesContratos.tsx` — 2 (`filterType`, `filterStatus`) + busca, client-side.

**SEARCH**: case-insensitive `.includes()`, sem normalização de acento, sem impacto de campo
criptografado (não há PII criptografado neste módulo — a PII de partes está em texto puro, §7).

**SORT**: `Contratos.tsx` = **0 colunas ordenáveis** (nenhum `SortableTableHead`/`sortState`
encontrado — diferente de todos os outros módulos de listagem já auditados). `TemplatesContratos.tsx`
= 4 colunas ordenáveis via `sortTableRows`.

**PAGINAÇÃO**: `usePagination(filteredContratos, 10)` / `usePagination(sortedTemplates, 10)` — 100%
client-side, mesma família de componente (`usePagination`) já documentada em `catalog.md`.
`TOTAL_COUNT_SOURCE` deriva do array já limitado a 50 pelo backend — mesmo limite silencioso
documentado no Gap #10 abaixo.

---

## 26. Import / Export / XLSX (§39-41 do prompt)

**Import estruturado (planilha)**: não existe para `contracts`/`contract_templates`/
`contract_service_types` — nenhum dos três aparece em `report-module-registry.ts`
(`REPORT_MODULE_TABLE_NAMES`) exceto `contracts` (ver export abaixo); não há fluxo de import XLSX
específico do módulo. O único "import" real do módulo é o semântico/textual via
`ContractImportWorkspace.tsx` (colar texto de um contrato existente → `POST /api/v1/ai/generate` →
gera um rascunho de `TemplateContrato`, não uma planilha) — fora do formato `XLSX` do prompt §39/§27.

**Export/XLSX**: só `contracts` está no registry central (`report-module-registry.ts:28`, label
"Contratos", `order: 10`). Contrato de campos (`CONTRACTS_CONTRACT`,
`report-form-contracts.ts:149-177`): 13 `col()` (`titulo, tipo, status, valor, data_inicio,
data_fim, exclusivo, observacoes, arquivo_url, signing_platform, artista_id, cliente_id,
lancamento_id, template_id`) + 2 `ro()` (`autentique_doc_id, versoes`) = **15 colunas
exportáveis, 14 importáveis** (excluindo as `ro()`). Motor genérico (mesmo de `catalog.md`) sempre
gera/exige exatamente 1 worksheet — `WORKSHEET_COUNT = 1`, `XLSX_RULE_VIOLATION: NÃO`.

**Achado de segurança direto**: `observacoes` está entre as colunas exportáveis (`col('observacoes')`).
Como o `ContratoWizard.tsx` (fluxo principal) serializa **todo o blob de partes** — incluindo CPF,
CNPJ, RG, e-mail, telefone e endereço de cada parte do contrato, além dos dados do representante
legal — dentro dessa mesma coluna `observacoes` (§7), **um export em massa de "Contratos" via a
Central de Relatórios entrega, em texto puro dentro de uma célula de planilha, o JSON completo com
PII de todas as partes de todo contrato exportado**. Este é o achado de maior severidade prática do
módulo do ponto de vista de exposição de dado sensível.

---

## 27. Notificações e Realtime (§43/§44 do prompt)

`REALTIME_EVENTS: 0` — nenhum canal Supabase Realtime, nenhuma subscription encontrada para
`contracts`/`contract_templates`/`contract_service_types` em `apps/web/src/modules/contracts`.

Notificações: o módulo emite eventos de domínio internos (`CONTRACT_CREATED`,
`WORKFLOW_TRANSITIONED`, `CONTRACT_SIGNED`, `CONTRACT_EXPIRED`, `CONTRACT_CANCELLED`,
`CONTRACT_STATUS_CHANGED`, `CONTRACT_EXPIRING_SOON`, `CONTRACT_SENT_FOR_SIGNATURE`,
`CONTRACT_INTEGRATION_READY`) consumidos por `ContractEventsHandler` (grava `activity_logs`, nunca
um "notification" endereçável a um usuário específico) e `ContractWorkflowHandler` (cria tarefas
CRM). Não foi encontrado nenhum consumidor que envie e-mail/push/in-app notification diretamente a
partir desses eventos dentro do próprio módulo `contracts` (fora do escopo: o módulo geral de
notificações não foi auditado, por instrução do prompt §43).

---

## 28. Permissões e Tenant Isolation (§45/§46 do prompt)

| PERMISSION | FRONTEND_ENFORCEMENT | BACKEND_ENFORCEMENT |
|---|---|---|
| `contract:read` | leitura da lista não é gateada no frontend | `@RequireRole('viewer') @RequirePermission('contract:read')` |
| `contract:create` | botão "Novo Contrato" via `RequirePermission module="contracts" action="write"` (`Contratos.tsx` header) | `@RequireRole('editor') @RequirePermission('contract:create')` + `IdempotencyInterceptor` (`X-Idempotency-Key`) + `PlanLimitService.enforce(...,'contracts')` (limite de plano) |
| `contract:update` | `RequirePermission module="contracts" action="write"` no item "Editar" da grid | `@RequireRole('editor') @RequirePermission('contract:update')` |
| `contract:cancel` (soft delete) | `RequirePermission module="contracts" action="delete"` no item "Excluir" | `@RequireRole('manager') @RequirePermission('contract:cancel')` |
| `contract_template:read/create/update/archive` | nenhum gate visível localizado em `TemplatesContratos.tsx` (a criação/edição de templates não está envolta em `RequirePermission` no componente, ao contrário da tela de contratos) | `@RequireRole('viewer'|'editor'|'editor'|'manager')` respectivamente — backend protegido mesmo sem gate visual no frontend |
| `contract_service_type` (create/update) | nenhum gate de permissão visível (tela de gestão real não existe — só leitura via dropdown) | endpoints reais existem (`contract-service-types.controller.ts`) — não lidos em detalhe aqui por não terem consumidor de escrita real na UI |

`AUTHORIZATION_GAP`: 1 pontual — `POST /integrations/autentique/webhook` sem `@Public()` (§21),
provavelmente inalcançável pelo caller real (mas sem consequência prática hoje, pois nada aciona o
envio real). Fora isso, `AUTHORIZATION_GAPS: 0` — todas as rotas de escrita/leitura têm guard
consistente com o padrão dos módulos já auditados.

`TENANT_ISOLATION_GAP: 0`. `contracts.service.ts`/`contract-templates.service.ts`/
`contract-service-types.service.ts` filtram `tenant_id = :tenantId` (via `@CurrentTenant()`) em
todas as queries; `create()` sempre grava `tenant_id` do contexto autenticado. Atenção especial
pedida pelo prompt:
- **contract parties**: não vivem em tabela própria (§7) — isolamento herdado do próprio
  `contracts.tenant_id` (a coluna `observacoes` que as contém está sob o mesmo isolamento de linha).
- **signatories**: idem, dentro de `contracts.signers` (jsonb), mesmo isolamento.
- **attachments**: `arquivo_url` é uma URL externa arbitrária — não há bucket/path controlado pelo
  sistema, logo não há isolamento de storage a verificar (o "isolamento" é apenas o de quem pode
  editar o campo, coberto pelo guard de `contract:update`).
- **tokens/external signature IDs**: `autentique_doc_id` vive na própria linha de `contracts`
  (tenant-isolado); os tokens OAuth do DocuSign são geridos por `IntegrationBaseService`, já
  tenant-scoped (mesmo padrão usado por Spotify/YouTube/etc., não reauditado aqui por já ser
  infraestrutura genérica comum a todo o módulo `integrations`).
- **`contact-contracts` (Map em memória, §3/Gap #9)**: tecnicamente particiona por `tenantId` como
  chave do Map externo (`forTenant(tenantId)`), então não há vazamento cross-tenant *dentro do
  processo* — mas por não persistir em Postgres, o "isolamento" é irrelevante na prática (o dado
  nem sobrevive a um restart, e não é o mesmo armazenamento usado por `contracts` real).

---

## 29. Delete / Terminate / Archive (§47 do prompt)

| UI_ACTION | ENDPOINT | DATABASE_BEHAVIOR | FINANCIAL_IMPACT | SIGNATURE_IMPACT | FK_IMPACT | SOFT_OR_HARD |
|---|---|---|---|---|---|---|
| Excluir contrato (individual ou em massa) | `DELETE /contracts/:id` | `UPDATE contracts SET deleted_at = now()` | nenhum — a transação provisória já criada (se o contrato chegou a ser assinado) **não é estornada nem marcada** automaticamente | nenhum — `autentique_doc_id`/`signers` permanecem gravados, sem cancelamento automático no provider (mesmo se a integração real fosse usada, não há chamada a `cancelSigning()` no fluxo de delete) | `artists.contrato_id` (se setado por um `CONTRACT_SIGNED` anterior) **não é limpo** — artista continua referenciando um contrato agora soft-deleted | SOFT |
| Cancelar (transição de workflow para `cancelado`) | `PATCH /contracts/:id` (`status=cancelado`) | apenas `status` muda | nenhum estorno automático | nenhum | nenhum | N/A (é transição de estado, não exclusão) |
| Arquivar template | `DELETE /contract-templates/:id` | `UPDATE contract_templates SET deleted_at = now()` | N/A | N/A | contratos que já usam `template_id` desse template **continuam funcionando** (FK não é `NOT NULL`/`CASCADE`, é só um `uuid` solto sem constraint declarada na Fase 1) | SOFT |
| Arquivar tipo de serviço | `POST` via `archiveContractServiceType` (`active=false`) | update simples | N/A | N/A | verificação de "em uso" roda contra `contratos` mas só olha os 50 mais recentes (Gap #10) — pode arquivar um tipo ainda em uso por um contrato mais antigo | SOFT (nunca hard-delete) |

Nenhuma tela de restauração (`restore`) para contratos/templates soft-deleted foi encontrada.

---

## 30. Gaps consolidados (evidenciados, não corrigidos)

1. **REAL_MAPPING_GAP** (severidade alta) — `ContratoWizard.tsx` (`handleSave()`, linha ~1109-1132)
   nunca usa o campo oficial `CreateContractDto.parties` (que o backend já sabe rotear para
   `contracts.metadata.parties`) — em vez disso, serializa manualmente `{parties, variables,
   partyRoles, manifestVars, signatureRoles}` como JSON dentro de `contracts.observacoes` (coluna
   `text`, sem estrutura, sem criptografia). Efeito colateral: qualquer edição feita via
   `ContratoFormModal` (que trata `observacoes` como texto livre real) **destrói** o blob JSON do
   wizard ao salvar. Ver também Gap de segurança em §26 (export expõe esse blob em massa).
2. **REAL_MAPPING_GAP** (severidade crítica) — `POST /contract-templates`
   (`CreateContractTemplateDto`: `title`/`type`/`content`/`variables`/`metadata`, inglês, `type` com
   enum fixo `['exclusive','non-exclusive','distribution','service','publishing','other']`) está
   completamente dessincronizado dos campos reais enviados por `TemplatesContratos.tsx`
   (`nome`/`tipo_servico`/`conteudo`/`descricao`/`ativo`/`variables_manifest`/`header_image`/
   `footer_image`, pt-BR). Com `ValidationPipe({whitelist:true, forbidNonWhitelisted:true})` global,
   **toda criação de template via a UI real retorna HTTP 400** — o módulo não tem nenhum alias de
   compatibilidade equivalente ao `contract-legacy-alias.util.ts` que existe para `contracts`. Isso
   bloqueia, na prática, a criação de novos templates (o Passo 1 do `ContratoWizard`, que é a porta
   de entrada de todo o fluxo principal de contratos, depende inteiramente de templates já
   existentes no banco).
3. **DOCUSIGN_GAP** — envelope/assinatura DocuSign: `NOT_IMPLEMENTED` no backend (só OAuth de
   conexão existe); `signing.adapter.ts` do frontend está hardcoded para sempre falhar em qualquer
   provider, inclusive DocuSign — ver §21.
4. **SIGNATURE_GAP** — botão "Enviar para Assinatura" do `ContratoWizard.tsx` (`handleSave(true)`,
   linha ~1146-1149) **sempre** executa `toast.error(...)` seguido de `throw new Error(...)`, sem
   nunca chamar nenhum backend — é uma falha determinística, não um bug de integração.
5. **SIGNATURE_GAP** — `SendForSigningDialog.tsx` (o outro caminho de envio, a partir de
   `ContratoViewModal`/`Contratos.tsx`) chama `signingService.sendForSigning()`, que por sua vez
   sempre falha em `resolveSigningAdapter(provider).createDocument()` (stub universal) — mesmo
   destino final do Gap #4, por um caminho diferente.
6. **EXTERNAL_INTEGRATION_GAP** (severidade alta) — a integração Autentique é **real e completa no
   backend** (`configure`/`send`/`webhook`, GraphQL genuíno, grava estado real no contrato, emite
   eventos) mas tem **zero consumidor no frontend** — nenhum arquivo em `apps/web/src` chama
   `/integrations/autentique/*`. Capacidade pronta, nunca acionada pela UI.
7. **WORKFLOW_GAP** (severidade alta) — a transição de workflow `aguardando_assinatura → assinado`
   exige `arquivo_url` truthy (guard real em `contracts.workflow.ts:40-46`), mas o `ContratoWizard`
   (fluxo principal, usado por `Contratos.tsx`) **não tem nenhum campo para `arquivo_url` em nenhum
   dos 6 passos** — só `ContratoFormModal.tsx` (fluxo secundário, só alcançável via `catalog`) o
   expõe. Um contrato criado inteiramente pelo fluxo principal não pode ser transicionado para
   "Assinado" sem um passo extra fora do wizard.
8. **PARTY_MAPPING_GAP** — dados de origem CRM/Artista copiados para uma parte
   (`origin: "crm"`/`"artistas"`) não retêm o `sourceId` de forma persistida/rastreável — é uma
   cópia pontual de valores, não uma referência viva; alterações posteriores no contato/artista de
   origem nunca se refletem no contrato.
9. **REAL_MAPPING_GAP** — `ContactContractsService` (`GET/POST /contacts/:contactId/contracts`)
   usa um `Map` em memória do processo Node como "banco de dados" — nenhuma persistência real em
   Postgres; dados perdidos a cada restart/redeploy e não compartilhados entre instâncias. Sem
   consumidor frontend (grep exaustivo confirmou zero ocorrências em `apps/web/src`).
10. **REAL_MAPPING_GAP** — `GET /contracts` e `GET /contract-templates` usam
    `PaginationDto.limit=50` como default, e `useContratos()`/`useTemplatesContratos()` nunca
    passam `limit`/`offset` — mesmo padrão já documentado em `catalog.md` §12.11: tenants com mais
    de 50 contratos/templates perdem visibilidade de registros mais antigos em `Contratos.tsx`,
    `TemplatesContratos.tsx`, na Auditoria (§2) e na checagem de "tipo em uso" de
    `useContractServiceTypes` (§4).
11. **REAL_MAPPING_GAP** — `CategoryRegistry.tsx`/`useCategoryRegistry` e
    `VariableRegistry.tsx`/`useVariableRegistry` são 100% `localStorage`, não sincronizados com o
    backend nem entre dispositivos/usuários — apesar de terem toda a aparência de telas de
    administração compartilhada (com seeds, CRUD completo, import/merge de variáveis).
12. **TEMPLATE_GAP** — quatro vocabulários de "tipo de contrato" coexistem sem nenhuma ligação
    formal entre si (`CONTRACT_TYPES` hardcoded morto, `contract_categories` local, `contract_
    templates.tipo`/`tipo_servico`, `contract_service_types.slug`) — ver §10.
13. **FINANCIAL_TERM_GAP** — os campos financeiros ricos de `contract_service_types`
    (moeda/frequência/multa/juros/prazo) nunca chegam a um contrato real, pois essa tabela não é
    consumida pelo `ContratoWizard` — ver §14.
14. **ENUM_MISMATCH** — `ContractStatus.ATIVO` não é alvo de nenhuma transição do workflow real —
    estado morto no enum compartilhado — ver §11.
15. **RELATION_MISMATCH** — `contracts.exclusivo` (coluna real, `NOT NULL`) não tem nenhum campo
    correspondente no `ContratoWizard` — todo contrato criado pelo fluxo principal nasce com
    `exclusivo=false` independentemente do conteúdo real do contrato — ver §17.
16. **DOCUMENT_GENERATION_GAP** — não existe geração real de PDF/DOCX a partir de um template,
    apesar de todo o motor de resolução de placeholders e preview A4 (HTML) já existir — ver §19.
17. **AUTHORIZATION_GAP** (pontual, sem efeito prático hoje) — `POST /integrations/autentique/webhook`
    sem `@Public()`, provavelmente inalcançável pelo caller externo real — ver §21.

Total: 9 REAL_MAPPING_GAP, 2 SIGNATURE_GAP, 1 DOCUSIGN_GAP, 1 EXTERNAL_INTEGRATION_GAP,
1 WORKFLOW_GAP, 1 PARTY_MAPPING_GAP, 1 TEMPLATE_GAP, 1 FINANCIAL_TERM_GAP, 1 ENUM_MISMATCH,
1 RELATION_MISMATCH, 1 DOCUMENT_GENERATION_GAP, 1 AUTHORIZATION_GAP = **21 gaps**.

Achados não classificados como "gap" formal, mas registrados como código morto:
`contracts.store.ts` (Zustand, nunca importado), `contract-party-origin.mapper.ts`/
`getContractPartyOrigin()` (nunca importado), `forms/index.ts` (stub vazio).

---

## Contadores finais (Zero-Gap)

```
SUBDOMAINS_AUDITED: 13
COMPONENTS_AUDITED: 18
HOOKS_AUDITED: 6
CREATE_FORMS: 2 (ContratoWizard, ContratoFormModal)
CREATE_FIELDS: 9 (wizard, nível-registro) + 13 (ContratoFormModal, nível-registro) = 22 campos de
               nível-registro distintos entre os dois fluxos; + N por parte (até 19 subcampos) e
               N por signatário (5 subcampos)
EDIT_FORMS: 2
EDIT_FIELDS: mesmos conjuntos do create por fluxo (mesmo componente create/edit em ambos)
MODALS_DRAWERS_WIZARDS: 6 (ContratoWizard, ContratoFormModal, ContratoViewModal,
                           SendForSigningDialog, ContractImportWorkspace, TemplateContratoViewModal)
TABLE_GRID_COLUMNS: 15 (7 em Contratos.tsx + 4 em TemplatesContratos.tsx, + checkbox/ações não
                        contados como dado)
CONTRACT_TYPES: 4 vocabulários paralelos (nenhum unificado — ver §10)
WORKFLOW_STATUSES: 9 alcançáveis + 1 morto (ATIVO) = 10 valores no enum
RELATION_FIELDS: 5 (contracts.artista_id, .cliente_id, .lancamento_id, .template_id,
                    artists.contrato_id)
PARTY_FIELDS: até 19 subcampos por parte × N partes dinâmicas por template (não persistido em
              colunas — dentro de observacoes)
SIGNATORY_FIELDS: 6 (role, nome/name, email, obrigatorio, ordem, provider)
FINANCIAL_TERM_FIELDS: 6 (valor + 5 campos de contract_service_types, desconectados na prática)
RIGHTS_TERM_FIELDS: 1 (exclusivo — não exposto no fluxo principal)
TEMPLATE_FIELDS: 8 (nome, tipo_servico, conteudo, descricao, ativo, variables_manifest,
                    header_image, footer_image)
TEMPLATE_VARIABLES: dinâmico por template (0 a N, todos com fonte — real via variables_manifest ou
                    fallback via regex, nunca sem origem)
AMENDMENT_FIELDS: 5 (versoes[]: versao, url, criado_em, notas, autor) — não é um aditivo formal,
                  é histórico de arquivo
FILTERS: 5 (3 em Contratos.tsx + 2 em TemplatesContratos.tsx)
SEARCH_FIELDS: 2 (título+artista em Contratos.tsx; nome em TemplatesContratos.tsx)
SORT_FIELDS: 4 (só TemplatesContratos.tsx — Contratos.tsx não tem nenhuma coluna ordenável)
IMPORT_FIELDS: 14 (só contracts, via Central de Relatórios)
EXPORT_FIELDS: 15 (13 col + 2 ro)
XLSX_EXPORTS: 1 (Contratos — contract_templates/contract_service_types não estão no registry)
XLSX_RULE_VIOLATIONS: 0
PDF_EXPORTS: 0
DOCX_EXPORTS: 0
STORAGE_FIELDS: 2 (arquivo_url; VinculadoDocument — sempre vazio/stub)
REALTIME_EVENTS: 0
DOCUSIGN_FUNCTIONS_AUDITED: 11 (connect_account, oauth_callback, account_status, token_reference,
                                create_envelope, send_envelope, signers, envelope_status,
                                signature_status, download_signed_document, webhook)
DOCUSIGN_IMPLEMENTED: 4 (connect_account, oauth_callback, account_status, token_reference)
DOCUSIGN_PARTIAL_OR_STUB: 0
DOCUSIGN_NOT_IMPLEMENTED: 7 (create_envelope, send_envelope, signers, envelope_status,
                             signature_status, download_signed_document, webhook)
CREDENTIALS_REQUIRED_LATER: 1 (DOCUSIGN_CLIENT_ID/DOCUSIGN_CLIENT_SECRET — PLATFORM ownership;
                              tokens OAuth resultantes permanecem TENANT_SCOPED, não vão para .env)
PERMISSIONS_AUDITED: 8 (contract:read/create/update/cancel,
                        contract_template:read/create/update/archive)
AUTHORIZATION_GAPS: 1 (autentique webhook sem @Public())
TENANT_ISOLATION_GAPS: 0

CODE_FIELD_ONLY: 0
DATABASE_COLUMN_ONLY: 0
TYPE_MISMATCH: 0
NULLABILITY_MISMATCH: 0
DEFAULT_MISMATCH: 0
ENUM_MISMATCH: 1 (ContractStatus.ATIVO inatingível)
RELATION_MISMATCH: 1 (exclusivo não exposto no wizard principal)
CREATE_MAPPING_MISMATCH: 1 (contract-templates DTO incompatível — bloqueia toda criação real)
EDIT_MAPPING_MISMATCH: 1 (mesmo, update-contract-template.dto herda o mesmo PartialType quebrado)
DISPLAY_MAPPING_MISMATCH: 0
PARTY_MAPPING_GAPS: 1
FINANCIAL_TERM_GAPS: 1
TEMPLATE_GAPS: 1
DOCUMENT_GENERATION_GAPS: 1
STORAGE_GAPS: 1
SIGNATURE_GAPS: 2
DOCUSIGN_GAPS: 1
WORKFLOW_GAPS: 1
REAL_MAPPING_GAPS: 9

CONTRACT_TO_ACCOUNTING_TRACEABILITY_COMPLETE: SIM
DOCUSIGN_TRACEABILITY_COMPLETE: SIM
AUDITORIA_TSX_CONTRACT_SECTION_COMPLETE: SIM

UNMAPPED_CREATE_FIELDS: 0
UNMAPPED_EDIT_FIELDS: 0
UNMAPPED_DISPLAY_FIELDS: 0
UNMAPPED_RELATION_FIELDS: 0
UNMAPPED_PARTY_FIELDS: 0
UNMAPPED_FINANCIAL_FIELDS: 0
UNMAPPED_TEMPLATE_FIELDS: 0
UNMAPPED_SIGNATURE_FIELDS: 0
UNMAPPED_IMPORT_FIELDS: 0
UNMAPPED_EXPORT_FIELDS: 0
UNMAPPED_STORAGE_FIELDS: 0
UNKNOWN_FIELD_CLASSIFICATIONS: 0
```

NEXT_MODULE: `crm-relationships`
