# Simulação de Perfis (Validação Visual de RBAC) — MOCK_MODE

> Ferramenta **dev-only** para validar visualmente como o sistema aparece para
> cada perfil de usuário/setor (menus, sidebar, escopo). **Não é segurança
> real** — a fonte de verdade de permissões será o backend (RBAC + tenant
> isolation). Em produção (`MOCK_MODE=false`) o simulador é ignorado.
>
> Implementação: `apps/web/src/shared/dev/devProfiles.ts` (mapa + store),
> `DevProfileSwitcher.tsx` (seletor) e filtro em
> `apps/web/src/shared/components/layout/AppSidebar.tsx`.

## Como usar
1. Rodar o frontend em dev (MOCK_MODE).
2. No topo da sidebar, usar o seletor **"Perfil (simulação)"** (borda âmbar).
3. A navegação (sidebar + itens admin + Configurações) passa a refletir o
   escopo do perfil escolhido. A escolha persiste em `localStorage`.

## 1. Mapa de perfis
| Perfil | Descrição |
|---|---|
| Admin / Dono | Acesso completo. |
| Artista | Apenas o que é dele (projetos, lançamentos, agenda, conteúdos, métricas). |
| Marketing | Campanhas, calendário, tarefas, métricas, planejamento, briefing. |
| Financeiro | Receitas, despesas, transações, notas fiscais, relatórios. |
| Design | Tarefas de design, capas, artes, assets de referência, aprovações. |
| Audiovisual | Tarefas AV (teaser/reels/shorts/clipe), assets, aprovações. |
| Administrativo / Direitos Autorais | Obras, fonogramas, splits, contratos, ISRC/ISWC, registros. |
| Atendimento / Suporte | Tickets, clientes/artistas vinculados, histórico. |

## 2. Módulos visíveis por perfil (sidebar)
| Perfil | Itens de menu visíveis |
|---|---|
| Admin / Dono | **Tudo** + Auditoria + Painel Admin + Configurações |
| Artista | Dashboard, Catálogo→Projetos, Lançamentos→Distribuição, Agenda, Marketing→(Calendário, Métricas) |
| Marketing | Dashboard, Agenda, Marketing→(Visão Geral, Campanhas, Calendário, Tarefas, Métricas, Briefing, IA Criativa) |
| Financeiro | Dashboard, Financeiro→(Transações, Contabilidade, Nota Fiscal), Relatórios |
| Design | Dashboard, Marketing→Tarefas *(ver lacuna abaixo)* |
| Audiovisual | Dashboard, Audiovisual, Marketing→Tarefas |
| Administrativo / Direitos | Dashboard, Catálogo→(Obras & Fonogramas, Monitoramento, Licenciamento, Takedowns), Contratos |
| Atendimento / Suporte | Dashboard, Suporte, CRM, MusicChat |

> Perfis não-admin **não** veem: Configurações, Auditoria, Painel Admin (gateados).

## 3. Ajustes visuais aplicados
- Seletor de perfil no topo da sidebar (somente MOCK_MODE).
- `AppSidebar` filtra `NAV_ITEMS` (itens e filhos de grupos) pelo `allow` do perfil, **somando-se** ao filtro de `featureFlag` já existente.
- Itens admin (Auditoria/Painel Admin) e atalho Configurações respeitam o perfil.
- Mudança não destrutiva e isolada (dev): quando `MOCK_MODE=false`, nada muda.

## 4. Telas simuladas
Não foram criadas telas novas — a "simulação" reusa as páginas existentes
(já populadas por mock), tornando visíveis apenas as rotas do perfil. Assim a
experiência por setor é validada com as telas reais do produto.

## 5. Permissões futuras necessárias no backend (RBAC real)
A simulação visual deverá ser substituída por RBAC + tenant isolation no
backend. Sugestão de permissões por módulo (alinhar com `TenantModuleKey`):

| Perfil | Permissões de leitura/escrita sugeridas (backend) |
|---|---|
| Admin/Dono | `*` (todos os módulos) + admin/billing/settings |
| Artista | `projects:read(own)`, `releases:read(own)`, `events:read(own)`, `marketing.contents:read(own)`, `analytics:read(own)`, `assets:read(own)` — **escopo "own"** (filtro por `artista_id`) |
| Marketing | `marketing.*`, `events:read` |
| Financeiro | `accounting.*`, `invoices.*`, `transactions.*`, `reports.read` |
| Design | `tasks(design):*`, `assets:read/write`, `approvals(design)` — **requer módulo/escopo de Design** |
| Audiovisual | `audiovisual.*`, `tasks(av):*`, `assets:read/write`, `approvals(av)` |
| Administrativo/Direitos | `works.*`, `phonograms.*`, `contracts.*`, `registry.*` |
| Suporte | `support.*`, `crm:read`, `conversations.*` |

Observações:
- **Escopo "own" (Artista)** exige filtro por entidade (artista logado) no backend — não só visibilidade de módulo.
- **RBAC por ação** (read/write/approve/delete) além de visibilidade de módulo.

## 6. Pontos onde o frontend ainda depende de mock
- Todo o conteúdo das telas vem de **MOCK_MODE** (mock/localStorage) — ver
  [MAPA_FRONTEND_BACKEND.md](./MAPA_FRONTEND_BACKEND.md).
- O **perfil** é simulado em `localStorage` (não vem de auth real).
- O **escopo "own"** do Artista (ver só os dados dele) **não** está aplicado aos
  dados mock — a simulação cobre **visibilidade de menu/módulo**, não o
  filtro linha-a-linha por artista (isso virá com o backend/RBAC real).

## 7. Lacunas identificadas
- **Design não tem módulo/rota dedicada** hoje (tarefas de design caem em
  Marketing→Tarefas). Avaliar criar superfície de Design (tarefas/aprovações/assets)
  quando a fase permitir.
- "Assets liberados para conteúdo", "uploads de entrega" e "aprovações" por setor
  dependem dos endpoints de assets centrais (backend pronto, sem UI ainda).

## Restrições respeitadas
- Sem segurança real no frontend como fonte de verdade.
- Sem alteração destrutiva (tudo aditivo e dev-only).
- Sem commit.
