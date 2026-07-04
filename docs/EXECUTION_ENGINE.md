# EXECUTION ENGINE (EE) — MUSIC OS 360

Data: 2026-07-01  
Status: protocolo oficial de execução automática por Task ID  
Fontes obrigatórias:

- `docs/BLUEPRINT_ENTERPRISE.md`
- `docs/PLANO_MASTER_IMPLEMENTACAO_ENTERPRISE.md`
- `docs/MASTER_FUNCTIONAL_SPECIFICATION.md`
- `docs/MASTER_TECHNICAL_IMPLEMENTATION_SPECIFICATION.md`
- `docs/EXECUTION_BACKLOG_ENGINE.md`
- `docs/AI_DEVELOPMENT_OPERATING_SYSTEM.md`

O Execution Engine define como qualquer agente de IA recebe uma Task ID do EBE e produz um pacote completo de execução: contexto, dependências, plano técnico, implementação, testes, validação, PR, revisão e fechamento.

Regra máxima: nenhuma implementação pode ocorrer sem Task ID válida, dependências concluídas, rastreabilidade completa e quality gates definidos.

## 1. Modelo De Entrada

Toda execução começa com um input estruturado.

```yaml
task_id: BILL-001-002-004
program: BILLING
epic: Stripe Webhook
feature: Webhook Processor
story: Processar checkout.session.completed
priority: P0
requested_by: user|system|program_manager
execution_mode: plan|implement|review|validate
target_branch: task/BILL-001-002-004-checkout-session-completed
```

Campos obrigatórios:

- `task_id`: deve existir no EBE.
- `program`: deve corresponder ao programa do EBE.
- `epic`: deve corresponder ao épico do EBE.
- `feature`: deve corresponder à feature do EBE.
- `story`: deve descrever o resultado da task.
- `priority`: P0, P1, P2 ou P3 conforme plano.
- `execution_mode`: define se o agente vai planejar, implementar, revisar ou validar.

Regras verificáveis:

- Se `task_id` não existir no EBE, retornar `BLOCKED`.
- Se `program/epic/feature` não baterem com o EBE, retornar `BLOCKED`.
- Se o input não declarar prioridade, inferir do EBE ou do Plano Master; se não houver fonte, retornar `BLOCKED`.

## 2. Resolução De Contexto

Ao receber uma task, o EE executa sempre a sequência:

1. Localizar a task no `docs/EXECUTION_BACKLOG_ENGINE.md`.
2. Ler objetivo, local afetado, dependências, critério de aceite e estimativa.
3. Verificar dependências diretas e predecessoras.
4. Ler seções relacionadas no MTIS.
5. Ler seções relacionadas na MFS.
6. Ler Blueprint quando houver decisão arquitetural ou domínio crítico.
7. Ler ADOS para regras operacionais.
8. Localizar código existente com `rg`.
9. Mapear arquivos existentes, arquivos novos e arquivos proibidos.
10. Produzir `Context Package`.

### Context Package

```yaml
context_package:
  task_id:
  status: READY|BLOCKED|RFC_REQUIRED
  objective:
  ebe:
    program:
    epic:
    feature:
    task:
    acceptance_criteria:
    dependencies:
  contracts:
    blueprint_sections:
    mfs_sections:
    mtis_sections:
    ados_sections:
  affected_surfaces:
    frontend:
    backend:
    database:
    storage:
    integrations:
    observability:
    tests:
    docs:
  entities:
  endpoints:
  components:
  hooks:
  services:
  repositories:
  events:
  jobs:
  quality_gates:
  risks:
```

Regras:

- O Context Package é obrigatório antes de editar arquivos.
- O Context Package deve listar explicitamente o que não será alterado.
- Se algum contrato estiver ausente ou contraditório, status vira `RFC_REQUIRED` ou `BLOCKED`.

## 3. Auditoria Pré-Implementação

Antes de implementar, o agente executa o checklist:

| Item | Verificação | Resultado |
|---|---|---|
| Task existe | Task ID localizada no EBE | PASS/FAIL |
| Dependências | Todas concluídas ou mitigadas | PASS/FAIL |
| Artefatos | Blueprint/MFS/MTIS/ADOS consultados | PASS/FAIL |
| Arquivos | Arquivos existentes localizados | PASS/FAIL |
| Contratos | DTO/API/UI/DB definidos | PASS/FAIL |
| Entidades | Entidades existem ou task prevê criação | PASS/FAIL |
| Migrations | Migration existe ou task prevê criação | PASS/FAIL |
| Testes | Testes existentes localizados | PASS/FAIL |
| Riscos | Riscos classificados | PASS/FAIL |
| RFC | Mudança exige ou não RFC | PASS/FAIL |

