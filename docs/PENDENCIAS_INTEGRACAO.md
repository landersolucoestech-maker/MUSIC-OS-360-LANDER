# Pendências Futuras — Integração Frontend → Backend

> Backlog de integração registrado durante a fase de **validação de frontend**.
> NÃO iniciar agora. Retomar quando os fluxos do frontend estiverem
> estabilizados. Sem commit, sem Fatia 6, sem auditoria enterprise final nesta fase.
>
> Referências: [CONTRATOS_API.md](./CONTRATOS_API.md) · [MAPA_FRONTEND_BACKEND.md](./MAPA_FRONTEND_BACKEND.md)

## 1. AdminAudit → `/audit-logs` (primeiro candidato, baixo risco)
- Provável **primeiro fluxo** a ser fiado quando a integração for liberada.
- Trocar `MOCK_AUDIT_LOGS` (em `AdminAudit`) por `GET /audit-logs` (já existente, com filtros + paginação). Detalhe com diff restrito a admin/owner.

## 2. Marketing — Campanhas e Calendário de Conteúdo (exigem ajuste de contrato)
Antes da fiação, alinhar backend ao comportamento já validado no frontend:
- **`platforms[]`** (Campanhas) — seleção multiplataforma.
- **`channels[]`** (Calendário de Conteúdo) — multiplataforma (backend hoje é `channel` single).
- **Contexto exclusivamente Empresa/Artista** (remover `projeto_musical` legado do contrato).
- **Regra Empresa publica / Artista apenas agenda** — enforcement server-side.
- Migrar os hooks `useMarketing*` do serviço in-memory (mock) para os controllers `/marketing/*`.

## 3. Integrações OAuth reais (dependem de credenciais)
- Rotas já existem (`/integrations/oauth/init`, `/oauth/exchange`, callbacks por plataforma).
- Fiação real depende de **credenciais/segredos OAuth** por provedor (Meta/Instagram, TikTok, YouTube, Spotify, Google Ads), indisponíveis no ambiente atual.

## 4. Assets centrais, Skill-runs e Release Readiness (backend pronto, sem UI agora)
- Backend entregue e testado (Fatias 1–5): `/projects/:id/assets`, `/tasks/:id/assets`, `/assets/:id`, `POST /assets/:id/classify`, `/skill-runs`, `/skill-runs/:id`, `/release-readiness`.
- **Não criar UI nova agora.** Consumir quando a fase de integração começar (Conteúdo/Agendamento, "Histórico de Execuções", checklist de distribuição).

## Restrições da fase (registradas)
- Não iniciar fiação frontend → backend.
- Não detalhar schemas campo a campo (contratos podem mudar enquanto o front valida).
- Não avançar para commit, Fatia 6 ou auditoria enterprise final.
- Foco atual: ajustar e estabilizar o frontend.
