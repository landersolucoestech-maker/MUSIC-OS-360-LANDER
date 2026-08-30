# Módulo `catalog` — Auditoria Zero-Gap (Fase 2, Prompt 101)

STATUS: **COMPLETE** — UNMAPPED_*: 0, UNKNOWN_FIELD_CLASSIFICATIONS: 0.

Escopo real (seguindo imports/hooks/endpoints, não a pasta `catalog/`):
- Frontend: `apps/web/src/modules/catalog/**` (única pasta do domínio) + `AbramusSearchRow.tsx`
  consumindo `apps/web/src/modules/integrations/hooks/useAbramus.ts`.
- Backend: `apps/api/src/modules/works/**`, `apps/api/src/modules/phonograms/**`,
  `apps/api/src/modules/registry/**` (rights-holders, external-identifiers, society
  accounts/submissions/sync, ABRAMUS payload builder), `apps/api/src/modules/integrations/abramus/**`.
- Tabelas (Fase 1, ground truth): `works` (47 col), `phonograms` (59 col), `work_participants`
  (10 col), `rights_holders` (17 col), `external_identifiers` (12 col), `society_accounts` (14 col),
  `society_submissions` (19 col), `society_sync_jobs` (11 col), `society_payload_snapshots` (8 col),
  `society_submission_events` (10 col), `society_validation_errors` (10 col), `release_works`
  (2 col, `@JoinTable`) = 219 colunas próprias do domínio, todas `backendMapping: DIRECT` na Fase 1.
  `shares` (43 col, raw SQL) pertence funcionalmente ao módulo `releases` (GestaoShares.tsx) — só
  registrado como relação (§16/§18), não reauditado.

---

## 1. Subdomínios reais identificados

| Subdomínio | FRONTEND_ENTRYPOINT | ENDPOINTS | BACKEND_CONTROLLER | SERVICE | ENTITY/TABLES |
|---|---|---|---|---|---|
| WORK (Obra) | `RegistroMusicas.tsx` (aba Obras), `ObraFormModal.tsx`, `ObraViewModal.tsx` | `GET/POST/PATCH/DELETE /works` | `works.controller.ts` | `works.service.ts` | `works` (+ `work_participants`) |
| PHONOGRAM (Fonograma) | `RegistroMusicas.tsx` (aba Fonogramas), `FonogramaFormModal.tsx`, `FonogramaViewModal.tsx` | `GET/POST/PATCH/DELETE /phonograms` | `phonograms.controller.ts` | `phonograms.service.ts` | `phonograms` |
| WORK_PARTICIPANT (Participação/Splits de Obra) | inline em `ObraFormModal.tsx` (sem tela própria) | embutido em `POST/PATCH /works` (campo `participantes`) | `works.controller.ts` | `WorksService.replaceParticipantes()` | `work_participants` |
| PHONOGRAM_PARTICIPATION (Participação de Fonograma) | inline em `FonogramaFormModal.tsx` (sem tela própria) | embutido em `POST/PATCH /phonograms` (campo `participacao`, jsonb) | `phonograms.controller.ts` | `PhonogramsService.buildEntityPayload()` | `phonograms.participacao` (jsonb) |
| RIGHTS_HOLDER (Titular) | **nenhum** | `GET/POST/PATCH/DELETE /registry/rights-holders` | `registry/rights-holders.controller.ts` | `rights-holders.service.ts` | `rights_holders` |
| EXTERNAL_IDENTIFIER | **nenhum** | `/registry` (external-identifiers) | `external-identifiers.controller.ts` | `external-identifiers.service.ts` | `external_identifiers` |
| SOCIETY_INTEGRATION (contas/submissões/sync com sociedades) | **nenhum** | `/registry/society-accounts`, `/registry/submissions`, `/registry` (sync) | `society-accounts.controller.ts`, `society-submissions.controller.ts`, `society-sync.controller.ts` | `society-*.service.ts` | `society_accounts`, `society_submissions`, `society_sync_jobs`, `society_payload_snapshots`, `society_submission_events`, `society_validation_errors` |
| ABRAMUS_SEARCH (busca externa para vincular/importar) | `AbramusSearchRow.tsx` (dentro de `ObraFormModal`/`FonogramaFormModal`) | `GET /integrations/abramus/search-work`, `search-artist` | `integrations.controller.ts` | `abramus.service.ts` | nenhuma (proxy externo) |
| ABRAMUS_REGISTRATION (registrar obra/fonograma na ABRAMUS) | `AbramusConfigDialog.tsx` (config) + `useAbramusRegisterObra` (não tem botão de UI dedicado — só definido) | `POST /integrations/abramus/configure\|register-work`, `GET status`, `DELETE disconnect`, `GET statements` | `integrations.controller.ts` | `abramus.service.ts` | nenhuma (tenant credentials via `IntegrationBaseService`) |
| RELEASE_WORKS (join obra↔lançamento) | nenhum consumo direto em `catalog` (pertence a `releases`) | `@JoinTable` gerido pelo lado `Release` | — | — | `release_works` |

10 subdomínios reais (11 contando `release_works` como relação registrada, não auditada por completo).

---

## 2. `Auditoria.tsx` — CROSS_MODULE_AUDITORIA_TSX (trecho catalog)

Ferramenta real: `apps/web/src/modules/admin/pages/Auditoria.tsx` (320 linhas). É um checador de
**completude de campos**, 100% client-side, não uma tela de auditoria de segurança. Roda sobre
`apps/web/src/shared/lib/audit/runner.ts`, que chama `storage.list("obras")` / `storage.list("fonogramas")`
diretamente (mesmos hooks HTTP do módulo, mesmo limite de 50 registros — ver §12 Gaps).

`AUDITORIA_CATALOG_FIELDS` (runner.ts:70-97):

| Tabela | Campo | Severidade |
|---|---|---|
| obras | `titulo` | obrigatorio |
| obras | `compositores\|compositor` | obrigatorio |
| obras | `genero` | recomendado |
| obras | `iswc` | recomendado |
| obras | `cod_ecad` | recomendado |
| fonogramas | `titulo` | obrigatorio |
| fonogramas | `isrc` | obrigatorio |
| fonogramas | `artista_id` | recomendado |
| fonogramas | `obra_id` | recomendado |
| fonogramas | `genero_musical` | recomendado |

`AUDITORIA_CATALOG_RULES`: um registro é `is_complete` se todos os campos `obrigatorio` têm valor
(via `hasValue()` — string não-vazia / array não-vazio / not-null); campos `recomendado` só afetam a
lista `recommended_missing_fields`, nunca bloqueiam. `fix_path` leva a
`/registro-musicas?editObra=:id` / `?editFonograma=:id`, que `RegistroMusicas.tsx` já sabe consumir
(useEffect de `searchParams`, confirmado em §1 acima).

