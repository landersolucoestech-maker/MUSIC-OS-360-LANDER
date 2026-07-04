# AI DEVELOPMENT OPERATING SYSTEM (ADOS) — MUSIC OS 360

Data: 2026-07-01  
Status: Constituição técnica oficial para agentes de IA  
Fontes obrigatórias:

- `docs/BLUEPRINT_ENTERPRISE.md`
- `docs/PLANO_MASTER_IMPLEMENTACAO_ENTERPRISE.md`
- `docs/MASTER_FUNCTIONAL_SPECIFICATION.md`
- `docs/MASTER_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md`
- `docs/EXECUTION_BACKLOG_ENGINE.md`

O ADOS define como qualquer agente de IA deve analisar, implementar, testar, revisar, documentar e entregar código no MUSIC OS 360. Nenhum código pode ser criado fora destas regras. Nenhuma decisão técnica pode ser arbitrária. Toda alteração deve ser rastreável ao Blueprint, MFS, MTIS e EBE.

## 1. Princípios Fundamentais

### Objetivos Do Sistema

- Produzir código compatível com a arquitetura enterprise oficial.
- Reduzir retrabalho, duplicação e divergência entre agentes.
- Garantir segurança, multi-tenancy, RBAC, billing enforcement, auditoria e observabilidade por padrão.
- Transformar cada task do EBE em implementação verificável.
- Manter documentação viva e sincronizada com código.

### Restrições

- Nenhum agente pode implementar funcionalidade sem `Task ID` existente no EBE.
- Nenhum agente pode criar módulo fora do Blueprint, MFS, MTIS e EBE.
- Nenhum agente pode alterar auth, billing, tenancy, RBAC, migrations ou contratos API sem seguir a regra de RFC quando aplicável.
- Nenhum agente pode usar mock como fonte de verdade em fluxo de produção.
- Nenhum agente pode resolver problema de backend apenas no frontend.
- Nenhum agente pode mascarar bug de layout, permissão, tenant ou billing com workaround visual.

### Limites Dos Agentes

- Agentes executam tasks, não redefinem produto.
- Agentes podem propor ajustes, mas não podem mudar arquitetura sem RFC aprovada.
- Agentes não removem código existente sem provar que está morto, duplicado ou incompatível com o contrato oficial.
- Agentes não alteram contratos públicos sem migration, DTO, documentação e testes.
- Agentes não reduzem cobertura de segurança para passar build.

### Responsabilidades

- Ler os artefatos oficiais antes de implementar.
- Confirmar dependências da task.
- Implementar somente o escopo da task.
- Adicionar ou atualizar testes obrigatórios.
- Atualizar documentação impactada.
- Registrar riscos e validações no PR.
- Entregar código que passe nos quality gates.

### Regras De Implementação

- Toda alteração deve informar `Programa`, `Épico`, `Feature`, `Story`, `Task` e `PR`.
- Toda entidade tenant-scoped deve ter `tenant_id`.
- Toda rota tenant-scoped deve validar auth, tenant, RBAC, feature gate e billing quando mutável.
- Toda mutação crítica deve auditar.
- Todo job deve carregar `tenantId`, `correlationId` e `idempotencyKey` quando aplicável.
- Toda integração externa deve usar adapter, retry, DLQ, healthcheck, logs e auditoria.

### Regras De Revisão

- Revisão deve validar arquitetura, escopo, tenant, RBAC, billing, auditoria, observabilidade, testes e documentação.
- PR sem `Task ID` é bloqueado.
- PR com alteração fora do escopo da task é bloqueado.
- PR que passa só no frontend quando a regra exige backend é bloqueado.
- PR sem evidência de comandos executados é bloqueado.

### Regras De Aprovação

- Aprovação exige CI verde.
- Aprovação exige checklist de PR completo.
- Aprovação exige todos os testes obrigatórios da task.
- Aprovação exige revisão manual para áreas críticas: auth, billing, tenancy, RBAC, migrations, webhooks, storage security e produção.

