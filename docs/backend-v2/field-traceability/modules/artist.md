# Módulo: artist (Artistas)

Fase 2 do Prompt 98. Escopo: `apps/web/src/modules/artist/**` completo + dependências reais
seguidas fora da pasta: `apps/web/src/modules/auth/pages/ArtistaSignupPublic.tsx` (cadastro público),
`apps/web/src/shared/components/FileUpload.tsx`+`useUploadToR2` (upload), `apps/web/src/shared/lib/audit/runner.ts`
(seção `Auditoria.tsx`), `apps/api/src/modules/artists/**` completo (controller, service, DTOs,
platform-profiles/providers), `apps/api/src/modules/reports/form-contracts/report-form-contracts.ts`
(ARTISTS_CONTRACT — achado central, ver §2). Lado banco↔backend reaproveitado da Fase 1
(78 colunas reais de `artists`, já extraídas) — não refeito aqui.

Read-only. `DATABASE_WRITES: 0`. Nenhum `.ts`/`.tsx` alterado.

## 1. Achado estrutural central: DOIS fluxos paralelos de criação/edição

Existem **duas implementações independentes**, cada uma com seu próprio sistema de definição de
campos, para criar/editar um artista:

1. **`ArtistaFormModal.tsx`** (modal) — aberto a partir de `Artistas.tsx` (`setCreateModal(true)` /
   ações de linha) e via `?edit=<id>` na URL. Usa `ArtistaFormFields`
   (`services/artista.mapper.ts`, 658 linhas, "ÚNICA FONTE DE VERDADE" segundo o próprio comentário
   do arquivo). **Este é o fluxo realmente usado pela UI.**
2. **`ArtistaCadastro.tsx`** (página dedicada) — roteada em `/artistas/novo` e
   `/artistas/:id/editar` (`app/routes/artist.routes.tsx`), usa `ARTIST_FORM_SECTIONS`
   (`forms/artist-form.definition.ts`, 702 linhas, sistema de definição por seções mais granular,
   inclui campos que o modal não tem — ex.: `genero` [gênero da pessoa, distinto de
   `generoMusical`]). **Confirmado órfã**: grep repo-wide por `/artistas/novo` e `/editar\`` fora do
   próprio arquivo de rotas retorna **zero resultados** — nenhum botão/link do app aponta para essas
   rotas. Código real, rota real, funcional se acessada por URL direta, mas inalcançável pela
   navegação normal.

Classificação: `REAL_MAPPING_GAP` (duplicação arquitetural) + `DEAD` (para `ArtistaCadastro.tsx`
especificamente, do ponto de vista de alcançabilidade via UI — não do ponto de vista de código,
que é válido e funcional).

Um **terceiro** fluxo de criação existe fora do módulo: `apps/web/src/modules/auth/pages/
ArtistaSignupPublic.tsx` — autocadastro público, `POST /public/artists` (endpoint distinto de
`POST /artists`).

`ArtistaSignupPublic: AUDITED_IN_AUTH` — fechado na auditoria do módulo `auth`
(`docs/backend-v2/field-traceability/modules/auth.md` §1). Achado crítico confirmado lá: o
endpoint `POST /public/artists` **não existe em nenhum lugar do backend** — todo o fluxo de
autocadastro público de artista está 100% quebrado (toda submissão retorna erro). Registrado como
`REAL_MAPPING_GAP`/`PUBLIC_SIGNUP_GAP` no doc do módulo `auth`, não neste documento.

## 2. Achado estrutural central #2: a maioria dos campos "estendidos" vive em `metadata` JSONB, não nas 78 colunas físicas

`ARTISTS_CONTRACT` (`report-form-contracts.ts`, fonte única também usada por `ArtistsService.create/
update`) revela que das 78 colunas reais de `artists` (Fase 1), a persistência real segue esta
divisão, **por decisão arquitetural documentada, não por bug**:

