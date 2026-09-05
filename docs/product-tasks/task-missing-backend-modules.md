# Backend — 5 Módulos Ausentes (Inventory, Licensing, Monitoring, Rules, Contents)

## What & Why
O frontend tem módulos completos para inventory, licensing, monitoring e outros, mas o backend não tem os endpoints correspondentes. Sem backend real, o frontend permanece em modo mock para essas áreas mesmo quando `MOCK_MODE=false` — as páginas carregam dados fictícios e qualquer mutação (criar, editar, excluir) não persiste. Isso impede qualquer uso real em produção das funcionalidades de inventário físico, licenciamento de obras, monitoramento de plays e conteúdos de marketing/briefing.

Nota: `/contents` no contexto do documento refere-se a conteúdos/monitorizações (content-detections existe, mas falta endpoint REST CRUD). `/rules` não tem controller.

## Done looks like
- `GET/POST/PATCH/DELETE /inventory` — CRUD de equipamentos/itens físicos com isolamento por tenant
- `GET/POST/PATCH/DELETE /licensing` — CRUD de licenças de obras com campos tipo, prazo, valor, status
- `GET/POST/PATCH/DELETE /monitoring` — listagem e criação de monitoramentos de plays/streams por obra/fonograma
- `GET/POST/PATCH/DELETE /rules` — regras de negócio configuráveis por tenant (alertas, thresholds)
- Todos os endpoints usam TenantGuard, retornam paginação cursor-based, têm DTOs Zod validados
- Frontend pode desligar mock para essas rotas e consumir dados reais

## Out of scope
- Integrações de streaming para popular monitoring automaticamente (task de queue separada)
- Relatórios avançados sobre estes módulos
- Migração de dados mock existentes

## Steps
1. **Schema Drizzle** — criar tabelas `inventory_items`, `licensing_agreements`, `monitoring_records`, `tenant_rules` em `apps/api/src/database/schema.ts`; campos essenciais com FK para tenant; gerar e aplicar migration
2. **InventoryModule** — controller + service + DTO com CRUD básico; filtro obrigatório por `tenantId`; suporte a campos: nome, categoria, quantidade, valor, status, localização
3. **LicensingModule** — controller + service + DTO; campos: obra_id, tipo_licença, licensee, valor, data_inicio, data_fim, status, territorio; alertas de expiração via queue
4. **MonitoringModule** — controller + service + DTO; campos: obra_id, fonograma_id, plataforma, periodo, plays, receita, fonte; suporte a import manual e bulk insert
5. **RulesModule** — controller + service + DTO; regras simples chave-valor com tipo (threshold, alert, config) por tenant; endpoint GET /rules/:key para lookup individual
6. **Registrar módulos** — adicionar os 4 módulos ao `app.module.ts`; garantir NestJS DI e imports do DrizzleModule corretos
7. **Frontend — desligar mock** — localizar onde cada módulo frontend faz fallback para mockData e substituir por chamadas `api.get/post` corretas apontando para os novos endpoints

## Relevant files
- `apps/api/src/database/schema.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/artists/artists.module.ts`
- `client/src/modules/inventory/`
- `client/src/modules/licensing/`
- `client/src/modules/monitoring/`