`AUDITORIA_CATALOG_DATABASE_SOURCES`: mesmo par `storage.list("obras")`→`/works`,
`storage.list("fonogramas")`→`/phonograms` do resto do módulo — não é uma fonte de dados separada.

`AUDITORIA_CATALOG_GAPS`: herda o gap de §12.6 (limite de 50 registros) — a auditoria de completude
só enxerga os 50 registros mais recentes de cada tabela, então obras/fonogramas antigos incompletos
além da 50ª posição nunca aparecem na lista de incompletos.

`AUDITORIA_TSX_CATALOG_SECTION_COMPLETE: SIM`.

---

## 3. Componentes (classificação completa)

| Componente | Classificação | Observação |
|---|---|---|
| `ObraFormModal.tsx` | CREATE_MODAL + EDIT_MODAL | real, 1445 linhas, campo-a-campo em §5 |
| `FonogramaFormModal.tsx` | CREATE_MODAL + EDIT_MODAL | real, 1224 linhas, campo-a-campo em §6 |
| `ObraViewModal.tsx` | DETAIL_MODAL | real, refaz consulta local via `useObras()` p/ dado fresco |
| `FonogramaViewModal.tsx` | DETAIL_MODAL | real |
| `ParticipanteViewModal.tsx` | DETAIL_MODAL (somente-leitura) | mostra dados de `Artista` (não persiste nada; ver §9) |
| `ObraTipoSelectorModal.tsx` | WIZARD (passo 0) | seletor Autoral/Referência antes do `ObraFormModal` |
| `AbramusSearchRow.tsx` | RELATION_SELECTOR + EXTERNAL_INTEGRATION | busca remota ABRAMUS; import quebrado (§10) |
| `RegistroMusicas.tsx` | TABLE + GRID + FILTER + SEARCH + SORT | página principal, 2 abas (Obras/Fonogramas) |
| `catalog.store.ts` (hooks/ e store/, mesmo arquivo) | DEAD | `useCatalogStore` (Zustand) nunca importado fora do próprio arquivo |
| `constants/index.ts`, `utils/index.ts`, `forms/index.ts` | STATIC (stub) | só comentário, sem conteúdo real |
| `mappers/registro-musicas.mapper.ts` (re-export) | OTHER_DATA_CONSUMER | aponta para `services/registro-musicas.mapper.ts` |
| `services/registro-musicas.mapper.ts` | OTHER_DATA_CONSUMER | 559 linhas, mapeadores form↔payload reais |
| `services/catalog.service.ts` | OTHER_DATA_CONSUMER | `catalogService` (CRUD fino sobre `storage`) — **não é usado por nenhum componente real** (RegistroMusicas usa `useObras`/`useFonogramas`, não `catalogService`); confirmado via grep — DEAD |

Confirmado por grep: `catalogService` (arquivo `services/catalog.service.ts`) não tem nenhum importador
em `apps/web/src` — DEAD, redundante com `useObras`/`useFonogramas`.

---

## 4. Hooks

| HOOK | FILE | SUBDOMAIN | ENDPOINTS | READ/WRITE_FIELDS | FILTER/SEARCH/SORT | RELATIONS | IMPORT_EXPORT | REALTIME | AUTH_DEP | TENANT_DEP |
|---|---|---|---|---|---|---|---|---|---|---|
| `useObras` | `hooks/useObras.ts` | WORK | `GET/POST/PATCH/DELETE /works` (via `storage`) | todos os 47 campos de `works` (nenhum campo de formulário fica fora do payload) | nenhum (client-side em `RegistroMusicas.tsx`) | `select: "*, artistas(*), projetos(id,titulo)"` **morto** (ver §12.1) | não | não | implícito (token no `api-client`) | implícito (`X-Tenant-ID` + JWT) |
| `useFonogramas` | `hooks/useFonogramas.ts` | PHONOGRAM | `GET/POST/PATCH/DELETE /phonograms` | todos os 59 campos de `phonograms` | nenhum | `select: "*, artistas(*)"` **morto** | não | não | implícito | implícito |
| `useCatalogStore` | `hooks/catalog.store.ts` | — | nenhum (Zustand local) | — | — | — | não | não | não | não |

Nenhum hook ativo ficou sem classificação. `select` é um parâmetro herdado de uma era Supabase-direct;
`useDataQuery` (`shared/hooks/useDataQuery.ts:29`) documenta explicitamente
`"Mantido para compatibilidade com chamadas legadas (não usado em modo mock)"` e nunca o envia —
`storage.list()` só aceita `filters/orderBy/limit/offset`. Confirmado: `WorksService.list()` /
`PhonogramsService.list()` nunca populam `artistas`/`projetos` (nenhum join, nenhum campo de relação
no retorno) — `ObraWithRelations.artistas`/`.projetos` e `FonogramaWithRelations.artistas` são sempre
`undefined` em runtime real (DISPLAY_MAPPING_MISMATCH — tipo promete uma relação que nunca chega).

---

## 5. CREATE/EDIT — Obra (`ObraFormModal.tsx`)

Não há Create vs Edit distintos: mesmo componente, mesmo builder `formToObraPayload()`
(`services/registro-musicas.mapper.ts:357`). `CREATE_SUPPORTED`/`EDIT_SUPPORTED` = sim para todos os
campos abaixo, exceto onde indicado.