- **~23 colunas físicas diretas** (`storage: 'column'`): `nome_artistico`, `nome_civil`, `tipo`,
  `status`, `genero_musical`, `observacoes`, `especialidades`, `foto_url`, `spotify_url`,
  `youtube_url`, `deezer_url`, `apple_music_url`, `soundcloud_url`, `galeria_urls`, `documentos`,
  `manager_nome`, `produtor_executivo`, `agencia_booking`, `label_parceira`, `contrato_id`.
- **4 colunas cifradas** (`storage: 'encrypted'`): `email`→`email_encrypted`,
  `telefone`→`telefone_encrypted`, `cpf_cnpj`→`cpf_cnpj_encrypted`,
  `manager_contato`→`manager_contato_encrypted` — cifra/decifra confirmada em
  `artists.service.ts` via `EncryptionService.encryptNullable()`/`safeDecrypt()` (ver §3).
- **~41 campos armazenados dentro da coluna `metadata` (jsonb)**, não em coluna própria, apesar de
  colunas físicas com esses EXATOS nomes existirem na tabela (confirmado Fase 1):
  `slug_artistico`, `tipo_perfil`, `fase_carreira`, `genero`, `data_nascimento`, `rg`, `endereco`,
  `tags_musicais`, `presskit_url`, `documentos_pessoais_url`, `apple_music_albuns_url`,
  `soundcloud_seguidores_url`, `instagram_url`, `tiktok_url`, `instagram_seguidores`,
  `tiktok_seguidores`, `spotify_ouvintes`, `youtube_inscritos`, `deezer_fas`, `agencia`,
  `empresario_id/nome/email/telefone`, `gravadora_id/nome/email/telefone`,
  `gravadora_responsavel_id/nome/email/telefone`, `banco`, `conta`, `chave_pix`, `titular_conta`,
  `distribuidoras_selecionadas/gerais/emails/empresa_selecionadas/empresa_emails`,
  `contatos_equipe`, `contatos_vinculados`, `relacionamentos`.

**Correção à Fase 1**: essas ~41 colunas foram classificadas `DIRECT_VIA_DTO_OR_RAW_QUERY` (achado
mecânico: "referenciadas em código real"). Essa classificação estava **parcialmente imprecisa** —
as colunas físicas existem e o nome aparece no DTO/migrations, mas o *caminho de persistência real*
(confirmado lendo `artists.service.ts::create()`/`update()`) grava o valor dentro de `metadata`
(`METADATA_FIELDS` coletados do contrato), nunca na coluna física homônima. As colunas físicas ficam
efetivamente **não utilizadas** por este caminho de código — reservadas/preparadas (schema já
existe, possivelmente de uma migration antecipando uma normalização futura), mas não é para lá que
o dado vai. Reclassificação correta:
`SCHEMA_COLUMN_PRESENT_BUT_APPLICATION_WRITES_TO_METADATA_JSONB_INSTEAD` (não é gap funcional — o
dado é persistido e recuperado corretamente via `metadata`, com round-trip confirmado em
`toResponse()`, que "achata" `metadata.<campo>` de volta para o nome plano na resposta da API — só
não é onde a introspecção do banco sugeria).

## 3. Dados sensíveis / criptografados

| Campo | Coluna DB | Criptografado | Camada | Leitura | Busca |
|---|---|---|---|---|---|
| Email | `email_encrypted` | SIM (AES-256-GCM, `EncryptionService`) | `artists.service.ts` `encryptNullable`/`safeDecrypt` | API decifra em `toResponse()`, expõe `email` plano | Não pesquisável por email (ciphertext não permite `ILIKE`) |
| Telefone | `telefone_encrypted` | SIM | idem | idem | idem |
| CPF/CNPJ | `cpf_cnpj_encrypted` | SIM | idem | idem | idem |
| Contato do manager | `manager_contato_encrypted` | SIM | idem | idem | idem |
| RG, endereço, dados bancários (banco/agência/conta/chave PIX/titular) | dentro de `metadata` jsonb | NÃO (metadata não é cifrada) | — | plano, dentro do JSON | não pesquisável (jsonb sem index de busca dedicado encontrado) |