## 2. Governança De Código

### Pode Ser Alterado Sem RFC

- Componentes UI internos sem alteração de contrato.
- Ajustes visuais que não mudam fluxo, permissão, rota ou contrato.
- DTOs internos quando não quebram API pública.
- Testes e documentação relacionados a uma task.
- Services e repositories dentro do escopo direto da task.

### Não Pode Ser Alterado

- Arquivos fora do escopo declarado da task.
- Regras de autenticação para contornar erro.
- RLS, tenant guards ou billing guards para liberar fluxo.
- Migrations aplicadas sem migration corretiva.
- Secrets, chaves ou credenciais reais.
- Mocks promovidos a fonte de verdade.

### Exige Aprovação Do Tech Lead

- Alteração em rotas protegidas.
- Alteração em providers globais.
- Alteração em guards/interceptors.
- Alteração em workflows CI/CD.
- Alteração em entidades compartilhadas.
- Alteração em navegação/sidebar que afete feature gates.

### Exige RFC

- Mudança de arquitetura de app.
- Mudança de banco que altera contrato público.
- Mudança em auth/session/JWT.
- Mudança em modelo multi-tenant.
- Mudança em billing enforcement.
- Mudança em RBAC authority.
- Mudança em storage provider/prefix.
- Mudança em event bus, queue ou worker topology.

### Exige Revisão Manual Obrigatória

- Migrations.
- Webhooks.
- Stripe.
- Supabase/Auth.
- RLS.
- Guard global.
- Upload/download.
- Criptografia/token store.
- Produção, rollback e deploy.

## 3. Regra De Rastreabilidade

Toda alteração deve conter:

```text
Programa:
Épico:
Feature:
Story:
Task:
PR:
Fontes:
  - Blueprint seção:
  - MFS seção:
  - MTIS seção:
  - EBE task:
```

Regras verificáveis:

- Commit sem `Task ID` no corpo ou branch é inválido.
- PR sem vínculo com task do EBE é inválido.
- Código sem correspondência com task é considerado fora de escopo.
- Toda alteração de documentação deve referenciar a task que a exigiu.
- Toda task deve listar os arquivos realmente alterados no PR.

Formato de branch:

```text
task/<TASK-ID>-descricao-curta
```

Formato mínimo de commit:

```text
<type>(<TASK-ID>): descrição objetiva
```

## 4. Ciclo De Execução

Fluxo obrigatório:

```text
1. Selecionar Task
2. Analisar Dependências
3. Ler EBE
4. Ler MTIS
5. Ler MFS
6. Ler Blueprint quando arquitetura/domínio estiver em dúvida
7. Auditar código existente
8. Definir plano de arquivos
9. Implementar
10. Testar
11. Validar tenant/RBAC/billing quando aplicável
12. Atualizar documentação
13. Criar PR
14. Executar quality gates
15. Revisar
16. Corrigir feedback
17. Merge
18. Atualizar status da task
```

Bloqueios:

- Se dependência não estiver concluída, task não inicia.
- Se contrato MTIS e código existente divergirem, agente deve registrar gap antes de implementar.
- Se teste obrigatório não puder rodar, agente deve justificar e criar risco no PR.
- Se mudança exigir RFC, implementação só inicia após RFC aprovada.

## 5. Template De Task

```markdown
# TASK <TASK-ID> — <Título>

## Rastreabilidade
- Programa:
- Épico:
- Feature:
- Story:
- PR previsto:
- Blueprint:
- MFS:
- MTIS:
- EBE:

## Objetivo
<resultado verificável da task>

## Dependências
- <TASK-ID ou "nenhuma">

## Arquivos Afetados
- Frontend:
- Backend:
- Banco:
- Tests:
- Docs:

## Arquivos Proibidos
- <arquivos fora do escopo>

## Regras
- Tenant:
- RBAC:
- Billing:
- Auditoria:
- Observabilidade:
- Feature gate:

## Implementação
- Passo 1:
- Passo 2:
- Passo 3:

## Testes Obrigatórios
- Unit:
- Integration:
- E2E:
- Security:
- Tenant:
- Billing:
- Permission:

## Critérios De Aceite
- <critério verificável>

## Comandos De Validação
```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```
```