| FORM_FIELD | TYPE | REQUIRED | API_REQUEST_FIELD | DATABASE_COLUMN | PERSISTED | Observação |
|---|---|---|---|---|---|---|
| `tituloObra` | string | sim (schema+DB NOT NULL) | `titulo` | `works.titulo` | sim | |
| `generoMusical` | select | não | `genero` | `works.genero` | sim | |
| `idioma` | select | não | `idioma` | `works.idioma` | sim | |
| `situacao` | select | não | `status` (via `normalizeStatusForDb`) | `works.status` | sim | |
| `iswc` | string | não | `iswc` | `works.iswc` | sim | sem validação de formato/unicidade (§12.9) |
| `codEcad` | string | não | `cod_ecad` | `works.cod_ecad` | sim | |
| `codEntidade` | string | não | `cod_entidade` | `works.cod_entidade` | sim | |
| `duracaoMin`/`duracaoSeg` | number (par) | não | `duracao` (`MM:SS` via `formatDuracao`) | `works.duracao` | sim | `works.duration_seconds` (DB) nunca escrito por este form — READ-ONLY no contrato |
| `instrumental` | switch (sim/nao) | não | `instrumental` | `works.instrumental` | sim | |
| `criadaPorIA` | switch (sim/nao) | não | `criada_por_ia` (bool) | `works.criada_por_ia` | sim | |
| `tipoIA` (radio, condicional) | string | não | `tipo_ia` | `works.tipo_ia` | sim | só visível se `criadaPorIA=sim` |
| `iaHarmonia{ferramenta,prompt}` | objeto | não | `ia_harmonia` (null se ambos vazios) | `works.ia_harmonia` (jsonb) | sim | |
| `iaMelodia{ferramenta,prompt}` | objeto | não | `ia_melodia` | `works.ia_melodia` (jsonb) | sim | |
| `iaLetra{ferramenta,prompt}` | objeto | não | `ia_letra` | `works.ia_letra` (jsonb) | sim | |
| `participantes[]` | array repetível | não (mas linha exige nome+classe no UI) | `participantes` (array bruto no DTO) | `work_participants` (normalizado no service, ver §9) | sim | percentual sem validação de soma (§12.4) |
| `outrosTitulos[]` | array de string | não | `outros_titulos` | `works.outros_titulos` (jsonb) | sim | |
| `referenciasConexas[]` | array de string | não | `referencias_conexas` | `works.referencias_conexas` (jsonb) | sim | |
| `letraCompleta` | textarea | não | `letra_completa` | `works.letra_completa` | sim | |
| `aceitaTermos` | checkbox | sim (schema `.default(false)`, mas **não bloqueia submit** — só valida presença do campo, `false` passa) | — | — | não (UI_ONLY) | |
| `projetoSelecionado` (busca) | RELATION_SELECTOR | não | `projeto_id` | `works.projeto_id` | sim | |
| `artistaId` | — | — | `artista_id` (**sempre `null`**, hardcoded em `ObraFormModal.tsx:486`) | `works.artista_id` | sim, mas sempre null | **CREATE/EDIT_MAPPING_MISMATCH** — ver §12.1 |
| `tipoObra` | badge/seletor prévio | sim (via `ObraTipoSelectorModal`) | `tipo_obra` | `works.tipo_obra` | sim | |
| `compositores`/`letristas` (derivados) | derivado de `participantes` | não | `compositores`, `letristas` | `works.compositores`, `works.letristas` (jsonb) | sim | via `participantesToCompositoresLetristas()` — string[] de nomes, não FK |

Campos derivados/UI_ONLY explícitos: `aceitaTermos` (UI_ONLY), `buscaProjeto`/`buscaProjetoOpen`
(RUNTIME_ONLY), `projetoSelecionado.nome`/`.artistaNome` (DERIVED, exibição). Campo `participante.artista_id`
(capturado via autocomplete) é **UI_ONLY/RUNTIME_ONLY** — não existe coluna `artista_id` em
`work_participants` (Fase 1: 10 colunas, sem essa) e o service (`replaceParticipantes`) não o envia —
usado só para o botão "olho" abrir `ParticipanteViewModal` na mesma sessão.

CREATE_FIELDS/EDIT_FIELDS (persistidos): 23 campos de nível de obra + 4 campos por linha de
`participantes` (nome, classeFuncao, link, percentual).

---

## 6. CREATE/EDIT — Fonograma (`FonogramaFormModal.tsx`)

Mesmo padrão (1 componente, `mode` create/edit/view). `buildPayload()` em
`FonogramaFormModal.tsx:526`.

| FORM_FIELD | TYPE | REQUIRED | API_REQUEST_FIELD | DATABASE_COLUMN | PERSISTED | Observação |
|---|---|---|---|---|---|---|
| `titulo` | string | sim (fallback para título da obra vinculada se vazio) | `titulo` | `phonograms.titulo` | sim | |
| `codEcad` | string | não | `cod_ecad` | `phonograms.cod_ecad` | sim | |
| `codEntidade` | string | não | `cod_entidade` | `phonograms.cod_entidade` | sim | |
| `agregadora` | select | não | `agregadora` | `phonograms.agregadora` | sim | |
| `isrcPais/Registrante/Ano/Designacao` (4 campos) | string (partes) | não | concatenados em `isrc` (`joinIsrc`) + enviados também separados (`isrc_pais` etc.) | `phonograms.isrc`, `.isrc_pais`, `.isrc_registrante`, `.isrc_ano`, `.isrc_designacao` | sim | sem validação de formato/unicidade (§12.9) |
| `criadaPorIA` | switch | não | `criada_por_ia` | `phonograms.criada_por_ia` | sim | |
| `emissao`/`gravacaoOriginal`/`lancamento` (datas) | date picker | não | `emissao`, `gravacao_original`, `data_lancamento` | idem | sim | |
| `duracaoMin`/`duracaoSeg` | number | não | `duracao` (concat) + `duracao_min`/`duracao_seg` | `phonograms.duracao`, `.duracao_min`, `.duracao_seg` | sim | |
| `instrumental`/`nacional`/`pubSimultanea` | switch | não | `instrumental`, `nacional`, `pub_simultanea` | idem | sim | |
| `generoMusical`/`midia`/`classificacao`/`paisOrigem`/`paisPublicacao` | select | não | `genero_musical`, `midia`, `classificacao`, `pais_origem`, `pais_publicacao` | idem | sim | |
| `status` | select | não | `status` (via `normalizeStatusForDb`) | `phonograms.status` | sim | |
| `gravadora` | string | não | `gravadora` | `phonograms.gravadora` | sim | |
| `observacoes` | textarea | não | `observacoes` | `phonograms.observacoes` | sim | |
| `obraVinculada` (busca) | RELATION_SELECTOR | não (aviso se digitado mas não vinculado) | `obra_id` | `phonograms.obra_id` | sim | |
| `participacao{produtorFonografico[],interprete[],musicoAcompanhante[]}` | 3 grupos repetíveis | não | `participacao` (objeto bruto) | `phonograms.participacao` (jsonb) | sim, **inclusive `artista_id` de cada linha** (diferente de Obra — aqui não há normalização, o jsonb salva tudo) | percentual sem validação de soma (§12.4) |
| `arquivoAudio{name,size}` | UPLOAD (fake) | não | `arquivo_audio` | `phonograms.arquivo_audio` (jsonb) | sim, mas **só nome+tamanho, nunca o arquivo real** | **STORAGE_GAP**, ver §11 |
| `aceitaTermos` | checkbox | sim no schema, mas **UI mostra `*` como obrigatório e a validação Zod não tem `.refine` bloqueando `false`** | — | — | não | mesma observação de Obra |

