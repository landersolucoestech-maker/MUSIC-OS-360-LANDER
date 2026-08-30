# Feature Backlog

## Governança de provedores externos (2026-08-23) — FEITO

`GET /integrations/providers` é a fonte de verdade do estado de cada **provedor externo**,
derivado pelo backend a partir de dados reais (env de plataforma + credenciais do tenant/OAuth +
saúde da última chamada) e exposto como `ExternalProviderStatus`
(`dependency_not_met` / `available_not_connected` / `connected` / `requires_reauth` /
`provider_error`) em `@music-os-360/types`.

- Catálogo: `apps/api/src/modules/integrations/governance/external-providers.catalog.ts`.
- **Não** é catálogo de recursos da plataforma nem feature flags. Módulos internos e
  infraestrutura (IA interna, PostHog/Sentry, BullMQ/jobs, storage/uploads, financeiro/CRM/
  tickets/projetos internos, infra OAuth) estão explicitamente fora — há teste que trava isso.
- Streaming individual **não** volta como integração configurável; o Soundcharts é o provedor
  governado para métricas de plataforma. Também travado por teste.
- Fora do catálogo por não terem adapter de backend: **UBC, ECAD, NFe** (hooks são stubs
  desligados) e **Clicksign**. Governá-los sugeriria que bastam credenciais — o que é falso.
  Continuam como pendências reais abaixo.
- O frontend ramifica pelo enum (`useExternalProviders`), nunca por texto humano. O badge passou
  a distinguir "Indisponível", "Reconexão necessária" e "Erro no provedor", que antes eram os
  três colapsados em "Desconectado".



Auditado em: 2026-05-20 (grupos/prioridades preservados; ver nota de proveniência abaixo).

> **Regra**: implementar cada item como uma branch nova a partir de `dev`, passando pelo PR checklist normal. Nenhum destes itens tem código-fonte recuperável hoje — são ideias de feature a reimplementar do zero.

> **Nota de proveniência**: esta lista documentava originalmente um conjunto de branches de sessões de agente (antigo fluxo de desenvolvimento) que já não existem — nem localmente, nem no remoto. Não há commits para recuperar ou portar; os identificadores dessas branches foram substituídos por IDs sequenciais neutros (`BACKLOG-NNN`). O conteúdo de cada item (a ideia de feature) é preservado abaixo.

---

## Grupo 1 — Contract Signing (Clicksign / DocuSign) — ATIVO

**Correção de rota (2026-08-23)**: uma revisão anterior nesta mesma data marcou este grupo como
OBSOLETO e removeu `ClicksignConfigDialog.tsx`. Essa decisão foi **revogada**: implementação
parcial não é feature inexistente. O arquivo foi restaurado (idêntico ao HEAD) e o grupo volta a
ser backlog ativo.

O "Decision Gate item 13" citado em `useSigningProviders.ts` apoiava-se em uma evidência
incorreta — que `signing.adapter.ts` "sempre falha para os três" provaria que Clicksign/DocuSign
não são reais. Esse adapter falha **também para Autentique** (é um stub de frontend deliberado:
o fluxo real passa pelo backend), então isso nunca foi evidência sobre a realidade de nenhum
provedor. O estado real, verificado no código:

- **Autentique** — provedor real e completo. `apps/api/src/modules/integrations/autentique/`
  (service 422 linhas: `sendForSignature`, `handleWebhook`, `configure`, credenciais
  criptografadas em `IntegrationEntity`, timeout/retry/dead-letter), `SendForSigningDialog.tsx`,
  webhook → evento `CONTRACT_SIGNED`.
- **DocuSign** — **COMPLETO (2026-08-23)**. O OAuth já existia
  (`integrations.controller.ts:283-323`); o adapter de assinatura foi implementado em
  `apps/api/src/modules/integrations/docusign/` (service + controller + spec), espelhando o
  AutentiqueService: criação de envelope v2.1, resolução de `account_id`/`base_uri` via
  `/oauth/userinfo` (cacheada no metadata da OAuthConnection), webhook Connect com HMAC-SHA256
  base64 sobre o raw body, ingest idempotente via `WebhookService`, resolução de tenant por
  leitura administrativa + `runInTenantContext`, e emissão de `CONTRACT_SENT_FOR_SIGNATURE` /
  `CONTRACT_SIGNED`. Selecionável no `SendForSigningDialog`. Requer
  `DOCUSIGN_WEBHOOK_SECRET` + credenciais reais para operar de facto.
