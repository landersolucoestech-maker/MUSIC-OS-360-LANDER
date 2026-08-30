# Módulo `dashboard` — Auditoria Zero-Gap (Fase 2, Prompt 104)

STATUS: **COMPLETE** — UNMAPPED_*: 0, UNKNOWN_DASHBOARD_CLASSIFICATIONS: 0.

Escopo real (agregador cross-domain — rastreado até as fontes, módulos já concluídos não
reauditados internamente):
- Frontend: `apps/web/src/modules/dashboard/**` (`components/`, `constants/`, `forms/`, `schemas/`,
  `services/`, `types/`, `utils/` são todos stubs vazios — `export {}`; toda a lógica real vive em
  `pages/Dashboard.tsx` + 3 hooks em `hooks/`). Rota: `/dashboard` (`<ProtectedRoute>`, registrada em
  `apps/web/src/App.tsx:171` — **fora** do sistema de rotas por-módulo em `app/routes/*.tsx` usado
  pelos demais módulos).
- Backend: **nenhum módulo `dashboard` dedicado** — `apps/api/src/modules/analytics/**` (real,
  `AnalyticsController`/`AnalyticsService`, 3 endpoints) + reuso direto de 7 endpoints de domínio já
  auditados (`/artists`, `/contracts`, `/transactions`, `/events`, `/clients`, `/releases`,
  `/projects`) + `/audit-logs`.
- Não há tabelas próprias do Dashboard — todas as fontes são tabelas de domínios já mapeados na
  Fase 1 (`artists`, `contracts`, `transactions`, `events`/`eventos`, `clients`, `releases`,
  `projects`, `invoices`, `support_tickets`, `campaigns`, `operational_tasks` se existir,
  `audit_logs`, `ai_usage_logs`).

---

## 1. Widgets identificados (§3 do prompt)

