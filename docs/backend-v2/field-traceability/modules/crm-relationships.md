# Módulo `crm-relationships` — Auditoria Zero-Gap (Fase 2, Prompt 103)

STATUS: **COMPLETE** — UNMAPPED_*: 0, UNKNOWN_FIELD_CLASSIFICATIONS: 0.

Escopo real (seguindo imports/hooks/endpoints, não a pasta `crm-relationships/`):
- Frontend: `apps/web/src/modules/crm-relationships/**` (nenhuma página própria — a pasta `pages/`
  só tem `.gitkeep`; os componentes reais são consumidos por `apps/web/src/modules/leads/pages/
  LeadsPage.tsx`, `apps/web/src/modules/artist/components/EquipeContatosCRM.tsx`,
  `apps/web/src/shared/pages/MusicChat.tsx`, e como `useClientes()` por `accounting`, `contracts`,
  `dashboard`, `events`, `marketing`). Rota real: `/leads` (`/crm`, `/crm-relacionamentos`
  redirecionam para lá — ver §3).
- Backend: `apps/api/src/modules/clients/**` (canônico), `apps/api/src/modules/contacts/**`
  (facade legado, sem consumidor), `apps/api/src/modules/contact-attachments/**`,
  `apps/api/src/modules/contact-timeline/**` (ambos sub-recursos do facade legado, fakes em
  memória), `contact-contracts` já documentado em `contracts.md` (não reaberto).
- Tabelas (Fase 1, ground truth): `clients` (39 col, `backendMapping: DIRECT`), `client_attachments`
  (11 col, `DIRECT`). **Não existe tabela física `contacts`** — decisão de domínio documentada nas
  próprias migrations/comentários do backend: "Contato = Cliente", mesma entidade física.

---

## 1. Subdomínios reais identificados

