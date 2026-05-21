# Roadmap GHL Music OS 360

## Fase 0 concluida nesta base

- Supabase Auth e a fonte unica de autenticacao.
- O backend valida JWT por JWKS publico do Supabase.
- O tenant ativo vem de `app_metadata.org_id`.
- RBAC vem de `org_members.role`.
- O identificador do usuario autenticado e `org_members.auth_user_id`.
- Nomes legados de auth foram removidos do codigo, schema, docs, lockfiles e anexos historicos.

## Proximas fases

1. Fundacao SaaS: revisar users, organizations, tenants, activity logs e notifications.
2. CRM musical canonico: contacts, companies, artists, tags, custom fields e timeline.
3. Pipeline: opportunities, pipelines, stages e kanban.
4. Conversas: conversations, messages, templates e atribuicao.
5. Automacoes: workflows, triggers, conditions, actions, queues e logs.
6. Campanhas/calendario: campanhas vinculadas a releases, eventos, tarefas e lembretes.
7. Paginas/formularios: captura de leads e origem.
8. Relatorios/IA: dashboards operacionais e IA assistiva.

## Regra de produto

Nao implementar white-label, revenda SaaS, painel de agencia, dominio por cliente ou marketplace de revendedores.

## Fase 1 iniciada

- Criado endpoint `GET /api/v1/auth/context` como contrato canonico de contexto SaaS.
- O contexto retorna usuario autenticado, workspace ativo, membership, role, permissoes RBAC e claims Supabase.
- O frontend agora sincroniza `TenantProvider` com `/auth/context` quando ha sessao real.
- A migration de nomes Supabase Auth foi registrada no `DatabaseModule`.
- Superficie de produto white-label removida de planos e feature flags; permanece apenas como item explicitamente fora de escopo.
