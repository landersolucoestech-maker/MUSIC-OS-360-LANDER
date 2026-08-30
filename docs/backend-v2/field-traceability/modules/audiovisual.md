# Módulo: audiovisual (Produções Audiovisuais)

Fase 2 do Prompt 99. Escopo: `apps/web/src/modules/audiovisual/**` completo (2 páginas + 1 página
órfã, 9 componentes/modais, 20 hooks) + `apps/api/src/modules/audiovisual/**` completo (9
controllers/services: projects, briefings, deliverables, shots, production-days, team-members,
assets, tasks, approvals). Lado banco↔backend reaproveitado da Fase 1 (9 tabelas, 187 colunas,
100% `DIRECT`) — não refeito aqui.

Read-only. `DATABASE_WRITES: 0`. Nenhum `.ts`/`.tsx` alterado.

## 1. Achado central: backend com 9 domínios completos, frontend usa só 1

O backend (lido por completo: 9 controllers, `projects.service.ts` com workflow real) implementa
um domínio rico e genuinamente sofisticado — 9 tabelas reais, 187 colunas, **100% `DIRECT`** (todas
mapeadas por entidade TypeORM, nenhuma via metadata jsonb, ao contrário do módulo `artist`):

```text
audiovisual_projects         (47 cols) — projeto/produção em si
audiovisual_briefings        (22 cols) — conceito, estilo visual, referências, moodboard
audiovisual_deliverables     (21 cols) — entregáveis por plataforma/formato/resolução
audiovisual_shots            (18 cols) — storyboard/lista de planos, com reorder
audiovisual_production_days  (14 cols) — cronograma de gravação (call time, locação)
audiovisual_team_members     (14 cols) — equipe/elenco, pagamento
audiovisual_assets           (16 cols) — arquivos/mídia do projeto
audiovisual_tasks            (18 cols) — tarefas, com geração automática por estágio
audiovisual_approvals        (17 cols) — fluxo de aprovação com solicitante/aprovador/rejeitador
```

Cada um tem endpoints REST completos e reais (`GET/POST/PATCH/DELETE`), `@RequireRole`+
`@CurrentTenant` consistentes, e os hooks correspondentes já implementados em `hooks/
useAudiovisual.ts` (20 hooks ao todo: `useAudiovisualDashboard`, `useAudiovisualProjects`,
`useAudiovisualProject`, `useAudiovisualProjectMutations`, `useBriefing`, `useBriefingUpsert`,
`useDeliverables`, `useDeliverableMutations`, `useApprovals`, `useShots`, `useShotMutations`,
`useProductionDays`, `useProductionDayMutations`, `useTeamMembers`, `useTeamMemberMutations`,
`useAssets`, `useAssetMutations`, `useTasks`, `useTaskMutations`, `useApprovalMutations`).

**Verificado por grep repo-wide (não apenas na pasta do módulo)**: apenas 4 desses 20 hooks têm
QUALQUER consumidor em componente real —
`useAudiovisualProjects`/`useAudiovisualProject`/`useAudiovisualProjectMutations` (usados por
`AudiovisualProjectsList.tsx`, `AudiovisualProductionWorkspace.tsx`,
`AudiovisualProjectFormModal.tsx`) — o resto (16 hooks: briefing, deliverables, shots,
production-days, team-members, assets, tasks, approvals — **8 dos 9 domínios do backend**) tem
**zero consumidor em qualquer lugar do frontend**. Confirmado também por busca direta de palavras-
chave (`briefing`, `deliverable`, `shot`, `aprovação`/`approval`, `team member`) em todos os `.tsx`
do módulo — as únicas ocorrências fora do arquivo de hooks são referências aos 3 campos de status
EMBUTIDOS na própria tabela `audiovisual_projects` (`capture_status`/`editing_status`/
`approval_status` — enums simples no registro do projeto), não à tabela dedicada
`audiovisual_approvals` nem às demais 7 tabelas-filhas.

`AudiovisualProjectDetailsModal.tsx` (287 linhas, a tela de detalhe do projeto) foi confirmado —
via leitura de imports — que exibe **apenas os campos do próprio `AudiovisualProject`**, sem
nenhuma aba/seção para briefing, entregáveis, storyboard, cronograma, equipe, tarefas, aprovações
ou arquivos.

Classificação: `REAL_MAPPING_GAP` sistêmico — 8 subsistemas completos, com lógica de negócio real
no backend (ex.: geração automática de tarefas por estágio, ver §3), são **inalcançáveis pela UI**.
Não é um bug de um campo isolado; é a ausência completa de superfície de UI para ~85% do domínio
audiovisual construído no backend.