| # | COMPONENT | LABEL | DISPLAY_TYPE | HOOK | SOURCE_DOMAIN |
|---|---|---|---|---|---|
| 1 | `StatCard` | "Artistas Cadastrados" | KPI_CARD | `useMetrics()` → `dashboardMetrics.totalArtistas` + `artistasMetrics.comContrato` | `artist` |
| 2 | `StatCard` | "Contratos Vigentes" | KPI_CARD | `useMetrics()` → `dashboardMetrics.contratosAtivos`/`.contratosVencendo` | `contracts` |
| 3 | `StatCard` | "Receita Total" (rótulo enganoso — ver Gap #1) | KPI_CARD | `useMetrics()` → `dashboardMetrics.receitaMensal` | `accounting` |
| 4 | `StatCard` | "Eventos do Mês" | KPI_CARD | `useMetrics()` → `dashboardMetrics.eventosMes` | `events` (não auditado, só rastreado o necessário) |
| 5 | `OperationalAlerts` | "Atenção Operacional" (até 8 tipos de alerta) | ALERT | `useOperationalDashboard()` → `GET /analytics/dashboard` | `artist`, `contracts`, `accounting`, `crm-relationships` (`leads`, não auditado), operacional |
| 6 | Card "Atividades Recentes" | — | ACTIVITY_FEED | `useActivityHistory()` (real) + `useWsEvent()` ×12 (inerte, ver Gap #7) + CustomEvents ×11 (morto, ver Gap #8) | cross-domain (`audit_logs`) |
| 7 | Card "Próximos Compromissos" | — | LIST (agenda) | `useEventos()` (módulo `events`, não auditado — só rastreado) | `events` |
| 8 | Grid "Artistas em Destaque" | — | RANKING | `useMetrics()` → `dashboardMetrics.artistasDestaque` | `artist`, `releases`, `projects` |

8 widgets funcionais. `ArtistaVisao360Modal` (acionado pelo botão "Ver perfil 360°" do widget 8) já
foi auditado em `artist.md` — não reaberto aqui, só registrado como deep-link (§9).

---

## 2. Componentes (classificação completa — §4 do prompt)

| Componente | Classificação |
|---|---|
| `StatCard` (×4 instâncias) | KPI_CARD |
| `OperationalAlerts`/`AlertItem` | ALERT |
| Card "Atividades Recentes" | ACTIVITY_FEED + REALTIME_CONSUMER (inerte, ver Gap #7) |
| Card "Próximos Compromissos" | LIST + OTHER_DATA_CONSUMER |
| Grid "Artistas em Destaque" | RANKING |
| `SectionHeader` | STATIC (label/descrição/link, sem dado próprio) |
| Bloco "Mock mode: window CustomEvents" (`Dashboard.tsx:449-515`) | DEAD — nenhum `dispatchEvent` correspondente encontrado em `apps/web/src` (confirmado por grep exaustivo); o único `musicos360:*` CustomEvent realmente disparado no app é `musicos360:auth:tokenRefreshed` (`AuthContext.tsx`), não relacionado |
| `computeFromMockStorage()` (`useOperationalDashboard.ts:70-220`) | DEAD — função completa (~150 linhas), nunca chamada; `useOperationalDashboard()` sempre usa `api.get("/analytics/dashboard")` |
| `crmMetrics`/`financeiroMetrics` (retornados por `useMetrics()`) | DEAD (código ativo, mas resultado nunca renderizado — ver Gap #4) |

Nenhum componente funcional ficou sem classificação.

---

## 3. Hooks (§5 do prompt)

| HOOK | FILE | ENDPOINTS | READ_FIELDS (fonte) | QUERY_PARAMS | REALTIME | CACHE | TENANT_DEP |
|---|---|---|---|---|---|---|---|
| `useMetrics` | `hooks/useMetrics.ts` | nenhum próprio — agrega `useArtistas()`, `useContratos()`, `useTransacoes()`, `useEventos()`, `useClientes()`, `useLancamentos()`, `useProjetos()` (7 hooks de domínio) | todos os campos já listados nos módulos `artist`/`contracts`/`accounting`/`crm-relationships` já concluídos + `events`/`releases`/`projects` (não auditados, só o necessário) | nenhum (cada hook interno chama sem filtro) | não | herdado de cada hook de domínio (React Query, chaves próprias) | implícito, herdado |
| `useOperationalDashboard` | `hooks/useOperationalDashboard.ts` | `GET /analytics/dashboard` | ver §5 abaixo | nenhum | não | `staleTime: 30_000`, `refetchInterval: 60_000` (polling real) | implícito (`@CurrentTenant()`) |
| `useActivityHistory` | `hooks/useActivityHistory.ts` | `GET /audit-logs?limit=N` (N=30, hardcoded em `Dashboard.tsx`) | `id, action, entity, entity_id, before, after, created_at` | `limit` | não (sem `useWsEvent` interno — a "atualização em tempo real" é feita por `Dashboard.tsx` via `useWsEvent`, não por este hook) | `staleTime: 30_000`, `refetchOnWindowFocus: false`, sem `refetchInterval` (**não há polling** — ver Gap #7) | implícito |

Nenhum hook ativo ficou sem classificação.

---

## 4. Endpoints do Dashboard (§6 do prompt)

| METHOD | PATH | CONTROLLER | SERVICE | TIPO |
|---|---|---|---|---|
| `GET` | `/analytics/dashboard` | `AnalyticsController` | `AnalyticsService.getDashboard()` — 21 queries SQL reais (`COUNT`/`SUM`/`GROUP BY`), `Promise.all`, todas `WHERE tenant_id = $1` | **DEDICATED_DASHBOARD_ENDPOINT** |
| `GET` | `/analytics/revenue` | `AnalyticsController` | `AnalyticsService.getRevenueOverview()` — série mensal real (`DATE_TRUNC('month', data)`) | **DEDICATED_DASHBOARD_ENDPOINT — sem consumidor frontend** (ver Gap #9) |
| `GET` | `/analytics/ai-usage` | `AnalyticsController` | `AnalyticsService.getAiUsageSummary()` — custo de IA por modelo/feature | **DEDICATED_DASHBOARD_ENDPOINT — sem consumidor frontend** (fora do escopo funcional deste dashboard operacional; não é widget do módulo auditado) |
| `GET` | `/audit-logs?limit=30` | (módulo de auditoria, não reauditado) | — | **REUSED_DOMAIN_ENDPOINT** |
| `GET` | `/artists`, `/contracts`, `/transactions`, `/events`, `/clients`, `/releases`, `/projects` | (módulos já auditados/rastreados) | — | **REUSED_DOMAIN_ENDPOINT** (consumidos crus, sem parâmetro dedicado ao Dashboard) |

`CLIENT_SIDE_AGGREGATION`: todo o conteúdo de `useMetrics()` (widgets 1, 2, 3, 4, 8) — nenhuma
soma/contagem desses 4 KPIs e do ranking de artistas é feita no backend; tudo é `Array.filter/reduce`
sobre os 7 arrays completos trazidos pelos hooks de domínio. `STATIC/MOCK`: nenhum widget ativo usa
dado estático/mock (o único bloco mock, `computeFromMockStorage()`, está morto — ver §2).

---

## 5. KPI — Rastreabilidade obrigatória (§7 do prompt)

### KPI 1 — "Artistas Cadastrados"

```
FRONTEND_FIELD:     dashboardMetrics.totalArtistas
ENDPOINT:           GET /artists (via useArtistas(), useDataQuery/storage.list — sem limit próprio)
BACKEND_FIELD:      artists.length (contagem do array retornado)
SOURCE_TABLES:      artists
SOURCE_COLUMNS:     nenhuma coluna específica — é COUNT do array já carregado
CALCULATION:        artistas.length
FILTER_CONDITIONS:  nenhum (todos os artistas retornados pelo backend, deleted_at IS NULL implícito
                     no service de artists — não reauditado, herdado de artist.md)
STATUS_CONDITIONS:  nenhuma
DATE_CONDITIONS:    nenhuma
TENANT_CONDITION:   implícita (herdada do endpoint /artists)
```
Sub-métrica "com contrato ativo": `artistasMetrics.comContrato` = `artistas.filter(a =>
a.contrato_id).length` — conta artistas com `contrato_id` truthy (setado só quando um contrato
chega a `assinado`, ver `contracts.md` §15/Gap #7 — sujeito ao gap já documentado lá, não reaberto).

### KPI 2 — "Contratos Vigentes"

```
FRONTEND_FIELD:     dashboardMetrics.contratosAtivos
ENDPOINT:           GET /contracts (via useContratos())
BACKEND_FIELD:      contratos[].status, .data_inicio, .data_fim
SOURCE_TABLES:      contracts
SOURCE_COLUMNS:     status, data_inicio, data_fim
CALCULATION:        contratos.filter(c => c.status === "ativo" && !!c.data_inicio && !!c.data_fim
                     && hoje >= data_inicio && hoje <= data_fim).length
FILTER_CONDITIONS:  data_inicio E data_fim devem estar preenchidos (ver Gap #2 — exclui contratos
                     ativos sem data_fim, campo opcional em contracts.md)
STATUS_CONDITIONS:  status === "ativo" (string exata, case-sensitive)
DATE_CONDITIONS:    hoje entre data_inicio e data_fim (inclusive nos dois extremos)
TENANT_CONDITION:   implícita (herdada do endpoint /contracts)
```
Sub-métrica "vencendo em breve": `dashboardMetrics.contratosVencendo` = mesma base de `status ===
"ativo"`, `data_fim` entre hoje e hoje+30 dias (`differenceInDays(data_fim, hoje)` entre 0 e 30).

### KPI 3 — "Receita Total" (rótulo) / valor real = `receitaMensal`

```
FRONTEND_FIELD:     dashboardMetrics.receitaMensal (rotulado na tela como "Receita Total")
ENDPOINT:           GET /transactions (via useTransacoes())
BACKEND_FIELD:      transacoes[].tipo, .status, .data, .valor
SOURCE_TABLES:      transactions
SOURCE_COLUMNS:     tipo, status, data, valor
CALCULATION:        transacoes.filter(t => t.tipo === "receita" && t.status === "pago" &&
                     data(t) >= hoje-30dias && data(t) <= hoje).reduce((acc,t) => acc + t.valor, 0)
FILTER_CONDITIONS:  janela móvel de 30 dias corridos (NÃO é mês calendário — ver Gap #1)
STATUS_CONDITIONS:  tipo === "receita" E status === "pago" (exclui pendente/agendado/cancelado)
DATE_CONDITIONS:    subDays(hoje, 30) <= t.data <= hoje
TENANT_CONDITION:   implícita (herdada do endpoint /transactions)
CURRENCY:           BRL implícito (formatCurrency, sem campo de moeda)
NULL_BEHAVIOR:      transação sem t.data é excluída (parseISO lançaria, capturado por try/catch)
ROUNDING:            nenhum arredondamento — soma de floats diretos, decimal_precision herdada de
                     `transactions.valor` (não auditada aqui)
```

### KPI 4 — "Eventos do Mês"

```
FRONTEND_FIELD:     dashboardMetrics.eventosMes
ENDPOINT:           GET /events (via useEventos())
BACKEND_FIELD:      eventos[].data_inicio (ou .data — dual-read, ver comentário no próprio código)
SOURCE_TABLES:      events (tabela `eventos`/`events`, não auditada — só rastreada)
CALCULATION:        eventos.filter(e => data(e) dentro de [startOfMonth(hoje), endOfMonth(hoje)]).length
DATE_CONDITIONS:    mês calendário atual (diferente do KPI 3, que usa janela móvel de 30 dias —
                     inconsistência de convenção de "período" entre KPIs do mesmo card grid)
TENANT_CONDITION:   implícita
```
`dashboardMetrics.eventosHoje` é calculado pelo hook mas **nunca lido/exibido** em `Dashboard.tsx`
(destructuring de `dashboardMetrics` na página não inclui `eventosHoje`) — campo computado mas morto.

---

## 6. OperationalAlerts — fontes reais (backend dedicado)

`GET /analytics/dashboard` (`AnalyticsService.getDashboard`) — todas as 21 queries rodam
`Promise.all`, cada uma `WHERE tenant_id = $1`, contra as tabelas físicas diretamente (não via os
endpoints REST paginados de cada domínio) — **não sofre o truncamento de 50 linhas** que afeta
`useMetrics()` (ver §8/Gap #3).

| Alert (label na UI) | SQL_SOURCE | STATUS_CONDITIONS |
|---|---|---|
| Tarefas atrasadas | `operational_tasks` (só se a tabela existir — `to_regclass` feature-detect) | `status != 'done' AND due_date < NOW()` |
| Invoices vencidas | `invoices` | `status IN ('vencida','overdue')` |
| Sincronizações com falha | `artists`/`releases`/`works`/`phonograms`.`metadata->'external_data_exchange'` (jsonb, via `jsonb_each`) | `item->>'status' IN ('failed','rejected')` |
| Contratos vencendo em 30 dias | `contracts` | `data_fim BETWEEN NOW() AND NOW()+30d`, sem filtro de `status` explícito nesta query (diferente do KPI 2 do frontend, que exige `status='ativo'` — **CROSS_DOMAIN_CONSISTENCY_GAP**, ver Gap #10) |
| Tarefas pendentes | `operational_tasks` (mesma feature-detect) | `status = 'pending'` |
| Onboardings em andamento | `artists` | `status = 'contratado'` — rotulado "Onboarding" na UI, mas a condição real é "contratado" (o próprio comentário do backend reconhece essa conflação) |
| Setups de distribuição pendentes | `artists.metadata` (jsonb) | `distribution_setup_requested_at IS NOT NULL AND distribution_setup_completed_at IS NULL` — depende de esses dois campos de metadata serem de fato escritos em algum fluxo de `artist` (não reverificado, fora do escopo desta auditoria) |
| Sincronizações externas pendentes | mesma CTE de external_data_exchange | `item->>'status' IN ('pending','processing')` |

`open_tickets`, `campaigns`, `leads`, `pending_receivables`, `active_contracts_count`,
`overdue_followups_count` e os `*_by_status` (buckets) são retornados pela API mas **não são lidos
por nenhum componente** (`OperationalAlerts` só desestrutura os 8 campos da tabela acima) —
confirmado por leitura completa de `Dashboard.tsx`.

---

## 7. Financeiro — integração com `accounting` (§9 do prompt, não reauditado)

| KPI | SOURCE_ENDPOINT | SOURCE_TABLE | INCOME_RULE | STATUS_RULE | DATE_FIELD | CALCULATION |
|---|---|---|---|---|---|---|
| "Receita Total" (rotulado; na prática `receitaMensal`) | `GET /transactions` (client-side) | `transactions` | `tipo='receita'` | `status='pago'` | `data` (janela móvel 30d) | soma de `valor` |
| `revenue_current_month` (backend, não exibido) | `GET /analytics/dashboard` | `transactions` | `tipo='receita'` | `status NOT IN ('cancelado','cancelled')` (aceita pago E pendente) | `data >= início do mês calendário` | soma de `valor` |
| `financeiroMetrics.*` (calculado, nunca exibido) | client-side | `transactions` | `tipo='receita'`/`'despesa'` | `status='pago'`/`'pendente'` | nenhum filtro de data (todo o histórico) | receitasPagas−despesasPagas=lucroLiquido; margem=round(lucro/receitasPagas×100) |

Três formulações diferentes de "receita" coexistem na mesma página (uma exibida, duas mortas), cada
uma com regra de status e janela de data distintas — nenhuma delas reaudita `accounting`
internamente; todas herdam os nomes de coluna já confirmados por esse módulo (`tipo`, `status`,
`data`, `valor`). `ACCOUNTING_DASHBOARD_TRACEABILITY_COMPLETE: SIM` (a origem é determinística nas
três formulações, mesmo divergindo entre si).

---

## 8. Artistas, Catálogo, Contratos, CRM — fontes (§10-§13 do prompt)

**Artistas** (widget "Artistas em Destaque"): `WIDGET=RANKING`, `ARTIST_FIELDS=nome_artistico,
genero_musical, foto_url` (diretos de `artists`) + `lancamentos`/`projetos` (contagens client-side
via `lancamentosData.filter(l => l.artista_id === artista.id).length` /
`projetos.filter(p => p.artista_id === artista.id).length`) + `streams` (métrica externa real —
`artista.spotify_ouvintes` ou `integrations_data.spotify.monthly_listeners/.listeners`, já
documentada como integração real em `artist.md`; corretamente `null` quando ausente, não `0`
falso). `SOURCE_ENDPOINT=GET /artists`. `ORDER`: `lancamentos` desc, depois `projetos` desc.
`LIMIT`: 4 (client-side `.slice(0,4)`). Confirmado: **não há mistura de fonte manual vs. métrica
externa no mesmo campo** — `streams` é 100% de integração real; `lancamentos`/`projetos` são 100%
contagem de registros reais — não há campo que misture as duas origens.

**Catálogo**: **não existe nenhum widget de catálogo (works/phonograms) no Dashboard atual** —
confirmado por leitura completa de `Dashboard.tsx` e `useMetrics.ts` (nenhuma referência a `useObras`/
`useFonogramas`/`works`/`phonograms`). `DASHBOARD_AGGREGATION_GAP` do prompt §11 portanto **não se
aplica** — não há dependência de `GET /works`/`GET /phonograms` neste módulo hoje.

**Contratos**: já coberto no KPI 2 (§5) e no alerta "Contratos vencendo em 30 dias" (§6) — `SOURCE_
FIELDS=status,data_inicio,data_fim`, `LIMIT`: nenhum widget de contrato usa `take N` — são contagens
sobre o array completo (sujeito ao truncamento de 50, ver Gap #3, exceto o alerta que usa SQL real).

**CRM**: confirmado — nenhuma tabela `contacts` inventada; `crmMetrics` (único ponto de leitura de
CRM em `useMetrics.ts`) lê `useClientes()` → `GET /clients` (fonte física real, `Contato=Cliente`,
já estabelecido em `crm-relationships.md`) — mas `crmMetrics` está morto (nunca exibido, ver §2).
`OperationalAlerts`/`analytics.service.ts` usa `leads` (tabela real do módulo `leads`, não
`crm-relationships`, distinção correta) para `leadCount`, também não exibido.

---

## 9. Charts / Time Series / Date Range (§15-§17 do prompt)

`CHARTS: 0` — nenhum gráfico/chart existe no Dashboard hoje (nenhuma biblioteca de gráficos
importada em `Dashboard.tsx`, nenhum componente `<Chart>`/`<Recharts>`/similar encontrado). Isso
apesar de existir um endpoint backend real e pronto para servir uma série temporal
(`GET /analytics/revenue`, `DATE_TRUNC('month', data)`, parametrizável por `months`) — **sem
nenhum consumidor frontend** (ver Gap #9). `TIME SERIES: 0` widgets de série temporal ativos.
`DATE RANGE: 0` seletores de período existem na UI — todas as janelas de tempo (30 dias corridos no
KPI 3, mês calendário no KPI 4 e no backend `revenue_current_month`, "hoje" no alerta de vencimento)
são **hardcoded**, não configuráveis pelo usuário.

---

## 10. Filtros, Search, Sort/Ranking (§18-§20 do prompt)

`FILTERS: 0` — não há nenhum filtro interativo no Dashboard (nem por artista, período, status, etc.
— todos os widgets mostram sempre o mesmo recorte fixo). `SEARCH: 0` — não há campo de busca.
`SORT/RANKING`: 1 — "Artistas em Destaque" (`UI_SORT`: implícito, sem controle do usuário;
`API_SORT`: nenhum, ordenação 100% client-side; `DATABASE_EXPRESSION`: N/A;
`DIRECTION`: desc por `lancamentos`, desc por `projetos` como desempate; `LIMIT`: 4;
`TIE_BEHAVIOR`: se `lancamentos` E `projetos` empatarem, mantém a ordem original do array
retornado por `GET /artists` — sem critério de desempate adicional, ex. nome alfabético).

---

## 11. Limites e Truncamento (§21/§22 do prompt) — GAP CRÍTICO CROSS-CUTTING

| WIDGET | LIMIT | SERVER_OR_CLIENT | INTENTIONAL | AFFECTS_AGGREGATE |
|---|---|---|---|---|
| KPI "Artistas Cadastrados" | 50 (default `PaginationDto.limit` em `GET /artists`, nenhum override em `useArtistas()`) | SERVER (silencioso) | NÃO | **SIM — total exibido é `artistas.length` sobre um array já truncado a 50 pelo backend** |
| KPI "Contratos Vigentes"/"vencendo" | 50 (default de `GET /contracts`, já confirmado em `contracts.md`) | SERVER | NÃO | **SIM** |
| KPI "Receita Total" (`receitaMensal`) | 50 (default de `GET /transactions`, `useTransacoes()` sem override) | SERVER | NÃO | **SIM — soma calculada sobre no máximo 50 transações, não o total real** |
| KPI "Eventos do Mês" | 50 (default de `GET /events`, `useEventos()` sem override) | SERVER | NÃO | **SIM** |
| "Artistas em Destaque" (ranking) | 50 em `artists`/`lancamentos`/`projetos` (3 fontes, cada uma truncada independentemente) | SERVER | NÃO | **SIM — ranking pode omitir o artista realmente mais relevante se ele estiver além da 50ª posição em qualquer uma das 3 listas** |
| "Próximos Compromissos" | 50 (default de `GET /events`) SERVER + 5 (client, `.slice(0,5)`, intencional) | AMBOS | o `.slice(0,5)` é intencional (preview); o limite de 50 upstream não é | preview, não afeta um "total" exibido |
| "Atividades Recentes" | 30 (`GET /audit-logs?limit=30`, parâmetro explícito, não é o default silencioso de 50) | SERVER, **intencional** (parâmetro passado deliberadamente) | SIM | preview, não afeta um "total" exibido |
| `OperationalAlerts` (todos os 8 valores) | nenhum — `AnalyticsService.getDashboard()` usa `COUNT(*)` SQL direto contra a tabela física, sem paginação | N/A | — | **NÃO — estes são os únicos KPIs do Dashboard livres do truncamento de 50** |

**Gap crítico confirmado (§21/§22 do prompt)**: os 4 `StatCard`s no topo do Dashboard e o ranking de
"Artistas em Destaque" são **todos** "Total X" derivados de arrays já limitados a 50 registros pelo
backend — não são `TOTAL_REAL`, são contagens/somas sobre um `PREVIEW_LIST_LIMIT` não-intencional.
Nenhuma indicação visual informa ao usuário que o número pode estar incompleto. Isso é uma
inferência estrutural (mesmo padrão `PaginationDto.limit=50` já verificado e confirmado
byte-a-byte em `works`/`phonograms`/`contracts`/`contract_templates`/`clients` nas auditorias
anteriores, e replicado identicamente por `useArtistas`/`useTransacoes`/`useEventos`/
`useLancamentos`/`useProjetos` via o mesmo `useDataQuery`/`storage.list()` sem override de `limit`
— não foi reaberto byte-a-byte cada controller de domínio, conforme instrução do prompt de não
reauditar módulos já concluídos e não auditar integralmente módulos externos).

---

## 12. Paginação, Status, Estados vazios/erro (§23-§25 do prompt)

Nenhum widget do Dashboard implementa paginação própria — são todos "preview" (top N) ou "total"
(seção §11). `LOADING_STATE`: página inteira usa `DashboardSkeleton` enquanto `useMetrics().
isLoading` é `true` (agregado dos 7 hooks de domínio) — `useOperationalDashboard`/
`useActivityHistory` têm seus próprios estados de loading, não bloqueiam a renderização inicial da
página (`OperationalAlerts` retorna `null` enquanto `dashboard` é `undefined`, sem skeleton próprio).
`EMPTY_STATE`: implementado explicitamente para "Atividades Recentes", "Próximos Compromissos" e
"Artistas em Destaque" (mensagens + CTA). `ERROR_STATE`: **nenhum tratamento de erro visível** — se
`useOperationalDashboard()`/`useActivityHistory()` falharem, o React Query `error` é retornado pelo
hook mas **nunca lido** em `Dashboard.tsx` (nem `OperationalAlerts` nem a Activity Feed verificam
`.error`) — uma falha de rede nesses dois endpoints resulta silenciosamente em "nenhum alerta"/
"nenhuma atividade" (estado vazio), **indistinguível de um tenant genuinamente sem dados** — `FAKE_
ZERO` confirmado para esses dois widgets especificamente (não para os 4 `StatCard`s de `useMetrics`,
que ficariam presos no `DashboardSkeleton` em caso de erro de qualquer um dos 7 hooks, já que
`isLoading` combinado nunca vira `false` se uma query trava, mas também não exibe uma mensagem de
erro dedicada — mesmo efeito prático de mascarar a falha, com sintoma diferente: loading infinito em
vez de zero).

---

## 13. Fallbacks / Mocks (§26 do prompt)

| Item | Classificação |
|---|---|
| `computeFromMockStorage()` (`useOperationalDashboard.ts`) | DEAD — nunca chamada |
| Bloco de 11 `window.addEventListener("musicos360:...")` (`Dashboard.tsx`) | DEAD — nenhum `dispatchEvent` correspondente em `apps/web/src` |
| `crmMetrics`/`financeiroMetrics` | ACTIVE_RUNTIME (código roda a cada render) mas resultado **DEAD** (nunca renderizado) |

Nenhum dado falso **ativo e visível** foi encontrado — os únicos mecanismos de fallback/mock
presentes no código estão todos mortos (nunca disparam), o que é positivo, mas o próprio fato de
~220 linhas de código morto (mock function + 11 listeners) permanecerem no módulo é registrado como
achado de manutenibilidade (`MOCK_DATA_GAP`, sem risco funcional ativo).

---

## 14. Realtime (§27 do prompt) — GAP CONFIRMADO

`useWsEvent()` é um mecanismo real (Supabase Realtime broadcast, canal tenant/user, já validado em
`auth.md`) — `Dashboard.tsx` assina 12 eventos tipados (`artist.created`, `artist.updated`,
`artist.deleted`, `catalog.music.registered`, `catalog.phonogram.registered`, `contract.created`,
`contract.updated`, `contract.signed`, `crm.lead.captured`, `crm.lead.converted`,
`finance.transaction.created`, `finance.transaction.updated`, `finance.calculated`,
`audit.entry.created` — 14 no total).

**Busca exaustiva no backend (`apps/api/src`) não encontrou nenhum call-site que publique
qualquer um desses 14 nomes de evento via broadcast Supabase Realtime.** O sistema de domain events
do backend (`EventsService.emitTyped()`) usa exclusivamente `EventEmitter2` (`this.emitter.emit(...)`,
confirmado lendo o código-fonte de `events.service.ts`) — um barramento **interno** do processo
NestJS, que aciona handlers como `ContractEventsHandler`/`ContractWorkflowHandler` (gravam
`activity_logs`, criam tarefas, etc. — já documentado em `contracts.md`), mas **não tem nenhuma ponte
para o Supabase Realtime**. Não foi encontrado nenhum serviço/gateway que traduza `DOMAIN_EVENTS`
em broadcasts `artist.created`/`contract.signed`/etc.

`REALTIME_GAP` confirmado: as 12-14 assinaturas `useWsEvent()` do Dashboard estão **estruturalmente
corretas** (tipagem real, canal real, hook real) mas **nunca recebem nenhum evento** porque nada no
backend os publica. `WIDGET_UPDATED`: nunca, por esse caminho — a única forma real de a Activity Feed
crescer é via novo carregamento de `useActivityHistory()` (React Query, `staleTime: 30_000`, **sem
`refetchInterval`** — não há polling automático; só reexecuta em novo mount ou invalidação manual,
nenhuma das quais ocorre neste módulo) — na prática, o feed é efetivamente estático após o
carregamento inicial da página, exceto por uma navegação/remontagem do componente.

---

## 15. Cache (§28 do prompt)

| FONTE | CACHE_KEY | TENANT_NA_KEY | FILTROS_NA_KEY | INVALIDATION |
|---|---|---|---|---|
| `useOperationalDashboard` | `["operational-dashboard"]` | **NÃO** — chave fixa, sem tenant | N/A (sem filtros) | nenhuma invalidação explícita encontrada; só `refetchInterval: 60_000` |
| `useActivityHistory` | `["activity-history", limit]` | **NÃO** — chave fixa + limit | `limit` (único parâmetro) | nenhuma invalidação explícita; `staleTime: 30_000` |
| Hooks de domínio (`useArtistas` etc.) | chaves próprias já documentadas nos módulos correspondentes | herdado | herdado | herdado |

`CACHE_GAP` — risco teórico registrado, não confirmado como exploração real: como React Query
mantém cache em memória por sessão de browser (não persistido entre usuários/dispositivos) e o
backend sempre filtra por `tenant_id` no servidor, **não há vazamento cross-tenant real** mesmo com
a chave de cache não incluindo o tenant — o risco só existiria em cenários exóticos (ex.: dois
tenants diferentes autenticados na mesma aba sem reload completo entre trocas), que não foi
verificado nem é o padrão de uso da aplicação (troca de tenant tipicamente implica reload). Registrado
como boa prática ausente, não como vulnerabilidade confirmada.

---

## 16. Refresh / Polling (§29 do prompt)

| MECHANISM | INTERVAL | ENDPOINT | WIDGET |
|---|---|---|---|
| `refetchInterval` (React Query) | 60.000 ms | `GET /analytics/dashboard` | OperationalAlerts |
| nenhum | — | `GET /audit-logs` | Atividades Recentes (só no mount, sem polling) |
| nenhum | — | 7 hooks de domínio (`useMetrics`) | 4 StatCards + Ranking (só no mount) |

Não alterado (proibido pelo prompt) — apenas registrado que só `OperationalAlerts` tem atualização
automática; os demais widgets exigem reload/remount manual da página para refletir novos dados.

---

## 17. Permissões (§30 do prompt)

| WIDGET | PERMISSION | FRONTEND_ENFORCEMENT | BACKEND_ENFORCEMENT |
|---|---|---|---|
| Página `/dashboard` inteira | nenhuma além de autenticação | `<ProtectedRoute>` (login obrigatório, sem checagem de role/permissão específica) | — |
| `OperationalAlerts` (inclui `revenue_current_month`/`expenses_current_month`/`net_result_current_month`/`pending_receivables` na resposta, mesmo que não exibidos) | nenhuma no frontend | nenhum `RequirePermission` visível | `GET /analytics/dashboard` requer só `@RequireRole('viewer')` — o papel mais baixo da hierarquia |
| KPI "Receita Total" / demais StatCards | nenhuma no frontend | nenhuma | herdada de `GET /transactions` etc. (não reauditado; presumivelmente também `viewer` para leitura, consistente com o padrão observado em todos os módulos já auditados) |

`AUTHORIZATION_GAP` (informativo, não crítico): `GET /analytics/dashboard` expõe agregados
financeiros (receita/despesa/saldo do mês, contas a receber pendentes) para qualquer usuário com o
papel mínimo `viewer` do tenant, sem gate adicional — mesmo que esses valores específicos não sejam
hoje renderizados por `OperationalAlerts` (§6), a API já os entrega a qualquer chamador autorizado a
ver o dashboard operacional. Se a intenção de produto for restringir dados financeiros agregados a
papéis mais altos (não verificável sem reabrir `accounting.md`), este é o ponto onde isso deveria ser
reforçado; registrado como observação, não como falha confirmada, pois não há evidência de que o
modelo de permissões pretendido seja mais restritivo que "viewer" para agregados financeiros.

---

## 18. Tenant Isolation (§31 do prompt)

`TENANT_SOURCE`: em todos os casos, o backend resolve o tenant via `@CurrentTenant()` (JWT-derivado,
mesmo padrão `TenantGuard` já auditado em `auth.md`) — o frontend nunca envia um tenant explícito
para nenhum dos endpoints usados pelo Dashboard. `DATABASE_FILTER`: confirmado `WHERE tenant_id = $1`
em todas as 21 queries de `AnalyticsService.getDashboard()` + `getRevenueOverview()` +
`getAiUsageSummary()`, e herdado dos 7 hooks de domínio (já auditados/rastreados individualmente).
`TENANT_ISOLATION_GAPS: 0`.

---

## 19. Deep Links (§32 do prompt)

| SOURCE_WIDGET | TARGET_ROUTE | ROUTE_EXISTS | Observação |
|---|---|---|---|
| StatCard "Contratos Vigentes" (indireto, não é link) | — | N/A | StatCards não são clicáveis |
| Alertas "Tarefas atrasadas"/"Tarefas pendentes" | `/crm` | **SIM**, mas redireciona para `/leads` (`crm.routes.tsx`) — funciona, é uma indireção, não um link quebrado | |
| Alerta "Invoices vencidas" | `/accounting/nota-fiscal` | SIM (`accounting.routes.tsx`) | |
| Alerta "Sincronizações com falha"/"Sincronizações externas pendentes" | `/configuracoes` | SIM, mas a rota é envolvida em `<AdminRoute>` (`settings.routes.tsx:19`) — um usuário `viewer` que vê o alerta (permissão mínima do endpoint, §17) pode ser bloqueado ao clicar se não for admin | possível fricção de permissão, não um link quebrado |
| Alerta "Contratos vencendo em 30 dias" | `/contratos` | SIM (`contracts.routes.tsx`) | |
| Alerta "Onboardings em andamento" | `/artistas` | SIM (`artist.routes.tsx`) | |
| Alerta "Setups de distribuição pendentes" | `/lancamentos` | SIM (`releases.routes.tsx`) | |
| "Ver Agenda Completa" (Próximos Compromissos) | `/agenda` | SIM (`operations.routes.tsx`) | |
| "Ver todos" (Artistas em Destaque) | `/artistas` | SIM | |
| Botão "Ver perfil 360°" | abre `ArtistaVisao360Modal` (já auditado em `artist.md`) | N/A (modal, não rota) | |

`DEEP_LINK_GAPS: 0` — nenhuma rota quebrada encontrada; 1 observação de possível fricção de
permissão (não contada como gap formal, já que a rota existe e funciona para quem tem acesso).

---

## 20. Export / XLSX (§33/§34 do prompt)

Nenhuma funcionalidade de export foi encontrada no Dashboard (nenhum botão, nenhuma chamada a
`reports-api`/Central de Relatórios a partir deste módulo). `XLSX_EXPORTS: 0`,
`XLSX_RULE_VIOLATIONS: 0` (não se aplica — não há XLSX neste módulo).

---

## 21. Cross-Domain Consistency (§35 do prompt)

| Comparação | DASHBOARD_FORMULA | DOMAIN_FORMULA (fonte) | CONSISTENT |
|---|---|---|---|
| "Contratos Vigentes" (StatCard) vs. `active_contracts_count` (`/analytics/dashboard`, não exibido) | `status='ativo'` + `data_inicio`/`data_fim` ambos presentes + hoje no intervalo | `status IN ('vigente','ativo','assinado')`, sem exigir datas | **NÃO** — mesmo Dashboard, duas fórmulas divergentes para "contrato ativo" (uma exibida, uma não) |
| Alerta "Contratos vencendo em 30 dias" vs. `dashboardMetrics.contratosVencendo` (não exibido diretamente, mas calculado) | backend: `data_fim BETWEEN NOW() AND NOW()+30d`, sem filtro de status | client: exige `status='ativo'` E `data_fim` dentro da janela de 30 dias | **NÃO** — o alerta (exibido, fonte real SQL) pode contar contratos em qualquer status cujo `data_fim` caia na janela, enquanto o `useMetrics()` equivalente (não exibido) restringe a `status='ativo'` |
| "Receita Total" (StatCard, `receitaMensal`) vs. `revenue_current_month` (`/analytics/dashboard`, não exibido) | janela móvel de 30 dias corridos, só `status='pago'` | mês calendário atual, `status NOT IN ('cancelado','cancelled')` (inclui pendente) | **NÃO** — período E regra de status diferentes |
| "Artistas Cadastrados" vs. contagem em `artists.md`/tela de Artistas | `artistas.length` sobre array truncado a 50 (Gap #3) | tela de Artistas usa a mesma fonte (`useArtistas()`), portanto **sofre o mesmo truncamento** — os dois números deveriam bater entre si (ambos errados da mesma forma), mas nenhum dos dois reflete o total real do tenant se houver >50 artistas | **CONSISTENTE entre si, ambos incorretos vs. a realidade** |

`CROSS_DOMAIN_CONSISTENCY_GAP` confirmado (3 pares divergentes de 4 comparados) — importante notar
que em todos os 3 casos divergentes, a fórmula **realmente exibida** ao usuário é a do
`useMetrics()` (client-side, truncada a 50, sujeita aos gaps documentados), enquanto a fórmula do
`/analytics/dashboard` (SQL real, sem truncamento) fica calculada mas **não exibida** — ou seja, o
Dashboard tem acesso a números mais corretos e não os usa para os KPIs de destaque.

---

## 22. Gaps consolidados

1. **DISPLAY_MAPPING_MISMATCH** — o StatCard rotulado **"Receita Total"** exibe na verdade
   `dashboardMetrics.receitaMensal`, uma janela móvel de 30 dias (`status='pago'` apenas), não o
   total histórico de receita nem sequer o mês calendário — rótulo enganoso.
2. **CALCULATION_MISMATCH** — "Contratos Vigentes" exclui contratos com `status='ativo'` mas sem
   `data_fim` preenchido (campo opcional em `contracts.md`), subestimando a contagem real.
3. **TRUNCATION_GAP** (severidade crítica, cross-cutting) — os 4 KPI StatCards e o ranking
   "Artistas em Destaque" são calculados sobre arrays client-side limitados a 50 registros pelo
   default `PaginationDto.limit=50` de cada endpoint de domínio (`/artists`, `/contracts`,
   `/transactions`, `/events`, mais `/releases`/`/projects` para o ranking) — nenhum "Total X"
   destes é um `TOTAL_REAL` para tenants com mais de 50 registros em qualquer dessas entidades.
4. **CODE_FIELD_ONLY** (achado de manutenibilidade) — `crmMetrics` e `financeiroMetrics` (retorno
   completo de `useMetrics()`, incluindo um cálculo real de P&L: receitas/despesas/lucro
   líquido/margem/contas a receber/contas a pagar) são computados a cada render mas **nunca
   renderizados** em nenhum lugar do Dashboard.
5. **STATUS_MISMATCH** — dentro do `financeiroMetrics` morto (Gap #4), e também potencialmente
   noutros pontos não exibidos, os status verificados (`"pago"`, `"pendente"`) são coerentes com
   `accounting`, mas isso não foi cruzado porque o próprio bloco nunca é exibido — registrado como
   nota, não como gap ativo visível ao usuário.
6. **MOCK_DATA_GAP** — `computeFromMockStorage()` (~150 linhas) e o bloco de 11
   `window.addEventListener("musicos360:...")` (~70 linhas) são código morto (nunca executado/
   nunca disparado) que permanece no módulo.
7. **REALTIME_GAP** (severidade alta) — as 14 assinaturas `useWsEvent()` da Activity Feed nunca
   recebem eventos: nenhum call-site no backend publica broadcasts Supabase Realtime para
   `artist.created`/`contract.signed`/`finance.transaction.created`/etc. — confirmado via leitura de
   `EventsService.emitTyped()` (usa só `EventEmitter2` interno, sem ponte para realtime). A Activity
   Feed só atualiza via `useActivityHistory()`, que por sua vez não tem `refetchInterval` — o feed é
   efetivamente estático entre remontagens da página.
8. **FALLBACK_GAP** — ambos `OperationalAlerts` e a Activity Feed tratam falha de rede (`error` do
   React Query, nunca lido) da mesma forma que "sem dados" — um erro de API vira silenciosamente uma
   seção vazia/ausente, sem aviso ao usuário (`FAKE_ZERO`/`FAKE_EMPTY` confirmado).
9. **REAL_MAPPING_GAP** — `GET /analytics/revenue` (série mensal real de receita/despesa,
   pronta para alimentar um gráfico) e `GET /analytics/ai-usage` não têm **nenhum consumidor
   frontend** — endpoints reais, completos, nunca chamados; o Dashboard não tem nenhum gráfico apesar
   de ter a fonte de dados pronta para um.
10. **CROSS_DOMAIN_CONSISTENCY_GAP** — 3 pares de fórmulas conceitualmente equivalentes (contrato
    ativo, contrato vencendo, receita do período) divergem entre a versão client-side exibida
    (`useMetrics()`, truncada, com regras de status/data mais restritivas) e a versão SQL real do
    backend (`/analytics/dashboard`, sem truncamento, calculada mas não exibida) — ver §21.
11. **AUTHORIZATION_GAP** (informativo) — `GET /analytics/dashboard` expõe agregados financeiros a
    qualquer `viewer` do tenant, sem gate adicional — ver §17.

Total: 1 DISPLAY_MAPPING_MISMATCH, 1 CALCULATION_MISMATCH, 1 TRUNCATION_GAP, 1 MOCK_DATA_GAP,
1 REALTIME_GAP, 1 FALLBACK_GAP, 1 REAL_MAPPING_GAP, 1 CROSS_DOMAIN_CONSISTENCY_GAP,
1 AUTHORIZATION_GAP (informativo) = **9 gaps** (mais 2 notas de manutenibilidade — código morto
`crmMetrics`/`financeiroMetrics` e a inconsistência de status dentro dele — registradas mas não
contadas separadamente por não afetarem nada visível ao usuário).

---

## Contadores finais (Zero-Gap)

```
COMPONENTS_AUDITED: 9 (4 StatCard instâncias tratadas como 1 componente reutilizável + 8 widgets)
HOOKS_AUDITED: 3
ENDPOINTS_AUDITED: 11 (3 dedicados de analytics + 8 reutilizados de domínio: artists, contracts,
                       transactions, events, clients, releases, projects, audit-logs)
WIDGETS_AUDITED: 8
KPI_WIDGETS: 4
CHARTS: 0
TABLE_LIST_WIDGETS: 1 (Próximos Compromissos)
RANKING_WIDGETS: 1 (Artistas em Destaque)
ACTIVITY_WIDGETS: 1 (Atividades Recentes) + 1 (Atenção Operacional / Alerts)
FILTERS: 0
DATE_RANGE_CONTROLS: 0
SEARCH_FIELDS: 0
SORT_FIELDS: 1 (ranking de artistas, não controlável pelo usuário)
CROSS_DOMAIN_SOURCES: 8 (artist, contracts, accounting, events, crm-relationships/clients,
                          releases, projects, audit-logs/sistema)
CALCULATIONS_AUDITED: 12 (4 KPIs do topo + 8 condições de alerta operacional)
LIMITS_AUDITED: 8 (7 fontes com limite silencioso de 50 + 1 fonte com limite intencional de 30)
REALTIME_EVENTS: 14 (assinados, 0 efetivamente publicados pelo backend)
CACHE_KEYS_AUDITED: 2 dedicados (`operational-dashboard`, `activity-history`) + herdados dos hooks
                     de domínio
EXPORT_FIELDS: 0
XLSX_EXPORTS: 0
XLSX_RULE_VIOLATIONS: 0
PERMISSIONS_AUDITED: 1 (GET /analytics/dashboard — @RequireRole('viewer'))
AUTHORIZATION_GAPS: 1 (informativo)
TENANT_ISOLATION_GAPS: 0

CODE_FIELD_ONLY: 1 (crmMetrics/financeiroMetrics)
DATABASE_COLUMN_ONLY: 0
TYPE_MISMATCH: 0
ENUM_MISMATCH: 0
DISPLAY_MAPPING_MISMATCH: 1
FILTER_MAPPING_MISMATCH: 0
DATE_RANGE_MISMATCH: 0
AGGREGATION_MISMATCH: 0
CALCULATION_MISMATCH: 1
STATUS_MISMATCH: 0 (nota registrada em código morto, não contada como gap ativo)
PAGINATION_GAPS: 0
TRUNCATION_GAPS: 1 (cross-cutting, afeta 5 widgets — contado uma vez como gap de padrão)
MOCK_DATA_GAPS: 1
FALLBACK_GAPS: 1
CACHE_GAPS: 0 (risco teórico registrado em §15, não confirmado como gap)
REALTIME_GAPS: 1
DEEP_LINK_GAPS: 0
CROSS_DOMAIN_CONSISTENCY_GAPS: 1
REAL_MAPPING_GAPS: 1

ACCOUNTING_DASHBOARD_TRACEABILITY_COMPLETE: SIM
ARTIST_DASHBOARD_TRACEABILITY_COMPLETE: SIM
CATALOG_DASHBOARD_TRACEABILITY_COMPLETE: SIM (não se aplica — nenhum widget de catálogo existe)
CONTRACTS_DASHBOARD_TRACEABILITY_COMPLETE: SIM
CRM_DASHBOARD_TRACEABILITY_COMPLETE: SIM

UNMAPPED_WIDGETS: 0
UNMAPPED_KPIS: 0
UNMAPPED_CHART_FIELDS: 0 (não há charts)
UNMAPPED_TABLE_LIST_FIELDS: 0
UNMAPPED_FILTERS: 0 (não há filtros)
UNMAPPED_DATE_RANGES: 0 (não há seletor de data)
UNMAPPED_SOURCE_TABLES: 0
UNMAPPED_CALCULATIONS: 0
UNKNOWN_DASHBOARD_CLASSIFICATIONS: 0
```

NEXT_MODULE: `events`
