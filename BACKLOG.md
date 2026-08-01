# Feature Backlog

Auditado em: 2026-05-20 (grupos/prioridades preservados; ver nota de proveniência abaixo).

> **Regra**: implementar cada item como uma branch nova a partir de `dev`, passando pelo PR checklist normal. Nenhum destes itens tem código-fonte recuperável hoje — são ideias de feature a reimplementar do zero.

> **Nota de proveniência**: esta lista documentava originalmente um conjunto de branches de sessões de agente (antigo fluxo de desenvolvimento) que já não existem — nem localmente, nem no remoto. Não há commits para recuperar ou portar; os identificadores dessas branches foram substituídos por IDs sequenciais neutros (`BACKLOG-NNN`). O conteúdo de cada item (a ideia de feature) é preservado abaixo.

---

## Grupo 1 — Contract Signing (Clicksign / DocuSign)

**Prioridade**: Alta — feature core para fluxo de contratos

| ID | Feature |
|----|---------|
| `BACKLOG-001` | Dialogs de configuração Clicksign e DocuSign na página de integrações |
| `BACKLOG-002` | Badge de plataforma de assinatura em cada contrato + atualização de dados mock |
| `BACKLOG-003` | Wire Clicksign e DocuSign no fluxo de assinatura de contrato + local de storage de arquivo |

**O que fazer**: Criar branch `feat/contract-signing-integration` a partir de `dev`, implementar as 3 features em ordem (001 → 002 → 003).

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
| `BACKLOG-011` | Filtro por data, artista e exportação CSV na tabela de execuções |
| `BACKLOG-012` | Testes automatizados: modal de detalhe + catalog lookup |

**O que fazer**: Criar branch `feat/rights-monitoring-v2` a partir de `dev`.

---

## Grupo 4 — Integrations & Streaming Platforms

**Prioridade**: Média — configuração de plataformas de streaming

| ID | Feature |
|----|---------|
| `BACKLOG-013` | Página de integrações reorganizada por categoria, remove Google Drive |
| `BACKLOG-014` | Dialogs de configuração: Spotify, YouTube, Deezer, SoundCloud, Apple Music |

**O que fazer**: Criar branch `feat/integrations-streaming-config` a partir de `dev`.

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
| BACKLOG-001 | Contract Signing | Alta | Backlog |
| BACKLOG-002 | Contract Signing | Alta | Backlog |
| BACKLOG-003 | Contract Signing | Alta | Backlog |
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
| BACKLOG-013 | Integrations | Média | Backlog |
| BACKLOG-014 | Integrations | Média | Backlog |
| BACKLOG-017 | Storage Cleanup | Média | Backlog |
| BACKLOG-018 | Storage Cleanup | Média | Backlog |
| BACKLOG-021 | Accounting | Média | Backlog |
| BACKLOG-022 | Marketing | Baixa | Backlog |
| BACKLOG-023 | Social Media | Baixa | Avaliar escopo |
| BACKLOG-024 | Contract UI | Baixa | Verificar se já incorporado |
