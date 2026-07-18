# Auditoria de Alinhamento Formulários × Banco de Dados

> Fase 13B (retomada) — mandato: nenhuma migration financeira adicional roda
> enquanto o schema relacional não estiver comprovadamente compatível com os
> formulários ativos. Este documento registra o método, as evidências e o
> resultado desta auditoria.

## 1. Metodologia

Em vez de inspecionar manualmente centenas de campos em dezenas de módulos
sem guia, a auditoria partiu do próprio mecanismo que o projeto já usa para
resolver exatamente este problema: migrations nomeadas `*FormFieldColumns`,
seguindo a **regra de produto de 2026-07-12** ("cada campo do formulário tem
a SUA coluna física, nome exato, nunca agregado em `metadata` jsonb").
Localizamos essas migrations no disco, confirmamos que cobrem os domínios
alegados como quebrados, lemos cada uma por completo (`up`/`down`, simetria
de colunas, migração de dados legados de `metadata`→coluna) e cruzamos com
entity, DTO, service e formulário do frontend para o caso citado (`artists`).

## 2. Achado principal

**`artists` NÃO é uma lacuna de modelagem não descoberta.** É uma migration
já **inteiramente escrita, correta e completa**
(`20260712000001_ArtistsFormFieldColumns.ts`, presente em disco, ainda não
commitada em git — uma das "162 pendências" desta sessão), que:
- adiciona as 45 colunas que faltam na tabela `artists` de InitialSchema,
  com o nome EXATO usado por `formToArtistaPayload` (frontend);
- migra dados legados que viviam em `metadata` jsonb para as colunas novas
  (`UPDATE ... COALESCE(coluna, metadata->>'chave')`), sem apagar o
  `metadata` original;
- tem `down()` simétrico (45 `DROP COLUMN IF EXISTS`, mesma lista).

A razão de a tabela **parecer** incompleta é que o replay desta fase está
**pausado na posição 75/92** (bloqueado pelo bug de FORCE RLS, corrigido
nesta mesma retomada) — e esta migration está em posição **posterior** na
cadeia (timestamp `20260712000001`), ainda não executada. Não é uma falha de
autoria; é um estado normal de banco em reconstrução.

## 3. Inventário de formulários (escopo desta auditoria)

Método de inventário: busca por migrations `*FormFieldColumns` (mecanismo
canônico do projeto) + leitura completa dos arquivos + cruzamento pontual
com o formulário frontend do domínio mais citado (`artists`). **Este NÃO é
um inventário exaustivo de todos os ~100+ módulos do repositório** — ver
§6 (escopo não coberto) para o que fica fora desta rodada.

| Migration | Tabelas | Data | Estado no replay |
|---|---|---|---|
| `20260712000001_ArtistsFormFieldColumns` | artists | 2026-07-12 | pendente (posição >75) |
| `20260712000002_CatalogFormFieldColumns` | phonograms, works | 2026-07-12 | pendente |
| `20260712000003_HrFormFieldColumns` | employees, leave_requests, payroll_entries | 2026-07-12 | pendente |
| `20260712000004_SharesContractsFormFieldColumns` | contracts, shares | 2026-07-12 | pendente |
| `20260712000005_CrmFinanceOpsFormFieldColumns` | clients, events, invoices, leads, licenses, takedowns, transactions | 2026-07-12 | pendente |

**15 tabelas** cobertas por este esforço (confirma a memória de sessão:
"regra sem-metadata aplicada em 15 módulos", 2026-07-12).

## 4. Auditoria detalhada de `artists`

### 4.1 Cadeia verificada
`entities.ts` (`ArtistEntity`, 73 colunas) → `create-artist.dto.ts` (DTO
aceita todos os campos do formulário) → `update-artist.dto.ts`
(`PartialType(CreateArtistDto)` — idêntico, campos opcionais) →
`artists.service.ts` (persistência **dirigida por contrato**:
`NULLABLE_COLUMNS`/`REQUIRED_COLUMNS`/`JSONB_LIST_COLUMNS`/`ENCRYPTED_FIELDS`
derivados de `REPORT_FORM_CONTRACTS.artists` — nenhuma lista hardcoded
divergente; um campo novo no contrato é automaticamente persistido) →
frontend `artist-form.definition.ts` (fonte única do formulário: campos,
schema Zod gerado, hidratação, export/import todos da MESMA definição) →
`artista.mapper.ts` (`formToArtistaPayload`/`artistaToFormFields`).

### 4.2 Matriz (campo do formulário → coluna/relação atual)

| Campo do formulário | Coluna/relação | Situação |
|---|---|---|
| fotoUrl | `foto_url` (text) | CORRETO |
| nomeArtistico | `nome_artistico` (varchar 255, NOT NULL) | CORRETO |
| generoMusical | `genero_musical` (varchar 100) | CORRETO |
| especialidades | `especialidades` (jsonb) | CORRETO |
| documentosPessoaisUrl | `documentos_pessoais_url` (text) | CORRETO — coluna na migration pendente |
| presskitUrl | `presskit_url` (text) | CORRETO — coluna na migration pendente |
| biografia | `observacoes` (text) | CORRETO (nome divergente documentado: form chama "biografia", coluna é `observacoes` — mapeamento explícito e estável, não um bug) |
| nome (civil) | `nome_civil` (varchar 255) | CORRETO |
| dataNascimento | `data_nascimento` (date) | CORRETO — coluna na migration pendente |
| cpfCnpj | `cpf_cnpj_encrypted` (text, cifrado) | CORRETO — PII cifrada, 1 coluna |
| rg | `rg` (varchar 30) | CORRETO — coluna na migration pendente |
| genero | `genero` (varchar 30) | CORRETO — coluna na migration pendente |
| endereco | `endereco` (varchar 300) | CORRETO — coluna na migration pendente |
| telefone | `telefone_encrypted` (text, cifrado) | CORRETO |
| email | `email_encrypted` (text, cifrado) | CORRETO |
| banco/agencia/conta/chavePix/titularConta | `banco`/`agencia`/`conta`/`chave_pix`/`titular_conta` | CORRETO — colunas na migration pendente |
| spotify/instagram/youtube/tiktok/soundcloud/deezer/appleMusic | `spotify_url`/`instagram`/`youtube_url`/`tiktok`/`soundcloud_url`/`deezer_url`/`apple_music_url` | CORRETO |
| tipoPerfil | `tipo_perfil` (varchar 30) | CORRETO — coluna na migration pendente |
| distribuidorasGerais | `distribuidoras_gerais` (jsonb) | CORRETO — coluna na migration pendente |
| contatosVinculados | `contatos_vinculados` (jsonb) | CORRETO — coluna na migration pendente |
| notasInternas | `notas_internas` (text) | CORRETO — coluna na migration pendente |
| relacionamentos (empresário/gravadora/editora) | `relacionamentos` (jsonb) + campos legados `empresario_*`/`gravadora_*` preservados p/ retrocompat | CORRETO — todas colunas na migration pendente |
| \*_seguidores/\*_ouvintes/\*_fas/\*_albuns (métricas de plataforma) | colunas `integer` dedicadas por plataforma | CORRETO — colunas na migration pendente |

**Nenhuma linha "COLUNA AUSENTE" real** — todas as colunas necessárias já
estão especificadas na migration pendente `ArtistsFormFieldColumns`.

## 5. Ação corretiva

**Nenhuma migration nova é necessária para os 15 tabelas listadas em §3.**
A ação correta é deixar o replay avançar até essas migrations (posições
posteriores à 75, dentro da cadeia legada já auditada na Fase 13B). As 5
migrations foram relidas por completo nesta auditoria: `up()`/`down()`
simétricos, sem `CASCADE` amplo, sem dado de negócio inserido (apenas
migração de valores já existentes de `metadata`→coluna, quando havia).

## 6. Rodada 2 — auditoria exaustiva (autorizada pelo usuário após §6 original)

A rodada 1 (acima) cobriu só `artists` em profundidade + verificação
estrutural das 14 tabelas irmãs. O usuário optou explicitamente por
"auditoria exaustiva completa antes de prosseguir" — segue o resultado,
módulo a módulo, com evidência de código (payload real enviado no submit,
não apenas o schema Zod de validação — vários módulos têm schemas Zod
**mortos/não usados**, o payload real é montado separadamente).

### 6.1 Domínios CORRETOS (payload real ↔ colunas confirmadas)
`artists`, `inventory`, `crm-relationships`/`leads` (memória estava
desatualizada — já reconciliado), `catalog`/phonograms, `rh`/employees,
`monitoring`/takedowns, `licensing`, `contracts`. `releases` é funcional
(sem perda de dados) mas usa `metadata` deliberadamente para campos extras —
inconsistente com a "regra sem-metadata" das 15 tabelas, porém documentado
e não quebrado (categoria F — JSONB justificado).

### 6.2 Achados CRÍTICOS confirmados (evidência: DTO + payload real lidos)

Pré-requisito verificado: `apps/api/src/main.ts` configura
`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
globalmente — qualquer propriedade não declarada no DTO **rejeita a
requisição inteira com 400**, não apenas descarta o campo silenciosamente.

| # | Módulo | Evidência | Efeito |
|---|---|---|---|
| 1 | **audiovisual** (`AudiovisualProjectFormModal.tsx:153-177`) | payload envia `music_id, music_title, artist_name, format, videomaker, editor, shooting_date, location, capture_status, editing_status, approval_status, pre_release_date, release_date, budget, real_cost, concept, observations, final_status` — `CreateAudiovisualProjectDto` não declara NENHUM desses (usa `recording_date`, `budget_estimated`, `budget_actual`, `publish_date`, `description`, sem `format/videomaker/editor/location/capture_status/editing_status/approval_status`) | **Criação de projeto audiovisual sempre falha (400)**; mesmo sem o whitelist, `artist_id`/`phonogram_id` nunca seriam setados (vínculo com catálogo perdido) |
| 2 | **projects** (genérico) (`ProjetoFormModal.tsx:254-274`) | payload envia `titulo, tipo, status, observacoes, descricao, genero` — `CreateProjectDto` exige `title`+`type` (nomes em inglês, ausentes do payload) e não tem `observacoes`/`genero`; `ProjectEntity` tem `nome` (não `titulo`) | **Criação de projeto sempre falha (400)** — campos obrigatórios do DTO nunca chegam |
| 3 | **settings/usuarios** (`useUsuarios.ts:34-53`) | update envia `{full_name, phone, cargo}` — `UpdateUserDto` espera `{fullName, avatarUrl, role, status}`; comentário do hook ainda descreve "abstração de MOCK_DATA" mas `usuarios→/users` já é endpoint real | **Editar usuário sempre falha (400)**; comentário do código está desatualizado |
| 4 | **marketing_tasks** (`marketing-forms.ts:459-477`, usado por `Tarefas.tsx`) | `toTaskInput` não inclui `marketing_project_id`/`task_key` (NOT NULL na entity); envia `targetType/targetName/owner/sector/deadline` sem coluna correspondente (`MarketingTaskEntity` tem `kind/assigned_to/due_date`) | Criação de tarefa de marketing provavelmente falha ou perde campos |

### 6.3 Achado retratado (falso positivo da primeira leitura)
`marketing` — a leitura inicial de `toProjectInput`/`projectFields` sugeria
quebra na criação de "Projeto de Marketing", mas **essas funções não têm
NENHUMA referência fora do próprio arquivo `marketing-forms.ts`** — são
código morto (categoria L). O caminho realmente usado (`MarketingFormModal`
por `Briefing.tsx`/`Tarefas.tsx`) foi auditado separadamente (ver 6.2 #4).

### 6.4 Achado de severidade MÉDIA/ALTA (não é perda de dado, é desperdício da reconciliação)
**`events`** (`SchedulerFormModal.tsx:435-460`): a migration
`CrmFinanceOpsFormFieldColumns` já criou colunas dedicadas
(`endereco, contato_local, valor_cache, publico_esperado, descricao,
participantes`), mas o formulário **continua roteando esses valores para
`metadata` jsonb** em vez das colunas — a "regra sem-metadata" foi aplicada
no banco mas não no frontend deste módulo especificamente. Dado é salvo (sem
perda), mas fica no lugar errado; qualquer leitura direta da coluna
(relatórios, dashboards) encontrará `NULL`.

### 6.5 Módulos com formulários simples/sem forms complexos (risco baixo, não aprofundado)
`admin`/`billing` (ações administrativas simples, poucos campos, sem
formulário rico), `support`, `musicchat`, `integrations`, `auth`,
`workspace` — nenhum `*FormModal*` de negócio complexo encontrado.
`dashboard`/`reports` são meta-módulos de leitura agregada, sem persistência
própria.

### 6.7 Auditoria estrutural programática (entity ↔ migrations, TODAS as 120 entities × 160 tabelas)

Em vez de reler manualmente cada formulário restante — impraticável para o
volume total do repositório —, foi escrito um script que extrai
programaticamente (a) toda coluna declarada em cada `@Entity`/`@Column` de
`entities.ts` e (b) toda coluna efetivamente materializada por
`CREATE TABLE`/`ALTER TABLE ... ADD COLUMN` em **todas** as 102 migrations
(92 legadas + 10 financeiras), e comparou os dois conjuntos para as 120
entities × 160 tabelas físicas totais.

**Resultado: 0 tabelas de entity sem `CREATE TABLE` correspondente; 0
colunas fantasma** (nenhuma entity declara coluna que nenhuma migration
materializa) — depois de corrigido um bug do próprio script (não tratava
`ALTER TABLE IF EXISTS <tabela>`, gerando 1 falso positivo em `leads` que foi
verificado e descartado por `grep` direto nas migrations).

Colunas **órfãs** (migration cria, entity não mapeia — direção seguramente
inofensiva, dado não perdido, apenas não exposto via TypeORM neste momento):
- `financial_category_rules`/`financial_categories`/`financial_category_centers`
  — módulo legado que a M2 (Fase 13B) substitui deliberadamente; esperado.
- `artists.banner_url`/`video_apresentacao_url` — removidas por
  `RemoveArtistBannerVideoFields` (o script não modela `DROP COLUMN`, por
  isso aparecem como "órfãs"; na prática já não existem após o replay).
- `audiovisual_projects.financial_project_id` / `marketing_projects.financial_project_id`
  — **achado real de menor severidade**: a ponte opcional criada pela M9
  (`FinancialOperationalBridges`, Fase 13A) ainda não foi refletida nas
  classes `AudiovisualProjectEntity`/`MarketingProjectEntity` — a coluna
  existirá no banco após o replay, mas o TypeORM não a lê/escreve até a
  entity ser atualizada (sem impacto agora: nenhum código ainda usa essa
  ponte). Registrar para a Fase 14 (entities do domínio financeiro).
- `content_detections.detectado_em`, `domain_event_log.occurred_at`,
  `lead_interactions.data`, `leads.tags` — colunas físicas existentes sem
  mapeamento na entity; BAIXA severidade (não são usadas pelos formulários
  auditados nas rodadas 1-2).

**Enums**: o domínio legado usa majoritariamente `varchar`+`CHECK`/enum
TypeScript (31 tipos com sufixo Status/Type/Tipo/Kind/Role) em vez de
`CREATE TYPE ... AS ENUM` nativo do Postgres — só 4 enums nativos legados
existem (`conversation_status`, `conversation_channel`,
`message_sender_type`, `form_status`), mais os 9 enums novos do domínio
financeiro (M1). Isso é uma escolha de arquitetura consistente, não uma
divergência.

**Sub-entidades de audiovisual** (shots, production-days, team-members,
deliverables, tasks, assets, approvals): confirmada a existência de DTO de
criação para as 7 (`CreateShotDto`, `CreateProductionDayDto`,
`CreateTeamMemberDto`, `CreateDeliverableDto`, `CreateTaskDto`,
`CreateAssetDto` — todos em `audiovisual.dto.ts`); **não foi feita a
comparação campo-a-campo com os formulários correspondentes** (mesmo perfil
de risco do achado #1 em §6.2, já que compartilham autoria/padrão com o
formulário principal de projeto — candidato prioritário para auditoria
futura).

**Billing, RBAC/permissions, notifications**: fazem parte das 120 entities
verificadas estruturalmente acima — **nenhuma apareceu na lista de colunas
fantasma**, ou seja, estruturalmente consistentes entre entity e migrations.
Não foi feita auditoria de formulário-a-formulário para esses domínios
(poucos/nenhum formulário complexo de criação identificado em rodada
anterior para billing/admin; RBAC e notifications não têm formulário de
usuário final, são geridos internamente).

### 6.8 Escopo ainda não verificado nesta rodada (transparência obrigatória)
Sub-entidades do audiovisual além do projeto principal (shots, production
days, team, deliverables, tasks, assets — 8 tabelas satélite, DTOs não
localizados/lidos); billing/subscriptions em profundidade; RBAC/permissions;
notifications. Nenhuma migration especulativa foi criada para eles.

## 7. Testes de contrato

Não foram criados testes novos de round-trip nesta rodada: os testes
existentes já cobrem parte do contrato (`artists.service.spec.ts`,
`create-artist.dto.spec.ts`, `legacy-platform-fields.guard.spec.ts`,
`artists-cross-tenant.integration.spec.ts`). Criar testes de round-trip
completo (`formulário → banco → API → formulário`) para os 15 domínios é
recomendado como próxima ação, mas depende de conexão real ao DEV (fora do
escopo "sem banco" desta fase de auditoria).

## 8. Dívida técnica remanescente registrada

- Módulos fora de §3 não auditados (ver §6) — candidatos a auditoria futura,
  priorizados por risco (financeiro já auditado nas Fases 10-12; próximo
  candidato natural: audiovisual e marketing, por volume de formulários).
- `artists.genero` (gênero da pessoa) e `artists.genero_musical` (gênero
  musical) coexistem com nomes próximos — não é um bug, mas vale considerar
  renomear em uma fase de limpeza de nomenclatura futura (fora do escopo
  "apenas correções inequívocas" desta fase).

## 9. Contagem de migrations (atualizada)

```text
92 legadas (incluindo as 5 FormFieldColumns já existentes — SEM alteração)
10 financeiras (M0–M9, Fase 13A)
0 migrations corretivas NOVAS criadas nesta fase
TOTAL = 102 (inalterado)
```

> **Atualização da Rodada 3 (§11)**: +1 migration corretiva criada
> (`20260718000010_ReleasesFormFieldColumns`), **não executada**. Novo total
> de migrations no repositório = 103 (92 legadas + 10 financeiras + 1 nova).
> DEV permanece em 74/92 — nenhuma migration foi executada nesta rodada.

**Nuance importante**: dos 4 achados CRÍTICOS da rodada 2 (§6.2), **nenhum
precisa necessariamente de migration nova**:
- `audiovisual_projects` é o único caso que genuinamente falta COLUNA no
  banco (format, videomaker, editor, location, capture_status,
  editing_status, approval_status, pre_release_date) — os demais 3 achados
  são divergência de nomes entre frontend/DTO/hook, com as colunas já
  existindo (ou existindo sob outro nome) na entity — a correção é de
  **código** (DTO + payload), não de schema.
- Nenhum dos 4 achados pertence às tabelas do domínio financeiro
  (`financial_transactions`, `transaction_allocations`, `budgets`,
  `performance_metric_entries`) nem depende delas — **não bloqueiam
  tecnicamente** a continuação do replay M0–M9.

## 10. Ordem final de replay (recomendada)

```text
1. retomar migrations legadas 75–92 (inclui as 5 FormFieldColumns) — JÁ CORRIGIDO o bloqueio de 75
2. validar 92/92 registradas
3. executar M0–M9 (Fase 13A, incl. M2 corrigida na Fase 13B)
4. validações completas (invariantes, RLS, maior resto, conciliação)
```

## 11. Rodada 3 — correção de vocabulário e auditoria works/metadata/órfãos (2026-07-18)

### 11.1 Correção de uma premissa incorreta da rodada anterior

O usuário apontou que a auditoria anterior poderia ter usado nomes inventados
("codigo_abramus", "detentores") em vez do vocabulário real e ativo do
sistema. Investigação exaustiva (grep em `apps/api/src` e `apps/web/src`,
leitura de `obra-schema.ts`, `ObraFormModal.tsx`,
`registro-musicas.mapper.ts`, `create-work.dto.ts`, `entities.ts`,
`report-form-contracts.ts`) produziu o seguinte resultado, que **corrige**
parcialmente a premissa e **confirma** parcialmente a preocupação de fundo:

- **`codigo_abramus` nunca existiu em nenhuma camada do sistema.** Buscas por
  `codigo_abramus`, `cod_abramus_alt`, `abramus_code`, `codigo_entidade`,
  `cod_entidade` e `entity_code` retornaram zero ocorrências. O nome
  canônico real, usado de ponta a ponta — Zod (`obra-schema.ts: codAbramus`),
  form (`ObraFormModal.tsx`), mapper (`formToObraPayload: cod_abramus`), DTO
  (`CreateWorkDto.cod_abramus`), entity (`WorkEntity.cod_abramus`), migration
  (`InitialSchema`, coluna física `cod_abramus VARCHAR(100)`), contrato de
  Reports (`WORKS_CONTRACT: col('cod_abramus')`) — é **`cod_abramus` /
  `codAbramus`**. Este não foi um nome introduzido por mim: é anterior a toda
  esta sessão (migration inicial do projeto).
- **`detentores` também não foi inventado.** É uma coluna real desde a
  primeira migration (`20240101000000_InitialSchema.ts`), ativamente lida
  por `external-data-exchange.service.ts` (`holders: w.detentores`), exibida
  em `RightsMonitoring.tsx`/`ExecucaoDetailModal.tsx`, e declarada como campo
  somente-leitura no contrato oficial de Reports (`WORKS_CONTRACT: ro('detentores')`).
  Não é um bug de nomenclatura — é dado legado ainda consumido por
  funcionalidades reais.
- **A preocupação de fundo do usuário está correta em outro sentido**: o
  sistema **já possui** uma estrutura normalizada e correta para titularidade
  de direitos — a tabela `rights_holders` + `shares.rights_holder_id`
  (migrations `RegistryFieldsPhase1`/`RegistryRightsHoldersIdentifiers`,
  2026-06-01), com `RightsHoldersService`/`RightsHoldersController` dedicados.
  `works.detentores` é **texto livre legado, anterior a essa normalização**,
  que nunca foi migrado para a relação estrutural correta. Ver §11.4.

### 11.2 Contrato canônico de `works` — matriz completa

Fonte: `obra-schema.ts` (Zod) → `ObraFormModal.tsx` (submit real) →
`registro-musicas.mapper.ts::formToObraPayload` (payload real) →
`create-work.dto.ts` (DTO) → `entities.ts::WorkEntity` → migrations →
`report-form-contracts.ts::WORKS_CONTRACT` (leitura/exportação).

| Campo do formulário | Payload | DTO | Service/Entity | Migration | Tabela | PG Type | Nullable | Relação | Status | Decisão |
|---|---|---|---|---|---|---|---|---|---|---|
| tituloObra | titulo | titulo | titulo | InitialSchema | titulo | varchar(500) | NOT NULL | — | ATIVO | MANTER |
| generoMusical | genero | genero | genero | InitialSchema | genero | varchar(100) | NULL | — | ATIVO | MANTER |
| idioma | idioma | idioma | idioma | FormFieldColumns 07-12 | idioma | varchar(20) | NULL | — | ATIVO | MANTER |
| iswc | iswc | iswc | iswc | InitialSchema | iswc | varchar(20) | NULL | — | ATIVO | MANTER |
| codAbramus | cod_abramus | cod_abramus | cod_abramus | InitialSchema | cod_abramus | varchar(100) | NULL | — | ATIVO | MANTER (nome canônico único e real) |
| codEcad | cod_ecad | cod_ecad | cod_ecad | InitialSchema | cod_ecad | varchar(100) | NULL | — | ATIVO | MANTER |
| duracaoMin+Seg | duracao | duracao | duracao | FormFieldColumns 07-12 | duracao | varchar(20) | NULL | — | ATIVO | MANTER |
| instrumental | instrumental | instrumental | instrumental | Registry Phase1 | instrumental | varchar(10) | NULL | — | ATIVO | MANTER |
| criadaPorIA | criada_por_ia | criada_por_ia | criada_por_ia | FormFieldColumns 07-12 | criada_por_ia | boolean | NULL | — | ATIVO | MANTER |
| (tipoIA) | tipo_ia | tipo_ia | tipo_ia | FormFieldColumns 07-12 | tipo_ia | varchar(50) | NULL | — | ATIVO | MANTER |
| iaHarmonia/Melodia/Letra | ia_harmonia/melodia/letra | idem | idem | FormFieldColumns 07-12 | idem | jsonb | NULL | — | ATIVO | MANTER (forma fixa {ferramenta,prompt}, não é metadata genérico) |
| outrosTitulos | outros_titulos | outros_titulos | outros_titulos | FormFieldColumns 07-12 | outros_titulos | jsonb/array | NULL | — | ATIVO | MANTER |
| referenciasConexas | referencias_conexas | referencias_conexas | referencias_conexas | FormFieldColumns 07-12 | referencias_conexas | jsonb/array | NULL | — | ATIVO | MANTER |
| letraCompleta | letra_completa | letra_completa | letra_completa | FormFieldColumns 07-12 | letra_completa | text | NULL | — | ATIVO | MANTER |
| participantes[] | participantes | participantes | participantes | FormFieldColumns 07-12 | participantes | jsonb | NULL | fonte rica de autoria | ATIVO | MANTER — candidato a virar tabela relacional `work_participants` no futuro (recomendação, não executada) |
| situacao | status | status | status | InitialSchema | status | varchar | NOT NULL default | — | ATIVO | MANTER |
| (derivado de participantes) | compositores | compositores | compositores | InitialSchema | compositores | jsonb | NULL | derivado | ATIVO | MANTER — CANÔNICO, mas DERIVADO (não é fonte primária) |
| (derivado de participantes) | letristas | letristas | letristas | ? | letristas | jsonb/array | NULL | derivado | ATIVO | MANTER — CANÔNICO, DERIVADO |
| projetoId | projeto_id | projeto_id | projeto_id | InitialSchema | projeto_id | uuid | NULL | FK projects | ATIVO | MANTER |
| artistaId | artista_id | artista_id | artista_id | InitialSchema | artista_id | uuid | NULL | FK artists | ATIVO | MANTER |
| tipoObra | tipo_obra | tipo_obra | tipo_obra | FormFieldColumns 07-12 | tipo_obra | varchar(50) | NULL | — | ATIVO | MANTER |
| — (não é campo do form ativo) | — | compositor | compositor | InitialSchema | compositor | varchar(255) | NULL | — | LEGADO/bulk | MANTER COM JUSTIFICATIVA (lido por `catalog-metadata-validator`; aceito via bulk-import; editável no contrato de Reports) |
| — (não é campo do form ativo) | — | editora | editora | InitialSchema | editora | varchar(255) | NULL | — | LEGADO/bulk | MANTER COM JUSTIFICATIVA (exibido em `RegistroMusicas.tsx`; editável via Reports/bulk) |
| — (não é campo do form ativo) | — | (read-only) | co_compositores | InitialSchema | co_compositores | text | NULL | — | LEGADO read-only | MANTER COM JUSTIFICATIVA (exibido em Rights Monitoring; lido por automação e external-data-exchange) |
| — (não é campo do form ativo) | — | (read-only) | detentores | InitialSchema | detentores | text | NULL | — | LEGADO read-only | MANTER COM JUSTIFICATIVA (ver §11.4 — substituto estrutural já existe, mas não é usado aqui ainda) |
| — (não é campo do form ativo) | — | metadata (bulk) | metadata | InitialSchema | metadata | jsonb | default {} | — | NÃO ESCRITO pelo form ativo | MANTER (excluído explicitamente do contrato de Reports como "objeto jsonb interno bruto"; não há chave formal a extrair, pois nenhuma é gravada pelo fluxo ativo) |
| — | — | authors/shares (bulk) | — | — | — | — | — | relação real em `shares` | LEGADO/bulk | MANTER (canal de bulk-import para a mesma relação já modelada em tabela própria) |

### 11.3 `compositor` × `compositores` — classificação final

**Não são a mesma gravação duplicada.** São dois CANAIS DE ESCRITA
diferentes para o mesmo domínio semântico (autoria):

- `compositores` (plural, jsonb array) é **CANÔNICO** para o formulário
  interativo — sempre DERIVADO de `participantes` via
  `participantesToCompositoresLetristas()`, nunca digitado diretamente.
- `compositor` (singular, varchar) é **LEGADO**, nunca escrito pelo
  formulário interativo (confirmado: `formToObraPayload` não o inclui), mas
  ainda é um canal de escrita válido via bulk-import/API direta (aceito pelo
  DTO) e é lido por `catalog-metadata-validator.automation.ts`.

Como nenhum fluxo real grava os dois simultaneamente com o mesmo dado, **não
há redundância ativa a resolver por migration**. Decisão: **MANTER AMBOS**,
documentando a distinção de canal (interativo vs. bulk/legado) — não remover
`compositor` sem antes provar que nenhum import em massa o usa (não
verificado nesta rodada; ver §11.6, dívida remanescente).

Multiautoria (múltiplos compositores) já é modelada corretamente através de
`participantes` (jsonb rico, com `classeFuncao`/`percentual`/`link` por
pessoa) — não há hoje uma tabela associativa `work_composers` dedicada;
`participantes` cumpre esse papel. Formalizar `participantes` como tabela
relacional (`work_participants`) é uma recomendação arquitetural, não uma
correção desta rodada (decisão de produto, fora do escopo "correções
inequívocas").

### 11.4 `detentor(es)` / `holder(s)` / `titular(es)` — todas as ocorrências

Busca `grep -rniE "\bholder\b|\bholders\b|rights_holder(s)?|\btitular\b|\btitulares\b"` em
`apps/api/src` e `apps/web/src` encontrou **4 conceitos distintos**, nunca
confundidos entre si no código real:

| Ocorrência | Conceito real | Decisão |
|---|---|---|
| `works.detentores` (texto livre) | Titular(es) de direitos de uma obra, formato legado pré-normalização | MANTER COM JUSTIFICATIVA (uso real comprovado); recomendação não-executada: migrar para relação com `rights_holders` |
| `rights_holders` (tabela) + `shares.rights_holder_id` (FK) | Titular de direitos normalizado (Registry ABRAMUS/ECAD, Fase 2026-06-01) | MANTER — é a estrutura correta e já existente; não duplica `works.detentores` porque atende `shares`, não `works`, diretamente |
| `shares.titular_nome`/`titular_doc` | Identificação do titular de uma participação (share) específica, pré-FK `rights_holder_id` | MANTER — usado no backfill de `rights_holders`; convive com a FK nova |
| `artists.titularConta` ("Titular da Conta") | Nome do titular da conta bancária do artista (dado financeiro/cadastral, sem relação com direitos autorais) | MANTER — conceito totalmente diferente, sem qualquer sobreposição |
| `releases` "Titular do Copyright" (`lancamento.copyright`) | Titular do copyright de um lançamento — ver §11.5 | MANTER — corrigido nesta rodada (coluna própria) |

Nenhum desses usos foi inventado por mim nesta sessão; todos preexistem.
Nenhum agrupa conceitos diferentes na mesma coluna/JSON — cada um tem seu
próprio nome e sua própria tabela/coluna.

### 11.5 Auditoria de `metadata` — tabelas com violação real encontrada e corrigida

Cobertura desta rodada: `works`, `events`, `releases` (as três tabelas onde
havia evidência concreta de leitura/escrita ativa de `metadata` a partir de
formulários reais). **Não foi possível, no tempo desta rodada, varrer as
demais ~157 tabelas** — ver §11.6 para o que fica como dívida explícita.

| Tabela | Coluna metadata | Chaves formais gravadas (achadas) | Formulário de origem | Coluna canônica existente | Coluna nova necessária | Migração | Pode remover metadata? | Decisão |
|---|---|---|---|---|---|---|---|---|
| `works` | `metadata` jsonb | **nenhuma** — `formToObraPayload` nunca inclui `metadata` | `ObraFormModal.tsx` | — | nenhuma | não aplicável | Não (mantido para bulk/import genérico; contrato de Reports já o exclui explicitamente) | MANTER |
| `events` | `metadata` jsonb | `endereco`, `contato_local`, `valor_cache`, `publico_esperado`, `descricao`, `observacoes`, `status_legado` (lixo — já duplicava a coluna `status`), `participants` (grafia divergente de `participantes`) | `SchedulerFormModal.tsx` | `endereco`, `contato_local`, `valor_cache`, `publico_esperado`, `descricao`, `participantes` já existiam na entity (migration 07-12) mas **não estavam no DTO** (`observacoes` também já existia na entity sem DTO) | nenhuma (colunas já existiam) — só faltava o DTO | `events.dto.ts`/`events.service.ts` corrigidos nesta rodada (sem migration nova) | Sim, para os campos formais (metadata deixou de receber estes) | **CORRIGIDO NESTA RODADA** |
| `releases` | `metadata` jsonb | `isrc_global`, `notas_internas`, `observacoes` (mapeado de `notasDistribuicao`), `gravadora`, `copyright`, `genero`, `idioma`, `assets` (objeto: 7 subchaves fixas), `cronograma` (objeto: 3 subchaves fixas) | `LancamentoFormModal.tsx` (via `form-to-payload.mapper.ts`) | nenhuma existia | `isrc_global`, `notas_internas`, `observacoes`, `gravadora`, `copyright`, `genero`, `idioma`, `assets`, `cronograma` (9 colunas) | `20260718000010_ReleasesFormFieldColumns.ts` (criada, **não executada**) | Sim, para os campos formais | **CORRIGIDO NESTA RODADA** (migration criada + DTO + entity + service + frontend) |

Nota sobre `assets`/`cronograma`: mantidos como colunas jsonb **dedicadas e
nomeadas** (não dentro de `metadata` genérico), porque cada uma tem um
conjunto fixo e conhecido de subchaves (7 e 3, respectivamente) — o mesmo
padrão já usado em `releases.plataformas` (jsonb pré-existente na mesma
entity). Isso não viola a regra de 1-campo-1-coluna: a regra proíbe usar
`metadata` como despejo de campos formais **individuais**; um sub-registro
estruturado com nome e forma fixos, documentado, é uma exceção legítima
equivalente a uma relação 1:1, análoga à exceção de FK/child-table.

### 11.6 Colunas órfãs

Reaproveitado o resultado da auditoria estrutural programática (§6.7, script
`structural-audit.mjs`, 120 entities × 160 tabelas): nenhuma coluna órfã nova
foi introduzida pelas mudanças desta rodada (`releases` re-verificado após a
migration nova — 0 divergências entity↔migration). O inventário de colunas
órfãs pré-existente permanece o registrado em §6.7/§6.8 — não foi
reclassificado campo a campo (REMOVER/MIGRAR/DEPRECAR/MANTER) nesta rodada
por não ter sido o foco solicitado; fica como dívida explícita.

Achado adicional (não uma coluna órfã de banco, mas do mesmo espírito):
`CreateEventDto.ticketUrl` existe no DTO/entity mas nenhum campo do
`SchedulerFormModal.tsx` o envia atualmente. Decisão: **MANTER** — é uma
feature pendente de UI (não há evidência de que tenha sido descartada), não
um campo morto sem uso; não classificado como órfão porque está corretamente
declarado e mapeado no service, apenas ainda sem UI.

### 11.7 Migrations corretivas criadas nesta rodada

Apenas **uma** migration nova, **não executada**:

- `20260718000010_ReleasesFormFieldColumns.ts` — adiciona `isrc_global`,
  `notas_internas`, `observacoes`, `gravadora`, `copyright`, `genero`,
  `idioma`, `assets`, `cronograma` em `releases`. Timestamp posterior a M9
  (`20260718000009_FinancialOperationalBridges`), não colide com a sequência
  financeira da Fase 13A.

Nenhuma migration de remoção foi criada para `works` (`compositor`,
`co_compositores`, `detentores`, `editora`, `metadata`): a evidência coletada
prova uso real e ativo de todos — remover qualquer um deles quebraria
`catalog-metadata-validator`, `external-data-exchange.service`, a UI de
Rights Monitoring, ou o contrato oficial de Reports. Fabricar uma migration
de remoção sem essa prova violaria a própria regra de "não simular sucesso"
que motivou este mandato.

### 11.8 Testes criados

- `apps/api/src/modules/works/works-field-contract.spec.ts` (5 testes) —
  prova comportamentalmente, via `class-validator` com a mesma config do
  `ValidationPipe` global (`whitelist + forbidNonWhitelisted`), que
  `cod_abramus` é aceito e `codigo_abramus`/`codigo_entidade`/`cod_entidade`/
  `entity_code`/`holders`/`titulares` são rejeitados.
- `apps/api/src/database/form-field-dto-parity.spec.ts` (2 testes) — guarda
  estática que impede a entity ter coluna dedicada de formulário sem o DTO
  expor o mesmo campo (o bug real encontrado em `events.observacoes`).
- `apps/web/src/modules/catalog/services/registro-musicas.mapper.test.ts`
  (4 testes) — `formToObraPayload` nunca envia `metadata`/`compositor`/
  `editora`/`codigo_abramus`; `compositores`/`letristas` sempre derivados de
  `participantes`.
- `apps/web/src/modules/events/components/scheduler-form-metadata-guard.test.ts`
  (3 testes) — guarda estática: `SchedulerFormModal.tsx` não volta a montar
  `metadata[...]` a partir de campos formais.
- `apps/web/src/modules/releases/services/form-to-payload.mapper.test.ts`
  (5 testes) — `formToLancamentoPayload` nunca envia `metadata`; campos
  formais vão para colunas próprias; `assets`/`cronograma` só aparecem
  quando preenchidos.

Total: **19 testes novos**, todos executados e passando (`jest` para
backend, `vitest run` para frontend) nesta rodada.

### 11.9 Escopo não coberto nesta rodada (dívida explícita — transparência obrigatória)

- Varredura de `metadata`/`meta`/`extra_data`/`additional_data`/`details`/
  `payload`/`attributes`/`custom_fields` nas ~157 tabelas restantes.
- Varredura de duplicidade de colunas nas 160 tabelas usando os pares de
  exemplo do mandato (titulo×title×nome, tipo×type, phone×telefone,
  artist_id×artista_id, etc.) além dos já verificados
  (compositor×compositores, codigo_entidade×codigo_abramus,
  titular×detentor).
- Reclassificação campo-a-campo (REMOVER/MIGRAR/DEPRECAR/MANTER) de cada
  coluna órfã já listada em §6.7/§6.8.
- Confirmação definitiva de que nenhum import em massa grava
  `works.compositor` (singular) hoje — recomendado antes de qualquer decisão
  futura de descontinuar esse campo.
- Migração arquitetural de `works.detentores` (texto livre) para uma relação
  estruturada equivalente a `shares.rights_holder_id → rights_holders` —
  decisão de produto, não executada.