Classificação:

- `READY`: todos os itens obrigatórios passaram.
- `BLOCKED`: dependência, task, contrato ou arquivo crítico ausente sem autorização.
- `RFC_REQUIRED`: mudança altera arquitetura, auth, billing, tenancy, RBAC, storage provider, event bus, queue topology, contrato público ou schema de forma não prevista.

## 4. Plano De Implementação

Todo plano deve conter:

```yaml
implementation_plan:
  task_id:
  objective:
  scope:
    included:
    excluded:
  files:
    existing_to_edit:
    new_files:
    forbidden_files:
  backend:
    dtos:
    controllers:
    services:
    repositories:
    policies:
    guards:
    events:
    jobs:
    metrics:
    audit:
  frontend:
    routes:
    pages:
    components:
    modals:
    forms:
    hooks:
    queries:
    mutations:
    guards:
    states:
  database:
    entities:
    migrations:
    indexes:
    constraints:
    rls:
  tests:
    unit:
    integration:
    e2e:
    security:
    tenant:
    billing:
    permission:
  docs:
  commands:
```

Regras:

- Escopo incluído e excluído deve ser explícito.
- Arquivos proibidos impedem edição.
- Plano deve preferir padrões existentes do código.
- Plano não pode criar arquitetura paralela sem RFC.

## 5. Regras De Modificação

### Permitido

- Editar arquivos declarados no plano.
- Criar arquivos declarados no plano.
- Atualizar testes da task.
- Atualizar documentação impactada.
- Ajustar imports e tipos necessários ao escopo.

### Proibido Sem Task Específica

- Alterar auth.
- Alterar billing.
- Alterar tenancy.
- Alterar RBAC.
- Alterar migrations.
- Alterar guards globais.
- Alterar providers globais.
- Alterar contratos API públicos.
- Alterar navegação/sidebar global.
- Alterar CI/CD.
- Remover código não relacionado.

### Exige Bloqueio Imediato

- Necessidade de mudança fora do escopo.
- Dependência incompleta.
- Falha estrutural que exige RFC.
- Risco de perda de dados.
- Risco de bypass auth/RBAC/billing/tenant.

## 6. Execução Backend

Fluxo obrigatório:

```text
DTO
↓
Controller
↓
Service
↓
Repository
↓
Event
↓
Audit
↓
Metrics
↓
Tests
```

Checklist backend:

- DTO criado ou atualizado.
- DTO valida entrada e rejeita campos proibidos.
- Controller declara rota, guard, permission, feature gate e billing guard quando aplicável.
- Controller delega regra de negócio ao service.
- Service recebe tenant context.
- Service valida regra de negócio.
- Repository filtra por tenant quando tenant-scoped.
- Evento de domínio emitido quando aplicável.
- Audit log registrado para mutação crítica.
- Métrica/log estruturado adicionado em fluxo crítico.
- Erros usam códigos padronizados.
- Unit tests cobrem service.
- Integration tests cobrem controller.

Critério backend:

- Endpoint funciona conforme MTIS.
- Erros seguem contrato API.
- Tenant, RBAC, billing e audit estão aplicados quando necessários.

## 7. Execução Frontend

Fluxo obrigatório:

```text
Route
↓
Page
↓
Component
↓
Hook
↓
Query
↓
Mutation
↓
Error State
↓
Tests
```

Checklist frontend:

- Rota existe ou foi validada.
- Page usa layout correto.
- Componentes seguem design system existente.
- Hooks usam query keys com tenant quando necessário.
- Queries tratam loading/error/empty.
- Mutations tratam success/error e invalidam cache.
- Permission guard aplicado.
- Feature gate aplicado.
- Billing guard aplicado para mutações.
- Estado `TENANT_READ_ONLY` tratado.
- Estado `TENANT_SUSPENDED` tratado.
- Acessibilidade mínima: labels, aria-label, foco visível.
- Responsividade sem overflow horizontal crítico.
- Testes de renderização ou E2E criados quando aplicável.

Critério frontend:

- UI reflete backend.
- UI não contém regra de negócio autoritativa.
- UI não usa mock como fonte de verdade em produção.

## 8. Execução Banco

Fluxo obrigatório:

```text
Entity
↓
Migration
↓
Indexes
↓
Constraints
↓
RLS
↓
Tests
```

Checklist banco:

- Entidade TypeORM criada ou atualizada.
- Migration versionada criada.
- `tenant_id` presente se tenant-scoped.
- FK real adicionada quando aplicável.
- Índices para `tenant_id`, FK, status e datas de listagem.
- Constraints de unicidade/check adicionadas.
- Soft delete definido quando necessário.
- RLS policy criada ou validada.
- Seed atualizado quando necessário.
- `db:check` passa.
- Tenant isolation test cobre a entidade quando crítica.

Critério banco:

- Schema suporta contrato técnico.
- Migration não perde dados sem plano.
- RLS e índices estão compatíveis com produção.

## 9. Execução Storage

Validar sempre que a task tocar upload, download, assets, reports ou contratos:

- Prefixo contém `env/{tenantId}`.
- Usuário não envia key final.
- MIME validado.
- Extensão validada.
- Tamanho validado.
- Quota validada.
- Signed URL tem expiração curta.
- Download valida tenant, permissão, status e billing.
- Audit registra presign/confirm/download/delete.
- Métrica registra sucesso/falha.
- Testes cobrem MIME inválido, quota excedida e cross-tenant.

Resultado:

- `READY`: todas as validações cobertas.
- `BLOCKED`: qualquer validação crítica ausente.

## 10. Execução Billing

Validar sempre que a task tocar mutação tenant-scoped, plano, feature, limite, Stripe ou admin:

- Feature gate aplicado no backend.
- Limites aplicados no backend.
- Frontend reflete gate/limite.
- `payment_grace` não bloqueia indevidamente, apenas avisa.
- `read_only` bloqueia mutações.
- `suspended` bloqueia módulos operacionais.
- `/billing`, `/support`, `/health` continuam acessíveis quando suspenso.
- Stripe webhook valida assinatura.
- Stripe webhook é idempotente.
- Evento Stripe atualiza subscription/invoice/state corretamente.
- Ação admin audita before/after e motivo.

Resultado:

- `READY`: billing validado.
- `BLOCKED`: mutação sem enforcement backend.

## 11. Execução Multi-Tenant

Validar sempre que a task tocar dado tenant-scoped:

- Request resolve tenant.
- Tenant guard aplicado.
- Membership validado.
- Query usa `tenantId`.
- Repository usa `id + tenantId` para recurso específico.
- RLS policy existe ou está planejada na task.
- Storage usa prefixo tenant.
- Jobs carregam tenant context.
- Eventos carregam tenantId.
- Logs incluem tenantId.
- Metrics não expõem PII.
- Teste cross-tenant existe.

Resultado:

- `READY`: isolamento validado.
- `BLOCKED`: qualquer acesso sem tenant filter em dado tenant-scoped.

## 12. Execução RBAC

Validar sempre que a task tocar rota protegida, ação mutável, UI de ação ou admin:

- Permission key existe.
- Role/grant existe ou seed/migration atualiza.
- Controller declara permission.
- Guard usa `PermissionDecisionService`.
- UI usa permission context.
- Denial retorna `PERMISSION_DENIED`.
- Decision log registra negação relevante.
- Audit registra alteração de roles/grants.
- Testes allow/deny existem.

Resultado:

- `READY`: permissões validadas.
- `BLOCKED`: rota protegida sem permission test.

## 13. Execução Testes

Todo Execution Package deve gerar Test Plan:

```yaml
test_plan:
  unit:
    - file:
      scenario:
  integration:
    - file:
      scenario:
  e2e:
    - file:
      scenario:
  security:
    - scenario:
  tenant:
    - scenario:
  billing:
    - scenario:
  permission:
    - scenario:
```

Regras:

- Unit test para service/guard/validator.
- Integration test para controller + service.
- E2E para fluxo usuário crítico.
- Security test para auth/webhook/upload/public endpoint.
- Tenant test para toda entidade tenant-scoped.
- Billing test para toda mutação tenant-scoped.
- Permission test para toda rota protegida.

Se um tipo de teste não se aplica, declarar:

```text
N/A — justificativa verificável
```

## 14. Quality Gates