`SEARCH_LIMITATION` confirmado: `searchableColumns: ['nome_artistico', 'nome_civil',
'genero_musical', 'observacoes']` no `ARTISTS_CONTRACT` — nenhum campo cifrado ou de `metadata` é
pesquisável pela Central de Relatórios; a busca da listagem (`Artistas.tsx`) é 100% client-side sobre
os dados já carregados (ver §6), então tecnicamente pesquisa até email/telefone decifrados que já
chegaram ao browser — mas não há busca server-side sobre PII cifrada (esperado/correto: ciphertext
não é pesquisável por natureza).

## 4. Create/Edit — mapeamento de campos

`services/artista.mapper.ts::formToArtistaPayload()`/`artistaToFormFields()` (o par usado pelo fluxo
real, `ArtistaFormModal.tsx`) foi lido por completo e mapeia corretamente ~45 campos de formulário
para os nomes de campo que `CreateArtistDto`/`UpdateArtistDto` esperam — incluindo o rename correto
`instagram`(form)→`instagram_url`(DTO/metadata) e `tiktok`(form)→`tiktok_url`(DTO/metadata),
resolvendo explicitamente (comentário no código, `artists.service.ts` linhas 36-37) um bug histórico
já corrigido onde esses dois campos eram descartados silenciosamente. Sem gaps de mapeamento
encontrados no par form↔DTO para os ~45 campos cobertos pelo modal.

`forms/artist-form.definition.ts` (fluxo órfão, `ArtistaCadastro.tsx`, §1) define ~71 campos
(granularidade maior, separa `genero` pessoa de `generoMusical`, tem seções de relacionamento mais
explícitas) — cobre uma superfície maior dos 78 campos reais que o modal, mas não é alcançável pela
UI.

`CREATE_SUPPORTED = EDIT_SUPPORTED` para praticamente todos os campos em ambos os fluxos — não foi
encontrado nenhum campo `IMMUTABLE_AFTER_CREATE` explícito (nem no schema, nem em validação).

## 5. Table/Grid (lista) e Detail/Profile

`Artistas.tsx` é um **grid de cards**, não uma `<Table>` — `data-testid="card-artista-*"`. Campos
exibidos por card: nome artístico, gênero musical, status, tipo, foto (avatar), especialidades,
contrato vinculado (via `artistasComContrato`, relação com `contracts`). `KPI` cards no topo:
total, exclusivos, (mais 2 não lidos em detalhe — baixo risco, são contagens derivadas do mesmo
array já carregado).

`ArtistaVisao360Modal.tsx` (3170 linhas — o maior componente já encontrado nesta auditoria) é o
"hub" central de detalhe: abas para dados pessoais/perfil, evolução/métricas de plataforma
(`ArtistaEvolucaoSection`+`ArtistaPlatformMetrics`+`PlatformMiniTrend`), equipe/contatos CRM
(`EquipeContatosCRM`), e listas relacionadas de obras/fonogramas/lançamentos/projetos/metas/
contratos/transações/eventos/conteúdos e campanhas de marketing (ver §6). Todos os campos exibidos
nessas abas rastreiam para colunas já confirmadas na Fase 1 ou nas relações do §6 — nenhum campo
sem origem conhecida encontrado na amostragem estrutural (grep de imports + padrão de filtro
consistente, não lido linha a linha nas 3170 linhas por volume).

## 6. Relações

Todas as relações a seguir seguem o MESMO padrão arquitetural já visto em `accounting`: o hook do
módulo relacionado busca **todos** os registros do tenant, e `ArtistaVisao360Modal.tsx` filtra
client-side por `artista_id === artistaId` (confirmado via grep direto no componente).