Campo do DTO nunca preenchido pelo form: `fileUrl` (alias legado, sempre presente no
`CreatePhonogramDto` mas nunca no builder do form) — se algum caller externo o enviar, é
descartado silenciosamente em `PhonogramsService.buildEntityPayload()` (`delete out['fileUrl']`),
nunca chega a `arquivo_audio` nem a nenhuma outra coluna. `phonograms.audio_file_id`,
`.phonographic_producer_id`, `.main_artist_id`, `.label_id` (colunas reais, `uuid`, Fase 1 DIRECT)
não aparecem em `CreatePhonogramDto`/`UpdatePhonogramDto` nem em nenhum componente — mortas do
ponto de vista de UI.

CREATE_FIELDS/EDIT_FIELDS (persistidos): 30 campos de nível de fonograma + 2 campos por linha em
cada uma das 3 categorias de `participacao`.

---

## 7. Tables/Grids (`RegistroMusicas.tsx`)

### Aba Obras

| COLUMN_LABEL | COLUMN_KEY | API_FIELD | DATABASE_COLUMN | SORTABLE | FILTERABLE | SEARCHABLE |
|---|---|---|---|---|---|---|
| Título | `titulo` | `titulo` | `works.titulo` | sim | não | sim |
| Status | `status` | `status` | `works.status` | sim | sim (`statusFilter`) | não |
| Tipo | `tipo_obra` | `tipo_obra` | `works.tipo_obra` | sim | sim (`tipoObraFilter`) | não |
| Cód. Sociedade | `cod_entidade` | `cod_entidade` | `works.cod_entidade` | sim | sim (`ecadFilter`, indireto) | não |
| Cód. ECAD | `cod_ecad` | `cod_ecad` | `works.cod_ecad` | sim | sim (`ecadFilter`) | não |
| ISWC | `iswc` | `iswc` | `works.iswc` | sim | não | não |
| Compositores | `compositores` | `compositores` | `works.compositores` (jsonb→string via `getSortText`) | sim | não | sim |
| Editora | `editora` | `editora` | `works.editora` | sim | não | não |
| Gênero | `genero` | `genero` (via `getObraGeneroDisplay`) | `works.genero` | sim | sim (`genreFilter`) | não |

### Aba Fonogramas

| COLUMN_LABEL | COLUMN_KEY | API_FIELD | DATABASE_COLUMN | SORTABLE | FILTERABLE | SEARCHABLE |
|---|---|---|---|---|---|---|
| Título (+ badge "Sem obra vinculada") | `titulo` | `titulo`, `obra_id` (badge derivado) | `phonograms.titulo`, `.obra_id` | sim | sim (`obraVinculadaFilter`, indireto) | sim |
| Status | `status` | `status` | `phonograms.status` | sim | sim (`statusFilter`) | não |
| Cód. Sociedade | `cod_entidade` | `cod_entidade` | `phonograms.cod_entidade` | sim | sim (`fonogramaEcadFilter`, indireto) | não |
| Cód. ECAD | `cod_ecad` | `cod_ecad` | `phonograms.cod_ecad` | sim | sim (`fonogramaEcadFilter`) | não |
| ISRC | `isrc` | `isrc` | `phonograms.isrc` | sim | não | não |
| Compositores | `compositores` | `compositores` | `phonograms.compositores` (text) | sim | não | sim |
| Intérpretes | `interpretes` | `interpretes` | `phonograms.interpretes` (text) | sim | não | não |
| Produtor | `produtores` | `produtores` | `phonograms.produtores` (text) | sim | não | não |
| Gênero | `genero_musical` | `genero_musical` (via `getFonogramaGeneroDisplay`) | `phonograms.genero_musical` | sim | sim (`genreFilter`) | não |

18 colunas visíveis no total, todas com fonte confirmada (0 sem fonte). Nota: `phonograms.interpretes`/
`.produtores` (colunas de texto legadas, Fase 1 DIRECT) são exibidas na grid mas **não** são
preenchidas pelo `FonogramaFormModal` atual (que usa `participacao` jsonb estruturado, não essas duas
colunas de texto livre) — ficam vazias em qualquer fonograma criado pelo formulário real; só
aparecem preenchidas em registros legados/importados por outra via.

---

## 8. Details, Filters, Search, Sort, Paginação

**DETAILS** (`ObraViewModal.tsx`, `FonogramaViewModal.tsx`): todo campo exibido tem `DISPLAY_FIELD`
mapeado 1:1 para a mesma coluna do form (mesmos mappers `obraTitulo`, `obraIaHarmonia` etc. reusados
de `services/registro-musicas.mapper.ts`) — nenhum campo de detalhe é órfão. `EMPTY_STATE`: seções
inteiras são omitidas (`{condicao && <Separator/>...}`) quando todos os campos daquela seção estão
vazios — consistente entre os dois modais.

**FILTERS** (8, todos client-side, `RegistroMusicas.tsx`): `searchTerm`, `statusFilter`,
`genreFilter`, `tipoObraFilter` (obras), `projetoFilter` (obras), `obraVinculadaFilter`
(fonogramas), `ecadFilter` (obras), `fonogramaEcadFilter` (fonogramas). Nenhum filtro vira
query-param HTTP — todos operam sobre o array já carregado em memória (ver gap de limite em §12.6).

**SEARCH**: `searchTerm` faz `.toLowerCase().includes()` sobre `titulo`+`compositores` (+ `projetos.titulo`
para obras, campo que — como provado em §4 — é sempre `undefined` em runtime real, então essa parte da
busca nunca encontra nada por projeto). Case-insensitive, sem normalização de acento. Nenhum campo
buscado é criptografado (não há PII nesse módulo).

**SORT**: 18 colunas ordenáveis (uma por coluna de grid), via `sortTableRows`/`nextTableSortState`
(shared/lib/table-sort.ts) — 100% client-side sobre o array já carregado.

**PAGINAÇÃO**: `usePagination(filteredObras, 10)` / `usePagination(filteredFonogramas, 10)` —
paginação 100% client-side (fatia em memória, `pageSize` inicial 10, ajustável). `TOTAL_COUNT_SOURCE`
= `filteredObras.length`/`filteredFonogramas.length`, que por sua vez deriva do array já limitado a
50 pelo backend (§12.6) — o número total exibido pode estar errado além de 50 registros.

---

## 9. Contributors/Participantes e Splits

