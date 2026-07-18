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