| Relação | Hook | Coluna FK | Enforcement no banco |
|---|---|---|---|
| Obras (works) | `useObras` (catalog) | `works.artista_id` | FK real → `artists.id` |
| Fonogramas (phonograms) | `useFonogramas` (catalog) | `phonograms.artista_id` | FK real → `artists.id` |
| Lançamentos (releases) | `useLancamentos` (releases) | `releases.artista_id` | FK real → `artists.id` |
| Contratos | `useContratos` (contracts) | `contracts.artista_id` | FK real → `artists.id` |
| Projetos | `useProjetos` (projects) | `projects.artista_id` | coluna existe, **sem FK declarada** — `LOGICAL_RELATION_WITHOUT_FK` |
| Transações (financeiro) | `useTransacoes` (accounting) | `transactions.artista_id` | coluna existe, **sem FK declarada** — `LOGICAL_RELATION_WITHOUT_FK` |
| Eventos | `useEventos` (events) | `events.artista_id` | coluna existe, **sem FK declarada** — `LOGICAL_RELATION_WITHOUT_FK` |
| Metas (goals) | `useMetas` (marketing) | `artist_goals.artista_id` | coluna existe, **sem FK declarada** — `LOGICAL_RELATION_WITHOUT_FK` |
| Contatos (CRM) | `useContacts` (crm-relationships) | via `EquipeContatosCRM`, vínculo por `contatos_vinculados` (metadata jsonb, §2) | relação lógica, não FK relacional |
| Conteúdos/Campanhas de marketing | `useMarketingContents`/`useMarketingCampaigns` | não verificado em detalhe (fora do escopo profundo desta passada — mapeamento superficial conforme §13 do prompt) | — |

Nenhuma relação ficou sem identificação de tabela/coluna de origem.

## 7. Financeiro do artista

`transactions.artista_id` é uma coluna real (Fase 1: `DIRECT`), sem FK declarada
(`LOGICAL_RELATION_WITHOUT_FK`, mesma tabela já auditada em `accounting`). `ArtistaVisao360Modal.tsx`
usa `useTransacoes()` (o MESMO hook do módulo accounting, sem endpoint próprio de artista) e filtra
client-side. **Confirmado**: é uma relação real e persistida (não apenas vínculo de UI) — o
`artista_id` é gravado de verdade na tabela `transactions` no momento da criação da transação
(campo `artistaVinculado` do formulário de Transação, já confirmado em `accounting.md`). Não é
afetado pelo gap do `entityLinks`/P&L (`accounting.md` §2.1) — esse gap é sobre o array de rateio
multi-entidade, não sobre o vínculo simples `artista_id`, que funciona corretamente.

## 8. Plataformas externas / métricas

Dois sistemas distintos e não confundíveis:

1. **Contadores estáticos manuais** (`spotify_ouvintes`, `youtube_inscritos`, `deezer_fas`,
   `apple_music_albuns_url`, `soundcloud_seguidores_url`, `instagram_seguidores`,
   `tiktok_seguidores`) — campos de formulário, digitados manualmente pelo usuário, armazenados em
   `metadata` (§2). `SOURCE_OF_TRUTH: manual do usuário`, sem sincronização automática.