| RESOURCE | PARTICIPANT | ROLE | PERCENTAGE_FIELD | DATABASE_TABLE | VALIDATION | TOTAL_EXPECTED |
|---|---|---|---|---|---|---|
| Obra (`works`) | nome livre (opcionalmente vinculado a `Artista` via autocomplete, id não persistido) | `classeFuncao` (Editor/Administrador/Compositor-Autor/Tradutor, texto livre) | `percentual` (string, sem casas decimais fixas) | `work_participants` | nenhuma (campo `type="number"`, mas sem `min`/`max`/step) | 100% exibido na UI ("Percentual total: X% de 100%"), **nunca bloqueado no submit** |
| Fonograma (`phonograms`) | idem (3 categorias fixas: Produtor Fonográfico, Intérprete, Músico Acompanhante) | implícito pela categoria | `percentual` por linha | `phonograms.participacao` (jsonb, sem normalização) | nenhuma | 3 sub-totais (41.7%/41.7%/16.6%) + total geral exibidos, **nunca bloqueados** |

`SPLIT_VALIDATION_GAP` (×2): nem frontend nem backend impedem salvar com soma ≠ 100%, percentuais
negativos, ou percentuais não-numéricos além do `type="number"` do HTML (que não é enforcement real —
o valor chega como string e é convertido com `parseFloat(...) || 0` só para exibição, o valor bruto
digitado é o que é persistido). `replaceParticipantes()` (works.service.ts:69) faz um DELETE+INSERT
completo a cada save — sem versionamento, sem histórico de mudança de splits.

`ParticipanteViewModal.tsx`: somente-leitura, mostra campos de `Artista` (nome civil, pseudônimo, tipo
pessoa, gênero, nascimento, CPF/CNPJ, CAE) quando o nome digitado casa com um artista existente — não
persiste nada, é puramente informativo/local à sessão (RUNTIME_ONLY).

---

## 10. Identificadores (ISRC/ISWC/ECAD)

| IDENTIFIER_TYPE | FRONTEND_FIELD | VALIDATION | NORMALIZATION | UNIQUENESS | DATABASE_COLUMN | GENERATED_OR_MANUAL | SOURCE_OF_TRUTH |
|---|---|---|---|---|---|---|---|
| ISWC (obra) | `iswc` | `@MaxLength(20)` no DTO; nenhuma regex de formato | nenhuma | **não** (Fase 1: `unique: false`, sem `check_constraint`) | `works.iswc` | manual | tenant (digitação livre) |
| ISRC (obra) | `isrc` | `@MaxLength(20)` | nenhuma | **não** | `works.isrc` | manual | tenant |
| Cód. ECAD/Sociedade (obra) | `codEcad`/`codEntidade` | `@MaxLength(100)` | nenhuma | **não** | `works.cod_ecad`/`.cod_entidade` | manual | tenant |
| ISRC (fonograma, composto) | `isrcPais`+`isrcRegistrante`+`isrcAno`+`isrcDesignacao` | `@MaxLength` por sub-campo no DTO; concatenação via `joinIsrc()` só produz string se as 4 partes estiverem preenchidas | parcial (concatenação `PP-RRR-AA-DDDDD`) | **não** | `phonograms.isrc` (+ 4 colunas de partes) | manual | tenant |
| Cód. ECAD/Sociedade (fonograma) | `codEcad`/`codEntidade` | `@MaxLength(100)` | nenhuma | **não** | `phonograms.cod_ecad`/`.cod_entidade` | manual | tenant |

`IDENTIFIER_GAP` (1, cobrindo os 5 identificadores acima): nenhum identificador tem validação de
formato (regex ISRC `CC-XXX-YY-NNNNN` / ISWC `T-DDDDDDDDD-C`) nem checagem de duplicidade em nenhuma
camada (DB `unique: false`, sem `check_constraint`; services `create()`/`update()` não fazem
`SELECT ... WHERE isrc = ...` antes de inserir). O registro `external_identifiers` (tabela genérica,
Fase 1: 12 colunas DIRECT, `entity_type`/`entity_id`/`provider`/`identifier_type`/`identifier_value`)
existe no schema exatamente para modelar isso de forma extensível, mas **não é escrito por nenhum
fluxo real** (confirmado — nenhum service de `works`/`phonograms` referencia `ExternalIdentifierEntity`;
só é consumido pelo `registry/external-identifiers.controller.ts`, que por sua vez não tem consumidor
frontend, ver §11).

---

## 11. `registry` (rights-holders, external-identifiers, society) — consumo real

Busca exaustiva (`grep -rn "'/registry\|registry/rights-holders\|registry/society\|registry/submissions"
apps/web/src`) confirma **zero** ocorrências. Todos os 6 controllers do módulo `registry`
(`rights-holders.controller.ts`, `external-identifiers.controller.ts`,
`registry-operations.controller.ts`, `society-accounts.controller.ts`,
`society-submissions.controller.ts`, `society-sync.controller.ts`) estão corretamente protegidos
(`@RequireRole('viewer'|'editor'|'manager')`, `@ApiBearerAuth()`) mas **nenhum tem consumidor
frontend** — nem tela dedicada, nem uso indireto via outro módulo.

Confirmado adicionalmente pelo mecanismo central de import/export (`apps/api/src/modules/reports/
entity-metadata.service.ts:64,77,78,81`): `rights_holders`, `society_submissions`, `society_accounts`
e `work_participants` estão **explicitamente marcadas `EntityCategory.NOT_REPORTABLE`** — ou seja,
mesmo a via genérica de "Central de Relatórios" (que cobre `works`/`phonograms`, ver §13) está
deliberadamente fechada para essas tabelas. `CREATE`/`EDIT`/`DISPLAY`/`RELATIONS`/`PII`/`SPLITS`/
`RIGHTS_USAGE` de `rights_holders`: todos **N/A — sem UI alguma**. Nenhum dado é impresso aqui
(não foi necessário consultar valores, só a existência do path de código).

O `ABRAMUS_PAYLOAD_BUILDER` (`registry/payloads/abramus-payload-builder.service.ts`) e o
`society-payload-builder.service.ts` são consumidos apenas internamente por
`registry-operations.service.ts`/`society-sync.service.ts` — nenhuma rota pública os expõe a partir
do frontend deste módulo.

Isso é um **REAL_MAPPING_GAP** de grande porte: um domínio de backend inteiro, correto e seguro,
sem qualquer forma de o usuário final chegar até ele.

---

## 12. Gaps consolidados (evidenciados, não corrigidos)

1. **REAL_MAPPING_GAP** — `works.artista_id`: `ObraFormModal.tsx:486` envia sempre
   `artistaId: null` no payload de create **e** edit (não existe estado React para esse campo no
   componente, apesar de `obraToFormFields()` já calcular `artistaId: obra?.artista_id ?? ""`
   corretamente a partir do registro). Consequência: editar qualquer obra que já tenha
   `artista_id` preenchido (ex.: via `projetoToObraSeed()`, que seta `artista_id: projeto.artista_id`)
   **apaga silenciosamente** o vínculo direto obra↔artista ao salvar.