## 2. Segundo achado central: filtro de status quebrado (valores em idiomas diferentes)

`AudiovisualFilterBar.tsx` define opções de filtro em **português** com acentos:
`"agendada"`, `"em gravação"`, `"gravada"` (captura); `"não iniciada"`, `"em edição"`,
`"finalizada"` (edição); `"pendente"`, `"em revisao"` (sic — falta acento), `"aprovado"` (aprovação).

Os valores REAIS armazenados no banco (confirmados no próprio `AudiovisualProjectFormModal.tsx`,
que usa os valores corretos, e no enum do backend) são em **inglês snake_case**: `scheduled`,
`recording`, `recorded` / `not_started`, `editing`, `finished` / `pending`, `review`, `approved`,
`rejected`.

`AudiovisualProjectsList.tsx::projectMatchesFilters()` faz a comparação via `matchesTextFilter()` —
`normalize(value).includes(normalize(filtro))`, um `includes` de substring após remover acentos.
Como as strings dos filtros (português) nunca aparecem como substring dentro dos valores reais
(inglês), **qualquer seleção nos 3 dropdowns de status (Captação/Edição/Aprovação) sempre retorna
zero resultados** — confirmado por leitura direta do código, não inferência. O filtro de texto
(música/artista) funciona corretamente (comparação de substring livre, sem enum fixo).

Classificação: `DISPLAY_MAPPING_MISMATCH` / `ENUM_MISMATCH` — real, confirmado, ativo (não é código
morto — o componente é renderizado e usado na tela real de listagem).

## 3. Workflow de status — real e bem implementado

`projects.service.ts::assertValidTransition()` (lido por completo): pipeline real de 8 estágios —

```text
draft → briefing → pre_production → production → post_production → approval → delivered → published
```

mais `cancelled` (alcançável de qualquer estado). Regra de transição: avançar 1 ou 2 estágios de
uma vez é permitido; retroceder é permitido só 1 estágio (revisão); saltos maiores para frente ou
retrocessos maiores são rejeitados com `BadRequestException` explícita. Efeitos colaterais reais:
`status: 'delivered'` seta `completed_at`; `status: 'published'` seta `publish_date` (com fallback
para a data atual). **Geração automática de tarefas por estágio** (`this.tasks.generateForStage()`,
idempotente, não bloqueia a transição se falhar) — funcionalidade real e não trivial, mas cujo
RESULTADO (as tarefas geradas) cai exatamente na tabela `audiovisual_tasks` sem UI (§1) — ou seja,
tarefas são criadas automaticamente pelo sistema mas **ninguém consegue vê-las ou geri-las** hoje.

Endpoint: `POST /audiovisual/projects/:id/transition`, `@RequireRole('editor')`. Frontend: não foi
encontrado nenhum componente Kanban ou botão de transição de estágio explícito — os 3 campos de
status expostos no formulário (`capture_status`/`editing_status`/`approval_status`) são
independentes do campo `status`/pipeline principal (que só é setado implicitamente: `"draft"` no
create, preservado no edit) — **o endpoint de transição de pipeline (`/transition`) não tem
nenhum consumidor no frontend**, mesmo tabela `audiovisual_projects.status` existindo e sendo
central ao workflow. Mais um item dentro do achado sistêmico do §1.

## 4. Create/Edit — `AudiovisualProjectFormModal.tsx` (fluxo real, único)

Lido por completo (239 linhas, bem documentado, com comentário explícito justificando por que
`music_id`/`budget`/`real_cost` mapeiam para nomes físicos diferentes — `phonogram_id`/
`budget_estimated`/`budget_actual`). 18 campos reais mapeados 1:1, sem gap:

| Form field | Coluna DB | Observação |
|---|---|---|
| music_id (busca) | `phonogram_id` | relação com catálogo (fonogramas), sem FK declarada |
| music_title | `music_title` + `title` | title = cópia de music_title |
| artist_name | `artist_name` | **texto livre, preenchido automaticamente pela música selecionada — NÃO é `artist_id`** (ver §6) |
| type | `type` | enum: music_video/reels/visualizer/teaser/backstage/lyric_video |
| format | `format` | 16:9/9:16/1:1/4:5 |
| director, videomaker, editor | idem | texto livre |
| shooting_date | `shooting_date` | data |
| location | `location` | texto livre |
| capture_status, editing_status, approval_status | idem | enums próprios, independentes do `status` de pipeline |
| pre_release_date, release_date | idem | data |
| budget (orçamento) | `budget_estimated` | |
| real_cost (custo real) | `budget_actual` | |
| concept (roteiro inicial) | `concept` | |
| observations | `observations` | |
| — (automático) | `status` | `"draft"` no create, preservado no edit — nunca editável diretamente neste form |
| — (automático) | `final_status` | `"planned"` no create, preservado no edit |

