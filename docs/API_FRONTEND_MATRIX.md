# API Frontend Matrix

| Frontend | Endpoint esperado | Backend atual | Status | Observacao |
|---|---|---|---|---|
| Dashboard | metricas diversas | parcial/mock | incompleto | Consolidar depois da Fase 1. |
| Artistas | `/artists` | `ArtistsModule` | existe | Reaproveitavel. |
| Catalogo/Works | `/works`, `/phonograms` | `WorksModule`, `PhonogramsModule` | existe | Reaproveitavel. |
| Contratos | `/contracts`, `/contract-templates` | existe | existe | Reaproveitavel. |
| Financeiro | `/transactions`, `/invoices` | existe | existe | Reaproveitavel. |
| Agenda | `/events` | `EventsModule` | existe | Base para calendario operacional. |
| Inventario | pendente | inexistente | bloqueado em producao | Frontend existe, mas `api-client` agora marca `inventario` como pendente; em producao falha em vez de mockar. |
| CRM | `/clients`, `/leads`, `/lead-interactions` | existe parcial | incompleto | Precisa virar CRM canonico em fase futura. |
| Marketing | `/campaigns`, `/briefings` | existe parcial | reaproveitavel | Base para campanhas musicais. |
| Projetos/Releases | `/projects`, `/releases` | existe | existe | Reaproveitavel. |
| Suporte | `/support-tickets` | existe | existe | Validar filtros tenant-aware. |
| Uploads | `/uploads` | existe | validar | Confirmar ownership por tenant/user. |
| Notifications | `/notifications` | existe | validar | Confirmar ownership por tenant/user. |
| AI | `/ai/*` | existe | reaproveitavel | Base para IA operacional. |
| Integrations | `/integrations` | existe | validar | Separar mocks e providers reais. |
| Users/RBAC | `/users` | existe | ajustado | Usa `auth_user_id` e Supabase Auth. |
| RH funcionarios | `/hr/employees` | `HrModule` | existe | Corrigido mapeamento frontend que apontava para `/employees`. |
| RH folha | `/hr/payroll` | `HrModule` | existe | Corrigido mapeamento frontend que apontava para `/payroll`. |
| RH afastamentos | `/hr/leave-requests` | `HrModule` | existe | Corrigido mapeamento frontend que apontava para `/leave`. |
| Conteudos/deteccoes | `/content-detections` | `ContentDetectionsModule` | existe | Corrigido alias `conteudos`; `deteccoes` ja estava correto. |
| Marketing tasks | pendente | inexistente | bloqueado em producao | `tarefas_marketing` sem controller backend; dev-only fallback explicito. |
| Monitoramentos | pendente | inexistente | bloqueado em producao | `monitoramentos` sem controller backend; dev-only fallback explicito. |
| Licencas | pendente | inexistente | bloqueado em producao | Futuro modulo de licensing; nao usar mock em producao. |
| Rules/financial rules | pendente | inexistente | bloqueado em producao | `regras` e `regras_financeiras` sem controller backend. |
| Roles/permissions CRUD | pendente | inexistente | bloqueado em producao | Permissoes sao computadas via backend/auth context; nao existe CRUD canonico ainda. |

## Production Rule

`PENDING_TABLES` may fallback to in-memory data only outside production. In production, any pending table throws an integration error so the UI cannot silently operate on mock data.
