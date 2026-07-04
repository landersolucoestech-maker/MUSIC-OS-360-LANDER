# Auditoria Completa de KPI Cards — MUSIC OS 360

> **Data:** 2026-07-03 · **Escopo:** todos os KPI cards do app web (`apps/web`) + rastreamento até o backend.
> **Evidência de dados:** consultas **READ-ONLY** (apenas contagens agregadas, nenhuma mutação) no Postgres de **produção** (`iundcoubyaiwzqyytvdr`) — produção não foi alterada. Branch `staging-go-live` foi descartado como fonte (0 linhas operacionais).
> **Limite honesto:** não há app rodando com tenant logado nesta sessão; portanto a coluna "valor renderizado no card" foi **inferida da lógica** + dados reais, não capturada de um browser. Onde isso importa, está marcado.

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Páginas com KPI cards auditadas | 20 |
| KPI cards mapeados | ~70 |
| Arquitetura de dados | **100% agregação no frontend** — **nenhum** endpoint de métricas no backend |
| Divergências críticas (mesmo KPI, regras diferentes) | **4** |
| KPIs mislabeled (rótulo ≠ cálculo) | **2** (Financeiro "Receita/Despesas Mensais") |
| KPIs zerados por dados reais (não por bug) | vários (contratos "vigentes/assinados", ver FASE 6) |
| Dados invisíveis a KPIs (categoria não coberta) | **47 transações `transferencia`** + 4 `receita/confirmado` |
| KPIs simulados/in-memory (design conhecido) | Marketing (Métricas/Visão Geral/Central Analítica) |

**Conclusão:** os cards **renderizam** e a maioria é **internamente coerente**, mas há **4 divergências críticas** onde o **mesmo indicador é calculado com regras diferentes** em páginas diferentes (Dashboard vs página de domínio). Além disso, a semântica de status do frontend **não corresponde** ao vocabulário real dos dados, o que faz cards legítimos exibirem 0 e esconde o pipeline real (rascunhos, negociação, transferências).

---

## FASE 1+2 — Inventário e Rastreamento

**Padrão arquitetural (evidência):** `apps/web/src/modules/dashboard/hooks/useMetrics.ts` importa hooks de domínio (`useArtistas`, `useContratos`, `useTransacoes`, `useEventos`, `useContacts`, `useLancamentos`, `useProjetos`). Cada hook faz `GET` de uma **lista** (via `api.get`), e **todo KPI é calculado no cliente** com `.filter(...).length` / `.reduce(...)`. **Não existe** controller `*dashboard*`/`*metrics*` no backend (`apps/api/src/modules` — grep vazio). Multi-tenancy é herdada dos endpoints de lista (TenantGuard + RLS).

