# Módulo `inventory` — Auditoria Zero-Gap (Fase 2, Prompt 107)

STATUS: **COMPLETE** — UNMAPPED_*: 0, UNKNOWN_FIELD_CLASSIFICATIONS: 0.

Escopo real (menor que os módulos anteriores — confirmado por rastreamento completo, não por
suposição): 1 tabela física (`inventory_items`, 19 colunas), 1 controller/service/DTO no backend, 1
página + 2 modais + 1 hook real no frontend. Nenhuma tabela de `stock_movements`, `warehouses`,
`locations`, `reservations`, `loans`, `maintenance_records`, `suppliers` ou `barcodes` existe no
banco (confirmado via `database-backend-column-mapping.json` — busca por `inventor|equipment|
asset|stock|warehouse|movement|loan|maintenance|reservation|supplier|barcode` só retornou
`inventory_items` como tabela do domínio deste módulo; as demais tabelas `*_assets` pertencentes a
`audiovisual`/`marketing`/`projects`/`tasks` já são de outros domínios, não reauditados aqui).

---

## 1. Subdomínios reais identificados

| Subdomínio | FRONTEND_ENTRYPOINT | ENDPOINTS | BACKEND_CONTROLLER | SERVICE | DATABASE_TABLES |
|---|---|---|---|---|---|
| ITEM | `Inventario.tsx`, `InventarioFormModal.tsx`, `InventarioViewModal.tsx` | `GET/POST/PATCH/DELETE /inventory` | `inventory.controller.ts` | `inventory.service.ts` | `inventory_items` |

**Apenas 1 subdomínio real.** `CATEGORY` (não é uma entidade — é uma string livre validada apenas
por um `<Select>` de opções hardcoded no formulário, sem tabela própria), `STOCK`/`MOVEMENT`/
`LOCATION`/`WAREHOUSE`/`RESERVATION`/`LOAN`/`MAINTENANCE`/`SUPPLIER`/`PURCHASE`/`ATTACHMENT` — todos
**NOT_IMPLEMENTED** como entidades/subdomínios próprios (ver seções 12-26 para o detalhamento de
cada um, com evidência específica de ausência).

---

## 2. `Auditoria.tsx` — CROSS_MODULE_AUDITORIA_TSX

Ferramenta real (mesma já auditada em todos os módulos anteriores): entrada `module: "inventory"`,
`table: "inventario"` em `apps/web/src/shared/lib/audit/runner.ts:157-170`.

`AUDITORIA_INVENTORY_FIELDS`:

| Campo | Severidade |
|---|---|
| `nome` | obrigatorio |
| `categoria` | obrigatorio |
| `status` | obrigatorio |
| `valor` | recomendado |
| `localizacao` | recomendado |

`AUDITORIA_INVENTORY_RULES`: mesmo motor genérico (`hasValue()`) usado em todos os módulos já
auditados — sem regra específica adicional para `inventory`. `fixPath`: `editPath("/inventario",
row)` → `/inventario?edit=<id>`.

`AUDITORIA_INVENTORY_DATABASE_SOURCES`: `storage.list("inventario")` → `GET /inventory` (via
`api-client.ts:85`, `inventario: "/inventory"`) — mesmo endpoint real usado pelo resto do módulo.

`AUDITORIA_INVENTORY_GAPS` (2, confirmados por leitura de código):

1. **Campo recomendado sempre "faltante"**: a Auditoria verifica `row.valor`, mas a coluna real e o
   campo real do DTO/resposta é `valor_unitario` (confirmado em `database-backend-column-mapping.
   json` e em `inventory.dto.ts`) — `row.valor` é sempre `undefined`, então todo item com um valor
   unitário genuinamente preenchido ainda aparece como "Valor" recomendado-faltante na Auditoria.
2. **Deep-link sem handler**: `fixPath` aponta para `/inventario?edit=<id>`, mas `Inventario.tsx`
   não implementa nenhum `useSearchParams`/tratamento de query string (confirmado por leitura
   completa do arquivo, 256 linhas) — mesmo padrão de deep-link quebrado já confirmado em
   `events.md`/`crm-relationships.md` para outros módulos.

`AUDITORIA_TSX_INVENTORY_SECTION_COMPLETE: SIM`.

---

## 3. Componentes (classificação completa)

| Componente | Classificação | Observação |
|---|---|---|
| `InventarioFormModal.tsx` | CREATE_MODAL + EDIT_MODAL | 427 linhas, único formulário; mapeamento de **criação** correto e completo; mapeamento de **edição** (pré-preenchimento) com bug real — ver §8 |
| `InventarioViewModal.tsx` | DETAIL_MODAL | 123 linhas, leitura defensiva (`item.local ?? item.localizacao`, `item.valorUnitario ?? item.valor_unitario ?? item.valorUnit`) — mais robusta que a tabela principal |
| `Inventario.tsx` | TABLE + FILTER + SEARCH + SORT(client, ver §31) + STATIC(métricas) | página única, 256 linhas |
| `hooks/inventory.store.ts` | DEAD | Zustand store, zero consumidores fora do próprio arquivo (mesmo padrão já visto em `events.md`/`catalog.md`) |
| `services/inventory.service.ts` | DEAD | zero consumidores — a página real usa `useInventario()` diretamente |
| `constants/index.ts`, `forms/index.ts`, `schemas/index.ts`(barrel), `utils/index.ts` | STATIC (stub) | pastas vazias, mesmo padrão de scaffold já visto em todos os módulos anteriores |
| `store/index.ts`, `store/inventory.store.ts` | DEAD | re-export/duplicata do `hooks/inventory.store.ts`, mesmo zero consumidores |

Não há `RELATION_SELECTOR`/`CATEGORY_SELECTOR`(estruturado)/`LOCATION_SELECTOR`(estruturado)/
`SUPPLIER_SELECTOR`/`QUANTITY_CONTROL`(dedicado, além do `<Input type="number">`)/`STOCK_BADGE`/
`MOVEMENT_UI`/`RESERVATION_UI`/`LOAN_UI`/`MAINTENANCE_UI`/`UPLOAD`/`IMPORT`/`EXPORT`(nível de
página)/`BARCODE_UI`/`QR_UI`/`REALTIME_CONSUMER` — nenhum desses componentes existe neste módulo
(confirmado por leitura completa de todos os arquivos do diretório).

---

## 4. Hooks

| HOOK | FILE | SUBDOMAIN | ENDPOINTS | READ/WRITE | REALTIME | TENANT_DEP |
|---|---|---|---|---|---|---|
| `useInventario` | `hooks/useInventario.ts` | ITEM | `GET/POST/PATCH/DELETE /inventory` (via `useDataQuery`/`storage`, `table: "inventario"`) | leitura completa da lista + create/update/delete | não | implícito (`CurrentTenant()` no backend) |