## 6. Template De Implementação

```markdown
# IMPLEMENTATION PLAN — <TASK-ID>

## Objetivo
<o que será entregue>

## Contexto
- Fonte funcional:
- Fonte técnica:
- Task EBE:

## Arquivos Existentes
- <arquivo>: responsabilidade atual

## Arquivos Novos
- <arquivo>: responsabilidade nova

## DTOs
- <NomeDto>: campos e validações

## Services
- <Service>: métodos e regras

## Repositories
- <Repository>: filtros tenant e queries

## Components
- <Component>: props e estados

## Hooks/Queries/Mutations
- <hook>: query key, endpoint, invalidações

## Tests
- <teste>: cenário

## Risks
- <risco>: mitigação

## Acceptance Criteria
- <critério>
```

## 7. Regras Frontend

### Estrutura

- Todo módulo fica em `apps/web/src/modules/{module}`.
- Componentes compartilhados ficam em `apps/web/src/shared`.
- Rotas ficam em `apps/web/src/app/routes`.
- Guards ficam em `apps/web/src/app/guards` ou padrão local equivalente.
- Services HTTP ficam no módulo ou em `shared/services` quando reutilizados.

### Componentes

- Componente de página orquestra dados e layout.
- Componentes filhos recebem props tipadas.
- Modais não devem conter regras de backend; chamam mutations.
- Botões com ícone precisam `aria-label` quando texto não estiver visível.
- Tabelas densas devem ter scroll horizontal responsivo.

### Hooks, Queries E Mutations

- Query key tenant-scoped deve incluir `tenantId`.
- Mutation deve invalidar queries afetadas.
- Mutation deve tratar `PERMISSION_DENIED`, `FEATURE_BLOCKED`, `TENANT_READ_ONLY`, `TENANT_SUSPENDED`.
- Hook não deve hardcodar dados de produção.
- Hook não deve decidir permissão sozinho; deve consumir contexto de permissão.

### Stores E Contexts

- `AuthContext`: sessão e usuário.
- `TenantContext`: tenant ativo, membership e features.
- `BillingContext`: status financeiro e bloqueios.
- `PermissionContext`: grants resolvidos.
- Store local é permitida apenas para estado visual ou cache não autoritativo.

### Forms

- Formulários usam schema validável.
- Backend sempre revalida.
- Erro de campo deve aparecer próximo ao campo.
- Submit deve desabilitar durante loading.
- Form público não pode enviar workspace escolhido manualmente.

### Estados Obrigatórios

- Loading.
- Empty.
- Error.
- Permission denied.
- Feature blocked.
- Read-only billing.
- Suspended billing.

### Feature Gates

- Menu, rota e ação devem respeitar feature gate.
- Feature gate visual não substitui backend.
- Feature bloqueada mostra mensagem clara e CTA de upgrade quando aplicável.

### Billing Guards

- `payment_grace`: banner global.
- `read_only`: bloquear botões mutáveis.
- `suspended`: redirecionar para `/billing/blocked`, exceto billing/support.

### Permission Guards

- Não renderizar ação proibida ou renderizar disabled com tooltip quando UX exigir.
- Rota sem permissão mostra `Forbidden`.
- Permissão deve vir do contexto/endpoint, não de string solta local.

### Tenant Context

- Nenhuma tela tenant-scoped carrega sem tenant ativo.
- Query tenant-scoped sem tenant deve ficar disabled.
- Troca de tenant invalida cache tenant-scoped.

## 8. Regras Backend

### Controllers

- Controller valida rota, DTO e decorators.
- Controller não contém regra de negócio complexa.
- Endpoint mutável deve declarar permissão, feature gate, billing guard e audit quando aplicável.