- **Clicksign** — UI real (`ClicksignConfigDialog.tsx` + `useClicksign.ts`), porém **sem nenhum
  backend** em `apps/api/src`. `useClicksign.ts` é hoje um stub honesto que reporta
  `connected: false` (a versão anterior fabricava `connected: true` via sessionStorage — isso
  sim era desonesto e foi corretamente removido). Falta o módulo de backend inteiro.

Nenhum dos dois deve ser reexposto em `useSigningProviders` antes que o backend correspondente
seja real — expor um provedor selecionável que não entrega seria fabricar funcionalidade.

| ID | Feature | Status |
|----|---------|--------|
| `BACKLOG-001` | Dialogs de configuração Clicksign e DocuSign | Clicksign: dialog restaurado, aguarda backend. DocuSign: conecta via OAuth (`/integrations/oauth/status?platform=docusign`), sem dialog dedicado necessário |
| `BACKLOG-002` | Badge de plataforma de assinatura em cada contrato | Existe (`SigningPlatformBadge.tsx`); revalidar rótulo para DocuSign agora que há 2 provedores reais |
| `BACKLOG-003` | Wire Clicksign e DocuSign no fluxo de assinatura | **DocuSign: FEITO** (2026-08-23) — `signing.service.ts` roteia por provedor e o dialog expõe os dois. Clicksign: pendente, exige o módulo de backend completo |

---

## Grupo 2 — ECAD Catalog

**Prioridade**: Alta — funcionalidade core de catalog

| ID | Feature |
|----|---------|
| `BACKLOG-004` | Badge de status ECAD na lista de obras |
| `BACKLOG-005` | Badge de status ECAD na lista de fonogramas |
| `BACKLOG-006` | Filtro por status ECAD na lista de fonogramas |
| `BACKLOG-007` | Filtro por status ECAD na lista de obras (handle vazio/whitespace) |
| `BACKLOG-008` | Preenchimento em lote de códigos ECAD com error handling |

**O que fazer**: Criar branch `feat/ecad-catalog-enhancements` a partir de `dev`.

---

## Grupo 3 — Rights Monitoring

**Prioridade**: Alta — módulo de monitoramento ECAD

