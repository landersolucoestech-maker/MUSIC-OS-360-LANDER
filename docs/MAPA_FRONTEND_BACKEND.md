# Mapa de Dependências Frontend → Backend

> Documento de mapeamento da fase de validação de frontend. NÃO é auditoria
> enterprise final. Objetivo: organizar o que precisa ser conectado ao backend
> real (TypeORM/NestJS) quando os fluxos visuais estiverem validados, sem
> quebrar os fluxos em validação e sem tratar mock como produção.

## Arquitetura de dados (estado atual)

- Switch central em `apps/web/src/shared/lib/env.ts` (`MOCK_MODE`).
  Em build de produção (`import.meta.env.PROD`) o mock é forçado a `false`
  → API HTTP real. Mock é estritamente dev/demo.
- Dois padrões coexistem no frontend:
  - **(A) CRUD core via `api-client`** (`apps/web/src/shared/lib/api-client.ts`):
    já mapeado para endpoints reais; alterna mock/HTTP por `MOCK_MODE`.
  - **(B) Marketing via serviço in-memory** (`createResourceHooks` →
    `marketing.service`): **mock-only hoje**; ainda não chama os controllers
    `/marketing/*` que já existem no backend.

## Tabela de dependências

| Tela / fluxo | Mock hoje? | Endpoint real existente | Falta / a fazer | Observações |
|---|---|---|---|---|
| Artistas, Projetos, Contratos, Transações, Notas Fiscais, Leads, Contatos, RH, Inventário, Licenças, Releases, Shares, Takedowns, Obras/Fonogramas, Regras/Categorias financeiras, ECAD, Detecções, Suporte, Usuários | Sim (padrão A) | `/artists`, `/projects`, `/contracts`, `/transactions`, `/invoices`, `/leads`, `/contacts`, `/hr/*`, `/inventory`, `/licenses`, `/releases`, `/shares`, `/takedowns`, `/works`, `/phonograms`, `/financial-categories`, `/financial-rules`, `/ecad-reports`, `/content-detections`, `/support-tickets`, `/users` | Ligar (`VITE_USE_MOCK=false`) + validar shape | Majoritariamente "flip do flag" |
| Marketing — Campanhas | Sim (padrão B) | `/marketing/campaigns`, `/marketing/campaign-builder` | Wiring B→HTTP; backend precisa de **contexto Empresa/Artista** + **`publishChannels[]`** | Front já multiplataforma |
| Marketing — Calendário de Conteúdo | Sim (padrão B) | `/marketing/contents` | Backend `marketing_content_posts.channel` é **single** → precisa `channels[]`; regra Empresa publica / Artista agenda | Contrato novo p/ multiplataforma |
| Marketing — Briefing / Tarefas / Visão Geral / Métricas | Sim (padrão B) | `/marketing/projects`, `/briefings`, `/analytics` | Wiring B→HTTP | Métricas podem exigir endpoint de agregação |
| Marketing — IA Criativa (skills front) | Sim (prompt-only no front) | `/ai` (ai_jobs) | Mover execução p/ backend `/ai` | Requer API key real |
| Configurações → Automações | Sim (`userSettings`, localStorage) | Parcial: `/users`, `/notifications` | Persistência real de preferências; **automações configuráveis (5.2)** = fase posterior | — |
| Auditoria (AdminAudit) | Sim (`MOCK_AUDIT_LOGS`) | `/audit-logs` | Trocar AdminAudit mock → `/audit-logs` | `useActivityHistory` já consome real |
| Assets centrais / Skill-runs / Release-readiness | Sem tela ainda | **Novos**: `/projects/:id/assets`, `/tasks/:id/assets`, `/assets/:id`, `POST /assets/:id/classify`, `/release-readiness`, `/skill-runs`, `/skill-runs/:id` | UI futura (Conteúdo/Agendamento + histórico) | Backend pronto e testado |
| Integrações (OAuth marketing) | Sim (`useMarketingOAuth`, sessionStorage) | `/integrations/*` + services YouTube/IG/TikTok/Spotify/Google Ads | Fluxo OAuth real (popup/callback) | Depende de credenciais reais |

## Lacunas de endpoint (não existem hoje no backend)

- **Eventos de domínio / "Eventos do Sistema"**: `domain_event_log` sem REST
  (apenas serviço). Falta `GET /system-events` se a UI for exibir.
- **Multiplataforma**: `marketing_content_posts` / `campaigns` precisam de
  `channels[]` + contexto Empresa/Artista (front já preparado).
- **Central Analítica de marketing**: possível endpoint de agregação (hoje mock).
- **Automações configuráveis (5.2)**: `workflow_rules` / SLA / responsáveis por
  tenant — fase posterior.

## Esforço de integração (estimativa)

- **Baixo:** fluxos core (padrão A) — "flip do `MOCK_MODE`" + ajuste de shape.
- **Médio:** Marketing (padrão B) — trocar serviço in-memory por chamadas HTTP
  nos hooks `useMarketing*` (contratos já existem nos controllers).
- **Pronto para consumir:** endpoints novos de assets/skills/release-readiness.

## Restrições da fase

- Não tratar mock como implementação de produção.
- Não criar dependência definitiva de mock.
- Conectar cada fluxo ao backend real (TypeORM/NestJS) respeitando Domain
  Events, BullMQ, RBAC, tenant isolation, logs e persistência — só após
  validação do comportamento no frontend.