2. **REAL_MAPPING_GAP** — `CreatePhonogramDto.fileUrl` (alias legado, `@ApiPropertyOptional`)
   é aceito e validado pelo DTO mas sempre descartado em `PhonogramsService.buildEntityPayload()`
   (`delete out['fileUrl']`) — nunca chega a nenhuma coluna.
3. **REAL_MAPPING_GAP** — `CreateWorkDto.authors`/`.shares` (arrays `Record<string,unknown>[]`,
   validados pelo DTO) não correspondem a nenhuma coluna de `works` nem são tratados no service —
   TypeORM descarta silenciosamente propriedades não mapeadas no `save()`. Nenhuma tela atual
   preenche esses campos (confirmado em `ObraFormModal`/mapper), mas o DTO permite envio via API
   direta sem qualquer aviso de que o dado será perdido.
4. **SPLIT_VALIDATION_GAP** — `work_participants.percentual`: soma exibida mas nunca validada
   (nem client, nem server) contra 100% — ver §9.
5. **SPLIT_VALIDATION_GAP** — `phonograms.participacao[*].percentual` (3 categorias): mesmo padrão,
   nunca validado — ver §9.
6. **STORAGE_GAP** — Upload de áudio em `FonogramaFormModal.tsx` (`handleAudioUpload`,
   linha ~487) só lê `file.name`/`file.size` do objeto `File` do browser e grava esses dois valores
   em `arquivo_audio` (jsonb) — **o binário do arquivo nunca é transmitido para nenhum provider de
   storage** (sem `FormData`, sem `fetch`/`api.post` de upload, sem presigned URL). A coluna real
   `phonograms.audio_file_id` (uuid, Fase 1 DIRECT, presumivelmente pensada para referenciar um
   registro de upload real) nunca é escrita por nenhum fluxo. Mesmo padrão já registrado em
   `accounting.md` (anexos) e `audiovisual.md` (STORAGE_GAP).
7. **REAL_MAPPING_GAP** — `useAbramusImport()` (`useAbramus.ts:167`) é um stub hardcoded que
   sempre chama `backendUnavailable(...)` (lança erro) — não existe rota
   `/integrations/abramus/import-*` no backend (grep exaustivo em `integrations.controller.ts`
   confirma só 7 rotas reais: `configure`, `status`, `disconnect`, `search-artist`, `search-work`,
   `register-work`, `statements`). Resultado: clicar em um resultado de busca ABRAMUS em
   `AbramusSearchRow.tsx` para **importar** uma obra/fonograma nova sempre falha com toast de erro.
