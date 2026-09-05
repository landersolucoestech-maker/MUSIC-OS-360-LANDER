# Módulo Support Hub Enterprise

## What & Why
Criar um módulo completo de suporte enterprise — **Support Hub** — totalmente integrado ao ecossistema do MUSIC OS 360. O módulo centraliza tickets, chat ao vivo, base de conhecimento, status do sistema e solicitações em um único hub premium, seguindo a identidade visual existente (azul `#3B82F6`, dark mode, glassmorphism, tipografia Plus Jakarta Sans).

## Done looks like
- Rota `/support` com dashboard principal: "Como podemos ajudar hoje?", KPIs (tickets abertos/resolvidos, SLA médio, tempo de resposta, status do sistema)
- Rotas `/support/tickets`, `/support/tickets/:id`, `/support/chat`, `/support/knowledge`, `/support/status`, `/support/requests` funcionando com lazy loading
- Sidebar com grupo "Support Hub" contendo: Dashboard → Tickets → Chat ao Vivo → Base de Conhecimento → Status do Sistema → Solicitações
- Sistema de tickets enterprise: criar, editar, responder, timeline de histórico, prioridade (low/medium/high/critical), status (open/in_progress/waiting_customer/resolved/closed), SLA deadline, responsável, categoria; drawer lateral fullscreen inspirado no Linear/Intercom
- Badges de status com cores suaves (vermelho, amarelo, azul, verde) e badges de prioridade com glow discreto
- Chat ao vivo com typing indicator, histórico de mensagens, upload de arquivos, emojis — visual estilo Intercom/Discord mas com identidade MUSIC OS 360
- Base de conhecimento com artigos, categorias (Financeiro, Analytics, Distribuição, Contratos, Artistas, Projetos, Usuários, Permissões, Integrações), busca rápida estilo command menu e suporte a markdown
- Página de status com indicadores operational/degraded/maintenance/offline para API, autenticação, uploads, realtime, analytics, financeiro, processamento e banco de dados — visual estilo Vercel/Stripe Status
- Isolamento multi-tenant: todos os tickets, mensagens, artigos e chats carregam/salvam com `tenant_id`
- Visual enterprise: `rounded-2xl`, `backdrop-blur`, `border-white/10`, gradientes escuros, glow azul sutil, skeletons de loading, empty states, animações suaves, responsivo (desktop/tablet/mobile)
- Todo o módulo usa mock data + localStorage no padrão `musicos360_` — sem backend obrigatório

## Out of scope
- Backend real com banco de dados Postgres (tabelas descritas no prompt servem como referência de tipos)
- WebSocket real (simular realtime com polling/estado local)
- Upload de arquivos real para storage externo
- Integração com ferramentas externas (Zendesk, Intercom, etc.)
- IA/automação de respostas

## Steps
1. **Estrutura do módulo** — Criar `client/src/modules/support/` com subpastas `pages/`, `components/`, `hooks/`, `types/`, `data/`; definir interfaces TypeScript centralizadas (Ticket, Message, KnowledgeArticle, SystemStatus, ChatMessage, SupportCategory) com enums de status e prioridade
2. **Rotas e sidebar** — Registrar as 6 rotas em `support.routes.tsx`, importá-las no `App.tsx`, e adicionar o grupo "Support Hub" com seus 6 itens no `AppSidebar.tsx` usando ícones do lucide-react
3. **Dashboard `/support`** — Página principal com hero "Como podemos ajudar hoje?", 6 cards KPI, activity feed e gráfico de tendência de tickets; integrar mock data com localStorage
4. **Sistema de tickets `/support/tickets` e `/support/tickets/:id`** — Listagem com filtros (status, prioridade, categoria), busca e infinite scroll; drawer fullscreen de detalhe com timeline de histórico, formulário de resposta, campos de prioridade/SLA/responsável e badges premium
5. **Chat ao vivo `/support/chat`** — Layout two-pane (lista de chats + painel de mensagens), typing indicator simulado, histórico persistido em localStorage, suporte a emojis e upload simulado
6. **Base de conhecimento `/support/knowledge`** — Grid de categorias, listagem de artigos com busca command-menu, visualização de artigo em markdown renderizado; artigos de mock cobrindo as 9 categorias do domínio
7. **Status do sistema `/support/status`** — Cards de serviço com indicadores coloridos, histórico de incidentes simulado e uptime visual; design inspirado em Vercel/Stripe Status
8. **Polimento visual** — Aplicar glassmorphism (`backdrop-blur`, `bg-white/5`, `border-white/10`), glow azul sutil nos cards críticos, skeletons em todos os carregamentos, empty states ilustrados, animações de entrada (fade/slide suaves), garantir responsividade completa

## Relevant files
- `client/src/App.tsx`
- `client/src/shared/components/layout/AppSidebar.tsx`
- `client/src/app/routes/`
- `client/src/shared/data/mockData.ts`
- `client/src/shared/components/MainLayout.tsx`
- `client/src/index.css`
- `tailwind.config.ts`