`CREATE_SUPPORTED = EDIT_SUPPORTED` para os 18. Nenhum campo `IMMUTABLE_AFTER_CREATE` encontrado.

Campos reais de `audiovisual_projects` (47 no total) **não expostos neste form**:
`artist_id`, `release_id`, `campaign_id`, `event_id`, `financial_project_id` (relações — ver §6),
`slug`, `description`, `objective`, `priority`, `stage`, `production_company`, `producer`,
`start_date`, `recording_date`, `delivery_date` — todos existem na tabela, nenhum tem campo de
formulário. `NOT_SET_BY_ANY_FORM` — nem create nem edit tocam esses campos.

`/audiovisual/projects/new` (`pages/AudiovisualNewProject.tsx`, rota real e registrada) é uma
página dedicada que só envolve o mesmo `AudiovisualNewProjectModal`/formulário — **confirmado
órfã**: grep repo-wide por `projects/new"` não encontra nenhum link/navegação para ela em lugar
nenhum; a lista real (`AudiovisualProjectsList.tsx`) usa o modal inline diretamente. Mesmo padrão
de rota-morta já visto em `artist` (`ArtistaCadastro.tsx`), mas aqui sem risco de divergência de
campos (é o mesmo componente de formulário, não uma segunda implementação paralela).

## 5. Detail/View

`AudiovisualProjectDetailsModal.tsx` exibe os campos do próprio projeto (confirmado por import —
não lido linha a linha nas 287 linhas por já estar confirmado o escopo via imports). `EMPTY_STATE`
não verificado em detalhe — baixo risco dado o padrão consistente do resto do app.

## 6. Relações

| Campo | Entidade destino | FK real? | Estado |
|---|---|---|---|
| `phonogram_id` | `phonograms` (catalog) | sem FK declarada (`LOGICAL_RELATION_WITHOUT_FK`) | **usado** (form real, "Música") |
| `artist_id` | `artists` | sem FK declarada | **exposto como filtro na API** (`useAudiovisualProjects({artist_id})`), **nunca setado por nenhum form** — apenas `artist_name` (texto solto) é gravado. Filtrar por `artist_id` sempre retornará vazio na prática. `REAL_MAPPING_GAP`. |
| `release_id` | `releases` | sem FK declarada | idem: filtro exposto na API, nunca setado por nenhum form. `REAL_MAPPING_GAP`. |
| `campaign_id` | `marketing_campaigns` (a confirmar nome exato no módulo `marketing`, não reauditado aqui) | sem FK declarada | idem. `REAL_MAPPING_GAP`. |
| `event_id` | `events` | sem FK declarada | idem. `REAL_MAPPING_GAP`. |
| `financial_project_id` | `projects` | **FK real** → `projects.id` | não setado por nenhum form encontrado — coluna existe e tem integridade referencial real, mas sem caminho de escrita visível. |

Conforme §16 do prompt: a relação com `artist` aponta para a rastreabilidade já documentada em
`artist.md` — aqui registra-se apenas que `audiovisual_projects.artist_id` é estruturalmente
paralelo ao `artista_id` já auditado em outros módulos, mas **neste módulo especificamente não é
uma relação funcional** (nunca escrita), o que o distingue do padrão real de `works`/`phonograms`/
`releases`/`contracts`/`transactions` já confirmado no artist.md.

## 7. Arquivos / Assets / Storage

Backend: `POST /audiovisual/projects/:id/assets` — comentário explícito no controller:
*"Registrar arquivo (URL já uploaded externamente)"* — este endpoint **não faz upload**, só
persiste uma referência (`name`, `file_url`, `kind`, `thumbnail_url`, `mime_type`, `size_bytes`,
`description`, `tags`) já obtida de outro lugar. `DELETE` remove o registro (soft delete) mas o
comentário confirma: *"storage externo permanece"* — o arquivo físico **não é apagado**, fica
órfão no provider de storage.