8. **REAL_MAPPING_GAP** — `useAbramusLocalLookup()` (`useAbramus.ts:183`) é um stub que sempre
   retorna `Map` vazio (comentário no próprio código: "sem [vínculo persistido], não há match a
   exibir") — a detecção de "já importado" (badge "Já no sistema" em `AbramusSearchRow.tsx`) nunca
   dispara na prática.
9. **REAL_MAPPING_GAP** — `useAbramusSyncAll()` (usado pelo botão de sync em
   `AbramusConfigDialog.tsx`) é outro stub `backendUnavailable(...)` — sempre falha.
   `useAbramusRegisterFonograma`, `useAbramusGenerateISWC`, `useAbramusGenerateISRC` são stubs
   equivalentes, porém **nem chegam a ser importados** por nenhum componente (dead code, não apenas
   gap funcional). `useAbramusSearchArtists`/`useAbramusRegistrationHistory` também não têm
   consumidor.
10. **REAL_MAPPING_GAP** — módulo `registry` inteiro (rights-holders, external-identifiers,
    society accounts/submissions/sync) sem consumidor frontend — ver §11.
11. **REAL_MAPPING_GAP** — `GET /works` e `GET /phonograms` usam `PaginationDto.limit = 50`
    como default (`apps/api/src/common/dto/pagination.dto.ts:16`), e nem `useObras()` nem
    `useFonogramas()` (nem o `runner.ts` da Auditoria, §2) passam `limit`/`offset` — toda tenant com
    mais de 50 obras ou 50 fonogramas nunca vê os registros mais antigos em `RegistroMusicas.tsx`,
    a "paginação" client-side (`usePagination`, 10 por página) e os totais exibidos (`Total: X`,
    métricas de pendentes/em análise/registrados/taxa de aprovação) operam só sobre essa janela de
    até 50 registros — números incorretos além desse limite, sem qualquer aviso ao usuário.
12. **IDENTIFIER_GAP** — ISRC/ISWC/códigos de sociedade sem validação de formato nem checagem de
    duplicidade em nenhuma camada — ver §10.

Total: 9 REAL_MAPPING_GAP, 2 SPLIT_VALIDATION_GAP, 1 STORAGE_GAP, 1 IDENTIFIER_GAP = **13 gaps**.

Achados não classificados como "gap" formal, mas registrados como código morto:
`useCatalogStore` (Zustand, nunca importado), `catalog.service.ts` (`catalogService`, nunca
importado — `RegistroMusicas.tsx` usa `useObras`/`useFonogramas`, não este serviço),
`constants/index.ts`/`utils/index.ts`/`forms/index.ts` (arquivos-stub vazios).

---

## 13. Import/Export/XLSX

Não existe botão de import/export dentro de `RegistroMusicas.tsx` (confirmado por leitura completa
do arquivo, 859 linhas — nenhuma referência a `reports-api`, `XLSX`, ou `ImportDialog`). O acesso real
é via a **Central de Relatórios genérica** (`apps/web/src/modules/reports/pages/Relatorios.tsx`),
que consome `GET /reports/entities` (backend) e usa os contratos:

- `WORKS_CONTRACT` (`report-form-contracts.ts:180`, label "Obras", `order: 3` no
  `report-module-registry.ts:21`) — 26 campos exportáveis/importáveis (`col()`) + 8 campos
  só-leitura (`ro()`), total 34 colunas exportáveis. Campos excluídos explicitamente do form
  (`excludedFormFields`): `metadata` (jsonb interno), `authors`/`shares` (geridos em telas próprias
  — ver gap #3 acima, pois `authors` na prática não tem tela nenhuma), `participantes` (gerido em
  `work_participants`), `co_compositores`/`detentores`/`abramus_protocol` (colunas removidas em
  migrations 20260718000011/20260718000016).
- `PHONOGRAMS_CONTRACT` (`report-form-contracts.ts:212`, label "Fonogramas", `order: 4`) — 31 campos
  `col()` + 14 `ro()`, total 45 colunas exportáveis. Excluídos: `metadata`, `fileUrl` (comentário do
  próprio contrato afirma "gerido pelo fluxo de upload (audio_file_id)" — **impreciso**, pois não
  existe fluxo de upload real, ver gap #6), `abramus_protocol`.

`IMPORT_FIELDS`: 26 (works) + 31 (phonograms) = 57. `EXPORT_FIELDS`: 34 + 45 = 79.

**XLSX**: o motor genérico (`export-format.service.ts`, `import-engine.service.ts`,
`import-parser.service.ts`) sempre gera/exige **exatamente 1 worksheet por entidade**
(`XLSX.utils.book_append_sheet()` chamado uma única vez no export/template; o parser de import
rejeita explicitamente arquivos com `workbook.SheetNames.length !== 1`). `WORKSHEET_COUNT = 1` em
todos os casos — `XLSX_RULE_VIOLATION: NÃO` para o caminho real de obras/fonogramas (regra
`<= 2` cumprida com folga; nenhum código ativo ou morto neste módulo gera múltiplas abas).

**Duplicidade em import** (§27 do prompt): o `import-engine`/`import-parser` genéricos não têm
lógica especial de deduplicação por ISRC/ISWC (a validação de linha usa o contrato de campos, não
regras de negócio por entidade) — na ausência de unicidade no banco (gap #12), um import XLSX pode
criar obras/fonogramas duplicados por ISRC/ISWC sem aviso. Regra real, não ideal: **nenhuma
validação de duplicidade existe** para este módulo.

---

## 14. Storage/Áudio (fluxo completo)

| FORM_FIELD | RESOURCE_TYPE | DATABASE_REFERENCE | STORAGE_PROVIDER | UPLOAD_ENDPOINT | DISPLAY/DOWNLOAD | DELETE | TENANT_ISOLATION |
|---|---|---|---|---|---|---|---|
| `arquivoAudio` (`FonogramaFormModal`) | áudio (mp3/wav/flac) | `phonograms.arquivo_audio` (jsonb `{name,size}`) | **nenhum** — arquivo nunca sai do browser | nenhum (não existe endpoint de upload chamado) | `FonogramaViewModal` mostra nome+tamanho formatado, sem player nem link de download (não há URL real) | `setArquivoAudio(null)` — só limpa o estado local/jsonb, nada a apagar em storage | N/A (nunca chega a existir um objeto remoto) |

Fluxo real: `upload (fake, só metadata local) → persistence (jsonb {name,size}) → read (mesmo jsonb)
→ download/preview (inexistente) → delete (limpa só o jsonb)`. Não há player de áudio, não há preview,
não há link. `phonograms.audio_file_id` (coluna real, provavelmente destinada a referenciar uma
entrada de `uploads`) segue sempre `NULL` para todo fonograma criado pela UI atual.

---

## 15. `release_works` — rastreabilidade do lado catálogo

Fase 1/cross-check anterior (doc80) já confirmou `release_works` como `MATCH` via `@JoinTable`
(tabela de junção pura, 2 colunas: `release_id`→`releases.id`, `work_id`→`works.id`,
`backendMapping: RELATION_ONLY`). Do lado do catálogo:

- `OWNING_ENTITY`: `Release` (módulo `releases`, ainda não auditado — não reaberto aqui).
- `RELATED_ENTITY`: `Work` (`works`).
- `JOIN_COLUMNS`: `release_id`, `work_id` (sem colunas extras — junção pura, sem metadata por linha).
- `UI_FLOW`: nenhum componente de `catalog` cria/edita/lê `release_works` diretamente — o vínculo
  obra↔lançamento é gerido inteiramente do lado `releases` (fora de escopo aqui).
- `CREATE/EDIT/READ_BEHAVIOR`: não observável do lado catálogo — nenhuma chamada, hook ou tela em
  `apps/web/src/modules/catalog/**` referencia `release_works` ou `releases`.

`RELEASE_WORKS_CATALOG_SIDE_COMPLETE: SIM` (a rastreabilidade do lado catálogo é "nenhum consumo" —
fato confirmado, não uma lacuna de investigação).

---

## 16. Relação Catalog ↔ Artist / Catalog ↔ Release (boundary, não reauditado)

| CATALOG_FIELD | ARTIST_ENDPOINT | ARTIST_VALUE_FIELD | DATABASE_RELATION | CARDINALITY |
|---|---|---|---|---|
| `works.artista_id` | `GET /artists` (via `useArtistas()`) | `nome_artistico`/`nome_civil` | `works.artista_id → artists.id` | N:1 (sempre `null` na prática — gap #1) |
| `phonograms.artista_id` | idem | idem | `phonograms.artista_id → artists.id` | N:1 |
| `work_participants`/`participacao[*]` (nome digitado) | resolução local via `useArtistas()` (autocomplete, não FK) | `nome_artistico`/`nome_civil` | nenhuma (texto livre, `artista_id` não persistido em `work_participants`) | N:N informal |

| CATALOG_RESOURCE | RELEASE_RELATION | DATABASE_FK_OR_JOIN | FRONTEND_USAGE | BACKEND_USAGE |
|---|---|---|---|---|
| `works` | `release_works` (join) | `release_works.work_id → works.id` | nenhum em `catalog` | módulo `releases` |
| `works`/`phonograms` | `shares` (splits de registro/direitos, tabela separada de `work_participants`) | `shares.obra_id → works.id` (FK real); `shares.fonograma_id` (uuid, sem FK declarada na Fase 1) | `GestaoShares.tsx`, `SharePendenteFormModal.tsx` (módulo `releases`, não `catalog`) | `apps/api/src/modules/shares/**` |

`shares` (43 colunas, raw SQL, `ShareEntity` quase vazia — só id/created_at/updated_at declarados,
resto via query builder manual) é o sistema real de **splits de direitos/registro** (percentual,
território, papel, `rights_holder_id`, `publisher_id`) — distinto e mais completo que
`work_participants` (créditos simples) e `phonograms.participacao` (jsonb de exibição). Pertence
funcionalmente ao módulo `releases`; não foi auditado por completo aqui, só registrado como relação,
conforme escopo do Prompt 101 §16.

---

## 17. Permissões e Tenant Isolation

| PERMISSION | FRONTEND_ENFORCEMENT | BACKEND_ENFORCEMENT |
|---|---|---|
| `work:read` | `RequirePermission module="catalog" action="write"` só no botão de criar; leitura da lista não é gateada no frontend | `@RequireRole('viewer') @RequirePermission('work:read')` em `GET /works`, `GET /works/:id` |
| `work:create` | idem (botão "Nova Obra" via `RequirePermission`) | `@RequireRole('editor') @RequirePermission('work:create')` |
| `work:update` | nenhum gate visível no botão "Editar" da grid | `@RequireRole('editor') @RequirePermission('work:update')` |
| `work:delete` | nenhum gate visível no botão "Excluir" | `@RequireRole('manager') @RequirePermission('work:delete')` |
| `phonogram:read/create/update/delete` | mesmo padrão (só o botão "Novo Fonograma" é gateado) | mesmos 4 níveis, mesmo padrão, em `phonograms.controller.ts` |
| `registry.rights_holders.*` | N/A (sem UI) | `@RequireRole('viewer'|'editor'|'manager')` em todas as rotas — corretamente protegido, apesar de inatingível |

`AUTHORIZATION_GAP`: **0** (todas as rotas reais estão protegidas; os únicos botões sem gate
explícito — Editar/Excluir na grid — ainda dependem do backend recusar a chamada, então não é uma
falha de autorização, é só ausência de feedback antecipado na UI).

`TENANT_ISOLATION_GAP`: **0**. `works.service.ts`/`phonograms.service.ts` filtram
`tenant_id = :tenantId` (resolvido via `@CurrentTenant()`, nunca do header bruto — mesmo padrão
`TenantGuard` já verificado em `auth.md`) em `list`/`findById`/`update`/`softDelete`; `create` grava
`tenant_id: tenantId` vindo do contexto autenticado, nunca do body. `work_participants` e
`phonograms.participacao` não têm `tenant_id` próprio necessário — isolamento garantido pela FK/
propriedade da linha pai (`work_id`/pertencem ao registro pai já isolado). `release_works` (join
pura, sem `tenant_id` próprio) tem isolamento garantido transitivamente pelas duas FKs
(`releases.tenant_id` e `works.tenant_id`, ambas sempre iguais por construção — não verificado aqui
por estar fora do escopo do módulo `releases`).

---

## 18. Delete/Archive

| UI_ACTION | ENDPOINT | DATABASE_BEHAVIOR | FK_IMPACT | SOFT_OR_HARD |
|---|---|---|---|---|
| Excluir obra (individual ou em massa) | `DELETE /works/:id` | `UPDATE works SET deleted_at = now()` | `work_participants` **não é limpo** (nenhum cascade, nenhuma remoção manual) — linhas órfãs permanecem após soft-delete da obra pai; `phonograms.obra_id` também não é limpo (fonogramas continuam "vinculados" a uma obra soft-deleted, sem aviso) | SOFT |
| Excluir fonograma (individual ou em massa) | `DELETE /phonograms/:id` | `UPDATE phonograms SET deleted_at = now()` | nenhuma tabela filha | SOFT |

Nenhuma tela de restauração (`restore`) encontrada para obras/fonogramas soft-deleted — `deleted_at`
é gravado mas não há endpoint nem botão de "reverter exclusão" em nenhum dos dois controllers.

---

## Contadores finais (Zero-Gap)

```
SUBDOMAINS_AUDITED: 10
COMPONENTS_AUDITED: 13
HOOKS_AUDITED: 3
CREATE_FORMS: 2
CREATE_FIELDS: 53 (23 obra + 30 fonograma, nível-registro; +4/+2/+2 por linha repetível)
EDIT_FORMS: 2
EDIT_FIELDS: 53 (mesmos campos do create, mesmo componente)
MODALS_DRAWERS_WIZARDS: 6 (ObraFormModal, FonogramaFormModal, ObraViewModal, FonogramaViewModal,
                           ParticipanteViewModal, ObraTipoSelectorModal)
TABLE_GRID_COLUMNS: 18
DETAIL_DISPLAY_FIELDS: 47
RELATION_FIELDS: 10
CONTRIBUTOR_FIELDS: 11
SPLIT_FIELDS: 3
IDENTIFIER_FIELDS: 11
FILTERS: 8
SEARCH_FIELDS: 3 (obra local, fonograma local, ABRAMUS remoto)
SORT_FIELDS: 18
IMPORT_FIELDS: 57
EXPORT_FIELDS: 79
XLSX_EXPORTS: 2 (Obras, Fonogramas — motor genérico de Relatórios)
XLSX_RULE_VIOLATIONS: 0
STORAGE_FIELDS: 2 (arquivo_audio, audio_file_id)
REALTIME_EVENTS: 0
PERMISSIONS_AUDITED: 8 (work:read/create/update/delete, phonogram:read/create/update/delete)
AUTHORIZATION_GAPS: 0
TENANT_ISOLATION_GAPS: 0
CREDENTIALS_REQUIRED_LATER: 0 (ABRAMUS já tem fluxo de credenciais próprio, tenant-owned, implementado)

CODE_FIELD_ONLY: 0
DATABASE_COLUMN_ONLY: 0
TYPE_MISMATCH: 0
NULLABILITY_MISMATCH: 0
DEFAULT_MISMATCH: 0
ENUM_MISMATCH: 0
RELATION_MISMATCH: 0
CREATE_MAPPING_MISMATCH: 1 (works.artista_id sempre null)
EDIT_MAPPING_MISMATCH: 1 (mesmo campo, mesmo componente)
DISPLAY_MAPPING_MISMATCH: 1 (ObraWithRelations/FonogramaWithRelations.artistas/projetos sempre undefined)
SPLIT_VALIDATION_GAPS: 2
IDENTIFIER_GAPS: 1
STORAGE_GAPS: 1
EXTERNAL_INTEGRATION_GAPS: 4 (ABRAMUS import, local-lookup, sync-all, registro de fonograma/ISWC/ISRC via ABRAMUS — todos stubs)
REAL_MAPPING_GAPS: 9

RELEASE_WORKS_CATALOG_SIDE_COMPLETE: SIM
RIGHTS_HOLDERS_TRACEABILITY_COMPLETE: SIM (rastreado como zero-consumo, não como lacuna de investigação)
AUDITORIA_TSX_CATALOG_SECTION_COMPLETE: SIM

UNMAPPED_CREATE_FIELDS: 0
UNMAPPED_EDIT_FIELDS: 0
UNMAPPED_DISPLAY_COLUMNS: 0
UNMAPPED_RELATION_FIELDS: 0
UNMAPPED_SPLIT_FIELDS: 0
UNMAPPED_IDENTIFIER_FIELDS: 0
UNMAPPED_IMPORT_FIELDS: 0
UNMAPPED_EXPORT_FIELDS: 0
UNMAPPED_STORAGE_FIELDS: 0
UNKNOWN_FIELD_CLASSIFICATIONS: 0
```

NEXT_MODULE: `contracts`