### DTOs

- Todo payload de entrada tem DTO.
- DTO não aceita campos proibidos como `tenant_id` vindo do usuário em rotas tenant-scoped comuns.
- DTO público usa validação e sanitização explícitas.

### Services

- Service concentra regra de negócio.
- Service recebe tenant context do guard/decorator.
- Service emite eventos de domínio após persistência segura.
- Service não chama provider externo sem adapter.

### Repositories

- Repository tenant-scoped sempre filtra por `tenantId`.
- Repository nunca retorna soft deleted por padrão.
- Query por id tenant-scoped usa `id + tenantId`.

### Events

- Evento carrega `eventId`, `tenantId`, `actorUserId`, `correlationId`, `occurredAt`.
- Evento não carrega secrets.
- Evento assíncrono tem idempotência.

### Jobs E Queues

- Job carrega `tenantId`.
- Job define retry, timeout e DLQ.
- Job falho gera log estruturado.
- Job que chama provider externo deve usar adapter.

### Policies E Guards

- Auth guard antes de tenant.
- Tenant guard antes de permission.
- Permission guard antes de execução.
- Billing guard bloqueia mutações quando necessário.
- Feature gate valida módulo/plano.

### Auditoria

- Mutação crítica audita before/after.
- Ação super admin sempre audita.
- Billing e RBAC sempre auditam.
- Audit log é append-only.

### Observabilidade

- Log estruturado em erro e fluxo crítico.
- Métricas em webhook, job, upload, billing, integração.
- Correlation id propagado.

## 9. Regras Banco

### Tenant ID

- Toda entidade operacional tem `tenant_id`.
- Tabelas globais precisam justificativa explícita.
- Unique tenant-scoped deve ser composto com `tenant_id`.

### Índices

- Índice em `tenant_id`.
- Índice em FKs.
- Índice em `status` quando usado em filtros.
- Índice em datas de listagem.
- Índices compostos para busca frequente.

### Constraints

- FK real para relações críticas.
- Check constraints para status financeiros.
- Unique constraints para ids externos como Stripe event/invoice/subscription.

### Migrations

- Toda alteração de schema exige migration versionada.
- Migration deve ser idempotente quando possível.
- Migration deve ser revisada manualmente.
- Migration não deve apagar dados sem plano explícito.

### Soft Delete

- Entidades de domínio usam `deleted_at` quando histórico importa.
- Repository deve ocultar soft deleted por padrão.

### Auditoria E Versionamento

- Dados críticos de catálogo, billing, RBAC e contratos exigem histórico/audit.
- Alterações de metadados críticos devem gerar snapshot quando definido no MTIS.

### Naming Convention

- Tabelas em snake_case plural.
- Colunas em snake_case.
- DTOs em PascalCase com sufixo `Dto`.
- Services em PascalCase com sufixo `Service`.
- Eventos em dot notation: `domain.action`.

## 10. Regras Multi-Tenancy

### Tenant Context

- Todo request tenant-scoped deve resolver tenant antes do service.
- Tenant vem de header/contexto autenticado ou slug público validado.
- Usuário deve ter membership ativo no tenant.

### Tenant Guards

- Guard bloqueia tenant ausente.
- Guard bloqueia membership inválido.
- Guard não confia em tenant enviado por body.

### Tenant Validation

- Query por recurso valida `tenantId`.
- Endpoint público por slug resolve tenant no backend.
- Super admin só acessa cross-tenant em rotas explicitamente admin.

### Tenant Storage

- Prefixo de objeto inclui ambiente e `tenantId`.
- Usuário não envia key final.
- Download valida tenant antes de assinar URL.

### Tenant Reports

- Relatório tenant-scoped filtra por tenant.
- Relatório cross-tenant exige super_admin.
- Export registra tenant e filtros.

### Tenant Jobs

- Job sem `tenantId` falha se tocar dado tenant-scoped.
- Processor restaura contexto antes de acessar banco.