| Página | KPI cards | Componente | Origem do dado | Cálculo |
|---|---|---|---|---|
| **Dashboard** | Artistas, Contratos Ativos, Vencendo, Receita Mensal, Eventos no mês | `MetricCard`/`StatCard` via `useMetrics` | `useArtistas/Contratos/Transacoes/Eventos` (listas) | frontend (`useMetrics.ts:165`) |
| **Artistas** | Total, Exclusivos, Parceiros, Independentes | `MetricCard` | `useArtistas` + contratos por artista | frontend `classifyVinculo` (`Artistas.tsx:125`) |
| **Contratos** | Vigentes, Aguardando, Em Análise, Assinados no ano, Vencendo, Valor Total | `MetricCard` | `useContratos` | frontend status-based (`Contratos.tsx:154`) |
| **CRM/Leads** | Contatos (total/clientes/parceiros/fornecedores/prestadores); Leads (total/negociação/propostas/fechados/valor) | `MetricCard` | `useContacts`, `useLeads` | frontend (`LeadsPage.tsx:280`, `leads/hooks/index.ts:26`) |
| **Financeiro** | Receita Mensal, Despesas Mensais, Lucro Líquido, Contas a Receber/Pagar | `MetricCard` | `useTransacoes` | frontend (`Financeiro.tsx:42`) |
| **Contabilidade** | (agregações de transações) | `MetricCard` | `useTransacoes` | frontend |
| **Inventário** | total, em uso, disponíveis, manutenção, valor | `MetricCard` | `useInventario` | frontend (`Inventario.tsx:129`) |
| **Licenciamento** | total, ativas, propostas, expiradas, valor | `MetricCard` | `useLicencas` | frontend (`Licenciamento.tsx:159`) |
| **Projetos** | ativos, concluídos, rascunhos, total | `MetricCard` | `useProjetos` | frontend (`Projetos.tsx:354`) |
| **Lançamentos** | total, distribuídos, pendentes, aguardando ação | `MetricCard` | `useLancamentos` | frontend (`Lancamentos.tsx:291`) |
| **RH** | total, ativos, férias, afastados | `MetricCard` | `useFuncionarios` | frontend (`RH.tsx:254`) |
| **Agenda/Eventos** | confirmados, pendentes, … | `MetricCard` | `useEventos` | frontend (`Agenda.tsx:287`) |
| **Takedowns** | total, pendentes, em andamento, resolvidos | `MetricCard` | `useTakedowns` | frontend (`Takedowns.tsx:136`) |
| **Audiovisual** | total, em produção, aguardando, concluídas, orçamento | card local (não `MetricCard`) | `useAudiovisual` | frontend (`AudiovisualProjectsList.tsx:96`) |
| **Monitoramento (Direitos/Royalties)** | Execuções, Confirmadas, Não Reportadas, Divergências, Match Rate, Valores | `RightsKPICards` | props do container | frontend |
| **Admin · Painel Executivo** | MRR, Clientes Ativos, Usuários, Churn, Assinaturas, Tenants em Atenção | `AdminKpiCard`→`MetricCard` | `adminTenantsService`, `adminBillingService` | frontend (`AdminDashboard.tsx:106`) |
| **Admin · Clientes** | Ativos, Trial, Suspensos, MRR | inline | `adminTenantsService` | frontend (`AdminClients.tsx:140`) |
| **Admin · Assinaturas** | total, ativas, inadimplentes, MRR | inline | `adminBillingService` | frontend (`AdminSubscriptions.tsx:247`) |
| **Suporte** | abertos, aguardando, fechados | inline | `useTickets` | frontend (`SupportDashboard.tsx:42`) |
| **Marketing** (Métricas/Visão Geral/Central Analítica/Tarefas) | vários | `MarketingKpiCard`/`MetricCard` | **in-memory/simulado** (controller `useCentralAnaliticaMarketing`) | frontend simulado |

---

## FASE 3 — Definições de negócio (e lacunas)

| KPI | Definição no código | Definição de negócio clara? |
|---|---|---|
| Dashboard · Contratos Ativos | `status='ativo'` **E** hoje ∈ `[data_inicio, data_fim]` | ⚠️ conflita com a página Contratos (ver FASE 4) |
| Contratos · Vigentes | `status ∈ {vigente, ativo}` | ⚠️ conflita com Dashboard |
| Dashboard · Receita Mensal | `receita+pago` nos **últimos 30 dias** | ⚠️ conflita com Financeiro (ver FASE 4) |
| Financeiro · "Receita Mensal" | `receita+pago` **sem filtro de data** (todo o período) | ❌ **rótulo mente** — não é mensal |
| Artistas · Exclusivo/Parceiro/Independente | por **contrato ativo** (`classifyVinculo`) | ⚠️ "ativo" depende de status inexistente nos dados (ver FASE 5) |
| Dashboard · Artistas "com contrato" | `a.contrato_id != null` | ⚠️ conflita com Artistas (contratos ativos) |
| Financeiro · KPIs | `receita/despesa` × `pago/pendente` | ❌ ignora `transferencia` (categoria real e majoritária) |
| Monitoramento · Match Rate | `%` recebido de props | ⚠️ sem origem de cálculo documentada no card |

**Marcados como ERRO CRÍTICO de definição:** "Receita/Despesas Mensais" (Financeiro) — o rótulo diz mensal, o cálculo é all-time.

---

## FASE 4 — KPIs Duplicados / Divergentes (CRÍTICO)

### D1 — "Contrato ativo/vigente" tem **3 definições**
| Local | Regra | Evidência |
|---|---|---|
| Dashboard | `status='ativo'` **E** data-no-intervalo | `useMetrics.ts:170` |
| Página Contratos | `status ∈ {vigente, ativo}` (sem data) | `Contratos.tsx:154` |
| CRM (valor contratado) | `status='ativo'` (contratos com `cliente_id`) | `useMetrics.ts:123` |
→ Um contrato `vigente` (sem `ativo`) aparece em Contratos e **não** no Dashboard. **CRÍTICO: unificar.**

