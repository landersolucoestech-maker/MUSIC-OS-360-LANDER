# Auditoria de Alinhamento Formulários × Banco de Dados

> Fase 13B (retomada) — mandato: nenhuma migration financeira adicional roda
> enquanto o schema relacional não estiver comprovadamente compatível com os
> formulários ativos. Este documento registra o método, as evidências e o
> resultado desta auditoria.

## 1. Metodologia

Em vez de inspecionar manualmente centenas de campos em dezenas de módulos
sem guia, a auditoria partiu do próprio mecanismo que o projeto já usa para
resolver exatamente este problema: migrations nomeadas `*FormFieldColumns`,
seguindo a **regra de produto de 2026-07-12** ("cada campo do formulário tem
a SUA coluna física, nome exato, nunca agregado em `metadata` jsonb").
Localizamos essas migrations no disco, confirmamos que cobrem os domínios
alegados como quebrados, lemos cada uma por completo (`up`/`down`, simetria
de colunas, migração de dados legados de `metadata`→coluna) e cruzamos com
entity, DTO, service e formulário do frontend para o caso citado (`artists`).

## 2. Achado principal

**`artists` NÃO é uma lacuna de modelagem não descoberta.** É uma migration
já **inteiramente escrita, correta e completa**
(`20260712000001_ArtistsFormFieldColumns.ts`, presente em disco, ainda não
commitada em git — uma das "162 pendências" desta sessão), que:
- adiciona as 45 colunas que faltam na tabela `artists` de InitialSchema,
  com o nome EXATO usado por `formToArtistaPayload` (frontend);
- migra dados legados que viviam em `metadata` jsonb para as colunas novas
  (`UPDATE ... COALESCE(coluna, metadata->>'chave')`), sem apagar o
  `metadata` original;
- tem `down()` simétrico (45 `DROP COLUMN IF EXISTS`, mesma lista).

A razão de a tabela **parecer** incompleta é que o replay desta fase está
**pausado na posição 75/92** (bloqueado pelo bug de FORCE RLS, corrigido
nesta mesma retomada) — e esta migration está em posição **posterior** na
cadeia (timestamp `20260712000001`), ainda não executada. Não é uma falha de
autoria; é um estado normal de banco em reconstrução.

## 3. Inventário de formulários (escopo desta auditoria)

Método de inventário: busca por migrations `*FormFieldColumns` (mecanismo
canônico do projeto) + leitura completa dos arquivos + cruzamento pontual
com o formulário frontend do domínio mais citado (`artists`). **Este NÃO é
um inventário exaustivo de todos os ~100+ módulos do repositório** — ver
§6 (escopo não coberto) para o que fica fora desta rodada.

| Migration | Tabelas | Data | Estado no replay |
|---|---|---|---|
| `20260712000001_ArtistsFormFieldColumns` | artists | 2026-07-12 | pendente (posição >75) |
| `20260712000002_CatalogFormFieldColumns` | phonograms, works | 2026-07-12 | pendente |
| `20260712000003_HrFormFieldColumns` | employees, leave_requests, payroll_entries | 2026-07-12 | pendente |
| `20260712000004_SharesContractsFormFieldColumns` | contracts, shares | 2026-07-12 | pendente |
| `20260712000005_CrmFinanceOpsFormFieldColumns` | clients, events, invoices, leads, licenses, takedowns, transactions | 2026-07-12 | pendente |

**15 tabelas** cobertas por este esforço (confirma a memória de sessão:
"regra sem-metadata aplicada em 15 módulos", 2026-07-12).

## 4. Auditoria detalhada de `artists`

### 4.1 Cadeia verificada
`entities.ts` (`ArtistEntity`, 73 colunas) → `create-artist.dto.ts` (DTO
aceita todos os campos do formulário) → `update-artist.dto.ts`
(`PartialType(CreateArtistDto)` — idêntico, campos opcionais) →
`artists.service.ts` (persistência **dirigida por contrato**:
`NULLABLE_COLUMNS`/`REQUIRED_COLUMNS`/`JSONB_LIST_COLUMNS`/`ENCRYPTED_FIELDS`
derivados de `REPORT_FORM_CONTRACTS.artists` — nenhuma lista hardcoded
divergente; um campo novo no contrato é automaticamente persistido) →
frontend `artist-form.definition.ts` (fonte única do formulário: campos,
schema Zod gerado, hidratação, export/import todos da MESMA definição) →
`artista.mapper.ts` (`formToArtistaPayload`/`artistaToFormFields`).

### 4.2 Matriz (campo do formulário → coluna/relação atual)

| Campo do formulário | Coluna/relação | Situação |
|---|---|---|
| fotoUrl | `foto_url` (text) | CORRETO |
| nomeArtistico | `nome_artistico` (varchar 255, NOT NULL) | CORRETO |
| generoMusical | `genero_musical` (varchar 100) | CORRETO |
| especialidades | `especialidades` (jsonb) | CORRETO |
| documentosPessoaisUrl | `documentos_pessoais_url` (text) | CORRETO — coluna na migration pendente |
| presskitUrl | `presskit_url` (text) | CORRETO — coluna na migration pendente |
| biografia | `observacoes` (text) | CORRETO (nome divergente documentado: form chama "biografia", coluna é `observacoes` — mapeamento explícito e estável, não um bug) |
| nome (civil) | `nome_civil` (varchar 255) | CORRETO |
| dataNascimento | `data_nascimento` (date) | CORRETO — coluna na migration pendente |
| cpfCnpj | `cpf_cnpj_encrypted` (text, cifrado) | CORRETO — PII cifrada, 1 coluna |
| rg | `rg` (varchar 30) | CORRETO — coluna na migration pendente |
| genero | `genero` (varchar 30) | CORRETO — coluna na migration pendente |
| endereco | `endereco` (varchar 300) | CORRETO — coluna na migration pendente |
| telefone | `telefone_encrypted` (text, cifrado) | CORRETO |
| email | `email_encrypted` (text, cifrado) | CORRETO |
| banco/agencia/conta/chavePix/titularConta | `banco`/`agencia`/`conta`/`chave_pix`/`titular_conta` | CORRETO — colunas na migration pendente |
| spotify/instagram/youtube/tiktok/soundcloud/deezer/appleMusic | `spotify_url`/`instagram`/`youtube_url`/`tiktok`/`soundcloud_url`/`deezer_url`/`apple_music_url` | CORRETO |
| tipoPerfil | `tipo_perfil` (varchar 30) | CORRETO — coluna na migration pendente |
| distribuidorasGerais | `distribuidoras_gerais` (jsonb) | CORRETO — coluna na migration pendente |
| contatosVinculados | `contatos_vinculados` (jsonb) | CORRETO — coluna na migration pendente |
| notasInternas | `notas_internas` (text) | CORRETO — coluna na migration pendente |
| relacionamentos (empresário/gravadora/editora) | `relacionamentos` (jsonb) + campos legados `empresario_*`/`gravadora_*` preservados p/ retrocompat | CORRETO — todas colunas na migration pendente |
| \*_seguidores/\*_ouvintes/\*_fas/\*_albuns (métricas de plataforma) | colunas `integer` dedicadas por plataforma | CORRETO — colunas na migration pendente |

**Nenhuma linha "COLUNA AUSENTE" real** — todas as colunas necessárias já
estão especificadas na migration pendente `ArtistsFormFieldColumns`.

## 5. Ação corretiva

**Nenhuma migration nova é necessária para os 15 tabelas listadas em §3.**
A ação correta é deixar o replay avançar até essas migrations (posições
posteriores à 75, dentro da cadeia legada já auditada na Fase 13B). As 5
migrations foram relidas por completo nesta auditoria: `up()`/`down()`
simétricos, sem `CASCADE` amplo, sem dado de negócio inserido (apenas
migração de valores já existentes de `metadata`→coluna, quando havia).

## 6. Escopo NÃO coberto por esta rodada (transparência obrigatória)

O repositório tem mais de 100 tabelas e dezenas de módulos de frontend.
Esta auditoria **verificou em profundidade** apenas `artists` (citado
explicitamente como caso confirmado) e **verificou estruturalmente** (leitura
completa das migrations, sem comparação campo-a-campo com o frontend) os
outros 14 tabelas de §3. Módulos **não auditados nesta rodada** — sem
evidência de problema, mas também sem verificação: audiovisual, marketing,
releases/lançamentos, billing/subscriptions, inventory, RH além de
employees/leave/payroll, settings/usuários, notifications, support,
musicchat, integrations, RBAC/permissions, dashboard/reports. Nenhuma
migration corretiva nova foi criada especulativamente para esses módulos —
o mandato desta fase proíbe inventar sem evidência concreta de campo
descartado.

## 7. Testes de contrato

Não foram criados testes novos de round-trip nesta rodada: os testes
existentes já cobrem parte do contrato (`artists.service.spec.ts`,
`create-artist.dto.spec.ts`, `legacy-platform-fields.guard.spec.ts`,
`artists-cross-tenant.integration.spec.ts`). Criar testes de round-trip
completo (`formulário → banco → API → formulário`) para os 15 domínios é
recomendado como próxima ação, mas depende de conexão real ao DEV (fora do
escopo "sem banco" desta fase de auditoria).

## 8. Dívida técnica remanescente registrada

- Módulos fora de §3 não auditados (ver §6) — candidatos a auditoria futura,
  priorizados por risco (financeiro já auditado nas Fases 10-12; próximo
  candidato natural: audiovisual e marketing, por volume de formulários).
- `artists.genero` (gênero da pessoa) e `artists.genero_musical` (gênero
  musical) coexistem com nomes próximos — não é um bug, mas vale considerar
  renomear em uma fase de limpeza de nomenclatura futura (fora do escopo
  "apenas correções inequívocas" desta fase).

## 9. Contagem de migrations (atualizada)

```text
92 legadas (incluindo as 5 FormFieldColumns já existentes — SEM alteração)
10 financeiras (M0–M9, Fase 13A)
0 migrations corretivas NOVAS (nenhuma lacuna nova confirmada)
TOTAL = 102 (inalterado)
```

## 10. Ordem final de replay (recomendada)

```text
1. retomar migrations legadas 75–92 (inclui as 5 FormFieldColumns) — JÁ CORRIGIDO o bloqueio de 75
2. validar 92/92 registradas
3. executar M0–M9 (Fase 13A, incl. M2 corrigida na Fase 13B)
4. validações completas (invariantes, RLS, maior resto, conciliação)
```