| ID | Feature |
|----|---------|
| `BACKLOG-009` | Página de detalhe de execução com timeline ECAD (#595) |
| `BACKLOG-010` | Conectar execuções com ISRC/obra real do catalog |
| `BACKLOG-011` | Filtro por data, artista e exportação XLSX na tabela de execuções |
| `BACKLOG-012` | Testes automatizados: modal de detalhe + catalog lookup |

**O que fazer**: Criar branch `feat/rights-monitoring-v2` a partir de `dev`.

---

## Grupo 4 — Integrations & Streaming Platforms — JÁ IMPLEMENTADO

**Status real (verificado 2026-08-23)**: Ambos os itens já existem no código atual. Google Drive
não aparece mais na página de integrações. Todos os 5 dialogs de configuração existem e estão
wired (`SpotifyConfigDialog.tsx`, `YouTubeConfigDialog.tsx`, `DeezerConfigDialog.tsx`,
`SoundCloudConfigDialog.tsx`, `AppleMusicConfigDialog.tsx`, cada um referenciado pela página de
integrações). Não confirmado nesta verificação: se o round-trip OAuth de cada provedor está
funcional ponta a ponta com credenciais reais (fora do escopo de uma verificação sem acesso a
essas credenciais).

| ID | Feature | Status |
|----|---------|--------|
| `BACKLOG-013` | Página de integrações reorganizada, remove Google Drive | Feito |
| `BACKLOG-014` | Dialogs de configuração das 5 plataformas | Feito (UI); OAuth end-to-end não verificado nesta passagem |

---

## Grupo 5 — Artist Signup

**Prioridade**: Média — melhoria no fluxo de cadastro

| ID | Feature |
|----|---------|
| `BACKLOG-015` | Formulário de cadastro de artista: múltiplas distribuidoras |
| `BACKLOG-016` | Exibir apenas distribuidoras preenchidas no resumo do step 3 |

**O que fazer**: Criar branch `feat/artist-signup-distribuidoras` a partir de `dev`.

---

## Grupo 6 — Storage & Auth Cleanup

**Prioridade**: Média — relacionado à migração Supabase (Phase 2 roadmap)

| ID | Feature |
|----|---------|
| `BACKLOG-017` | Limpar chaves legadas de credenciais do sessionStorage/localStorage na inicialização |
| `BACKLOG-018` | Sistema de migração versionada para limpeza do browser storage (#658) |

**O que fazer**: Criar branch `feat/storage-cleanup-migration` a partir de `dev`. Avaliar compatibilidade com remoção do MOCK_MODE (Phase 2 do roadmap).

---

## Grupo 7 — Server-side Zod Validation (Phase 5 Roadmap)

**Prioridade**: Alta — alinhado diretamente com Phase 5 do roadmap

| ID | Feature |
|----|---------|
| `BACKLOG-019` | Validação Zod server-side para endpoints POST, PUT e PATCH de transactions + documentação |

**O que fazer**: Criar branch `feat/zod-server-validation` a partir de `dev`. Escopo maior — revisar cuidadosamente antes de implementar.

---

## Grupo 8 — Frontend Tests (Phase 6 Roadmap)

**Prioridade**: Alta — alinhado diretamente com Phase 6 do roadmap

| ID | Feature |
|----|---------|
| `BACKLOG-020` | Testes unitários para regras de negócio do formulário de transação + scripts de teste no web app |

**O que fazer**: Criar branch `feat/frontend-unit-tests` a partir de `dev`.

---

## Grupo 9 — Accounting Refactor

**Prioridade**: Média

| ID | Feature |
|----|---------|
| `BACKLOG-021` | NotaFiscalFormModal: arquitetura modular |

**O que fazer**: Criar branch `feat/nota-fiscal-modal-refactor` a partir de `dev`.

---

## Grupo 10 — Marketing / Calendar

**Prioridade**: Baixa

| ID | Feature |
|----|---------|
| `BACKLOG-022` | CalendarCards com engagement stats reais de publicações |

**O que fazer**: Criar branch `feat/calendar-engagement-stats` a partir de `dev`.

---

## Grupo 11 — Social Media Publishing

**Prioridade**: Baixa — feature avançada, avaliar escopo

| ID | Feature |
|----|---------|
| `BACKLOG-023` | Conectar publicação real Instagram, TikTok e YouTube quando integrações estiverem ativas |

**O que fazer**: Avaliar se o escopo está dentro das integrações previstas antes de implementar. Escopo maior — mais complexo.

---

## Grupo 12 — Contract Template UI

**Prioridade**: Baixa (verificar se já incorporado)

| ID | Feature |
|----|---------|
| `BACKLOG-024` | Layout lado a lado no template de contrato (Task #86) |

**O que fazer**: Verificar se já foi incorporado nos commits recentes de contratos em `dev`. Pode ser descartada se sim.

---

## Status

| ID | Grupo | Prioridade | Status |
|----|-------|-----------|--------|
| BACKLOG-001 | Contract Signing | Alta | Obsoleto (verificado 2026-08-23 — ver Grupo 1) |
| BACKLOG-002 | Contract Signing | Alta | Reavaliar para Autentique (verificado 2026-08-23) |
| BACKLOG-003 | Contract Signing | Alta | Obsoleto (verificado 2026-08-23 — ver Grupo 1) |
| BACKLOG-019 | Zod Validation | Alta | Backlog |
| BACKLOG-020 | Frontend Tests | Alta | Backlog |
| BACKLOG-012 | Rights Monitoring | Alta | Backlog |
| BACKLOG-009 | Rights Monitoring | Alta | Backlog |
| BACKLOG-010 | Rights Monitoring | Alta | Backlog |
| BACKLOG-011 | Rights Monitoring | Alta | Backlog |
| BACKLOG-004 | ECAD Catalog | Alta | Backlog |
| BACKLOG-005 | ECAD Catalog | Alta | Backlog |
| BACKLOG-006 | ECAD Catalog | Alta | Backlog |
| BACKLOG-007 | ECAD Catalog | Alta | Backlog |
| BACKLOG-008 | ECAD Catalog | Alta | Backlog |
| BACKLOG-015 | Artist Signup | Média | Backlog |
| BACKLOG-016 | Artist Signup | Média | Backlog |
| BACKLOG-013 | Integrations | Média | Feito (verificado 2026-08-23) |
| BACKLOG-014 | Integrations | Média | Feito (UI) — OAuth E2E não verificado (2026-08-23) |
| BACKLOG-017 | Storage Cleanup | Média | Backlog |
| BACKLOG-018 | Storage Cleanup | Média | Backlog |
| BACKLOG-021 | Accounting | Média | Backlog |
| BACKLOG-022 | Marketing | Baixa | Backlog |
| BACKLOG-023 | Social Media | Baixa | Avaliar escopo |
| BACKLOG-024 | Contract UI | Baixa | Verificar se já incorporado |