### D2 — "Receita Mensal" com **duas janelas** e **mesmo rótulo**
| Local | Janela | Evidência |
|---|---|---|
| Dashboard | últimos **30 dias** | `useMetrics.ts:191` |
| Financeiro | **todo o período** (rotulado "Mensal") | `Financeiro.tsx:43` |
→ Números diferentes sob o mesmo nome. **CRÍTICO: unificar janela + corrigir rótulo.**

### D3 — "Artistas com contrato / ativos"
| Local | Regra | Evidência |
|---|---|---|
| Dashboard | `a.contrato_id != null` / `status ∈ {ativo, contratado}` | `useMetrics.ts:90-91` |
| Página Artistas | por **contrato ativo real** (`classifyVinculo`) | `Artistas.tsx:125` |
→ Fontes diferentes (FK no artista vs tabela de contratos). **CRÍTICO: unificar.**

### D4 — Métricas financeiras **duplicadas** (código)
`Financeiro.tsx:42` e `useMetrics.ts:135` implementam a **mesma** lógica de receitas/despesas **separadamente**. Divergência sutil: Financeiro usa `Number(t.valor ?? 0)`, useMetrics usa `t.valor` cru (se a API mandar string, o `reduce` do Dashboard concatena). **Risco de drift; extrair helper único.**

---

## FASE 5 — Validação com dados reais (prod, READ-ONLY)

```
contracts: total=72  → rascunho=66, em_analise=6  (0 vigente/ativo/assinado/aguardando)
artists:   total=105 → em_negociacao=79, ativo=26
transactions: transferencia/pendente=47, receita/pago=21, despesa/pago=9,
              receita/pendente=8, receita/confirmado=4
```

| KPI | Valor real esperado (dados atuais) | Observação |
|---|---|---|
| Contratos · Vigentes | **0** | correto: nenhum contrato `vigente/ativo` |
| Contratos · Em Análise | **72** | 66 rascunho + 6 em_analise |
| Dashboard · Contratos Ativos | **0** | correto, mas esconde 72 contratos existentes |
| Artistas · Independentes | **≈ todos** | há **0 contratos ativos** → `classifyVinculo`=independente p/ todos |
| Financeiro · Receita (paga) | soma de **21** transações `receita/pago` | os 4 `receita/confirmado` **não entram** |
| Qualquer KPI financeiro | — | **47 `transferencia`** ficam **fora** de receita **e** despesa |

**Não há divergência Banco→API→Frontend de apresentação** (não há transform que zere um valor não-zero): os cálculos batem com o banco. O problema é **de definição**, não de pipeline de apresentação.

---

## FASE 6 — KPIs zerados (justificativa)

Todos os zeros observados são **reais**, não bugs de query/cache/tenant:
- **Contratos Vigentes/Assinados/Aguardando = 0** → porque 100% dos 72 contratos estão em `rascunho`/`em_analise`. **Justificado por dados**, mas indica que:
  1. o fluxo de status de contratos nunca avançou para assinado/vigente em produção; **ou**
  2. a UI que muda status não está sendo usada.
- **Match Rate / valores ECAD** podem zerar se o container não recebe execuções — depende do módulo de monitoramento (não há dados de execução verificados aqui).
- ⚠️ **Mismatch de vocabulário:** o frontend conta status como `assinado`, `vigente`, `aguardando_assinatura` que **não existem** nos dados atuais → esses cards são **estruturalmente sempre 0** com os dados de hoje.

---

## FASE 7 — Multi-tenancy

- KPIs **não** têm query própria: herdam o escopo de tenant dos **endpoints de lista** (protegidos por `TenantGuard` + RLS `FORCE`, ver [[rls-rollout]]). Portanto **não há risco adicional de vazamento cross-tenant específico de KPI**.
- Risco inverso (esconder dados válidos): se a lista vier vazia por contexto de tenant/RLS mal setado, **todos** os KPIs da página zeram juntos. Como as contagens reais acima retornam valores > 0 em prod (via owner), o RLS não está zerando indevidamente no nível de dados; a validação definitiva por-tenant exige app logado.
- **Observação:** como a agregação é no cliente, o browser recebe a **lista completa do tenant** (todas as linhas) para contar — ver FASE 8.