### Tenant Events

- Evento tenant-scoped carrega `tenantId`.
- Consumidor valida tenant antes de efeito.

### Tenant Logs E Metrics

- Logs incluem tenantId quando disponível.
- Métricas podem agregar, mas não expõem PII.

## 11. Regras RBAC

### Permissions

- Permission key segue `module:action`.
- Ações mínimas: `read`, `create`, `update`, `delete`, `export`, `approve`.
- Permissão deve existir em seed/migration.

### Roles

- Roles tenant-scoped ficam no banco.
- Super admin é escopo sistema.
- Department/position não concede permissão diretamente.

### Policies

- Endpoint declara permissão.
- UI consome grants resolvidos.
- Backend é fonte de verdade.

### Guards

- `PermissionsGuard` usa `PermissionDecisionService`.
- Denial retorna 403 com código `PERMISSION_DENIED`.
- Decision log registra negações relevantes.

### Audit

- Role criada/editada/removida audita.
- Grant adicionado/removido audita.
- Mudança de autoridade RBAC exige readiness.

## 12. Regras Billing

### Planos

- Planos são persistidos.
- Features e limites vêm do banco.
- Frontend não hardcoda plano como fonte final.

### Gates

- Backend valida feature em criação/mutação.
- Frontend esconde ou bloqueia ação.
- Erro padrão: `FEATURE_BLOCKED` ou `PLAN_LIMIT_EXCEEDED`.

### Grace

- `invoice.payment_failed` inicia `payment_grace`.
- `grace_until` vem de configuração persistida.
- Banner global informa prazo.

### Read Only

- Permite `GET`, `HEAD`, `OPTIONS`.
- Bloqueia `POST`, `PUT`, `PATCH`, `DELETE`, upload, import e export mutável.
- Resposta padrão: `TENANT_READ_ONLY`.

### Suspension

- Bloqueia módulos operacionais.
- Permite billing, support, logout e health.
- Resposta padrão: `TENANT_SUSPENDED`.

### Stripe

- Webhook valida assinatura oficial.
- Evento duplicado não reprocessa.
- 2xx só após persistência segura.
- Reconciliation job corrige divergência.

### Enforcement

- Backend sempre aplica.
- Frontend apenas reflete estado.
- Ações admin auditam motivo e before/after.

## 13. Regras Storage

### Upload

- Upload direto para R2/S3 via signed URL.
- API valida antes de gerar presign.
- MIME, extensão, tamanho e quota são obrigatórios.

### Download

- Download usa signed URL curta.
- API valida tenant, permissão, status e billing.

### Signed URLs

- Expiração curta.
- Key gerada pelo backend.
- URL nunca é permanente para arquivo privado.

### Quotas

- Quota vem do plano.
- Quota excedida retorna `QUOTA_EXCEEDED`.
- Uso de storage deve ser recalculável.

### Versioning

- Asset versionado cria `asset_versions`.
- Versão atual fica marcada em metadata.

### Scan

- Status recomendado: `pending_scan`, `clean`, `infected`.
- Download bloqueado até `clean` quando scan ativo.

### Tenant Prefix

```text
env/{tenantId}/...
```

Prefixo sem tenant é proibido para dados privados.

## 14. Regras Integrações

### Adapter Pattern

- Toda integração implementa `ProviderAdapter`.
- Controller/service de domínio chama adapter, não SDK direto.

### OAuth E Token Store

- Tokens criptografados.
- Refresh token não aparece em logs.
- Desconectar remove ou revoga token conforme provider.

### Retry E DLQ

- Falha transitória reprocessa.
- Falha permanente vai para DLQ.
- DLQ deve ser observável.

### Healthcheck

- Cada provider expõe status.
- Admin técnico consegue ver falha.

### Audit E Metrics

- Conectar/desconectar audita.
- Webhook recebido audita.
- Métrica de sucesso/falha por provider.

## 15. Regras IA

### Skills