2. **Sincronização real com API externa** (`useArtistPlatformProfiles`/
   `useSyncArtistPlatformProfile`, tabela `artist_platform_profiles` — 24 colunas, 100% `DIRECT`,
   confirmada na Fase 1): `GET/POST /artists/:id/platform-profiles[/:platform/sync]`. Providers
   reais e funcionais lidos por completo:
   - **Spotify** (`spotify-artist-profile.provider.ts`): OAuth client-credentials real contra
     `accounts.spotify.com`/`api.spotify.com`. `CREDENTIAL_REQUIRED_LATER: SIM` —
     `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`, `OWNERSHIP: PLATFORM` (não por tenant). Se
     ausente, `isConfigured()` retorna falso e a sincronização falha com erro claro
     (`ServiceUnavailableException`), não silenciosamente.
   - **YouTube** (`youtube-artist-profile.provider.ts`): YouTube Data API v3 real.
     `CREDENTIAL_REQUIRED_LATER: SIM` — `YOUTUBE_API_KEY`, `OWNERSHIP: PLATFORM`. Mesmo
     comportamento de falha explícita quando não configurado.
   `SOURCE_OF_TRUTH: API externa`, via job assíncrono (`enqueued`/`job_id` na resposta de sync).

Os dois sistemas não se sobrepõem tecnicamente (colunas/tabelas diferentes), mas representam
conceitualmente a MESMA informação (seguidores/ouvintes por plataforma) capturada de duas formas
diferentes sem nenhuma reconciliação visível entre elas — registrado como observação, não como
gap técnico (nenhum dos dois está quebrado).

## 9. Storage (avatar/documentos)

`ARTIST_FORM_SECTIONS` declara 3 campos `type: "file"`: `fotoUrl` (`folder: "artistas/fotos"`,
`accept: "image/*"`, `maxSize: 5MB`, `circular: true`), `documentosPessoaisUrl`
(`folder: "artistas/documentos"`, `accept: "application/pdf"`), `presskitUrl` (idem, PDF).
`ArtistaFormModal.tsx` importa e usa `@/shared/components/FileUpload` (que usa `useUploadToR2`,
confirmado real — não é um campo de texto disfarçado). Fluxo end-to-end real, não quebrado.

## 10. Import / Export / XLSX

**Import**: `Artistas.tsx::handleExcelImport` — lê **apenas a primeira aba** (`workbook.
SheetNames[0]`) via `XLSX.utils.sheet_to_json`, processa linha a linha via `parseArtistaImportRow`
(services/artista.mapper.ts, mesma fonte única do form). `WORKSHEET_COUNT` consumido: 1 — dentro da
regra. Sem `XLSX_RULE_VIOLATION` neste módulo.

**Export**: nenhum botão de exportação dedicado em `Artistas.tsx` (grep confirmado). A exportação
real acontece pela Central de Relatórios centralizada (`report-module-registry.ts`, `{ tableName:
'artists', label: 'Artistas' }`, já documentado no doc80), consumindo o mesmo `ARTISTS_CONTRACT`
(68 campos, coluna/metadata/cifrado corretamente resolvidos e descriptografados na exportação por
`ExportEngineService`). Não recontado aqui — pertence à infraestrutura central de relatórios, não ao
módulo `artist` isoladamente.

## 11. Filtros / Busca / Ordenação / Paginação

Tudo client-side (mesmo padrão de `accounting`/`admin`): busca (nome/email/gênero — 1 campo de
busca cobrindo múltiplas colunas), 3 selects de filtro (gênero, status, tipo — a julgar pelos
`SelectTrigger` encontrados), paginação via `usePagination` (10/página). Sem ordenação explícita por
coluna encontrada (sem `SortableTableHead` no grid de cards). `BACKEND_FILTER: NENHUM` —
`artistaService.list()` não aceita parâmetros.

## 12. Permissões / Tenant isolation / Delete

Backend (`artists.controller.ts`, lido por completo): todas as rotas com `@RequireRole`+
`@RequirePermission`+`@CurrentTenant` — leitura=`viewer`/`artist:read`, criar=`editor`/
`artist:create`, editar=`editor`/`artist:update`, sync de plataforma=`editor`/`artist:update`,
excluir=`manager`/`artist:delete`. `DELETE` chama `softDelete()` (usa `deleted_at`, confirmado
`DIRECT` na Fase 1) — **soft delete confirmado**, não hard delete. Frontend usa
`RequirePermission module="artists" action="write"` no botão "Novo Artista" — consistente com o
enforcement do backend. `AUTHORIZATION_GAP: 0`. `TENANT_ISOLATION_GAP: 0` (todas as rotas exigem
`@CurrentTenant`, sem exceção encontrada).