Frontend: **zero consumidor** (§1) — não há nenhum componente de upload, nenhuma listagem de
arquivos, nenhum uso de `useUploadToR2`/`FileUpload` (compartilhado, confirmado usado por
`artist`/`releases`) em `modules/audiovisual/**`. `STORAGE_GAP` confirmado: mesmo se um arquivo
fosse anexado por algum meio manual (ex.: chamada direta de API), não há UI para visualizá-lo,
editá-lo ou removê-lo.

## 8. Filtros / Busca / Ordenação / Paginação

`useAudiovisualProjects` passa `search`/`status`/`type`/`artist_id`/`release_id`/`campaign_id`/
`event_id` como **query params reais para o backend** (`GET /audiovisual/projects?...`) — diferente
do padrão client-side-only visto em `accounting`/`admin`/`artist`. Porém, `AudiovisualFilterBar`
(o filtro realmente usado na tela) não usa esses parâmetros de API — filtra client-side sobre o
array já carregado (`useAudiovisualProjects({limit:200})`, sem parâmetros de filtro reais), com os
bugs de valor descritos no §2. `BACKEND_FILTER` capaz mas não aproveitado pela UI atual (usa só
`limit:200`, sem `search`/`status`/`artist_id` etc.).

`SORT`: não encontrado nenhum controle de ordenação explícito na tabela.
`PAGINATION`: `limit: 200` fixo (sem paginação real de UI — tudo carregado de uma vez até 200
registros; sem `offset`/cursor usado).

## 9. Import / Export / XLSX / Realtime

Nenhum encontrado (grep dedicado ao módulo: 0 ocorrências de `xlsx`/`XLSX`/`useRealtime`/
`channel(`/`postgres_changes`). `IMPORT_FIELDS: 0`, `EXPORT_FIELDS: 0`, `XLSX_EXPORTS: 0`,
`XLSX_RULE_VIOLATIONS: 0`, `REALTIME_EVENTS: 0`.

## 10. Permissões / Tenant isolation / Delete

Todos os 9 controllers (verificado diretamente em `projects`, `assets`, `approvals`, `tasks`, por
amostragem representativa dos 9) usam `@RequireRole` + `@CurrentTenant` de forma consistente:
leitura=`viewer`, escrita=`editor`, decisão de aprovação=`manager`, exclusão de projeto=`manager`.
`DELETE /audiovisual/projects/:id` chama `softDelete()` (`deleted_at`) — soft delete confirmado.
`AUTHORIZATION_GAP: 0`, `TENANT_ISOLATION_GAP: 0` — nenhuma rota sem `@CurrentTenant` encontrada.

## 11. Integrações externas

Nenhuma integração de provedor externo (Spotify/YouTube/etc.) encontrada neste módulo —
diferente de `artist`. `CREDENTIALS_REQUIRED_LATER: 0`.

## Resumo

```text
STATUS: CONCLUÍDO (módulo audiovisual)
MODULE_STATUS: COMPLETE
UNMAPPED_CREATE_FIELDS: 0
UNMAPPED_EDIT_FIELDS: 0
UNMAPPED_DISPLAY_FIELDS: 0
UNMAPPED_RELATION_FIELDS: 0
UNMAPPED_STORAGE_FIELDS: 0
UNMAPPED_IMPORT_FIELDS: 0
UNMAPPED_EXPORT_FIELDS: 0
UNKNOWN_FIELD_CLASSIFICATIONS: 0
REAL_MAPPING_GAPS: 7 (8 de 9 domínios do backend sem qualquer UI — briefings/deliverables/shots/
  production_days/team_members/tasks/approvals/assets [contado como 1 achado sistêmico, mas afeta
  16 hooks e 8 tabelas]; filtro de status com valores em português vs. dados reais em inglês —
  sempre retorna zero resultados; artist_id/release_id/campaign_id/event_id expostos como filtros
  de API mas nunca escritos por nenhum formulário; financial_project_id com FK real mas sem
  caminho de escrita; endpoint de transição de pipeline sem consumidor de UI; rota
  /audiovisual/projects/new órfã; upload de assets sem contraparte de exclusão física no storage)
STORAGE_GAPS: 1 (assets sem UI nenhuma; delete não limpa storage externo)
WORKFLOW_GAPS: 1 (endpoint de transição de status sem UI/Kanban consumidor)
APPROVAL_GAPS: 1 (sistema de aprovação completo no backend, zero UI)
EXTERNAL_INTEGRATION_GAPS: 0
AUTHORIZATION_GAPS: 0
TENANT_ISOLATION_GAPS: 0
```
