# Feature Backlog — Branches subrepl-*

Auditado em: 2026-05-20  
Branch base atual: `feat/supabase-auth`  
Critério de reintegração: cherry-pick ou reimplementação manual (todas estão 42–575 commits atrás do HEAD).

> **Regra**: Não fazer merge direto de nenhuma branch subrepl-* em main. Reimplementar a feature em uma branch nova a partir de `feat/supabase-auth`, passando pelo PR checklist.

---

## Grupo 1 — Contract Signing (Clicksign / DocuSign)

**Prioridade**: Alta — feature core para fluxo de contratos

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-q8g4xsgz` | 1 | Dialogs de configuração Clicksign e DocuSign na página de integrações |
| `subrepl-upmlui2l` | 3 | Badge de plataforma de assinatura em cada contrato + atualização de dados mock |
| `subrepl-e5jplqf9` | 4 | Wire Clicksign e DocuSign no fluxo de assinatura de contrato + local de storage de arquivo |

**O que fazer**: Criar branch `feat/contract-signing-integration` a partir de `feat/supabase-auth`, reimplementar as 3 features em ordem (q8g4xsgz → upmlui2l → e5jplqf9).

---

## Grupo 2 — ECAD Catalog

**Prioridade**: Alta — funcionalidade core de catalog

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-aiyr3su8` | 1 | Badge de status ECAD na lista de obras |
| `subrepl-a0mijmfo` | 1 | Badge de status ECAD na lista de fonogramas |
| `subrepl-48mt2ag0` | 1 | Filtro por status ECAD na lista de fonogramas |
| `subrepl-mgpejyg1` | 2 | Filtro por status ECAD na lista de obras (handle vazio/whitespace) |
| `subrepl-t4rhp45f` | 2 | Preenchimento em lote de códigos ECAD com error handling |

**O que fazer**: Criar branch `feat/ecad-catalog-enhancements` a partir de `feat/supabase-auth`.

---

## Grupo 3 — Rights Monitoring

**Prioridade**: Alta — módulo de monitoramento ECAD

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-3betyet5` | 2 | Página de detalhe de execução com timeline ECAD (#595) |
| `subrepl-tvi8lmhc` | 2 | Conectar execuções com ISRC/obra real do catalog |
| `subrepl-asapacyj` | 3 | Filtro por data, artista e exportação CSV na tabela de execuções |
| `subrepl-r83ta6w1` | 3 | Testes automatizados: modal de detalhe + catalog lookup |

**O que fazer**: Criar branch `feat/rights-monitoring-v2` a partir de `feat/supabase-auth`.

---

## Grupo 4 — Integrations & Streaming Platforms

**Prioridade**: Média — configuração de plataformas de streaming

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-zr4rm8cu` | 1 | Página de integrações reorganizada por categoria, remove Google Drive |
| `subrepl-bd341rfr` | 4 | Dialogs de configuração: Spotify, YouTube, Deezer, SoundCloud, Apple Music |

**O que fazer**: Criar branch `feat/integrations-streaming-config` a partir de `feat/supabase-auth`.

---

## Grupo 5 — Artist Signup