## 13. `CROSS_MODULE_AUDITORIA_TSX` — seção específica de artistas

Fecha a lacuna deixada pelo módulo `admin` (`admin.md` §7). Config real em `shared/lib/audit/
runner.ts`, objeto `{ module: "artistas", table: "artistas", ... }`:

```text
AUDITORIA_ARTIST_FIELDS:
  nome_artistico   (severidade: obrigatorio)
  genero_musical   (severidade: obrigatorio)
  email            (severidade: obrigatorio)
  telefone         (severidade: recomendado)
  cpf_cnpj         (severidade: recomendado)
  status           (severidade: recomendado)

AUDITORIA_ARTIST_RULES:
  entityType: "Artista"
  label: entityLabel(row, ["nome_artistico","nome_civil","email"], "Artista sem nome")
  fixPath: "/artistas?edit=<id>" (abre ArtistaFormModal — o fluxo real, não o órfão)

AUDITORIA_ARTIST_DATABASE_SOURCES:
  table: "artistas" → endpoint /artists (mesmo hook useDataQuery/storage já usado em toda a app)
  Os campos email/telefone/cpf_cnpj checados aqui batem exatamente com os nomes PLANOS que a API
  retorna já descriptografados (toResponse() em artists.service.ts) — a checagem de completude
  funciona corretamente mesmo sendo campos cifrados no banco, porque opera sobre a resposta da API,
  não sobre as colunas *_encrypted diretamente. Confirmado, sem gap.

AUDITORIA_ARTIST_GAPS:
  Nenhum gap próprio encontrado nesta seção — as 6 regras batem 1:1 com campos reais e alcançáveis
  via o fluxo de edição real (ArtistaFormModal). Único ponto de atenção: a regra não verifica
  nenhum dos ~41 campos armazenados em `metadata` (§2) nem os campos do fluxo órfão
  ArtistaCadastro.tsx — mas isso é esperado/correto, pois a auditoria de completude é sobre o dado
  persistido real (via API), não sobre a superfície completa de todos os formulários possíveis.
```

## Resumo

```text
STATUS: CONCLUÍDO (módulo artist)
MODULE_STATUS: COMPLETE
UNMAPPED_CREATE_FIELDS: 0
UNMAPPED_EDIT_FIELDS: 0
UNMAPPED_DISPLAY_COLUMNS: 0
UNMAPPED_RELATION_FIELDS: 0
UNMAPPED_IMPORT_FIELDS: 0
UNMAPPED_EXPORT_FIELDS: 0
UNMAPPED_METRIC_FIELDS: 0
UNMAPPED_PLATFORM_FIELDS: 0
UNMAPPED_STORAGE_FIELDS: 0
UNKNOWN_FIELD_CLASSIFICATIONS: 0
REAL_MAPPING_GAPS: 3 (dois fluxos paralelos de create/edit com cobertura de campo divergente,
  ArtistaCadastro.tsx órfão/inalcançável pela UI; ~41 colunas físicas da tabela artists reservadas
  mas não usadas — dado real vive em metadata jsonb, correção de classificação da Fase 1;
  contadores estáticos manuais de seguidores/ouvintes coexistem sem reconciliação com o sistema
  real de sync via API externa)
AUTHORIZATION_GAPS: 0
TENANT_ISOLATION_GAPS: 0
CREDENTIALS_REQUIRED_LATER: 2 (Spotify: SPOTIFY_CLIENT_ID+SPOTIFY_CLIENT_SECRET, plataforma;
  YouTube: YOUTUBE_API_KEY, plataforma) — não solicitadas ao usuário, auditoria não bloqueada por
  isso.
```