- Skill deve ter id, owner module, input schema, output schema e permission.
- Skill não pode executar sem feature gate `aiFeatures`.

### Providers

- Provider acessado por router/adapter.
- Nenhum módulo chama SDK IA diretamente.

### Custos E Quotas

- Todo uso registra tokens/custo estimado.
- Budget por plano bloqueia execução.

### Observabilidade

- Log registra provider, skill, latency, status e custo.
- Prompt completo com PII não deve ir para log.

### Segurança E Redação De PII

- Redact PII quando possível.
- Não enviar secrets para provider.
- Dados sensíveis exigem base funcional e permissão.

## 16. Test Strategy

Toda task deve classificar testes obrigatórios:

- **Unit:** service, guard, validator, mapper, repository helper.
- **Integration:** controller + service + database/test container quando aplicável.
- **E2E:** fluxo usuário ou fluxo backend crítico.
- **Security:** auth, rate limit, signature, injection, IDOR.
- **Tenant:** cross-tenant read/write bloqueado.
- **Billing:** read_only/suspended/feature/limit.
- **Permission:** allow/deny por role/permission.

Regras:

- Mutation tenant-scoped exige tenant test.
- Endpoint protegido exige permission test.
- Upload exige MIME/quota/security test.
- Webhook exige signature/idempotency test.
- Billing exige state transition test.
- UI exige loading, empty e error state quando buscar dados.

## 17. Quality Gates

Nenhuma task conclui sem gates aplicáveis:

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test
corepack pnpm --filter @music-os-360/api test:e2e
corepack pnpm --filter @music-os-360/api db:check
corepack pnpm --filter @music-os-360/api verify:tenant-isolation
corepack pnpm --filter @music-os-360/api rbac:readiness
corepack pnpm --filter @music-os-360/api storage:e2e
```

Gates obrigatórios por área:

- Auth: token válido/inválido e bypass production.
- RBAC: allow/deny e readiness.
- Tenancy: isolation script.
- Billing: webhook, duplicate event, read_only, suspended.
- Storage: MIME, quota, tenant download.
- Integrations: adapter failure, retry, DLQ.
- Reports: permission e export.
- UI: build e testes de renderização quando existentes.

Bloqueios:

- Typecheck falhando: bloqueia.
- Lint falhando sem justificativa aprovada: bloqueia.
- Build falhando: bloqueia.
- Teste obrigatório ausente: bloqueia.
- Teste obrigatório falhando: bloqueia.
- Documentação não atualizada quando contrato mudou: bloqueia.

## 18. Template De PR

```markdown
# PR — <TASK-ID> <Título>

## Task ID
- Programa:
- Épico:
- Feature:
- Task:

## Objetivo
<o que o PR entrega>

## Arquivos Alterados
- Frontend:
- Backend:
- Banco/Migrations:
- Tests:
- Docs:

## Riscos
- <risco e mitigação>

## Testes Executados
```bash
<comandos>
```

## Resultado
- Typecheck:
- Lint:
- Build:
- Unit:
- Integration:
- E2E:
- Tenant:
- Billing:

## Checklist
- [ ] Task existe no EBE
- [ ] Escopo limitado à task
- [ ] MTIS consultado
- [ ] MFS consultada
- [ ] Tenant validado quando aplicável
- [ ] RBAC validado quando aplicável
- [ ] Billing validado quando aplicável
- [ ] Auditoria implementada quando aplicável
- [ ] Observabilidade implementada quando aplicável
- [ ] Testes obrigatórios adicionados
- [ ] Documentação atualizada
- [ ] Sem mock como fonte de verdade
- [ ] Sem secrets em código/logs
```

## 19. Template De Code Review

```markdown
# CODE REVIEW — <PR>

## Arquitetura
- [ ] Segue Blueprint/MFS/MTIS
- [ ] Não cria módulo fora do escopo
- [ ] Não duplica camada existente