Comandos padrão:

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test
```

Comandos por área:

```bash
corepack pnpm --filter @music-os-360/api test:e2e
corepack pnpm --filter @music-os-360/api db:check
corepack pnpm --filter @music-os-360/api verify:tenant-isolation
corepack pnpm --filter @music-os-360/api rbac:readiness
corepack pnpm --filter @music-os-360/api storage:e2e
corepack pnpm --filter @music-os-360/api test -- billing
```

Resultado:

- `PASS`: comando executado e passou.
- `FAIL`: comando executado e falhou.
- `BLOCKED`: comando não pôde executar por dependência externa, ambiente ausente ou credencial não disponível.

Regras:

- `FAIL` bloqueia conclusão.
- `BLOCKED` exige justificativa e risco no PR.
- Gate obrigatório ausente bloqueia merge.

## 15. Geração De PR

O EE deve gerar automaticamente o PR Package:

```markdown
# PR PACKAGE — <TASK-ID>

## Task ID
<TASK-ID>

## Objetivo
<objetivo da task>

## Rastreabilidade
- Programa:
- Épico:
- Feature:
- Story:
- Blueprint:
- MFS:
- MTIS:
- EBE:
- ADOS:

## Arquivos Alterados
- <arquivo>: <motivo>

## Arquivos Criados
- <arquivo>: <motivo>

## Riscos
- <risco>: <mitigação>

## Testes
- Unit:
- Integration:
- E2E:
- Security:
- Tenant:
- Billing:
- Permission:

## Quality Gates
- Typecheck:
- Lint:
- Build:
- Tests:
- Tenant isolation:
- RBAC readiness:
- Storage:
- Billing:

## Resultado
PASS|FAIL|BLOCKED

## Checklist
- [ ] Task existe no EBE
- [ ] Dependências concluídas
- [ ] Escopo respeitado
- [ ] MTIS lido
- [ ] MFS lida
- [ ] Blueprint consultado quando necessário
- [ ] ADOS seguido
- [ ] Testes adicionados
- [ ] Documentação atualizada
- [ ] Sem mock como fonte de verdade
- [ ] Sem alteração fora do escopo
```

## 16. Code Review

O EE executa o checklist ADOS:

| Área | Validação | Resultado |
|---|---|---|
| Arquitetura | segue Blueprint/MFS/MTIS | PASS/FAIL |
| Escopo | apenas arquivos da task | PASS/FAIL |
| Tenancy | tenant context/RLS/filter | PASS/FAIL |
| RBAC | permissions/guards/denial | PASS/FAIL |
| Billing | gates/read_only/suspended | PASS/FAIL |
| Observabilidade | logs/metrics/correlation | PASS/FAIL |
| Auditoria | mutações críticas auditadas | PASS/FAIL |
| Testes | obrigatórios presentes | PASS/FAIL |
| Performance | índices/paginação/jobs | PASS/FAIL |
| Segurança | auth/IDOR/secrets/input | PASS/FAIL |
| Docs | documentação atualizada | PASS/FAIL |

Resultado:

- `APPROVED`: todos os itens obrigatórios passaram.
- `CHANGES_REQUESTED`: falhas corrigíveis dentro da task.
- `BLOCKED`: falha crítica, escopo inválido, RFC necessária ou quality gate vermelho.

## 17. Atualização Do Backlog

Após merge, atualizar status:

```yaml
backlog_update:
  task_id:
  task_status: TODO|IN_PROGRESS|BLOCKED|DONE
  story_status: TODO|IN_PROGRESS|BLOCKED|DONE
  feature_status: TODO|IN_PROGRESS|BLOCKED|DONE
  epic_status: TODO|IN_PROGRESS|BLOCKED|DONE
  pr:
  merge_commit:
  completed_at:
  evidence:
    tests:
    docs:
    release:
```

Regras:

- Task vira `DONE` apenas após merge.
- Story vira `DONE` apenas quando todas as tasks da story estão `DONE`.
- Feature vira `DONE` apenas quando stories, testes e docs estão completos.
- Epic vira `DONE` apenas quando features e release criteria estão completos.

## 18. Matriz De Decisão

| Situação | Ação |
|---|---|
| Task inexistente | BLOCKED |
| Task sem dependência concluída | BLOCKED |
| Rastreabilidade incompleta | BLOCKED |
| Contrato ausente | BLOCKED |
| Contrato contraditório | RFC_REQUIRED |
| Escopo exige arquivo proibido | BLOCKED |
| Build falhando | BLOCKED |
| Typecheck falhando | BLOCKED |
| Lint falhando sem aprovação | BLOCKED |
| Testes falhando | BLOCKED |
| Teste obrigatório ausente | BLOCKED |
| Tenant não validado | BLOCKED |
| Billing não validado | BLOCKED |
| RBAC não validado | BLOCKED |
| Segurança não validada | BLOCKED |
| Migration sem revisão manual | BLOCKED |
| Observabilidade ausente em fluxo crítico | CHANGES_REQUESTED |
| Auditoria ausente em mutação crítica | CHANGES_REQUESTED |
| RFC necessária | RFC_REQUIRED |
| Tudo validado | READY |

## 19. Template De Execução

```markdown
# EXECUTION PACKAGE