**Prioridade**: Média — melhoria no fluxo de cadastro

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-4vpask7l` | 1 | Formulário de cadastro de artista: múltiplas distribuidoras |
| `subrepl-bym04bmb` | 2 | Exibir apenas distribuidoras preenchidas no resumo do step 3 |

**O que fazer**: Criar branch `feat/artist-signup-distribuidoras` a partir de `feat/supabase-auth`.

---

## Grupo 6 — Storage & Auth Cleanup

**Prioridade**: Média — relacionado à migração Supabase (Phase 2 roadmap)

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-fkmza3eb` | 1 | Limpar chaves legadas de credenciais do sessionStorage/localStorage na inicialização |
| `subrepl-u6s4k3bu` | 1 | Sistema de migração versionada para limpeza do browser storage (#658) |

**O que fazer**: Criar branch `feat/storage-cleanup-migration` a partir de `feat/supabase-auth`. Avaliar compatibilidade com remoção do MOCK_MODE (Phase 2 do roadmap).

---

## Grupo 7 — Server-side Zod Validation (Phase 5 Roadmap)

**Prioridade**: Alta — alinhado diretamente com Phase 5 do roadmap

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-hu4gmyxy` | 11 | Validação Zod server-side para endpoints POST, PUT e PATCH de transactions + documentação |

**O que fazer**: Criar branch `feat/zod-server-validation` a partir de `feat/supabase-auth`. Tem 11 commits — revisar cuidadosamente antes de reimplementar.

---

## Grupo 8 — Frontend Tests (Phase 6 Roadmap)

**Prioridade**: Alta — alinhado diretamente com Phase 6 do roadmap

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-i3hcqiwh` | 2 | Testes unitários para regras de negócio do formulário de transação + scripts de teste no web app |

**O que fazer**: Criar branch `feat/frontend-unit-tests` a partir de `feat/supabase-auth`.

---

## Grupo 9 — Accounting Refactor

**Prioridade**: Média

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-ynmkoezp` | 3 | NotaFiscalFormModal: arquitetura modular |

**O que fazer**: Criar branch `feat/nota-fiscal-modal-refactor` a partir de `feat/supabase-auth`.

---

## Grupo 10 — Marketing / Calendar

**Prioridade**: Baixa

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-ck008ff5` | 2 | CalendarCards com engagement stats reais de publicações |

**O que fazer**: Criar branch `feat/calendar-engagement-stats` a partir de `feat/supabase-auth`.

---

## Grupo 11 — Social Media Publishing

**Prioridade**: Baixa — feature avançada, avaliar escopo

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-45z13hnk` | 13 | Conectar publicação real Instagram, TikTok e YouTube quando integrações estiverem ativas |

**O que fazer**: Avaliar se o escopo está dentro das integrações previstas antes de reimplementar. 13 commits — mais complexo.

---

## Grupo 12 — Contract Template UI

**Prioridade**: Baixa (já no HEAD via `feat/supabase-auth`)

| Branch | Commits únicos | Feature |
|--------|---------------|---------|
| `subrepl-565dy2jg` | 1 | Layout lado a lado no template de contrato (Task #86) |

**O que fazer**: Verificar se já foi incorporado nos commits recentes de contratos no `feat/supabase-auth`. Pode ser descartada.

---

## Status das branches

| Branch | Grupo | Prioridade | Status |
|--------|-------|-----------|--------|
| subrepl-q8g4xsgz | Contract Signing | Alta | Backlog |
| subrepl-upmlui2l | Contract Signing | Alta | Backlog |
| subrepl-e5jplqf9 | Contract Signing | Alta | Backlog |
| subrepl-hu4gmyxy | Zod Validation | Alta | Backlog |
| subrepl-i3hcqiwh | Frontend Tests | Alta | Backlog |
| subrepl-r83ta6w1 | Rights Monitoring | Alta | Backlog |
| subrepl-3betyet5 | Rights Monitoring | Alta | Backlog |
| subrepl-tvi8lmhc | Rights Monitoring | Alta | Backlog |
| subrepl-asapacyj | Rights Monitoring | Alta | Backlog |
| subrepl-aiyr3su8 | ECAD Catalog | Alta | Backlog |
| subrepl-a0mijmfo | ECAD Catalog | Alta | Backlog |
| subrepl-48mt2ag0 | ECAD Catalog | Alta | Backlog |
| subrepl-mgpejyg1 | ECAD Catalog | Alta | Backlog |
| subrepl-t4rhp45f | ECAD Catalog | Alta | Backlog |
| subrepl-4vpask7l | Artist Signup | Média | Backlog |
| subrepl-bym04bmb | Artist Signup | Média | Backlog |
| subrepl-zr4rm8cu | Integrations | Média | Backlog |
| subrepl-bd341rfr | Integrations | Média | Backlog |
| subrepl-fkmza3eb | Storage Cleanup | Média | Backlog |
| subrepl-u6s4k3bu | Storage Cleanup | Média | Backlog |
| subrepl-ynmkoezp | Accounting | Média | Backlog |
| subrepl-ck008ff5 | Marketing | Baixa | Backlog |
| subrepl-45z13hnk | Social Media | Baixa | Avaliar escopo |
| subrepl-565dy2jg | Contract UI | Baixa | Verificar se já incorporado |