## Tenant
- [ ] `tenant_id` aplicado quando necessário
- [ ] Queries filtram por tenant
- [ ] RLS/membership considerados

## RBAC
- [ ] Permissões declaradas
- [ ] Guards aplicados
- [ ] UI respeita grants

## Billing
- [ ] Feature gates aplicados
- [ ] Read-only bloqueia mutações
- [ ] Suspended bloqueia rotas operacionais

## Segurança
- [ ] Sem IDOR
- [ ] Sem secrets
- [ ] Entrada validada
- [ ] Webhook/upload protegido

## Observabilidade
- [ ] Logs estruturados
- [ ] Métricas em fluxo crítico
- [ ] Correlation id preservado

## Testes
- [ ] Unit
- [ ] Integration
- [ ] E2E
- [ ] Tenant
- [ ] Permission
- [ ] Billing

## Performance
- [ ] Índices adequados
- [ ] Paginação em listas
- [ ] Jobs para operação pesada

## Resultado
- [ ] Aprovar
- [ ] Solicitar mudanças
- [ ] Bloquear por RFC
```

## 20. Template De RFC

RFC é obrigatória quando a mudança afeta arquitetura, banco, auth, billing, tenancy, RBAC, storage provider, event bus, queue topology ou contrato público.

```markdown
# RFC-<número> — <Título>

## Motivação
<problema real>

## Escopo
<o que muda>

## Fora De Escopo
<o que não muda>

## Artefatos Impactados
- Blueprint:
- MFS:
- MTIS:
- EBE:

## Opções Consideradas
1. Opção A
2. Opção B
3. Opção C

## Decisão Proposta
<decisão>

## Impacto Técnico
- Frontend:
- Backend:
- Banco:
- Segurança:
- Observabilidade:
- CI/CD:

## Migração
<plano de rollout/rollback>

## Riscos
<risco e mitigação>

## Critério De Aceite
<condições verificáveis>