## Task ID
<TASK-ID>

## Status
READY|BLOCKED|RFC_REQUIRED|IN_PROGRESS|DONE

## Objetivo
<objetivo verificável>

## Dependências
- <dependência>: DONE|BLOCKED|PENDING

## Contexto
- Blueprint:
- MFS:
- MTIS:
- EBE:
- ADOS:

## Arquivos
### Existentes
- <arquivo>

### Novos
- <arquivo>

### Proibidos
- <arquivo>

## Plano
- Backend:
- Frontend:
- Banco:
- Storage:
- Billing:
- Tenant:
- RBAC:
- Docs:

## Implementação
- Passo 1:
- Passo 2:
- Passo 3:

## Testes
- Unit:
- Integration:
- E2E:
- Security:
- Tenant:
- Billing:
- Permission:

## Quality Gates
- Typecheck:
- Lint:
- Build:
- Test:
- Tenant isolation:
- RBAC readiness:
- Storage:
- Billing:

## Resultado
PASS|FAIL|BLOCKED

## Próximos Passos
- <ação>
```

## 20. Execution Playbook

Para qualquer Task ID, o EE deve produzir os pacotes abaixo, nesta ordem:

### 20.1 Context Package

- Task localizada.
- Artefatos oficiais consultados.
- Contratos extraídos.
- Arquivos mapeados.
- Riscos iniciais identificados.

### 20.2 Dependency Check

- Dependências diretas.
- Dependências transitivas.
- Status de cada dependência.
- Decisão `READY`, `BLOCKED` ou `RFC_REQUIRED`.

### 20.3 Risk Analysis

- Riscos técnicos.
- Riscos de segurança.
- Riscos de tenant.
- Riscos de billing.
- Riscos de migração.
- Mitigações.

### 20.4 Implementation Plan

- Escopo.
- Arquivos.
- Backend.
- Frontend.
- Banco.
- Storage.
- Billing.
- Tenant.
- RBAC.
- Observabilidade.
- Docs.

### 20.5 Test Plan

- Unit.
- Integration.
- E2E.
- Security.
- Tenant.
- Billing.
- Permission.

### 20.6 Validation Plan

- Comandos.
- Gates obrigatórios.
- Resultado esperado.
- Bloqueios conhecidos.

### 20.7 PR Package

- Template preenchido.
- Arquivos alterados.
- Riscos.
- Testes.
- Resultado.
- Checklist.

### 20.8 Review Package

- Checklist de arquitetura.
- Checklist tenancy.
- Checklist RBAC.
- Checklist billing.
- Checklist security.
- Checklist observability.
- Checklist performance.

### 20.9 Completion Package

- Status final.
- PR mergeado.
- Backlog atualizado.
- Evidências.
- Riscos remanescentes.
- Próxima task recomendada.

## 21. Definition Of Done Execution

Uma task só pode ser concluída quando:

- Task ID foi validada no EBE.
- Dependências estão concluídas.
- Rastreabilidade está completa.
- Context Package foi produzido.
- Auditoria pré-implementação retornou `READY`.
- Implementação foi concluída no escopo.
- Arquivos fora da task não foram alterados.
- Testes obrigatórios foram criados ou atualizados.
- Testes passaram.
- Typecheck passou.
- Lint passou.
- Build passou.
- Tenant isolation passou quando aplicável.
- RBAC passou quando aplicável.
- Billing passou quando aplicável.
- Storage passou quando aplicável.
- Segurança foi validada quando aplicável.
- Auditoria foi implementada quando aplicável.
- Observabilidade foi implementada quando aplicável.
- Documentação foi atualizada.
- PR Package foi gerado.
- Code Review retornou `APPROVED`.
- CI aprovou.
- PR foi mergeado.
- Backlog foi atualizado.

Regra final: se qualquer item obrigatório falhar, a task não está concluída. O resultado correto é `BLOCKED`, `CHANGES_REQUESTED` ou `RFC_REQUIRED`, nunca `DONE`.