**1 hook ativo, totalmente classificado.** Sem `QUANTITY_FIELDS` dedicados (quantidade é só mais um
campo do objeto, não um sub-hook próprio), sem `MOVEMENT_USAGE` (não existe conceito de
movimentação), sem `STORAGE_USAGE`.

---

## 5. CREATE ITEM — mapeamento campo a campo

`InventarioFormModal.tsx::onSubmit` constrói o payload explicitamente (linhas 146-159) mapeando
CORRETAMENTE os nomes internos do formulário (camelCase, usados só dentro do `react-hook-form`) para
os nomes reais de API/DB (snake_case):

| FORM_FIELD (interno) | LABEL | TYPE | REQUIRED | API_REQUEST_FIELD | DATABASE_COLUMN | PERSISTED |
|---|---|---|---|---|---|---|
| `nome` | Nome do Item | string | sim (zod `.min(1)`) | `nome` | `inventory_items.nome` | sim |
| `categoria` | Categoria | select (9 opções fixas) | não | `categoria` | `.categoria` | sim |
| `quantidade` | Quantidade | number | sim na UI (zod `.min(1)`; backend aceita `.min(0)` — ver Gap #6) | `quantidade` | `.quantidade` | sim |
| `localizacao` | Localização | string livre | não | `localizacao` | `.localizacao` | sim |
| `responsavel` | Responsável | string livre | não | `responsavel` | `.responsavel` | sim |
| `status` | Status | select (6 opções no form — ver Gap #5, ENUM_MISMATCH) | sim (zod enum) | `status` | `.status` | sim |
| `setor` | Setor | select (16 opções fixas) | não | `setor` | `.setor` | sim |
| `localCompra` | Local de Compra | string livre | não | `local_compra` | `.local_compra` | sim |
| `numeroNotaFiscal` | Número da Nota Fiscal | string livre | não | `numero_nota_fiscal` | `.numero_nota_fiscal` | sim |
| `dataEntrada` | Data de Entrada | date picker | não (default: hoje) | `data_entrada` | `.data_entrada` | sim |
| `valor_unitario` | Valor Unitário (R$) | number | não | `valor_unitario` | `.valor_unitario` | sim |
| `observacoes` | Observações | textarea | não | `observacoes` | `.observacoes` | sim |
| "Valor Total" | Valor Total (Calculado) | derivado (`quantidade × valor_unitario`, `useMemo`) | — | **nunca enviado** | nenhuma coluna própria | **UI_ONLY/DERIVED** — calculado só para exibição, não persistido (não há coluna `valor_total`/`current_value` no banco) |

**Todos os 12 campos reais do formulário de criação são corretamente mapeados e persistidos** — o
`onSubmit` já converte para os nomes snake_case corretos. `CREATE_FIELDS: 12` (11 campos de
domínio + status).

---

## 6. EDIT ITEM — Create ≠ Edit (bug real confirmado)

Mesmo componente (`mode: "create"|"edit"|"view"`), mas o **pré-preenchimento** do formulário em modo
edição (`useEffect` que chama `reset({...})` quando `item` é passado, linhas 108-121) lê os campos
do objeto `item` (a resposta real da API) usando os MESMOS NOMES INTERNOS camelCase que o formulário
usa para si mesmo, em vez dos nomes reais retornados pela API:

```js
reset({
  ...,
  localCompra:       item.localCompra || "",        // API real retorna item.local_compra
  numeroNotaFiscal:  item.numeroNotaFiscal || "",    // API real retorna item.numero_nota_fiscal
  dataEntrada:       item.dataEntrada || <hoje>,     // API real retorna item.data_entrada
});
```

**EDIT_MAPPING_MISMATCH confirmado**: `item.localCompra`, `item.numeroNotaFiscal` e `item.dataEntrada`
são sempre `undefined` na resposta real de `GET /inventory/:id` (que retorna `local_compra`/
`numero_nota_fiscal`/`data_entrada`) — ao abrir um item existente para edição, esses 3 campos
**sempre aparecem vazios/com o valor padrão**, mesmo que o item tenha esses dados genuinamente
persistidos no banco. Se o usuário salvar a edição sem notar e sem preencher novamente, o
`onSubmit` envia `undefined` para esses 3 campos (que o `PATCH` trataria como "não alterar", já que
`UpdateInventoryItemDto extends PartialType(...)` e o backend só atualiza o que vier no DTO) — na
prática o dado NÃO é apagado no banco (PATCH parcial preserva o valor antigo), mas a UI mostra ao
usuário um formulário de edição incorreto/incompleto, podendo levá-lo a re-digitar um valor
diferente do original sem perceber que já existia um.

Os demais 9 campos (`nome`, `categoria`, `quantidade`, `localizacao`, `status`, `responsavel`,
`setor`, `valor_unitario`, `observacoes`) usam o MESMO nome no formulário e na API — pré-preenchimento
correto para esses.

`EDIT_FIELDS: 12` (mesmos 12 do create). `IMMUTABLE_AFTER_CREATE: nenhum campo` (todos editáveis).
`DATABASE_MAPPING`: idêntico ao create para os 12 campos (a divergência é só na LEITURA para
popular o formulário, não na escrita).

---

## 7. Identificação do item

| FIELD | DATABASE_COLUMN | UNIQUE | GENERATED_OR_MANUAL | VALIDATION | NORMALIZATION | SEARCH_USAGE |
|---|---|---|---|---|---|---|
| `id` | `id` (uuid) | sim (PK) | GENERATED (`gen_random_uuid()`) | — | — | não (não é buscável pelo usuário) |
| `nome` | `nome` | **NÃO** (sem constraint UNIQUE no banco, confirmado na Fase 1) | MANUAL | `@IsString @MaxLength(255)` (backend), `.min(1).max(150)` (frontend — **DEFAULT_MISMATCH**: limite de 150 no frontend vs. 255 no backend, o frontend é mais restritivo, não é um bug funcional mas é uma divergência real de regra) | `.trim()` só no frontend (zod) | sim — busca por nome (`ILIKE`, backend; `.includes()`, frontend) |

**Nenhum SKU, código interno, barcode, QR code, número de série, modelo ou marca existe** em
nenhuma camada (schema, DTO, formulário) — `nome` é o único identificador humano do item, sem
nenhuma normalização/geração automática, sem unicidade garantida (dois itens podem ter exatamente o
mesmo `nome`, sem aviso).

---

## 8. Categorias

Não existe uma entidade/tabela de categorias — `categoria` é uma coluna `character varying` livre em
`inventory_items`, validada no formulário apenas por um `<Select>` com 9 opções hardcoded no
componente (`categoriasOptions`, linhas 43-53 de `InventarioFormModal.tsx`): Áudio, Computador,
Escritório, Estrutura, Iluminação, Mobília, Software, Vídeo, Outros. Sem hierarquia (sem
`parent_id`), sem `CATEGORY_ID` próprio, sem descrição, sem status.

```text
CREATE:   via <Select> das 9 opções fixas (não permite digitar categoria livre — o backend aceitaria
          qualquer string, mas a única UI real restringe às 9)
EDIT:     mesmo <Select>
DISPLAY:  Badge simples (`item.categoria`)
FILTER:   dropdown na página principal com 5 opções (áudio/vídeo/computador/iluminação/estrutura —
          SUBCONJUNTO das 9 do formulário; "Escritório"/"Mobília"/"Software"/"Outros" nunca
          aparecem como opção de filtro, apesar de serem selecionáveis na criação — REAL_MAPPING_GAP
          menor, um item criado com essas 4 categorias nunca pode ser isolado via filtro de
          categoria, só via busca textual)
RELATION: nenhuma (string livre, sem FK)
DATABASE_MAPPING: `inventory_items.categoria` (DIRECT)
```

`CATEGORY_FIELDS: 1` (a própria coluna `categoria`).

---

## 9. Quantidade / Estoque

| FIELD | DATABASE_COLUMN | TYPE | DEFAULT | DERIVED_OR_PERSISTED | UPDATE_SOURCE |
|---|---|---|---|---|---|
| `quantidade` | `quantidade` (integer) | integer | `0` (banco) / `1` (frontend, no formulário) | PERSISTED | sobrescrita direta pelo valor absoluto digitado no formulário a cada create/update |

**Não existem** `available_quantity`, `reserved_quantity`, `minimum_quantity`, `maximum_quantity`,
`damaged_quantity`, `in_use_quantity` — apenas a única coluna `quantidade`, um contador simples,
sem nenhuma subdivisão. `QUANTITY_FIELDS: 1`.

---

## 10. Regra de estoque

```text
STOCK_MODEL: QUANTITY_SNAPSHOT

O saldo (`quantidade`) é um valor absoluto armazenado diretamente na linha do item, sobrescrito a
cada PATCH com o valor que o usuário digitar no formulário — NÃO existe um ledger de movimentações
(entradas/saídas) do qual o saldo seria derivado por soma. Não há fórmula de cálculo
(INITIAL + ENTRIES - EXITS ...) porque não há histórico de transações de estoque — apenas o estado
atual, decidido a cada edição pelo usuário.
```

---

## 11. Movimentações

**Não implementado.** Nenhuma tabela `inventory_movements`/`stock_movements` existe no banco
(confirmado na Fase 1), nenhum endpoint de movimentação existe no `InventoryController`
(`GET/POST/PATCH/DELETE /inventory` são as únicas 4 rotas), nenhum componente de UI de
entrada/saída/transferência/ajuste foi encontrado. `status: "em_uso"`/`"manutencao"`/etc. é apenas
um campo de rótulo na própria linha do item — não gera nenhum registro de movimentação associado.
`MOVEMENT_FIELDS: 0`. `MOVEMENT_TYPES: 0`.

---

## 12. Transação de estoque / Concorrência

```text
MOVEMENT_CREATED: NOT_APPLICABLE (não existem movimentações)
QUANTITY_UPDATED: SIM — via UPDATE de linha única (`inventory.service.ts::update()`,
       `this.repository.update({id, tenant_id}, {...dto, updated_at, updated_by})`)
SAME_TRANSACTION: NOT_APPLICABLE (não há uma segunda escrita — "movimento" e "novo saldo" são o
       mesmo único UPDATE)
STOCK_CONSISTENCY_GAP: não aplicável no sentido de "saldo divergente do histórico" (não há
       histórico para divergir) — mas ver INVENTORY_HISTORY_GAP abaixo (§18) para o achado
       correspondente de auditabilidade.

CONCURRENCY_CONTROL: NONE — o `update()` grava o valor de `quantidade` (e demais campos) tal como
       veio no `dto`, sem verificação de versão (sem `updated_at`/`version` otimista) e sem lock
       de linha explícito. Se dois usuários abrirem o mesmo item simultaneamente com valores de
       `quantidade` diferentes em mente e ambos salvarem, o último `PATCH` a chegar vence
       silenciosamente (last-write-wins) — um STOCK_CONCURRENCY_GAP real, mas da mesma classe de
       risco genérica de qualquer formulário CRUD simples sem lock otimista (não é uma falha
       específica de um "saldo mutável de alta frequência" como em um sistema de estoque real de
       movimentação contínua, dado que aqui a alteração é sempre manual, via formulário).
```

---

## 13. Saldo negativo

```text
NEGATIVE_STOCK_ALLOWED: NÃO
BACKEND_ENFORCEMENT: SIM — `@Min(0)` em `CreateInventoryItemDto.quantidade` (class-validator)
DATABASE_ENFORCEMENT: NÃO — a coluna `quantidade` (integer) não tem CHECK constraint (confirmado na
       Fase 1, `check_constraint: []`) — a proteção existe só na camada de validação HTTP, não no
       schema
FRONTEND_ENFORCEMENT: SIM, mas mais restritivo — zod exige `.min(1)` (não permite nem 0), enquanto o
       backend permite 0 — DEFAULT_MISMATCH real (não impede o usuário de operar, apenas o
       frontend é mais rígido que o back nesse ponto específico; não classificado como bug
       funcional, pois nenhum caminho real tenta enviar 0 hoje)
```

---

## 14. Reservas, Empréstimos, Manutenção

**Todos NOT_IMPLEMENTED como entidade/fluxo próprio** — confirmado pela ausência de qualquer tabela
(`reservations`/`loans`/`maintenance_records`) e de qualquer endpoint/componente dedicado.

```text
RESERVATION_FIELDS: 0 (o valor "reservado" existe no enum de status do BACKEND — ver §16 — mas não
       há CAMPOS de reserva (quem reservou, quantidade reservada, período) além do rótulo de status
       em si; e esse valor "reservado" nem sequer é oferecido pela UI real, ver Gap de enum abaixo)
LOAN_FIELDS: 0 (o valor "emprestado" existe apenas no FRONTEND — zod schema e shared type — mas,
       pela mesma razão, não há campos de empréstimo (borrower, checkout_at, expected_return_at,
       returned_at) — é só um rótulo de status, e o backend sequer aceita esse valor, ver Gap #5)
MAINTENANCE_FIELDS: 0 (mesmo raciocínio para "manutencao" — presente nas 3 camadas de enum, mas sem
       nenhum campo de manutenção (tipo, descrição, data agendada, custo, fornecedor) além do
       rótulo de status)
```

`STATUS` funciona, na prática, como um rótulo livre de "situação atual do item" sem nenhum dos
fluxos de negócio (criar reserva, criar empréstimo, agendar manutenção) que os nomes dos valores
sugerem — mudar o status de um item para "manutencao" não dispara nenhum efeito colateral, não cria
nenhum registro, não bloqueia nenhuma ação.

---

## 15. Status / Condition — ENUM_MISMATCH confirmado (3 vocabulários divergentes)

| Camada | Fonte | Valores |
|---|---|---|
| Backend DTO (`@IsIn`, valida a escrita real) | `apps/api/src/modules/inventory/dto/inventory.dto.ts:6` | `disponivel`, `em_uso`, `manutencao`, `descartado`, **`reservado`** |
| Frontend Zod (`inventarioSchema`, valida o formulário) | `apps/web/src/modules/inventory/schemas/inventario-schema.ts:21` | `disponivel`, `em_uso`, **`emprestado`**, `manutencao`, **`danificado`**, `descartado` |
| Shared type (`InventarioStatus`) | `apps/web/src/shared/types/enums.ts:281` | `disponivel`, `em_uso`, `manutencao`, `descartado`, **`emprestado`** |

Nenhuma das 3 listas é idêntica às outras duas. Efeito prático confirmado: `InventarioFormModal.tsx`
oferece 6 opções na UI (`statusOptions`, linhas 55-62) — as mesmas 6 do schema Zod — incluindo
**`emprestado`** e **`danificado`**, nenhuma das quais o `@IsIn(STATUSES)` do backend aceita.
**Selecionar "Emprestado" ou "Danificado" no formulário e salvar resulta em HTTP 400** (rejeição de
validação do NestJS `ValidationPipe`) — um bug real e acionável pelo usuário através do fluxo normal
da UI. Inversamente, `reservado` (aceito pelo backend) nunca é oferecido em nenhuma tela — um item
não pode ser colocado nesse status através da UI real.

```text
FRONTEND_LABEL → FRONTEND_VALUE → BACKEND_ACEITA?
Disponível      → disponivel      → SIM
Em Uso          → em_uso          → SIM
Emprestado      → emprestado      → NÃO (400)
Em Manutenção   → manutencao      → SIM
Danificado      → danificado      → NÃO (400)
Descartado      → descartado      → SIM
(nenhum label)  → reservado       → N/A (nunca ofertado pela UI)
```

`FILTER_USAGE`: o filtro de status na página principal (`statusFilter`) só oferece 3 das 6 opções
do form (`em-uso`/`disponivel`/`manutencao` — nem "emprestado"/"danificado"/"descartado" são
filtráveis via dropdown, só via busca textual indireta, que também não cobre status).

`TRANSITIONS`: nenhuma regra de transição de estado — qualquer status pode ser escolhido a qualquer
momento (mesma ausência de workflow já confirmada em outros módulos simples desta série).

---

## 16. Location / Warehouse

`localizacao` é uma única coluna `character varying` de texto livre — **não é uma entidade
estruturada**. Não existem `warehouse`/`room`/`shelf`/`bin`/`address` como campos ou tabelas
próprias. O único artefato de "localização estruturada" é ilusório: o filtro `localFilter` na
página principal (`Inventario.tsx:61-65`) compara `item.localizacao` contra 4 strings EXATAS
hardcoded ("Estúdio 1", "Estúdio 2", "Escritório", "Estoque"), enquanto o campo de formulário é um
`<Input>` de texto livre com placeholder de exemplo ("Ex: Estúdio A, Sala 201, Depósito") — ou seja,
o filtro assume uma taxonomia fixa que a UI de criação não impõe. Um item cadastrado com
`localizacao: "Estúdio A"` (exatamente o exemplo do próprio placeholder) **nunca aparece** ao
filtrar por "Estúdio 1" nem por nenhuma das 4 opções — REAL_MAPPING_GAP confirmado, o filtro de
local é estruturalmente quase-morto para dados reais digitados livremente.

```text
FRONTEND_FIELD: localizacao (texto livre)
API_FIELD: localizacao
DATABASE_RELATION: nenhuma (coluna simples, sem FK)
CARDINALITY: N/A
TENANT_SCOPE: herdado da linha do item (tenant_id da tabela inventory_items)
```

`LOCATION_FIELDS: 1`.

---

## 17. Transferências

**NOT_IMPLEMENTED.** Nenhum campo, endpoint ou componente de transferência de item entre locais foi
encontrado — mudar a "localização" de um item é apenas editar o campo de texto livre via o mesmo
formulário de edição genérico, sem nenhum conceito de "transferência" (origem/destino/aprovação)
distinto de uma edição comum.

---

## 18. Custos

| FIELD | DATABASE_TYPE | PRECISION/SCALE | CURRENCY | SOURCE | ACCOUNTING_RELATION |
|---|---|---|---|---|---|
| `valor_unitario` | `numeric` (sem precisão/escala fixada no schema, confirmado na Fase 1) | genérico (Postgres `numeric` sem restrição) | implícita — BRL (formatação `pt-BR`/`formatCurrency`), sem coluna de moeda | manual, digitado no formulário | nenhuma (ver §19) |

`current_value`/`replacement_value`/`maintenance_cost`/`purchase_cost` (como campos distintos de
`valor_unitario`) **não existem** — "Valor Total" exibido na UI (form e página) é sempre um cálculo
client-side (`quantidade × valor_unitario`), nunca uma coluna persistida. `FINANCIAL_FIELDS: 1`
(`valor_unitario`).

---

## 19. Inventory ↔ Accounting

**NOT_IMPLEMENTED.** Nenhuma propagação automática ou manual foi encontrada entre `inventory_items`
e `transactions`/`invoices` (módulo `accounting`, já auditado, não reaberto aqui) — apesar dos
campos `valor_unitario`, `local_compra` e `numero_nota_fiscal` sugerirem fortemente um registro de
compra, não existe nenhum botão "Lançar como despesa"/nenhum `@OnEvent`/nenhuma chamada de serviço
cruzando os dois módulos (confirmado por leitura completa de `inventory.service.ts`, que não emite
nenhum evento de domínio, e por busca de consumidores de `InventoryItemEntity`/`inventory_items`
fora do próprio módulo — nenhum resultado em `apps/api/src` além dos já esperados: entities.ts,
migrations, e os módulos genéricos de relatórios/RLS).

```text
INVENTORY_ACTION: criar/editar item com valor_unitario preenchido
FINANCIAL_RESOURCE: nenhum
DATABASE_RELATION: nenhuma
CLASSIFICAÇÃO: NOT_IMPLEMENTED (nem MANUAL_ONLY nem UI_ONLY — não há sequer um caminho manual de
       registrar a compra como transação a partir do item de inventário; o usuário precisaria
       criar a transação de forma totalmente independente no módulo `accounting`)
```

---

## 20. Fornecedores

**Não existe relação real com CRM/fornecedores.** `local_compra` é uma coluna `character varying`
de texto livre (ex.: "Loja de Música ABC", conforme o próprio placeholder do formulário) — não há
`supplier_id`, não há `<Select>` de fornecedor, não há vínculo com a tabela `clients` (já auditada
em `crm-relationships.md`, não reaberta aqui). Consistente com a instrução do prompt de não inventar
uma relação inexistente — confirmado que ela genuinamente não existe.

---

## 21. Projetos / Audiovisual / Events

**Nenhuma relação encontrada.** Busca exaustiva por `InventoryItemEntity`/`inventory_items` fora do
próprio módulo `inventory` (backend) e por `useInventario`/`modules/inventory` fora do próprio
módulo (frontend) não encontrou nenhum consumidor em `projects`, `audiovisual` ou `events` — itens
de inventário não podem ser alocados/reservados para um projeto, produção audiovisual ou evento em
nenhuma camada do sistema hoje.

---

## 22. Ownership / Assignment

`responsavel` é uma coluna `character varying` de texto livre (nome digitado, não uma FK para
`users`/`employees`) — não é uma atribuição estruturada com cardinalidade/início/fim, é apenas um
rótulo textual. Nenhum outro campo de atribuição (a artista, equipe, projeto, evento, local
estruturado) existe.

---

## 23. Tables/Grids — rastreabilidade de colunas

| SCREEN | COLUMN_LABEL | COLUMN_KEY | API_FIELD | DATABASE_COLUMN | DERIVED | SORTABLE | FILTERABLE | SEARCHABLE |
|---|---|---|---|---|---|---|---|---|
| Inventario.tsx | (checkbox) | — | — | — | UI_ONLY | não | não | não |
| Inventario.tsx | Nome | `nome` | `nome` | `inventory_items.nome` | não | não (ver §31) | não | sim |
| Inventario.tsx | Categoria | `categoria` | `categoria` | `.categoria` | não | não | sim | sim |
| Inventario.tsx | Setor | `setor` | `setor` | `.setor` | não | não | não | não |
| Inventario.tsx | Localização | `localizacao` | `localizacao` | `.localizacao` | não | não | sim (ver Gap §16) | sim |
| Inventario.tsx | Responsável | `responsavel` | `responsavel` | `.responsavel` | não | não | não | não |
| Inventario.tsx | Status | `status` | `status` | `.status` | não | não | sim | não |
| Inventario.tsx | Qtd. | `quantidade` | `quantidade` | `.quantidade` | não | não | não | não |
| Inventario.tsx | Valor Unit. | `valor_unitario` | `valor_unitario` | `.valor_unitario` | não | não | não | não |
| Inventario.tsx | Valor Total | (derivado) | — | — | **DERIVED** (`valor_unitario × quantidade`, client-side) | não | não | não |
| Inventario.tsx | Entrada | `dataEntrada` | **`data_entrada`** (real) | `.data_entrada` | não | não | não | não | **DISPLAY_MAPPING_MISMATCH confirmado**: a coluna lê `item.dataEntrada` (camelCase), que é sempre `undefined` na resposta real da API — a coluna "Entrada" **sempre exibe "—"**, mesmo para itens com `data_entrada` genuinamente preenchida |

Nenhuma coluna visível ficou sem origem — 10 de 11 colunas de dados mapeiam corretamente; 1
(`Entrada`) tem uma origem real (`data_entrada`) mas o código lê o nome errado.

---

## 24. Details (InventarioViewModal.tsx)

| DISPLAY_LABEL | DISPLAY_FIELD (lido) | API_FIELD real | Situação |
|---|---|---|---|
| Nome/Categoria (header) | `item.nome`/`item.categoria` | `nome`/`categoria` | correto |
| Status | `item.status` | `status` | correto |
| Quantidade | `item.quantidade ?? item.qtd` | `quantidade` | correto (fallback `qtd` nunca usado, mas inofensivo) |
| Localização | `item.local ?? item.localizacao` | `localizacao` | correto (cai no segundo fallback) |
| Valor Unitário | `item.valor_unitario ?? item.valorUnitario ?? item.valorUnit` | `valor_unitario` | correto (primeiro fallback já bate) |
| Valor Total | derivado (`valorUnitario × quantidade`) | — | DERIVED, client-side |
| Setor | `item.setor` | `setor` | correto |
| Responsável | `item.responsavel` | `responsavel` | correto |

**Diferente da tabela principal e do formulário de edição**, o `InventarioViewModal` usa cadeias de
fallback defensivas em quase todo campo — por isso não sofre do bug de `dataEntrada`/`localCompra`/
`numeroNotaFiscal` (esses 3 campos, aliás, **nem são exibidos** neste modal — `local_compra`,
`numero_nota_fiscal` e `data_entrada` não aparecem em lugar nenhum do detalhe, apesar de existirem
no banco e serem coletados no formulário — um DISPLAY_MAPPING_GAP por omissão, não por nome errado:
o usuário não consegue ver esses 3 campos em nenhuma tela de leitura, só no formulário de edição
recém-aberto, e mesmo ali, incorretamente vazios, ver §6).

`EMPTY_STATE`: "—" para campos ausentes/nulos, consistente com o padrão dos demais módulos.

---

## 25. Filters, Search, Sort, Paginação, Limites

**FILTERS** (`Inventario.tsx`): 3 — `categoryFilter` (5 de 9 opções reais, ver §8), `statusFilter`
(3 de 6 opções reais, ver §15), `localFilter` (4 strings fixas contra um campo de texto livre, ver
§16). Todos 100% client-side, sobre o array já carregado — nenhum vira query-param HTTP real,
apesar de `QueryInventoryDto` aceitar `status`/`categoria`/`search` no backend (o mesmo padrão de
"filtro backend pronto, nunca chamado pelo frontend" já confirmado em módulos anteriores desta
série).

**SEARCH**: `searchTerm` compara `item.nome`/`item.categoria`/`item.localizacao` via
`.toLowerCase().includes()` — 100% client-side, os 3 campos comparados são nomeados corretamente.

**SORT**: nenhum controle de ordenação interativo na tabela (sem `SortableTableHead` nem
equivalente) — a ordem é a de chegada da API (`ORDER BY i.created_at DESC`, hardcoded no backend,
`inventory.service.ts:31`), sem nenhuma forma de o usuário reordenar por nome/quantidade/valor.
`SORT_FIELDS: 0` (interativos).

**PAGINAÇÃO**: `usePagination(filteredEquipamentos, 10)` — paginação 100% client-side sobre o array
já filtrado, que por sua vez já veio truncado do backend (ver Limites abaixo). `TOTAL_COUNT_SOURCE`:
`filteredEquipamentos.length` (contagem do array já truncado, não do total real do tenant).

**LIMITES**:

| ENDPOINT_OR_COMPONENT | LIMIT | SERVER_OR_CLIENT | INTENTIONAL | AFFECTS_TOTAL |
|---|---|---|---|---|
| `GET /inventory` (via `useInventario()`, sem override) | 50 (`PaginationDto.limit` default, `inventory.service.ts:33` `query.limit ?? 50`) | SERVER (silencioso) | NÃO | **SIM** — mesmo padrão de truncamento silencioso já confirmado em praticamente todos os módulos anteriores desta série (`works`, `phonograms`, `contracts`, `clients`, `events`, os hooks do `dashboard`) — aqui afeta a lista principal, as métricas do topo da página (`metricas.total`/`.emUso`/`.disponiveis`/`.emManutencao`/`.valorTotal`, todas computadas sobre o mesmo array truncado) e a paginação client-side (que pagina um subconjunto, não o total real) |

`TRUNCATION_GAP` confirmado — mesma causa raiz estrutural já documentada em todos os módulos
anteriores.

---

## 26. Import / Export / XLSX

**Import (nível de página): NOT_IMPLEMENTED.** Nenhum botão/fluxo de importação foi encontrado em
`Inventario.tsx` nem em nenhum outro arquivo do módulo (diferente de `events`/`catalog`, que têm
import XLSX client-side próprio, ainda que quebrado) — o módulo `inventory` simplesmente não
oferece essa funcionalidade em nenhuma forma, nem funcional nem quebrada.

**Export (nível de página): NOT_IMPLEMENTED** pela mesma ausência — nenhum botão de exportação na
página do módulo.

**Export via Central de Relatórios (mecanismo genérico, já auditado estruturalmente em módulos
anteriores)**: `inventory_items` **está registrado e corretamente mapeado**
(`report-form-contracts.ts:586-595`, `INVENTORY_ITEMS_CONTRACT`) — os 12 campos reais
(`nome`, `categoria`, `quantidade`, `valor_unitario`, `localizacao`, `status`, `responsavel`,
`setor`, `data_entrada`, `local_compra`, `numero_nota_fiscal`, `observacoes`) usam os NOMES REAIS
snake_case corretos — **este caminho de export não sofre do bug de `dataEntrada`/`localCompra`/
`numeroNotaFiscal` da UI própria do módulo**, porque o motor genérico de relatórios lê diretamente
do schema real, não do código de `Inventario.tsx`. `WORKSHEET_COUNT`: herdado do motor genérico
(já confirmado em módulos anteriores como respeitando `XLSX_MAX_SHEETS: 2`, não reauditado
individualmente aqui por não ser um mecanismo específico deste módulo). `XLSX_RULE_VIOLATION: NÃO`.

`IMPORT_FIELDS: 0`. `EXPORT_FIELDS: 12` (via Central de Relatórios). `XLSX_EXPORTS: 0` (nenhum
export XLSX específico do módulo `inventory` — só o compartilhado).

---

## 27. Duplicidade

Nenhuma regra de deduplicação existe para `nome` (nem `DATABASE_UNIQUE`, nem `BACKEND_CHECK`, nem
`FRONTEND_CHECK`) — como não há SKU/barcode/serial, não há campo algum candidato a chave de
duplicidade além do próprio `nome`, e mesmo esse não é verificado. `DUPLICATE_HANDLING_GAP`
confirmado: dois cliques rápidos no botão "Cadastrar Item" (sem debounce/disable visível além do
`disabled={isSubmitting}` do próprio botão, que cobre o caso mais óbvio de duplo-clique mas não uma
segunda tentativa deliberada) podem gerar 2 itens idênticos sem nenhum aviso.

---

## 28. Barcode / QR Code

**NOT_IMPLEMENTED.** Nenhum campo, biblioteca, componente de geração ou leitura de código de barras
ou QR code foi encontrado em nenhuma camada. `BARCODE_QR_FIELDS: 0`.

---

## 29. Storage (fotos, notas fiscais, manuais, garantias)

**NOT_IMPLEMENTED.** Apesar do formulário coletar `numero_nota_fiscal` (um número de referência em
texto), não existe nenhum campo de upload de arquivo (foto do item, PDF da nota fiscal, manual,
termo de garantia) em nenhuma camada — sem coluna de referência de storage em `inventory_items`
(confirmado na Fase 1: nenhuma coluna `*_url`/`*_key`/`attachment*`), sem endpoint de
presign/upload dedicado, sem componente de upload no formulário. `STORAGE_FIELDS: 0`.

---

## 30. Audit / History

Não existe um ledger de movimentações nem uma tabela de auditoria dedicada ao módulo — a única
trilha de mudança é a genérica: `@Audit('inventory.created'|'inventory.updated'|'inventory.deleted')`
no controller, que grava em `activity_logs` (mesmo `AuditInterceptor` já confirmado em todos os
módulos anteriores — registra a AÇÃO e o ator, não necessariamente um diff old_value/new_value
campo a campo). Não há UI que exiba esse histórico dentro do módulo `inventory` (a Activity Feed do
Dashboard, já auditada em `dashboard.md`, é o único consumidor cross-domain desse log, sujeito ao
mesmo gap de realtime já documentado lá).

```text
INVENTORY_HISTORY_GAP confirmado: alterar `quantidade` de um item (a operação mais sensível deste
módulo) não deixa nenhum registro específico do valor antigo vs. novo além do log de atividade
genérico (ação "inventory.updated", sem payload de diff estruturado garantido) — não há como, a
partir da UI ou de uma consulta simples ao banco, reconstruir "quanto tinha em estoque em uma data
passada" — o histórico de quantidade, se existir no JSON do activity log, não é exposto em nenhuma
tela.
```

---

## 31. Realtime

**NOT_IMPLEMENTED.** Nenhum `useWsEvent()` foi encontrado em nenhum arquivo do módulo `inventory`
(confirmado por leitura completa de `Inventario.tsx`/`InventarioFormModal.tsx`/
`InventarioViewModal.tsx`/`useInventario.ts`) — consistente com o contrato canônico de realtime já
fechado (doc37, 22 eventos catalogados), que não inclui nenhum evento relacionado a inventário.
`REALTIME_EVENTS: 0`.

---

## 32. Permissões e Tenant Isolation

| PERMISSION | FRONTEND_ENFORCEMENT | BACKEND_ENFORCEMENT |
|---|---|---|
| `inventory:read` | leitura não gateada explicitamente (assume-se acesso à página já gateado por rota) | `@RequireRole('viewer') @RequirePermission('inventory:read')` |
| `inventory:create` | botão "Novo Item" via `<RequirePermission module="inventory" action="write">` | `@RequireRole('editor') @RequirePermission('inventory:create')` |
| `inventory:update` | nenhum gate visível no item de menu "Editar" | `@RequireRole('editor') @RequirePermission('inventory:update')` |
| `inventory:delete` | nenhum gate visível no item de menu "Excluir" nem no botão de exclusão em massa | `@RequireRole('manager') @RequirePermission('inventory:delete')` |

`AUTHORIZATION_GAPS: 0` — todas as rotas reais estão protegidas no backend; ausência de gate visual
antecipado em editar/excluir é a mesma observação não-bloqueante já registrada em módulos
anteriores (o backend recusaria a operação de qualquer forma). Note-se que o botão "Excluir em
massa" (`handleBulkDelete`) dispara múltiplas chamadas `deleteInventario.mutate(id)` em loop — cada
uma passa pelo mesmo endpoint protegido, sem um endpoint de "delete em lote" dedicado (funcional,
apenas N requisições em vez de 1, não classificado como gap).

`TENANT_ISOLATION_GAPS: 0`. `InventoryService` filtra `tenant_id = :tenantId` em
`list`/`findById`/`update`/`softDelete`, e `create` grava `tenant_id: tenantId` explicitamente a
partir de `@CurrentTenant()` — consistente com o padrão já auditado em `auth.md`. Não há
`movements`/`locations`/`reservations`/`loans`/`maintenance`/`attachments` para os quais avaliar
isolamento adicional, pois nenhuma dessas entidades existe (§11-14, §29).

---

## 33. Delete / Archive

| UI_ACTION | ENDPOINT | DATABASE_BEHAVIOR | RELATION_IMPACT | SOFT_OR_HARD |
|---|---|---|---|---|
| Excluir item (`DeleteConfirmModal`, individual ou via seleção em massa) | `DELETE /inventory/:id` | `UPDATE inventory_items SET deleted_at = now()` | nenhum (sem tabelas filhas, §11-14) | SOFT |

Não há `ARCHIVE`/`RESTORE`/`DEACTIVATE` distintos do soft-delete padrão. `HAS_MOVEMENTS`: sempre
`false` (não existe o conceito) — `DELETE_ALLOWED`: sempre sim, sem nenhuma restrição de FK
(`foreign_key: false` em todas as colunas de `inventory_items`, confirmado na Fase 1) —
`HISTORY_PRESERVED`: N/A (não há histórico de movimentação para preservar/perder; o próprio item
soft-deletado preserva seus dados na linha, apenas oculto de `list`/`findById`).

---

## 34. Idempotência

Nenhum `idempotencyKey` em nenhum endpoint de `inventory` — `create` não tem proteção contra
double-submit no nível de servidor (só o `disabled={isSubmitting}` do botão no frontend). Como não
há import/sync/transfer neste módulo (§26, §17), o único caso relevante é `create` — registrado
como `IDEMPOTENCY_GAP` de baixa severidade (mesma classe de qualquer formulário CRUD simples sem
proteção server-side contra reenvio).

---

## Gaps consolidados (evidenciados, não corrigidos)

1. **EDIT_MAPPING_MISMATCH** — `InventarioFormModal.tsx` pré-preenche `localCompra`/
   `numeroNotaFiscal`/`dataEntrada` a partir de campos camelCase inexistentes na resposta real da
   API (que usa `local_compra`/`numero_nota_fiscal`/`data_entrada`) — esses 3 campos sempre
   aparecem vazios ao editar um item existente, mesmo com dado real persistido.
2. **DISPLAY_MAPPING_MISMATCH** — a coluna "Entrada" da tabela principal lê `item.dataEntrada`
   (sempre `undefined`), sempre exibindo "—" mesmo quando `data_entrada` está preenchida.
3. **DISPLAY_MAPPING_GAP** (omissão) — `local_compra`/`numero_nota_fiscal`/`data_entrada` nunca são
   exibidos no modal de detalhes (`InventarioViewModal.tsx`), apesar de existirem e serem
   coletados no formulário.
4. **ENUM_MISMATCH** (crítico) — 3 vocabulários de status divergentes entre backend DTO, Zod
   schema do frontend e shared type; a UI real oferece "Emprestado"/"Danificado", que o backend
   rejeita com HTTP 400; "Reservado" (aceito pelo backend) nunca é oferecido pela UI.
5. **REAL_MAPPING_GAP** — filtro de localização (`localFilter`) compara contra 4 strings exatas
   fixas, incompatível com o campo de texto livre real (`localizacao`) que o próprio placeholder do
   formulário incentiva a preencher de forma diferente.
6. **REAL_MAPPING_GAP** — filtro de categoria oferece só 5 das 9 categorias reais selecionáveis na
   criação.
7. **DEFAULT_MISMATCH** — quantidade mínima: frontend exige `≥1` (zod), backend aceita `≥0`
   (class-validator); limite de tamanho de `nome`: frontend `≤150`, backend `≤255`.
8. **TRUNCATION_GAP** — `GET /inventory` usa `PaginationDto.limit=50` e `useInventario()` nunca
   sobrescreve — lista, métricas e paginação client-side operam sobre um subconjunto truncado para
   tenants com mais de 50 itens.
9. **DUPLICATE_HANDLING_GAP** — nenhuma verificação de duplicidade de `nome` (ou qualquer outro
   campo) em nenhuma camada.
10. **STOCK_CONCURRENCY_GAP** — atualização de `quantidade` (e demais campos) é last-write-wins,
    sem lock otimista nem verificação de versão.
11. **INVENTORY_HISTORY_GAP** — sem ledger de movimentações; mudanças de `quantidade` não deixam
    trilha estruturada além do log de atividade genérico.
12. **IDEMPOTENCY_GAP** — `create` sem proteção server-side contra reenvio duplicado.
13. **FINANCIAL_INTEGRATION_GAP** — nenhuma propagação (automática ou manual) entre item de
    inventário e o módulo `accounting`, apesar dos campos de compra sugerirem essa necessidade.
14. **MOVEMENT_GAP / RESERVATION_GAP / LOAN_GAP / MAINTENANCE_GAP** — os 4 conceitos existem apenas
    como rótulos de `status` (parcialmente, dado o Gap #4), sem nenhum campo, tabela ou fluxo de
    negócio próprio por trás.
15. **STORAGE_GAP** — nenhum anexo (foto/nota fiscal/manual/garantia) implementado, nem mesmo de
    forma parcial/fake.
16. **AUDITORIA_TSX gap** — campo `valor` verificado pela Auditoria não corresponde ao campo real
    `valor_unitario`; deep-link `/inventario?edit=` sem handler na página (§2).
17. **DEAD CODE** (não contado como gap formal) — `hooks/inventory.store.ts`/`store/*`
    (Zustand, zero consumidores), `services/inventory.service.ts` (zero consumidores).

Total: 17 achados (3 DISPLAY/EDIT-mapping-família, 1 ENUM_MISMATCH, 2 REAL_MAPPING_GAP de filtro, 1
DEFAULT_MISMATCH, 1 TRUNCATION_GAP, 1 DUPLICATE_HANDLING_GAP, 1 STOCK_CONCURRENCY_GAP, 1
INVENTORY_HISTORY_GAP, 1 IDEMPOTENCY_GAP, 1 FINANCIAL_INTEGRATION_GAP, 1 achado agregando
MOVEMENT/RESERVATION/LOAN/MAINTENANCE_GAP, 1 STORAGE_GAP, 1 achado de Auditoria.tsx).

---

## Contadores finais (Zero-Gap)

```text
SUBDOMAINS_AUDITED: 1
COMPONENTS_AUDITED: 7
HOOKS_AUDITED: 1
CREATE_FORMS: 1
CREATE_FIELDS: 12
EDIT_FORMS: 1
EDIT_FIELDS: 12
MODALS_DRAWERS_WIZARDS: 2 (InventarioFormModal, InventarioViewModal)
TABLE_GRID_FIELDS: 11
DETAIL_DISPLAY_FIELDS: 8
IDENTIFIER_FIELDS: 1 (nome — único identificador real, sem SKU/barcode/serial)
CATEGORY_FIELDS: 1
QUANTITY_FIELDS: 1
MOVEMENT_FIELDS: 0
MOVEMENT_TYPES: 0
RESERVATION_FIELDS: 0
LOAN_FIELDS: 0
MAINTENANCE_FIELDS: 0
LOCATION_FIELDS: 1
FINANCIAL_FIELDS: 1
RELATION_FIELDS: 0
FILTERS: 3
SEARCH_FIELDS: 3
SORT_FIELDS: 0
IMPORT_FIELDS: 0
EXPORT_FIELDS: 12 (via Central de Relatórios genérica)
XLSX_EXPORTS: 0 (específico do módulo — o export real é o mecanismo compartilhado, não reauditado
    em detalhe de worksheet aqui)
XLSX_RULE_VIOLATIONS: 0
BARCODE_QR_FIELDS: 0
STORAGE_FIELDS: 0
REALTIME_EVENTS: 0
PERMISSIONS_AUDITED: 4 (inventory:read/create/update/delete)
AUTHORIZATION_GAPS: 0
TENANT_ISOLATION_GAPS: 0

CODE_FIELD_ONLY: 0
DATABASE_COLUMN_ONLY: 0
TYPE_MISMATCH: 0
NULLABILITY_MISMATCH: 0
DEFAULT_MISMATCH: 1 (quantidade mínima + limite de nome — contado como 1 achado categorizado,
    afetando 2 campos)
ENUM_MISMATCH: 1 (3 vocabulários de status divergentes)
RELATION_MISMATCH: 0
CREATE_MAPPING_MISMATCH: 0 (create é correto)
EDIT_MAPPING_MISMATCH: 1 (localCompra/numeroNotaFiscal/dataEntrada no pré-preenchimento)
DISPLAY_MAPPING_MISMATCH: 2 (coluna "Entrada" da tabela + omissão de 3 campos no view modal —
    contados como 2 achados distintos: 1 de nome errado, 1 de omissão)
STOCK_CONSISTENCY_GAPS: 0 (não aplicável — modelo snapshot, sem ledger a divergir)
STOCK_CONCURRENCY_GAPS: 1
NEGATIVE_STOCK_GAPS: 0 (negativo corretamente impedido nas camadas que existem)
MOVEMENT_GAPS: 1
RESERVATION_GAPS: 1
LOAN_GAPS: 1
MAINTENANCE_GAPS: 1
FINANCIAL_INTEGRATION_GAPS: 1
DUPLICATE_HANDLING_GAPS: 1
IMPORT_MAPPING_GAPS: 0 (não há import para ter mapeamento — NOT_IMPLEMENTED, não um gap de
    mapeamento)
STORAGE_GAPS: 1
PAGINATION_GAPS: 0 (paginação client-side funciona corretamente sobre o array recebido — o
    problema é o array já vir truncado, contado em TRUNCATION_GAPS)
TRUNCATION_GAPS: 1
INVENTORY_HISTORY_GAPS: 1
IDEMPOTENCY_GAPS: 1
REAL_MAPPING_GAPS: 2 (filtro de localização + filtro de categoria)

ACCOUNTING_INVENTORY_TRACEABILITY_COMPLETE: SIM
CRM_INVENTORY_TRACEABILITY_COMPLETE: SIM
EVENTS_INVENTORY_TRACEABILITY_COMPLETE: SIM
AUDIOVISUAL_INVENTORY_TRACEABILITY_COMPLETE: SIM
AUDITORIA_TSX_INVENTORY_SECTION_COMPLETE: SIM

UNMAPPED_CREATE_FIELDS: 0
UNMAPPED_EDIT_FIELDS: 0
UNMAPPED_DISPLAY_FIELDS: 0
UNMAPPED_RELATION_FIELDS: 0
UNMAPPED_QUANTITY_FIELDS: 0
UNMAPPED_MOVEMENT_FIELDS: 0
UNMAPPED_FINANCIAL_FIELDS: 0
UNMAPPED_IMPORT_FIELDS: 0
UNMAPPED_EXPORT_FIELDS: 0
UNMAPPED_STORAGE_FIELDS: 0
UNKNOWN_FIELD_CLASSIFICATIONS: 0
```

NEXT_MODULE: `leads`