---

## FASE 8 — Performance

| Item | Severidade | Detalhe |
|---|---|---|
| Agregação 100% no frontend | **MÉDIO→ALTO** | KPIs deveriam ter endpoint agregado (`COUNT/SUM` no Postgres). Hoje o Dashboard baixa **7 listas completas** (`useMetrics`) só para contar. |
| `useMetrics` map O(artistas × lançamentos) + O(artistas × projetos) | **MÉDIO** | `useMetrics.ts:228-229` faz `.filter` por artista dentro do `.map` → quadrático (hoje ~105×N, aceitável; escala mal). |
| Sem paginação para totais | **MÉDIO** | Totais exigem a lista inteira; com paginação nos endpoints, os KPIs ficariam incorretos se a lista vier paginada. |
| Lógica duplicada (D4) | **BAIXO→MÉDIO** | dobra custo de manutenção e risco de divergência. |
| Refetch | **BAIXO** | react-query com cache; sem N+1 de rede evidente (uma chamada por lista). |

---

## FASE 9 — Problemas Críticos (lista priorizada) e Correções

1. **[CRÍTICO] Unificar "contrato ativo/vigente"** (D1). Criar um único predicado compartilhado (ex.: `isContratoVigente(c)`) e usá-lo em Dashboard, Contratos e CRM. Decisão de negócio necessária: "vigente" = por status, por data, ou ambos?
2. **[CRÍTICO] "Receita Mensal" do Financeiro** (D2): ou aplicar filtro do mês corrente (para bater com o rótulo), ou renomear para "Receita (paga) total". Unificar janela com o Dashboard.
3. **[CRÍTICO] `transferencia` invisível**: 47 transações reais fora de qualquer KPI financeiro. Definir se entram (e onde) — hoje o Financeiro dá uma visão incompleta do caixa.
4. **[CRÍTICO] Unificar "artistas com contrato/ativos"** (D3): escolher fonte única (contratos ativos reais **ou** FK `contrato_id`) e reusar entre Dashboard e Artistas.
5. **[ALTO] `receita/confirmado` (4) não conta como paga**: incluir `confirmado` em "recebido/pago" se for a semântica de negócio.
6. **[ALTO] Mismatch de vocabulário de status**: alinhar os conjuntos de status do frontend ao vocabulário real (ou normalizar no backend), senão cards ficam sempre 0.
7. **[MÉDIO] Extrair helper financeiro único** (D4) e mover agregações pesadas para o backend (endpoints `COUNT/SUM`).
8. **[INFO] Marketing**: KPIs simulados/in-memory por decisão de projeto ([[go-live-state]]) — não são dados reais; sinalizar isso na UI para não confundir com métricas de produção.

### Já corrigido nesta rodada de auditoria
- **Contratos** (`Contratos.tsx`): KPIs reescritos para **status-based** + card "Em Análise" + uso de `assinado_em` (antes contava por datas/ano, ignorando status). Typecheck web PASS.
- **RightsKPICards**: removidos **5 trends fabricados** ("+8,4% vs. mês anterior" hardcoded).
- **AdminDashboard**: trends falsos + valores 0 placeholders removidos (agora só métricas reais).

---

## Evidências (comandos)

```
# READ-ONLY em produção (iundcoubyaiwzqyytvdr) — apenas contagens:
contracts by status → rascunho=66, em_analise=6 (total 72)
artists by status   → em_negociacao=79, ativo=26 (total 105)
transactions        → transferencia/pendente=47, receita/pago=21, despesa/pago=9,
                       receita/pendente=8, receita/confirmado=4
definição divergente "ativo": pagina_vigentes=0 vs dashboard_ativos=0 (ambas 0 hoje, mas regras distintas)

# Frontend (grep/leitura):
useMetrics.ts:170  Dashboard contratosAtivos = status='ativo' & data-no-intervalo
Contratos.tsx:154  Página Vigentes = status ∈ {vigente,ativo}
useMetrics.ts:191  Dashboard Receita = últimos 30 dias
Financeiro.tsx:43  Financeiro Receita = sem filtro de data
apps/api/src/modules → sem controller de métricas/dashboard
```

**Produção não foi alterada (somente SELECT de contagens). Nenhuma evidência fabricada.**