## Aprovações
- CTO/Architect:
- Tech Lead:
- Security:
- DevOps:
```

## 21. Matriz De Decisão

| Situação | Ação |
|---|---|
| Task sem dependência concluída | bloquear execução |
| Task não existe no EBE | bloquear execução |
| Escopo não rastreável a Blueprint/MFS/MTIS/EBE | bloquear execução |
| Testes falhando | bloquear merge |
| Build falhando | bloquear merge |
| Typecheck falhando | bloquear merge |
| Lint falhando | bloquear merge salvo exceção aprovada |
| Tenant não validado em dado tenant-scoped | bloquear merge |
| RBAC não validado em rota protegida | bloquear merge |
| Billing não validado em mutação tenant-scoped | bloquear merge |
| Segurança não validada em auth/webhook/upload | bloquear merge |
| Migration sem revisão manual | bloquear merge |
| Mudança exige RFC e não há RFC | bloquear execução |
| Mock usado como fonte de verdade | bloquear merge |
| Secret detectado em código/log | bloquear merge e rotacionar secret |
| Documentação desatualizada após contrato mudar | bloquear merge |
| Observabilidade ausente em fluxo crítico | solicitar mudanças |

## 22. Execução Por Agentes

### Architect Agent

- **Responsabilidades:** validar aderência a Blueprint, MFS, MTIS e EBE; decidir se RFC é necessária.
- **Limites:** não implementa código crítico sem task; não aprova bypass.
- **Entregáveis:** plano técnico, mapa de arquivos, decisão arquitetural.

### Backend Agent

- **Responsabilidades:** controllers, DTOs, services, repositories, guards, events, jobs e tests backend.
- **Limites:** não altera UI salvo contrato necessário; não altera schema sem migration.
- **Entregáveis:** API funcional, testes, audit, observability.

### Frontend Agent

- **Responsabilidades:** pages, components, forms, hooks, queries, guards visuais e UX states.
- **Limites:** não altera regra de negócio backend; não finge permissão/billing.
- **Entregáveis:** UI funcional, acessível, responsiva e conectada a API real.

### Database Agent

- **Responsabilidades:** migrations, RLS, índices, constraints, seeds e db checks.
- **Limites:** não apaga dados sem plano aprovado; não desliga RLS.
- **Entregáveis:** migrations versionadas, scripts e validação.

### QA Agent

- **Responsabilidades:** planos de teste, unit/integration/e2e, cenários negativos, tenant, billing e permission.
- **Limites:** não aprova sem evidência.
- **Entregáveis:** suíte de testes e relatório de cobertura funcional.

### Security Agent

- **Responsabilidades:** auth, RBAC, RLS, IDOR, secrets, webhooks, upload, PII.
- **Limites:** pode bloquear PR crítico.
- **Entregáveis:** revisão de segurança e checklist de riscos.

### DevOps Agent

- **Responsabilidades:** CI/CD, environments, secrets, observability, deploy, rollback, backups.
- **Limites:** não injeta secrets em código; não promove release sem go/no-go.
- **Entregáveis:** pipelines, runbooks, dashboards e alertas.

### Reviewer Agent

- **Responsabilidades:** revisar PR pelo template ADOS.
- **Limites:** não aprova PR com gate vermelho.
- **Entregáveis:** aprovação ou solicitação objetiva de mudanças.

## 23. Definition Of Done Global

Uma feature só pode ser concluída quando:

- todas as tasks da feature estão concluídas;
- cada task possui PR associado;
- PRs foram revisados e mergeados;
- CI está verde;
- frontend completo quando aplicável;
- backend completo quando aplicável;
- banco/migrations completos quando aplicável;
- testes unitários/integration/e2e obrigatórios passam;
- tenant isolation validado;
- RBAC validado;
- billing read_only/suspended validado;
- auditoria implementada;
- observabilidade implementada;
- documentação atualizada;
- release correspondente aprovado;
- nenhum P0/P1 relacionado permanece aberto sem mitigação formal.

## 24. Operating Manual

### Como Um Agente Deve Começar

1. Abrir `docs/EXECUTION_BACKLOG_ENGINE.md`.
2. Selecionar uma task sem dependências pendentes.
3. Copiar o template de task do ADOS.
4. Preencher rastreabilidade.
5. Abrir `docs/MASTER_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md`.
6. Identificar contratos frontend/backend/banco/eventos/testes.
7. Abrir `docs/MASTER_FUNCTIONAL_SPECIFICATION.md`.
8. Confirmar comportamento funcional, permissões, telas e fluxos.
9. Abrir `docs/BLUEPRINT_ENTERPRISE.md` se houver dúvida arquitetural.
10. Auditar o código existente com `rg` antes de editar.

### Como Implementar

1. Criar plano de arquivos.
2. Confirmar arquivos proibidos.
3. Implementar menor alteração compatível com a task.
4. Reutilizar padrões existentes.
5. Adicionar DTOs/schemas.
6. Adicionar backend antes de UI quando regra de negócio for backend.
7. Adicionar testes obrigatórios.
8. Atualizar documentação.
9. Rodar quality gates.

### Como Lidar Com Divergência

- Se código existente divergir do MTIS, registrar gap.
- Se MFS e MTIS divergirem, MFS define comportamento e MTIS deve ser atualizado por task/RFC.
- Se EBE não possui task para mudança necessária, criar proposta de task antes de implementar.
- Se dependência estiver incompleta, bloquear ou criar task predecessora.

### Como Finalizar

1. Preencher template de PR.
2. Listar comandos executados e resultados.
3. Listar arquivos alterados.
4. Listar riscos restantes.
5. Solicitar revisão.
6. Corrigir feedback.
7. Só considerar concluído após merge e CI verde.

### Regra Final

Nenhum agente pode implementar código fora das regras do ADOS. Toda decisão técnica deve ser rastreável ao Blueprint, MFS, MTIS e EBE. Quando houver dúvida, a ação correta é bloquear, documentar o gap e solicitar revisão ou RFC.