| Subdomínio | FRONTEND_ENTRYPOINT | ENDPOINTS | BACKEND_CONTROLLER | SERVICE | DATABASE_TABLES |
|---|---|---|---|---|---|
| CONTACT/CLIENT (unificado) | `ContatosPanel.tsx` (via `/leads`), `ContatoFormModal.tsx`, `ContatoViewModal.tsx`, `useClientes()` (consumido por 5 outros módulos) | `GET/POST/PATCH/DELETE /clients` | `clients.controller.ts` | `clients.service.ts` | `clients` |
| TIMELINE (real) | `ContatoViewModal.tsx` (via `useClientTimeline`) | `GET/POST /clients/:id/timeline` | `clients.controller.ts` | `ClientsService` (reaproveita `activity_logs`, real, tenant-scoped) | `activity_logs` (não `clients`) |
| CONTRATOS VINCULADOS | nenhum consumidor frontend encontrado (endpoint real, não chamado) | `GET /clients/:id/contracts` | `clients.controller.ts` | `ClientsService.getContracts` (raw SQL sobre `contracts.cliente_id`) | `contracts` (leitura) |
| ANEXOS (real, backend completo) | nenhum consumidor real de upload; `listAttachments`/`removeAttachment` existem no service frontend mas nunca são chamados | `GET/DELETE /clients/:id/attachments`, `POST /clients/:id/attachments/presign`, `POST /clients/:id/attachments` | `clients.controller.ts` | `ClientsService` + `StorageService` (R2 presigned upload real) | `client_attachments` |
| CONTACT LEGACY FACADE | nenhum (zero consumidores frontend) | `GET/POST/PATCH/DELETE /contacts` | `contacts.controller.ts` | `ContactsService` (facade puro sobre `ClientsService`, Parte 80) | `clients` (via facade) |
| CONTACT ATTACHMENTS (fake) | nenhum | `GET/POST /contacts/:id/attachments` | `contact-attachments.controller.ts` | `ContactAttachmentsService` — **`Map` em memória, não Postgres** | nenhuma |
| CONTACT TIMELINE (fake) | nenhum | `GET/POST /contacts/:id/timeline` | `contact-timeline.controller.ts` | `ContactTimelineService` — **`Map` em memória, não Postgres** | nenhuma |
| CONTACT CONTRACTS (fake) | nenhum | `GET/POST /contacts/:id/contracts` | `contact-contracts.controller.ts` | já documentado em `contracts.md` §3/Gap #9 — **`Map` em memória** | nenhuma |
| CLASSIFICAÇÃO HIERÁRQUICA | `ContatoFormModal.tsx` (Tipo→Categoria→Perfil) | nenhum (config estático no frontend) | — | `constants/contact-classification.ts` | `clients.tipo_pessoa`/`.categoria`/`.perfil` (real) |
| INTERAÇÕES (histórico manual) | `ContatoFormModal.tsx` (seção "Histórico de Interações") | **nenhum — nunca chega ao backend** (ver Gap #1) | — | — | `clients.interacoes` (jsonb, real, órfã) |

10 subdomínios reais identificados.

---

## 2. `Auditoria.tsx` — CROSS_MODULE_AUDITORIA_TSX (trecho crm-relationships)

Ferramenta real (mesma de `catalog.md`/`contracts.md`): tab "CRM" (`module: "crm"`) em
`apps/web/src/modules/admin/pages/Auditoria.tsx`. Roda sobre `runner.ts:171-184`.

`AUDITORIA_CRM_RELATIONSHIP_FIELDS`:

| Campo | Severidade |
|---|---|
| `nome` | obrigatorio |
| `email` | recomendado |
| `telefone` | recomendado |
| `segmento` | recomendado |
| `status` | recomendado |

`AUDITORIA_CRM_RELATIONSHIP_RULES`: mesmo motor genérico (`hasValue()`) dos demais módulos.
`fix_path`: `/crm?edit=<id>`.

`AUDITORIA_CRM_RELATIONSHIP_DATABASE_SOURCES`: `storage.list("clientes")` → `GET /clients` (mesmo
endpoint real do resto do módulo) — retorna a forma bruta de `ClientsService.mapClient()`
(campos `nome`, `phone`, `email`, `document`, `categoria`, `status`, não `telefone`/`segmento`).

`AUDITORIA_CRM_RELATIONSHIP_GAPS` (2, ambos confirmados por leitura de código):

1. **Deep-link quebrado**: `fix_path` aponta para `/crm?edit=<id>`, mas
   `apps/web/src/app/routes/crm.routes.tsx:12` define `<Route path="/crm" element={<Navigate
   to="/leads" replace />} />` — um redirecionamento **estático**, sem repassar `location.search`.
   Clicar em "Preencher"/"Abrir" para um contato incompleto navega para `/crm?edit=<id>` e é
   imediatamente redirecionado para `/leads` puro, **perdendo o `?edit=<id>`** — diferente do
   comportamento correto já confirmado em `contracts.md` (`/contratos?edit=<id>` funciona).
2. **Checagem de campos com nomes errados**: `runner.ts` verifica `row.telefone` e `row.segmento`,
   mas a resposta real de `GET /clients` (consumida cruamente por `storage.list()`, sem passar pelo
   `apiClientToCliente()` do frontend) usa `phone` e `categoria` — os nomes `telefone`/`segmento` só
   existem na camada de tradução do `useClientes()` do próprio módulo, nunca no payload bruto da
   API. Resultado: `hasValue(row.telefone)` e `hasValue(row.segmento)` são **sempre `false`**,
   então **todo** contato/cliente aparece com "Telefone" e "Segmento" na lista de recomendados
   faltantes, mesmo quando o telefone e a categoria estão de facto preenchidos no banco.

`AUDITORIA_TSX_CRM_RELATIONSHIPS_SECTION_COMPLETE: SIM`.

---

## 3. Componentes (classificação completa)

| Componente | Classificação | Observação |
|---|---|---|
| `ContatoFormModal.tsx` | CREATE_MODAL + EDIT_MODAL | real, 769 linhas, único formulário de criação/edição realmente usado (via `/leads`, `EquipeContatosCRM`, `MusicChat`) |
| `ContatoViewModal.tsx` | DETAIL_MODAL + TIMELINE (real) | real, usa `useClientTimeline` (dados reais de `activity_logs`), permite adicionar nota manual |
| `ContatosPanel.tsx` | TABLE + FILTER + SEARCH | real, embutido em `LeadsPage.tsx`; filtros "Clientes" e "Contratantes" mapeiam para o **mesmo** valor (`CORPORATE_CLIENT`) — filtro duplicado/redundante |
| `ContatosTable.tsx` | TABLE | real, 7 colunas de dado, sem ordenação (nenhum `SortableTableHead`) |
| `ContactModal.tsx` (`forms/`) | OTHER_DATA_CONSUMER | real, usado por `MusicChat.tsx` (não lido em profundidade — fora do caminho crítico do CRM propriamente dito, é um modal de contato simplificado embutido no chat) |
| `ContactComponents.tsx` | DEAD | **317 linhas, 13 componentes exportados** (`ContactHeader`, `ContactFilters`, `ContactDetailsPanel`, `ContactTimeline`, `ContactTags`, `ContactAttachments`, `ContactContracts`, `ContactNotes`, `ContactAgenda`, `CompanyRelations`, `SocialMediaSection`, `OperationalInfoSection`, `ContactForm`) — confirmado por grep exaustivo: **zero consumidores fora do próprio módulo** (nem mesmo o barrel `components/index.tsx` que os re-exporta é importado por ninguém). Suite alternativa/mais rica de UI de contato, jamais renderizada |
| `components/index.tsx` (barrel) | DEAD | mesmo motivo — nunca importado |
| `EquipeContatosCRM.tsx` (módulo `artist`, não `crm-relationships`) | RELATION_SELECTOR | real, consome `ContatoFormModal`/`useContacts` — ver §14 |

Confirmado: `ContactContracts()` (dentro do componente morto `ContactComponents.tsx`) é um
placeholder estático (`<div>Contratos vinculados ao contato aparecem aqui.</div>`) que nunca
chegou a ser ligado ao endpoint real `GET /clients/:id/contracts` — mesmo se o componente fosse
reativado, não haveria chamada real.

---

## 4. Hooks

| HOOK | FILE | SUBDOMAIN | ENDPOINTS | READ/WRITE | RELATIONS | INTERACTION_USAGE | REALTIME | STORAGE | AUTH/TENANT_DEP |
|---|---|---|---|---|---|---|---|---|---|
| `useContacts` | `hooks/useContacts.ts` | CONTACT | `GET/POST/PATCH/DELETE /clients` (via `contactsService`→`clientsService`) | mapeia `ApiClient`→`Contact` (`fromApi`); `tags`/`priority`/`timeline`/`linkedArtistId`/`website` sempre vazios/hardcoded (sem coluna física, documentado no próprio código) | nenhuma | não (usa `Contact.timeline` sempre `[]`; timeline real é via hook separado) | não | não | implícito |
| `useSimpleContacts` | `hooks/useContacts.ts` | CONTACT | idem (reusa `useContacts`) | só `{id,name}` | — | — | — | — | implícito |
| `useClientes` | `hooks/useContacts.ts` | CLIENT | `GET/POST/PATCH/DELETE /clients` (via `clientsService` direto) | mapeia `ApiClient`→`Cliente` (`apiClientToCliente`) | — | não | não | não | implícito |
| `useClientTimeline` | `hooks/useClientTimeline.ts` | TIMELINE | `GET/POST /clients/:id/timeline` | real, persistido | — | sim (real) | não | não | implícito |

Comentário do próprio `useClientTimeline.ts` confirma: substitui um `useContactTimelineStore`
(Zustand, 100% em memória) já removido por não ter consumidor — mas **4 outros stores irmãos**
(`contact-agenda`, `contact-filters`, `contact-panel`, `contact-tags`) permanecem no código hoje,
igualmente sem consumidor (ver §5/DEAD).

Nenhum hook ativo ficou sem classificação.

---

## 5. Dead code adicional (stores)

| Item | Situação |
|---|---|
| `useContactAgendaStore` (`store/contact-agenda.store.ts`) | DEAD — zero consumidores em `apps/web/src` |
| `useContactFiltersStore` (`store/contact-filters.store.ts`) | DEAD — idem |
| `useContactPanelStore` (`store/contact-panel.store.ts`) | DEAD — idem |
| `useContactTagsStore` (`store/contact-tags.store.ts`) | DEAD — idem |
| `store/index.ts` (barrel) | DEAD — nunca importado fora do módulo |

---

## 6. CREATE Contact — `ContatoFormModal.tsx` (único fluxo real)

Comentário do próprio arquivo (linhas 4-9) já alerta: vários campos do formulário "NÃO existem como
colunas dedicadas na tabela `contatos` atual... persistidos via `payloadOperacional jsonb`". A
auditoria confirma que essa afirmação está **parcialmente errada hoje**: o `payloadOperacional`
nunca chega, de fato, ao backend (ver Gap #1) — não é que os dados vão para o jsonb errado, é que
são descartados antes de sair do navegador.

| FORM_FIELD | TYPE | REQUIRED | DATABASE_COLUMN (real, `clients`) | ENVIADO NO CREATE REAL? | Observação |
|---|---|---|---|---|---|
| `tipo_pessoa` | select | sim | `tipo_pessoa` | sim (via `type`, convertido `person\|company`) | |
| `nome_pf` / (`nome_fantasia`\|\|`razao_social`) | string | sim (`isValid` exige nome derivado) | `nome` | sim (`name`, mas só o valor **derivado**, nunca ambos) | ver Gap #2 |
| `cpf` / `cnpj` | string (mascarado) | não | `cpf_cnpj_encrypted` (AES-256-GCM) | sim (via `documentNumber`→`document`) | único campo de doc PII que sobrevive |
| `funcao` | string | não | `funcao` | **NÃO** | capturado, nunca enviado |
| `foto` | file→data URL (base64) | não | `foto` | **NÃO** | capturado (pode gerar string enorme em memória), nunca enviado |
| `razao_social` / `nome_fantasia` | string | não (PJ) | `razao_social` / `nome_fantasia` (2 colunas distintas) | **NÃO, separadamente** | só um dos dois sobrevive, fundido em `nome` |
| `categoria` | select (6 opções) | sim | `categoria` | sim (via `contactType`→`category`) | |
| `perfil` | select (config-driven, cascata) | sim | `perfil` | **NÃO** | capturado, obrigatório na validação do form, nunca enviado ao backend |
| `email` | string | não | `email_encrypted` (AES-256-GCM) | sim | |
| `telefone` | string (mascarado) | não | `telefone_encrypted` (AES-256-GCM) | sim (via `phone`/`whatsapp`) | |
| `instagram` | string | não | `instagram` | sim | |
| `cep`/`cidade`/`estado` | string | não | `cep`/`cidade`/`estado` (colunas próprias) | sim (via `zipCode`/`city`/`state`) | |
| `logradouro`/`numero`/`complemento`/`bairro` | string | não | `logradouro`/`numero`/`complemento`/`bairro` (4 colunas próprias) | **NÃO, separadamente** | só combinados numa única string `address`→`endereco_completo` |
| `status_contato` | select (6 opções) | não | `status_contato` | **NÃO** | capturado, nunca enviado (nem por esse nome nem por `status`) |
| `prioridade_contato` | select (4 opções) | não | `prioridade_contato` | **NÃO** | idem |
| `responsavel_nome` | string (PJ) | não | `responsavel_nome` | sim (via `responsible`) | único campo de "responsável" que sobrevive |
| `responsavel_email`/`responsavel_telefone`/`responsavel_cargo` | string (PJ) | não | 3 colunas próprias | **NÃO** | capturados, nunca enviados |
| `interacoes[]` | array repetível (tipo/data/horário/descrição) | não | `interacoes` (jsonb) | **NÃO** | seção inteira "Histórico de Interações" descartada no submit |
| `attachments[]` | UPLOAD (fake, ver §16) | não | `client_attachments` (tabela real) / `clients.attachments` (jsonb, também real) | **NÃO** | ver Gap #4 |
| `observacoes` | textarea | não | `observacoes` | sim (via `notes`) | |

**Causa raiz confirmada em duas camadas**:
1. `contacts.service.ts::toApiInput()` (frontend) só mapeia `name/category/type/email/phone/
   document/address/city/state/instagram/zipCode/responsible/notes` — nunca lê
   `data.payloadOperacional` nem popula `payload.metadata` (que existe e seria o canal correto).
2. Mesmo que mapeasse, `CreateClientDto`/`UpdateClientDto` (backend,
   `apps/api/src/modules/clients/dto/clients.dto.ts`) **não declaram** `foto`, `funcao`, `perfil`,
   `razao_social`/`nome_fantasia` (distintos), `logradouro`/`numero`/`complemento`/`bairro`,
   `status_contato`, `prioridade_contato`, `responsavel_email`/`.telefone`/`.cargo`, nem
   `interacoes` — com `ValidationPipe({whitelist:true, forbidNonWhitelisted:true})` global, enviar
   qualquer um desses nomes de campo faria a request inteira ser **rejeitada com HTTP 400**, não
   apenas ignorada.

CREATE_FIELDS (persistidos de fato, nível-registro): 9 (`tipo_pessoa`, `nome`(derivado), `document`,
`categoria`, `email`, `telefone`, `instagram`, `cep`/`cidade`/`estado`(3), `address`(combinado),
`responsavel_nome`, `observacoes` — total 12 campos reais chegam ao backend, de um total de 19+N
campos capturados no formulário).

---

## 7. EDIT — mesmas regras do Create

`ContatoFormModal` é o mesmo componente para `mode="create"|"edit"`. `contactToFormPayload()`
(em `ContatosPanel.tsx`) faz o caminho inverso ao editar: lê `contact.payloadOperacional` (que na
prática está **sempre vazio**, já que nunca foi escrito no create) para tentar re-popular
`foto`/`cpf`/`cnpj`/`razao_social`/`nome_fantasia`/`funcao`/`cep`/`logradouro`/`numero`/
`complemento`/`bairro`/`responsavel_email`/`responsavel_telefone`/`responsavel_cargo`/`interacoes`
— como esses campos nunca foram persistidos, a edição de um contato real sempre reabre o formulário
com esses campos em branco, mesmo que o usuário os tenha preenchido na criação. `IMMUTABLE_AFTER_
CREATE`: nenhum campo é bloqueado após criação (mesmo padrão dos demais módulos). `CREATE_SUPPORTED`
= `EDIT_SUPPORTED` = sim para todos os campos, mas ambos igualmente afetados pela perda de dado.

---

## 8. Dados de identificação — PII (§17/§18/§19 do prompt)

| FIELD | DATABASE_COLUMN | PII_CLASS | ENCRYPTED | ENCRYPTION_LAYER | READ_MAPPING | WRITE_MAPPING | DISPLAY_BEHAVIOR | SEARCH_BEHAVIOR | EXPORT_BEHAVIOR |
|---|---|---|---|---|---|---|---|---|---|
| `email` | `clients.email_encrypted` | EMAIL | **SIM** | AES-256-GCM (`EncryptionService.encryptNullable`/`.decryptNullable`, mesma classe usada por `artists`) | `mapClient()` descriptografa no `findById`/`list` | `create()`/`update()` criptografam antes de `INSERT`/`UPDATE` | texto plano na UI (já descriptografado pelo backend) | **não pesquisável no backend** — `QueryClientDto` só filtra `status`/`type`/`category`; busca por email é 100% client-side sobre o array já descriptografado em memória | descriptografado no export (`enc('email','email_encrypted')` em `CLIENTS_CONTRACT`) |
| `telefone`/`phone`/`whatsapp` | `clients.telefone_encrypted` | PHONE | **SIM** | idem | idem | idem | texto plano | mesma limitação — não pesquisável no backend | descriptografado no export |
| `cpf`/`cnpj`/`document` | `clients.cpf_cnpj_encrypted` | DOCUMENT/TAX_ID | **SIM** | idem | idem | idem | texto plano | mesma limitação | descriptografado no export |
| `endereco_completo`/`logradouro`/`numero`/`complemento`/`bairro`/`cidade`/`estado`/`cep` | colunas próprias, texto plano | ADDRESS | **NÃO** | N/A | direto | direto (parcial — ver §6) | texto plano | client-side | texto plano no export |
| `observacoes` | `clients.observacoes` (text) | PERSONAL_NOTE | **NÃO** | N/A | direto | direto | texto plano | client-side | texto plano no export |
| `interacoes` | `clients.interacoes` (jsonb) | PERSONAL_NOTE/OTHER_PII | **NÃO** | N/A | nunca lido de fato (sempre vazio na prática, ver Gap #1) | nunca escrito de fato | N/A | N/A | `interacoes` **não está** no `CLIENTS_CONTRACT` (`excludedFormFields` não a lista explicitamente, mas também não tem `col()`/`ro()` — coluna simplesmente ausente do contrato de export) |
| `foto` | `clients.foto` (text) | OTHER_PII (imagem/identificação) | **NÃO** | N/A | nunca lido de fato | nunca escrito de fato (Gap #1) | N/A | N/A | texto plano no export (`col('foto')`) — mas sempre vazio na prática, dado que nunca é escrito |

Diferente do achado de `contracts.md` (PII de partes serializada em texto puro dentro de
`observacoes`), aqui o padrão é o **oposto**: os campos de identificação verdadeiramente sensíveis
(email/telefone/CPF/CNPJ) são corretamente roteados para colunas dedicadas `*_encrypted` com
AES-256-GCM real — o problema neste módulo não é exposição de PII sem criptografia, é **perda de
dado** (campos capturados na UI que nunca chegam a ser persistidos, criptografados ou não).

`ENCRYPTION_GAP`: nenhum (a criptografia dos 3 campos que efetivamente persistem está correta e
consistente com o padrão `artists`). `SEARCH_GAP`: 1 — nenhum campo criptografado é pesquisável no
backend (`QueryClientDto` não tem `search`), busca é sempre local ao array já carregado (mesma
limitação estrutural do módulo `artist`, já registrada em `artist.md`, aqui apenas confirmada de
novo no contexto de `clients`).

---

## 9. Tipos de relacionamento (§11 do prompt)

Sistema hierárquico real, config-driven, 3 níveis (`constants/contact-classification.ts`):

1. **Tipo de Contato** (natureza jurídica): `pessoa_fisica` | `pessoa_juridica` → persiste em
   `clients.tipo_pessoa`.
2. **Categoria** (relacionamento): 6 valores fixos — `CORPORATE_CLIENT` (Cliente), `PARTNER`
   (Parceiro), `SUPPLIER` (Fornecedor), `SERVICE_PROVIDER` (Prestador de Serviços), `INVESTOR`
   (Investidor), `COLLECTIVE_MANAGEMENT_ORGANIZATION` (Órgão) → persiste em `clients.categoria`
   (aliás `contactType` no `Contact`).
3. **Perfil** (identidade específica dentro da categoria, ex. "Advogado", "Beatmaker", "Gravadora/
   Selo"): dezenas de valores por combinação Tipo×Categoria, config `CONTACT_PROFILES` → **capturado
   no form mas nunca persistido** (Gap #1) apesar de ser campo obrigatório na validação do form.

Coexistindo com esse sistema (usado só para rótulos de exibição/filtro, não para o fluxo de
classificação do form de criação): `contactTypes`/`ContactType` (108 valores brutos, ex.
`A_AND_R`, `BEATMAKER`, `LAWYER`, `VENUE`) em `types/index.ts` + `constants/index.ts`
(`individualContactTypeOptions`/`companyContactTypeOptions`) — usado por `ContatosTable.tsx` e
`ContatosPanel.tsx` para exibir o label de `contact.contactType` (que na prática só recebe um dos 6
slugs de `CONTACT_CATEGORY_OPTIONS`, já que é isso que `ContatoFormModal` grava em `categoria`) — os
demais ~100 valores do enum `ContactType` são vestigiais para qualquer contato criado pelo fluxo
atual, só alcançáveis em dados legados/importados por outra via.

`RELATIONSHIP_TYPES`: 6 categorias funcionalmente ativas + 108 valores de enum histórico (não
todos alcançáveis pela UI atual).

---

## 10. Relacionamentos / Relações Polimórficas (§12/§13 do prompt)

**Não existe uma tabela de relacionamento dedicada** (`contact_relationships` ou similar) — não foi
encontrada em nenhuma camada. **Não existem relações polimórficas** (`entity_type`/`entity_id`,
`resource_type`/`resource_id` etc.) no sentido de um relacionamento genérico contato↔qualquer-coisa
com um par tipo/ID armazenado numa tabela de junção própria do CRM.

Os únicos padrões observados são referências soltas por UUID, sempre unidirecionais (contato nunca
sabe quem o referencia):

| SOURCE_ENTITY | TARGET_ENTITY | MECHANISM | DATABASE_FK_OR_JOIN | CARDINALITY | DIRECTIONAL |
|---|---|---|---|---|---|
| `artists.contatos_equipe[].contactId` (jsonb) | `clients.id` | referência solta por UUID dentro de um array jsonb no lado do artista | nenhuma FK — string UUID sem constraint | N:N (um artista referencia N contatos; um contato pode ser referenciado por N artistas, sem índice reverso) | SIM (artista → contato; não há caminho de volta armazenado) |
| `contracts.cliente_id` | `clients.id` | FK "solta" (Fase 1: `foreign_key: false`, mas usada funcionalmente via `GET /clients/:id/contracts`, raw SQL `WHERE cliente_id = $2`) | sem constraint declarada no schema, mas semanticamente uma FK real | N:1 | SIM (contrato → cliente) |

Isso responde à pergunta do prompt: `POLYMORPHIC_RELATION: NÃO` — todas as referências encontradas
são simples (uma entidade→um tipo de alvo), não há um campo genérico "tipo de entidade relacionada".
Risco de referência inválida: como nenhuma das duas referências acima tem FK declarada no banco,
**nada impede** (a nível de banco) que `artists.contatos_equipe[].contactId` ou
`contracts.cliente_id` apontem para um `clients.id` de **outro tenant** ou para um ID inexistente —
mitigado apenas em runtime: `ClientsService.findById()`/`getContracts()` sempre filtram por
`tenant_id` explicitamente, então uma referência cross-tenant nunca é resolvida com sucesso (falha
silenciosa/404, não vazamento), mas o dado "sujo" (UUID de outro tenant) pode persistir
indefinidamente sem detecção.

---

## 11. Artist ↔ CRM (§14 do prompt — `artist` já auditado, não reaberto)

| ARTIST_FIELD | CRM_RESOURCE | ENDPOINT | DATABASE_RELATION | DISPLAY_USAGE | CREATE_USAGE | EDIT_USAGE |
|---|---|---|---|---|---|---|
| `artists.contatos_equipe` (jsonb array de `{contactId, distribuidoras[]}`) | `clients` (via `useContacts()`) | `GET /clients` (lista para busca/seleção) + `POST /clients` (criar novo contato inline) | referência solta por UUID (§10), sem FK | `EquipeContatosCRM.tsx` resolve `nome`/`categoria`/`telefone`/`email` dinamicamente a partir do `contactId` — "fonte única", sem duplicação de dado do contato no lado do artista | permite criar um novo contato inline (abre `ContatoFormModal`, mesmo componente/mesmas limitações do §6) sem sair do cadastro de artista | vínculo (contactId + campo `distribuidoras`, exclusivo da relação artista↔contato, não do contato em si) editável; dados do contato em si só editáveis via o próprio `ContatoFormModal` |

Padrão limpo: ao contrário do achado de `contracts.md` (partes contratuais **copiadas**/
desnormalizadas para dentro de `observacoes`), aqui o vínculo artista↔contato é uma **referência
real**, não uma cópia — qualquer alteração num contato do CRM se reflete automaticamente em todos os
artistas que o referenciam. `distribuidoras[]` (e-mails de distribuidoras) é dado específico da
relação (não do contato), corretamente mantido do lado do artista.

`ARTIST_CRM_TRACEABILITY_COMPLETE: SIM`.

---

## 12. Contracts ↔ CRM (§15 do prompt — `contracts` já auditado, não reaberto)

| CONTRACT_PARTY_SOURCE | CRM_RESOURCE | DATABASE_RELATION | DATA_COPY_OR_REFERENCE |
|---|---|---|---|
| `contracts.cliente_id` (campo de nível-registro, real, usado por `ContratoFormModal`/`Contrato.
  cliente_id`) | `clients` | FK solta (`contracts.cliente_id → clients.id`, sem constraint declarada) | **REFERÊNCIA** — aponta para o registro real; `ContractsService.list/findById` faz
  `leftJoinAndMapOne('c.clientes', ClientEntity, ...)` real (já confirmado em `contracts.md` §4), então o nome do cliente exibido em `Contratos.tsx` vem sempre do registro atual em `clients`, não de uma cópia |
| `ContratoWizard.tsx` → partes textuais dentro de `contracts.observacoes` (jsonb serializado, ver `contracts.md` Gap #1) | `clients`/`useClientes()` | **nenhuma** — quando uma parte tem `origin: "crm"`, os valores (nome/CPF/CNPJ/email/telefone/endereço) são **copiados** pontualmente do registro CRM selecionado para dentro do blob da parte | **CÓPIA** — o `sourceId` do contato de origem não é persistido (já registrado como `PARTY_MAPPING_GAP` em `contracts.md` Gap #8); alterações posteriores no contato do CRM nunca se refletem no contrato já criado |

Confirma-se exatamente o que `contracts.md` já apontava sem aprofundar o lado CRM: o módulo
`contracts` tem **dois** padrões coexistentes — `contracts.cliente_id` é uma referência real e viva
(nível-contrato, resolvida via join), enquanto as **partes** dentro do wizard (nível-clausula,
potencialmente vários "papéis" com origem CRM cada) são cópias desnormalizadas, sem rastro do
registro CRM de origem. **Não corrigido aqui**, conforme instrução do prompt.

`CONTRACT_CRM_TRACEABILITY_COMPLETE: SIM`.

---

## 13. Relações com outros domínios (§16 do prompt)

| CRM_RESOURCE | RELATED_RESOURCE | DATABASE_RELATION | ENDPOINT | PURPOSE |
|---|---|---|---|---|
| `clients` | `accounting` (transações/notas fiscais) | nenhuma FK direta encontrada — `useClientes()` é usado como dropdown de seleção em `TransacaoFormModal`/`useNotaFiscalForm`, mas o valor selecionado provavelmente vira um campo de texto/nome na transação, não uma FK para `clients.id` (não reauditado a fundo — fora do escopo, `accounting` já concluído) | `GET /clients` (leitura, dropdown) | seleção de cliente ao lançar uma transação/nota fiscal |
| `clients` | `events`/agenda | idem — `useClientes()` usado por `SchedulerFormModal`/`useAgendaParticipants` | `GET /clients` | selecionar cliente como participante de evento |
| `clients` | `dashboard` | `useClientes()` usado por `useMetrics.ts` | `GET /clients` | métricas agregadas (contagem de clientes, provavelmente) |
| `clients` | `marketing` (Tarefas) | `useClientes()` usado por `Tarefas.tsx` | `GET /clients` | vincular cliente a uma tarefa de marketing |
| `clients` | `musicchat` | `ContatoFormModal`/`useContacts`/`contatoPayloadToContactData` usados por `MusicChat.tsx` | `GET/POST /clients` | criar/vincular contato a partir do chat |
| `clients` | `leads` | `ContatosPanel`/`ContatoFormModal`/`ContatoViewModal` embutidos em `LeadsPage.tsx` — **é a única página real que renderiza a UI de Contatos do CRM** | `GET/POST/PATCH/DELETE /clients` | tela "Contatos" dentro do módulo `leads`, já que `/crm` redireciona para lá |

Nenhum desses módulos externos foi auditado a fundo aqui, conforme instrução do prompt §16 — só a
relação em si foi registrada.

---

## 14. Storage — Anexos (§41 do prompt)

| FORM_FIELD | RESOURCE_TYPE | DATABASE_REFERENCE | STORAGE_PROVIDER | UPLOAD_ENDPOINT | DOWNLOAD/PREVIEW | DELETE | TENANT_ISOLATION |
|---|---|---|---|---|---|---|---|
| `attachments[]` (`ContatoFormModal`, seção "Anexos") | documentos/imagens/vídeos do contato | **nenhuma real** — `client_attachments` existe mas nunca é escrita por este caminho | **nenhum** — `URL.createObjectURL(file)` gera um blob URL local, válido só na aba/sessão atual do navegador | nenhum chamado (existe `POST /clients/:id/attachments/presign` real, nunca invocado) | link local (`blob:...`), quebra ao fechar/recarregar a página | remove só do estado local do formulário | N/A (nunca sai do navegador) |
| `foto` (`ContatoFormModal`, PF) | imagem de perfil | `clients.foto` (real, nunca escrita — Gap #1) | nenhum (data URL local) | nenhum | preview local (`<img src={dataURL}>`) enquanto o modal está aberto | limpa o estado local | N/A |

Fluxo REAL do backend (existe, mas **0% alcançado pela UI**): `presignAttachmentUpload()` gera URL
pré-assinada para o Cloudflare R2 (`StorageService.createPresignedUpload`, 503 explícito se R2 não
configurado — sem fabricar sucesso); `confirmAttachmentUpload()` persiste metadata real em
`client_attachments` após confirmação do upload direto ao R2; `listAttachments()`/`removeAttachment()`
existem no `clientsService` do frontend mas **nenhum componente os invoca** — nem `ContatoViewModal`
(que mostra só `contact.attachments`, sempre `[]`) nem `ContatoFormModal` (que usa só blob URLs
locais). `STORAGE_GAP` confirmado: a infraestrutura de upload real está completa e testável via API,
mas inacessível a partir de qualquer tela do sistema.

---

## 15. Import / Export / XLSX (§31-35 do prompt)

**Import estruturado**: não foi encontrado nenhum fluxo de import de contatos/clientes específico
do módulo (nem componente `ImportDialog` equivalente ao de `reports`). O acesso é só via a Central
de Relatórios genérica (mesmo motor de `catalog.md`/`contracts.md`).

**Export/XLSX**: `clients` está registrado em `report-module-registry.ts:35` (label "Contatos",
`order: 17`). Contrato de campos `CLIENTS_CONTRACT` (`report-form-contracts.ts:253-286`): 25 `col()`
(incluindo **todos** os campos que o create-form real não consegue persistir — `foto`, `nome_pf`,
`razao_social`, `nome_fantasia`, `funcao`, `logradouro`, `numero`, `complemento`, `bairro`,
`status_contato`, `prioridade_contato`, `responsavel_nome/_email/_telefone/_cargo`) + 3 `enc()`
(`email`, `telefone`, `cpf_cnpj` — descriptografados para o export, mesmo padrão de `artists`/
`employees`) = **28 campos exportáveis/importáveis**.

`IMPORT_MAPPING_GAP` confirmado (§32 do prompt): como o motor de import da Central de Relatórios
opera sobre o `ReportFormContract` (mapeamento coluna-a-coluna direto), e **não** sobre
`CreateClientDto` (que rejeitaria a maioria desses 15 campos com HTTP 400 se enviados via
`POST /clients`), existe uma **assimetria real**: um tenant pode popular `foto`/`razao_social`/
`nome_fantasia`/`logradouro`/`numero`/`complemento`/`bairro`/`funcao`/`status_contato`/
`prioridade_contato`/`responsavel_email`/`responsavel_telefone`/`responsavel_cargo` **somente** via
import XLSX — o formulário "Novo Contato" normal nunca permite preenchê-los (Gap #1/§6). Isso não
foi verificado com uma importação real (proibido pelo prompt), mas é uma conclusão direta da leitura
comparada do DTO vs. do `ReportFormContract`.

`PII_EM_EXPORT` (§34 do prompt): `email`/`telefone`/`cpf_cnpj` são **descriptografados e incluídos em
texto plano** em qualquer export de "Contatos" via a Central de Relatórios — mesmo padrão já
sancionado para `artists`/`employees` (não uma peculiaridade deste módulo, mas está presente e deve
ser registrado). `MASKED: NÃO`. `PERMISSION_REQUIRED`: a exportação em si exige as permissões
normais do módulo de relatórios (não reauditadas aqui — fora de escopo).

**XLSX**: mesmo motor genérico (`export-format.service.ts`/`import-parser.service.ts`) de
`catalog.md`/`contracts.md` — sempre 1 worksheet por entidade, import rejeita arquivos com mais de 1
aba. `WORKSHEET_COUNT = 1`, `XLSX_RULE_VIOLATION: NÃO`.

---

## 16. Duplicidade (§24 do prompt)

Nenhuma regra de deduplicação foi encontrada em nenhuma camada:

| FIELD | UNIQUE_DB | BACKEND_CHECK | FRONTEND_CHECK | IMPORT_CHECK | BEHAVIOR_ON_DUPLICATE |
|---|---|---|---|---|---|
| `email` (após decriptar) | não (coluna é `email_encrypted`, criptografia AES-GCM com IV aleatório torna comparação de igualdade a nível de banco inviável sem descriptografar linha a linha) | nenhum (`ClientsService.create()` nunca consulta por email/telefone/documento existente antes de inserir) | nenhum | mesmo motor genérico, sem regra de dedup por entidade | duplicata criada silenciosamente, sem aviso |
| `document` (CPF/CNPJ) | idem | nenhum | nenhum | idem | idem |
| `nome` | não | nenhum | nenhum | idem | idem |

`DUPLICATE_HANDLING_GAP` confirmado — mesmo padrão já registrado para ISRC/ISWC em `catalog.md`
(nenhuma validação de unicidade em nenhuma camada, nem para os identificadores mais sensíveis do
módulo).

---

## 17. Tables/Grids, Details, Filters, Search, Sort, Paginação (§25-30 do prompt)

**`ContatosTable.tsx`** (única grid real):

| COLUMN_LABEL | COLUMN_KEY | API_FIELD | DATABASE_COLUMN | SORTABLE | FILTERABLE | SEARCHABLE | PII |
|---|---|---|---|---|---|---|---|
| Nome (+ empresa) | `name`/`companyName` | `nome`/`razao_social` | `clients.nome`/`.razao_social` | não | não | sim | não |
| Segmento | `contactType` (label) | `categoria` | `clients.categoria` | não | sim (`ContatosPanel` filtro rápido) | não | não |
| Contato (telefone+email) | `phone`/`email` | `phone`/`email` (decriptado) | `clients.telefone_encrypted`/`.email_encrypted` | não | não | sim (client-side, sobre dado já decriptado) | **sim** (PHONE/EMAIL) |
| Cidade | `city`/`state` | `cidade`/`estado` | `clients.cidade`/`.estado` | não | não | sim | não |
| Responsável | `responsible` | `responsavel_nome` | `clients.responsavel_nome` | não | não | não | não |
| Status | `status` (label) | `status` | `clients.status` | não | não | não | não |

7 colunas de dado, 0 ordenáveis (nenhuma implementa `SortableTableHead`), todas com origem
confirmada. `PAGINAÇÃO`: `usePagination(contacts, 10)` — 100% client-side sobre o array já
carregado. `TOTAL_COUNT_SOURCE`: `contacts.length` (array em memória).

**Limite silencioso confirmado (§28 do prompt)**: `GET /clients` usa o mesmo `PaginationDto.
limit=50` default já documentado em `catalog.md`/`contracts.md`, e nem `useContacts()` nem
`useClientes()` passam `limit`/`offset` — tenants com mais de 50 contatos/clientes nunca veem os
registros mais antigos em `ContatosPanel.tsx`, nos dropdowns de seleção de cliente
(`TransacaoFormModal`, `ContratoWizard`, `SchedulerFormModal` etc.), nem na Auditoria (§2).

**FILTERS**: 2 em `ContatosPanel.tsx` (busca livre + filtro rápido de categoria, 6 opções mas 2
delas — "Clientes" e "Contratantes" — mapeiam para o mesmo valor `CORPORATE_CLIENT`, portanto
redundantes/idênticas na prática).

**SEARCH**: `.includes()` case-insensitive sobre `nome`/`companyName`/`email`/`phone`/`whatsapp`/
`city`, sem normalização de acento, 100% client-side. Como `email`/`phone` chegam já decriptados do
backend antes da busca rodar, não há limitação adicional de criptografia na busca (mas segue sem
suporte a busca no backend, ver §8).

---

## 18. Delete / Archive (§36/§37 do prompt)

| UI_ACTION | ENDPOINT | DATABASE_BEHAVIOR | RELATIONSHIP_IMPACT | CROSS_MODULE_IMPACT | SOFT_OR_HARD |
|---|---|---|---|---|---|
| Excluir contato (individual ou em massa) | `DELETE /clients/:id` | `UPDATE clients SET deleted_at = now()` | `artists.contatos_equipe[].contactId` **não é limpo** — artistas continuam referenciando um `clients.id` agora soft-deleted, sem aviso; `contracts.cliente_id` idem | `ContratoWizard`/`TransacaoFormModal`/`SchedulerFormModal` etc. deixam de listar o contato no dropdown (pois `list()` filtra `deleted_at IS NULL`), mas registros já criados que o referenciam continuam com a FK solta apontando para um registro agora invisível | SOFT |

Nenhuma tela de restauração encontrada. Não existe funcionalidade de **merge** de contatos
duplicados em nenhuma camada (frontend ou backend) — `MERGE` não se aplica a este módulo hoje.

---

## 19. Permissões e Tenant Isolation (§38/§39 do prompt)

| PERMISSION | FRONTEND_ENFORCEMENT | BACKEND_ENFORCEMENT |
|---|---|---|
| `client:read` | leitura não gateada explicitamente no frontend | `@RequireRole('viewer') @RequirePermission('client:read')` |
| `client:create` | nenhum `RequirePermission` visível envolvendo o botão "Novo Contato" em `ContatosPanel`/`LeadsPage` (diferente de `catalog`/`contracts`, que gateiam o botão de criar) | `@RequireRole('editor') @RequirePermission('client:create')` |
| `client:update` | idem, sem gate visível no botão "Editar" | `@RequireRole('editor') @RequirePermission('client:update')` (também usado pelos endpoints de timeline/attachments) |
| `client:delete` | idem, sem gate visível no botão "Excluir" | `@RequireRole('manager') @RequirePermission('client:delete')` |
| `contact:read/create/update/delete` | N/A (endpoint sem consumidor) | mesmos 4 níveis, corretamente aplicados no facade legado, apesar de inatingível na prática |

`AUTHORIZATION_GAP`: nenhum gap real de segurança — o backend está corretamente protegido em
100% das rotas (`clients`, `contacts` legado, `contact-attachments`, `contact-timeline`, todas com
`@RequireRole`/`@RequirePermission`); o que falta é só o **feedback visual antecipado** no frontend
(botões de criar/editar/excluir não escondidos por permissão antes da chamada — mesma observação já
feita para `catalog.md` §17, não bloqueante pois o backend recusaria a operação de qualquer forma).

`TENANT_ISOLATION_GAP: 0`. `ClientsService` filtra `tenant_id = :tenantId` (via `@CurrentTenant()`)
em **todas** as operações (`list`/`findById`/`create`/`update`/`remove`/`getTimeline`/
`addTimelineEntry`/`getContracts`/`listAttachments`/`presignAttachmentUpload`/
`confirmAttachmentUpload`/`removeAttachment`) — inclusive validação explícita de que
`storageKey` de um anexo pertence ao tenant (`input.storageKey.startsWith(\`tenants/${tenantId}/\`)`)
antes de confirmar o upload. Existe um arquivo de teste dedicado
(`apps/api/src/modules/contacts/contacts-tenant-isolation.spec.ts`) cobrindo especificamente esse
cenário no facade legado. Atenção especial pedida pelo prompt:
- **join tables**: não existem (§10).
- **relações polimórficas**: não existem (§10).
- **notes/interactions**: `observacoes`/`interacoes` vivem na própria linha de `clients`, isolamento
  herdado diretamente do `tenant_id` da linha — sem risco adicional.
- **tags**: não existem de fato (sempre `[]`, §1/Gap #1) — sem superfície de risco.
- **imports/exports**: a Central de Relatórios (módulo `reports`, não reauditado aqui) já opera
  sempre com `tenant_id` do contexto autenticado, mesmo padrão usado por todos os módulos já
  auditados.

---

## 20. Realtime (§40 do prompt)

`REALTIME_EVENTS: 0` — nenhum canal Supabase Realtime, nenhuma subscription para `clients`/
`contacts` encontrada em `apps/web/src/modules/crm-relationships` nem nos módulos consumidores.

---

## 21. External Integrations (§42 do prompt)

Nenhuma integração externa (e-mail, calendário, WhatsApp, redes sociais, enriquecimento de
contato, outro CRM) foi encontrada especificamente neste módulo. `instagram` é apenas um campo de
texto livre (handle/URL), sem chamada a nenhuma API do Instagram. `EXTERNAL_INTEGRATIONS: 0`.

---

## 22. Gaps consolidados (evidenciados, não corrigidos)

1. **REAL_MAPPING_GAP** (severidade crítica) — `ContatoFormModal.tsx` captura ~15 campos reais
   (`foto`, `perfil`, `funcao`, `razao_social`/`nome_fantasia` distintos, `logradouro`/`numero`/
   `complemento`/`bairro`, `status_contato`, `prioridade_contato`, `responsavel_email`/`.telefone`/
   `.cargo`, `interacoes[]`) que **nunca chegam ao backend** em nenhum create/update real:
   `contacts.service.ts::toApiInput()` não os mapeia, e mesmo que mapeasse,
   `CreateClientDto`/`UpdateClientDto` não os declaram — seriam rejeitados com HTTP 400 pelo
   `ValidationPipe` global. O próprio comentário do modal afirma que esses campos "são persistidos
   via `payloadOperacional jsonb`" — afirmação **hoje incorreta**: `payloadOperacional` nunca é
   enviado. Ver §6/§8.
2. **CREATE_MAPPING_MISMATCH** — `razao_social` e `nome_fantasia` são 2 colunas reais e distintas
   em `clients`, mas o create-form só consegue persistir **uma delas** (fundida em `nome`) — a
   distinção se perde permanentemente.
3. **CREATE_MAPPING_MISMATCH** — `logradouro`/`numero`/`complemento`/`bairro` são 4 colunas reais
   e distintas em `clients`, mas o create-form só envia a versão combinada (`endereco_completo`) —
   as 4 colunas próprias nunca são populadas por nenhum fluxo real.
4. **STORAGE_GAP** (severidade alta) — o backend tem um fluxo real e completo de upload de anexos
   via URL pré-assinada para o Cloudflare R2 (`presign`/`confirm`/`list`/`remove`, tabela
   `client_attachments`), mas nenhuma tela chama `presign`/`confirm` — `ContatoFormModal` usa só
   `URL.createObjectURL()` (blob local, nunca sobrevive a um reload) e nunca envia `attachments` no
   payload de create/update de qualquer forma.
5. **IMPORT_MAPPING_GAP** — os ~15 campos do Gap #1 **são** exportáveis/importáveis via a Central
   de Relatórios (`CLIENTS_CONTRACT` os declara como `col()`), criando uma assimetria onde um
   import XLSX consegue popular colunas que o formulário normal de criação jamais alcança.
6. **DUPLICATE_HANDLING_GAP** — nenhuma verificação de duplicidade por email/telefone/documento/
   nome em nenhuma camada (create, update, import).
7. **AUDITORIA_TSX gap** — `fix_path` da Auditoria (`/crm?edit=<id>`) é destruído pelo redirect
   estático `/crm→/leads`; os campos `telefone`/`segmento` verificados pela Auditoria usam nomes que
   não existem na resposta bruta da API (`phone`/`categoria`), fazendo esses dois campos aparecerem
   como sempre-faltantes mesmo quando preenchidos — ver §2.
8. **SEARCH_GAP** — nenhum campo criptografado (email/telefone/documento) é pesquisável no backend
   (`QueryClientDto` não expõe `search`); toda busca é client-side sobre o array (já limitado a 50
   registros, Gap #10 abaixo).
9. **REAL_MAPPING_GAP** — `GET /clients` usa `PaginationDto.limit=50` e nenhum consumidor
   (`useContacts`/`useClientes`, nem os 5 módulos externos que os reusam) passa `limit`/`offset` —
   mesmo padrão de truncamento silencioso já documentado em `catalog.md`/`contracts.md`.
10. **REAL_MAPPING_GAP** — o facade legado `/contacts` e seus 3 sub-recursos
    (`contact-attachments`, `contact-timeline`, `contact-contracts` — este último já registrado em
    `contracts.md`) são todos apoiados em `Map`s em memória (não Postgres) e têm zero consumidores
    frontend — código morto duplo (sem uso E sem persistência real, caso fossem usados).

Total: 4 REAL_MAPPING_GAP, 2 CREATE_MAPPING_MISMATCH, 1 STORAGE_GAP, 1 IMPORT_MAPPING_GAP,
1 DUPLICATE_HANDLING_GAP, 1 SEARCH_GAP = **10 gaps** (mais os 2 achados específicos da Auditoria.tsx,
contabilizados dentro do total pelo prompt como parte do fechamento do trecho, não como gap numerado
adicional).

Achados não classificados como "gap" formal, registrados como código morto:
`ContactComponents.tsx` (317 linhas, 13 componentes, suite alternativa de UI nunca renderizada),
`components/index.tsx` (barrel morto), 4 Zustand stores (`contact-agenda`, `contact-filters`,
`contact-panel`, `contact-tags`), `store/index.ts` (barrel morto), backend `/contacts` facade +
`contact-attachments`/`contact-timeline` (fakes em memória, zero consumidor).

---

## Contadores finais (Zero-Gap)

```
SUBDOMAINS_AUDITED: 10
COMPONENTS_AUDITED: 9
HOOKS_AUDITED: 4
CREATE_FORMS: 1
CREATE_FIELDS: 12 reais persistidos (de 19+N campos capturados no formulário)
EDIT_FORMS: 1
EDIT_FIELDS: 12 (mesmo componente, mesma perda)
MODALS_DRAWERS_WIZARDS: 2 (ContatoFormModal, ContatoViewModal)
TABLE_GRID_COLUMNS: 7

RELATION_FIELDS: 2 (artists.contatos_equipe[].contactId; contracts.cliente_id)
RELATIONSHIP_TYPES: 6 categorias ativas (+ 108 valores de enum histórico, não todos alcançáveis)
POLYMORPHIC_RELATIONS: 0

PII_FIELDS: 6 (email, telefone, documento/cpf_cnpj, endereço completo, observações, interações)
ENCRYPTED_FIELDS: 3 (email_encrypted, telefone_encrypted, cpf_cnpj_encrypted — AES-256-GCM real)
UNENCRYPTED_PII_FIELDS: 3 (endereço, observações, interações — sem PII de terceiros exposta por
                           padrão, diferente do achado de contracts.md)

NOTE_FIELDS: 2 (observacoes — texto único real; interacoes — jsonb, capturado mas nunca persistido)
INTERACTION_FIELDS: 4 por linha (tipo, data, horário, descrição) — nunca persistidos (Gap #1)
TAG_FIELDS: 0 (Contact.tags sempre [], sem coluna física, sem mecanismo de tags real)

FILTERS: 2
SEARCH_FIELDS: 6 (nome, empresa, email, telefone, whatsapp, cidade — client-side)
SORT_FIELDS: 0

IMPORT_FIELDS: 25 (via CLIENTS_CONTRACT col())
EXPORT_FIELDS: 28 (25 col + 3 enc)
PII_EXPORT_FIELDS: 3 (email, telefone, cpf_cnpj — descriptografados, não mascarados)
XLSX_EXPORTS: 1 (Contatos)
XLSX_RULE_VIOLATIONS: 0

REALTIME_EVENTS: 0
STORAGE_FIELDS: 2 (attachments — fake/local; foto — capturado mas nunca enviado)

PERMISSIONS_AUDITED: 8 (client:read/create/update/delete, contact:read/create/update/delete)
AUTHORIZATION_GAPS: 0
TENANT_ISOLATION_GAPS: 0

CODE_FIELD_ONLY: 0
DATABASE_COLUMN_ONLY: 0
TYPE_MISMATCH: 0
NULLABILITY_MISMATCH: 0
DEFAULT_MISMATCH: 0
ENUM_MISMATCH: 0
RELATION_MISMATCH: 0
CREATE_MAPPING_MISMATCH: 2
EDIT_MAPPING_MISMATCH: 2 (mesmos, mesmo componente)
DISPLAY_MAPPING_MISMATCH: 0
PII_PROTECTION_GAPS: 0
ENCRYPTION_GAPS: 0
SEARCH_GAPS: 1
DUPLICATE_HANDLING_GAPS: 1
IMPORT_MAPPING_GAPS: 1
EXPORT_PRIVACY_GAPS: 0 (comportamento intencional/sancionado, mesmo padrão de artists/employees —
                       registrado como fato em PII_EXPORT_FIELDS, não contado como gap adicional)
STORAGE_GAPS: 1
REAL_MAPPING_GAPS: 4

ARTIST_CRM_TRACEABILITY_COMPLETE: SIM
CONTRACT_CRM_TRACEABILITY_COMPLETE: SIM
AUDITORIA_TSX_CRM_RELATIONSHIPS_SECTION_COMPLETE: SIM

UNMAPPED_CREATE_FIELDS: 0
UNMAPPED_EDIT_FIELDS: 0
UNMAPPED_DISPLAY_FIELDS: 0
UNMAPPED_RELATION_FIELDS: 0
UNMAPPED_PII_FIELDS: 0
UNMAPPED_INTERACTION_FIELDS: 0
UNMAPPED_IMPORT_FIELDS: 0
UNMAPPED_EXPORT_FIELDS: 0
UNMAPPED_STORAGE_FIELDS: 0
UNKNOWN_FIELD_CLASSIFICATIONS: 0
```

NEXT_MODULE: `dashboard`
