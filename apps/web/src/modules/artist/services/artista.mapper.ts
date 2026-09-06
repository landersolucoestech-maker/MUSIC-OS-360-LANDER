/**
 * artistaMappers.ts
 * ─────────────────────────────────────────────────────────────────
 * ÚNICA FONTE DE VERDADE para toda transformação de dados de artista.
 * Exportação, importação e formulário devem consumir estas funções
 * para garantir consistência total entre CREATE, EDIT, VIEW e LIST.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Artista, ArtistaRelacionamento, ArtistaDistribuidoraEntry } from "@/modules/artist/types/artista.types";

// ─── Utilidades internas ──────────────────────────────────────────

function str(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s;
}

function strOrNull(v: unknown): string | null {
  const s = str(v);
  return s !== "" ? s : null;
}

function numOrNull(v: unknown): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).trim());
  return isNaN(n) ? null : n;
}

/**
 * Remove diacritics e coloca em lowercase para matching
 * case-insensitive e tolerante a acentuação variada.
 */
function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Retorna o valor da linha Excel para o primeiro cabeçalho que corresponda,
 * comparando após normalização de Unicode/case.
 * Isso resolve casos em que Excel salva "Tipo de Perfil" com NFD diferente.
 */
export function pickRow(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    // Tentativa exata primeiro (mais rápida)
    if (key in row) return row[key];
    // Fallback: normalizado
    const normKey = normalizeKey(key);
    for (const rowKey of Object.keys(row)) {
      if (normalizeKey(rowKey) === normKey) return row[rowKey];
    }
  }
  return undefined;
}

/**
 * Normaliza o valor de "Tipo de Perfil" para o enum interno,
 * aceitando qualquer variação razoável de caixa, espaços ou acentos.
 */
export function normalizeTipoPerfil(
  raw: unknown,
): "independente" | "com_empresario" | "gravadora" | "editora" {
  const v = normalizeKey(str(raw));
  if (!v || v === "independente") return "independente";
  if (v === "gravadora") return "gravadora";
  if (v === "editora") return "editora";
  if (
    v === "com_empresario" ||
    v.startsWith("com_") ||
    v.startsWith("com ") ||
    v.includes("empresario") ||
    v.includes("empresarial")
  )
    return "com_empresario";
  return "independente";
}

// ─── Especialidades (Função) ─────────────────────────────────────

/**
 * Mapeamento canônico enum → label legível.
 * Fonte única de verdade para formulário, Visão360, export e import.
 */
export const ESPECIALIDADES_LABELS: Record<string, string> = {
  dj:               "DJ",
  dj_produtor:      "DJ/Produtor",
  compositor_autor: "Compositor/Autor",
  interprete:       "Intérprete",
  produtor:         "Produtor",
};

/** Mapeamento inverso: label normalizado → enum interno. */
const ESPECIALIDADES_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(ESPECIALIDADES_LABELS).map(([k, v]) => [normalizeKey(v), k]),
);

/**
 * Converte qualquer variação de label ou enum para o valor interno.
 * Retorna "" para valores não reconhecidos (serão filtrados no import).
 */
export function normalizeEspecialidade(raw: string): string {
  const v1 = normalizeKey(raw);
  if (ESPECIALIDADES_ENUM[v1]) return ESPECIALIDADES_ENUM[v1];

  const v2 = normalizeKey(raw.replace(/_/g, "/"));
  if (ESPECIALIDADES_ENUM[v2]) return ESPECIALIDADES_ENUM[v2];

  const asEnum = v1.replace(/\//g, "_");
  if (ESPECIALIDADES_LABELS[asEnum]) return asEnum;

  return "";
}

// ─── Slug artístico ───────────────────────────────────────────────

/**
 * Gera um slug a partir do nome artístico:
 * remove acentos, converte para lowercase, substitui espaços por hífens.
 */
export function gerarSlugArtistico(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── Validadores de URL de plataformas ───────────────────────────
// O domínio trabalha exclusivamente com URLs — não existe extração nem
// reconstrução de ID de plataforma em nenhuma camada. Os regexes abaixo
// espelham exatamente os `@Matches` de CreateArtistDto/UpdateArtistDto no
// backend (fonte de verdade da validação); aqui servem só de feedback
// visual imediato no formulário.

export type UrlValidationState = "idle" | "valid" | "invalid";

const SPOTIFY_ARTIST_URL_RE = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?artist\/[A-Za-z0-9]{22}(?:[/?#].*)?$/i;
const YOUTUBE_URL_RE = /^https:\/\/(?:www\.)?(?:youtube\.com\/(?:@[^/?#]+|channel\/UC[A-Za-z0-9_-]{22})(?:[/?#].*)?|music\.youtube\.com\/(?:.*))$/i;

export function validateSpotifyUrl(url: string): UrlValidationState {
  if (!url.trim()) return "idle";
  return SPOTIFY_ARTIST_URL_RE.test(url.trim()) ? "valid" : "invalid";
}

export function validateYoutubeUrl(url: string): UrlValidationState {
  if (!url.trim()) return "idle";
  return YOUTUBE_URL_RE.test(url.trim()) ? "valid" : "invalid";
}

/**
 * Validates that `url` is a real URL whose host is (a subdomain of) `host`.
 * Parses the URL instead of matching an unanchored substring regex, so a value
 * like `https://evil.com/?x=instagram.com/` is correctly rejected (CWE-20).
 */
function hasHost(url: string, host: string): boolean {
  const trimmed = url.trim();
  // Tolerate scheme-less input (users paste "instagram.com/x") without weakening
  // the check: the value is still parsed as a URL and the HOST is compared.
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const h = new URL(candidate).hostname.toLowerCase();
    return h === host || h.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

export function validateInstagramUrl(url: string): UrlValidationState {
  if (!url.trim()) return "idle";
  return hasHost(url, "instagram.com") ? "valid" : "invalid";
}

export function validateTiktokUrl(url: string): UrlValidationState {
  if (!url.trim()) return "idle";
  return hasHost(url, "tiktok.com") ? "valid" : "invalid";
}

export function validateSoundcloudUrl(url: string): UrlValidationState {
  if (!url.trim()) return "idle";
  return hasHost(url, "soundcloud.com") ? "valid" : "invalid";
}

export function validateDeezerUrl(url: string): UrlValidationState {
  if (!url.trim()) return "idle";
  return hasHost(url, "deezer.com") ? "valid" : "invalid";
}

export function validateAppleMusicUrl(url: string): UrlValidationState {
  if (!url.trim()) return "idle";
  return hasHost(url, "music.apple.com") ? "valid" : "invalid";
}

// ─── Exportação / Importação ─────────────────────────────────────
// REMOVIDO: artistaToExportRow / importRowToArtista (listas manuais de
// colunas). Exportação e importação agora iteram a definição única do
// formulário em forms/artist-form.definition.ts (artistaToExportRowFromForm
// e parseArtistaImportRow) — 1 campo do formulário = 1 coluna, mesma ordem.

// ─── Form Fields Interface ────────────────────────────────────────

export interface ArtistaFormResponsavel {
  nome: string;
  telefone: string;
  email: string;
}

export interface ArtistaFormRelacionamento {
  type: "empresario" | "gravadora" | "editora" | "booker" | "juridico" | "financeiro" | "contador" | "assessoria";
  nome: string;
  telefone: string;
  email: string;
  escritorio: string;
  crc: string;
  responsaveis: ArtistaFormResponsavel[];
  distribuidoras: ArtistaDistribuidoraEntry[];
}

export interface ArtistaFormFields {
  nomeArtistico: string;
  slugArtistico: string;
  tagsMusicais: string[];
  faseCarreira: string;
  generoMusical: string;
  statusArtista: string;
  especialidades: string[];
  biografia: string;
  notasInternas: string;
  nome: string;
  dataNascimento: string;
  cpfCnpj: string;
  rg: string;
  endereco: string;
  telefone: string;
  email: string;
  banco: string;
  agencia: string;
  conta: string;
  chavePix: string;
  titularConta: string;
  spotify: string;
  spotifyOuvintes: string;
  instagram: string;
  instagramSeguidores: string;
  youtube: string;
  youtubeInscritos: string;
  tiktok: string;
  tiktokSeguidores: string;
  soundcloud: string;
  soundcloudSeguidores: string;
  deezer: string;
  deezerFas: string;
  appleMusic: string;
  appleMusicAlbuns: string;
  // relacionamentos comerciais (novo modelo relacional)
  relacionamentos: ArtistaFormRelacionamento[];
  // legado — mantido para backward compat com CRM select
  tipoPerfil: "independente" | "com_empresario" | "gravadora" | "editora";
  empresarioId: string;
  empresarioNome: string;
  empresarioTelefone: string;
  empresarioEmail: string;
  gravadoraId: string;
  gravadoraNome: string;
  gravadoraTelefone: string;
  gravadoraEmail: string;
  gravadoraResponsavelId: string;
  gravadoraResponsavelNome: string;
  gravadoraResponsavelTelefone: string;
  gravadoraResponsavelEmail: string;
  distribuidorasSelecionadas: Record<string, boolean>;
  distribuidorasEmails: Record<string, string>;
  distribuidorasEmpresaSelecionadas: Record<string, boolean>;
  distribuidorasEmpresaEmails: Record<string, string>;
  fotoUrl: string;
  documentosPessoaisUrl: string;
  presskitUrl: string;
  contratoId: string;
}

function emptyRelacionamento(type: ArtistaFormRelacionamento["type"]): ArtistaFormRelacionamento {
  return { type, nome: "", telefone: "", email: "", escritorio: "", crc: "", responsaveis: [], distribuidoras: [] };
}

function dbRelToForm(r: ArtistaRelacionamento): ArtistaFormRelacionamento {
  return {
    type: r.type,
    nome: r.nome ?? "",
    telefone: r.telefone ?? "",
    email: r.email ?? "",
    escritorio: r.escritorio ?? "",
    crc: r.crc ?? "",
    responsaveis: Array.isArray(r.responsaveis)
      ? r.responsaveis.map((rv) => ({ nome: rv.nome ?? "", telefone: rv.telefone ?? "", email: rv.email ?? "" }))
      : [],
    distribuidoras: Array.isArray(r.distribuidoras) ? r.distribuidoras : [],
  };
}

/** Constrói ArtistaDistribuidoraEntry[] a partir dos campos legados de distribuidoras. */
function buildLegacyDistribuidoras(
  selecionadas: Record<string, boolean> | null | undefined,
  emails: Record<string, string> | null | undefined,
): ArtistaDistribuidoraEntry[] {
  if (!selecionadas) return [];
  return Object.entries(selecionadas)
    .filter(([, selected]) => selected)
    .map(([id]) => ({ id, email: emails?.[id] ?? "" }));
}

/**
 * Migra campos legados para o novo array de relacionamentos quando o artista
 * não tem `relacionamentos` mas tem campos empresario_* / gravadora_* preenchidos.
 * Também migra distribuidoras_selecionadas e gravadora_responsavel_* legados.
 */
function migrateLegatoRelacionamentos(artista: Artista): ArtistaFormRelacionamento[] {
  const rels: ArtistaFormRelacionamento[] = [];

  // Distribuidoras legadas — serão atribuídas ao primeiro empresario ou gravadora
  const legacyDists = buildLegacyDistribuidoras(
    artista.distribuidoras_selecionadas,
    artista.distribuidoras_emails,
  );
  const legacyEmpresaDists = buildLegacyDistribuidoras(
    artista.distribuidoras_empresa_selecionadas,
    artista.distribuidoras_empresa_emails,
  );

  if (artista.empresario_nome) {
    rels.push({
      type: "empresario",
      nome: str(artista.empresario_nome),
      telefone: str(artista.empresario_telefone),
      email: str(artista.empresario_email),
      escritorio: "",
      crc: "",
      responsaveis: [],
      distribuidoras: legacyDists,
    });
  }

  if (artista.gravadora_nome) {
    const tp = str(artista.tipo_perfil);
    const tipoRel: ArtistaFormRelacionamento["type"] = tp === "editora" ? "editora" : "gravadora";
    // Migrar o responsável único legado (gravadora_responsavel_*) para o array
    const responsaveis: ArtistaFormResponsavel[] = [];
    if (artista.gravadora_responsavel_nome) {
      responsaveis.push({
        nome: str(artista.gravadora_responsavel_nome),
        telefone: str(artista.gravadora_responsavel_telefone),
        email: str(artista.gravadora_responsavel_email),
      });
    }
    rels.push({
      type: tipoRel,
      nome: str(artista.gravadora_nome),
      telefone: str(artista.gravadora_telefone),
      email: str(artista.gravadora_email),
      escritorio: "",
      crc: "",
      responsaveis,
      // Se já existe empresario, as legacyDists foram atribuídas a ele; caso contrário atribuir aqui
      distribuidoras: artista.empresario_nome ? legacyEmpresaDists : legacyDists,
    });
  }

  return rels;
}

/**
 * Converte um registro de artista (vindo do banco) no estado de formulário.
 * Usado no useEffect de ArtistaFormModal quando open=true.
 */
export function artistaToFormFields(artista: Artista | null | undefined): ArtistaFormFields {
  const emptyBase: ArtistaFormFields = {
    nomeArtistico: "",
    slugArtistico: "",
    tagsMusicais: [],
    faseCarreira: "",
    generoMusical: "",
    statusArtista: "contratado",
    especialidades: [],
    biografia: "",
    notasInternas: "",
    nome: "",
    dataNascimento: "",
    cpfCnpj: "",
    rg: "",
    endereco: "",
    telefone: "",
    email: "",
    banco: "",
    agencia: "",
    conta: "",
    chavePix: "",
    titularConta: "",
    spotify: "",
    spotifyOuvintes: "",
    instagram: "",
    instagramSeguidores: "",
    youtube: "",
    youtubeInscritos: "",
    tiktok: "",
    tiktokSeguidores: "",
    soundcloud: "",
    soundcloudSeguidores: "",
    deezer: "",
    deezerFas: "",
    appleMusic: "",
    appleMusicAlbuns: "",
    relacionamentos: [],
    tipoPerfil: "independente",
    empresarioId: "",
    empresarioNome: "",
    empresarioTelefone: "",
    empresarioEmail: "",
    gravadoraId: "",
    gravadoraNome: "",
    gravadoraTelefone: "",
    gravadoraEmail: "",
    gravadoraResponsavelId: "",
    gravadoraResponsavelNome: "",
    gravadoraResponsavelTelefone: "",
    gravadoraResponsavelEmail: "",
    distribuidorasSelecionadas: {},
    distribuidorasEmails: {},
    distribuidorasEmpresaSelecionadas: {},
    distribuidorasEmpresaEmails: {},
    fotoUrl: "",
    documentosPessoaisUrl: "",
    presskitUrl: "",
    contratoId: "",
  };

  if (!artista) return emptyBase;

  // Relacionamentos: usa novo campo ou migra do legado
  let relacionamentos: ArtistaFormRelacionamento[] = [];
  if (Array.isArray(artista.relacionamentos) && artista.relacionamentos.length > 0) {
    relacionamentos = artista.relacionamentos.map(dbRelToForm);
  } else {
    relacionamentos = migrateLegatoRelacionamentos(artista);
  }

  return {
    nomeArtistico: str(artista.nome_artistico),
    slugArtistico: str(artista.slug_artistico),
    tagsMusicais: Array.isArray(artista.tags_musicais) ? artista.tags_musicais : [],
    faseCarreira: str(artista.fase_carreira),
    generoMusical: str(artista.genero_musical),
    statusArtista: str(artista.status) || "contratado",
    especialidades: Array.isArray(artista.especialidades) ? artista.especialidades : [],
    biografia: str(artista.observacoes),
    notasInternas: str(artista.notas_internas),
    // Pessoal
    nome: str(artista.nome_civil),
    dataNascimento: str(artista.data_nascimento),
    cpfCnpj: str(artista.cpf_cnpj),
    rg: str(artista.rg),
    endereco: str(artista.endereco),
    telefone: str(artista.telefone),
    email: str(artista.email),
    // Bancário
    banco: str(artista.banco),
    agencia: str(artista.agencia),
    conta: str(artista.conta),
    chavePix: str(artista.chave_pix),
    titularConta: str(artista.titular_conta),
    // Plataformas — a URL é o dado persistido (nenhuma reconstrução a partir de ID)
    spotify: str(artista.spotify_url),
    spotifyOuvintes: artista.spotify_ouvintes != null ? String(artista.spotify_ouvintes) : "",
    instagram: str(artista.instagram_url),
    instagramSeguidores: artista.instagram_seguidores != null ? String(artista.instagram_seguidores) : "",
    youtube: str(artista.youtube_url),
    youtubeInscritos: artista.youtube_inscritos != null ? String(artista.youtube_inscritos) : "",
    tiktok: str(artista.tiktok_url),
    tiktokSeguidores: artista.tiktok_seguidores != null ? String(artista.tiktok_seguidores) : "",
    soundcloud: str(artista.soundcloud_url),
    soundcloudSeguidores: artista.soundcloud_seguidores_url != null ? String(artista.soundcloud_seguidores_url) : "",
    deezer: str(artista.deezer_url),
    deezerFas: artista.deezer_fas != null ? String(artista.deezer_fas) : "",
    appleMusic: str(artista.apple_music_url),
    appleMusicAlbuns: artista.apple_music_albuns_url != null ? String(artista.apple_music_albuns_url) : "",
    // Relacionamentos
    relacionamentos,
    // Legado
    tipoPerfil: (str(artista.tipo_perfil) || "independente") as ArtistaFormFields["tipoPerfil"],
    empresarioId: str(artista.empresario_id),
    empresarioNome: str(artista.empresario_nome),
    empresarioTelefone: str(artista.empresario_telefone),
    empresarioEmail: str(artista.empresario_email),
    gravadoraId: str(artista.gravadora_id),
    gravadoraNome: str(artista.gravadora_nome),
    gravadoraTelefone: str(artista.gravadora_telefone),
    gravadoraEmail: str(artista.gravadora_email),
    gravadoraResponsavelId: str(artista.gravadora_responsavel_id),
    gravadoraResponsavelNome: str(artista.gravadora_responsavel_nome),
    gravadoraResponsavelTelefone: str(artista.gravadora_responsavel_telefone),
    gravadoraResponsavelEmail: str(artista.gravadora_responsavel_email),
    distribuidorasSelecionadas: (artista.distribuidoras_selecionadas as Record<string, boolean> | null) ?? {},
    distribuidorasEmails: (artista.distribuidoras_emails as Record<string, string> | null) ?? {},
    distribuidorasEmpresaSelecionadas: (artista.distribuidoras_empresa_selecionadas as Record<string, boolean> | null) ?? {},
    distribuidorasEmpresaEmails: (artista.distribuidoras_empresa_emails as Record<string, string> | null) ?? {},
    // Arquivos
    fotoUrl: str(artista.foto_url),
    documentosPessoaisUrl: str((artista as any).documentos_pessoais_url),
    presskitUrl: str((artista as any).presskit_url),
    contratoId: str(artista.contrato_id),
  };
}

export interface FormToArtistaInput extends ArtistaFormFields {
  contratoId: string;
}

/**
 * Converte o estado do formulário em payload pronto para persistência.
 * Salva todos os campos — incluindo type e status — garantindo que
 * exportação e re-importação não percam dados.
 */
export function formToArtistaPayload(f: FormToArtistaInput): Omit<Artista, "id" | "user_id" | "created_at" | "updated_at"> {
  // Converte ArtistaFormRelacionamento[] → ArtistaRelacionamento[]
  const relacionamentos: ArtistaRelacionamento[] = f.relacionamentos
    .filter((r) => r.nome.trim() !== "")
    .map((r) => {
      const responsaveisValid = (r.responsaveis ?? []).filter((rv) => rv.nome.trim() !== "");
      return {
        type: r.type,
        nome: r.nome.trim(),
        telefone: r.telefone.trim(),
        email: r.email.trim(),
        ...(r.escritorio.trim() ? { escritorio: r.escritorio.trim() } : {}),
        ...(r.crc.trim() ? { crc: r.crc.trim() } : {}),
        ...(responsaveisValid.length > 0 ? { responsaveis: responsaveisValid } : {}),
        ...(r.distribuidoras.length > 0 ? { distribuidoras: r.distribuidoras } : {}),
      };
    });

  // Deriva mapas legados de distribuidoras a partir do novo modelo relacional
  // (empresario + gravadora + editora têm distribuidoras próprias no novo modelo)
  const empresarioRels = f.relacionamentos.filter((r) => r.type === "empresario");
  const gravadoraRels  = f.relacionamentos.filter((r) => r.type === "gravadora" || r.type === "editora");

  const distribuidorasSelecionadas: Record<string, boolean> = {};
  const distribuidorasEmails: Record<string, string>        = {};
  for (const rel of empresarioRels) {
    for (const d of rel.distribuidoras) {
      distribuidorasSelecionadas[d.id] = true;
      if (d.email) distribuidorasEmails[d.id] = d.email;
    }
  }
  // Se não há empresario, usa as distribuidoras da gravadora para o mapa legado
  if (empresarioRels.length === 0) {
    for (const rel of gravadoraRels) {
      for (const d of rel.distribuidoras) {
        distribuidorasSelecionadas[d.id] = true;
        if (d.email) distribuidorasEmails[d.id] = d.email;
      }
    }
  }
  // Mapa "empresa" (distribuidoras da gravadora quando também há empresario)
  const distribuidorasEmpresaSelecionadas: Record<string, boolean> = {};
  const distribuidorasEmpresaEmails: Record<string, string>        = {};
  if (empresarioRels.length > 0) {
    for (const rel of gravadoraRels) {
      for (const d of rel.distribuidoras) {
        distribuidorasEmpresaSelecionadas[d.id] = true;
        if (d.email) distribuidorasEmpresaEmails[d.id] = d.email;
      }
    }
  }

  // Primeiro responsável da primeira gravadora → campos legados
  const firstGrav = f.relacionamentos.find((r) => r.type === "gravadora" || r.type === "editora");
  const firstResp = firstGrav?.responsaveis?.[0];

  return {
    nome_artistico: f.nomeArtistico.trim(),
    slug_artistico: strOrNull(f.slugArtistico),
    tags_musicais: f.tagsMusicais.length > 0 ? f.tagsMusicais : null,
    fase_carreira: strOrNull(f.faseCarreira),
    nome_civil: strOrNull(f.nome),
    status: (f.statusArtista || null) as any,
    genero_musical: strOrNull(f.generoMusical),
    especialidades: f.especialidades.length > 0 ? f.especialidades : null,
    observacoes: strOrNull(f.biografia),
    foto_url: strOrNull(f.fotoUrl),
    // Pessoal
    data_nascimento: strOrNull(f.dataNascimento),
    rg: strOrNull(f.rg),
    endereco: strOrNull(f.endereco),
    telefone: strOrNull(f.telefone),
    email: strOrNull(f.email),
    cpf_cnpj: strOrNull(f.cpfCnpj),
    // Bancário
    banco: strOrNull(f.banco),
    agencia: strOrNull(f.agencia),
    conta: strOrNull(f.conta),
    chave_pix: strOrNull(f.chavePix),
    titular_conta: strOrNull(f.titularConta),
    // Plataformas — persiste a URL diretamente (contrato do backend: spotify_url/youtube_url)
    spotify_url: strOrNull(f.spotify),
    spotify_ouvintes: numOrNull(f.spotifyOuvintes),
    youtube_url: strOrNull(f.youtube),
    youtube_inscritos: numOrNull(f.youtubeInscritos),
    deezer_url: strOrNull(f.deezer),
    deezer_fas: numOrNull(f.deezerFas),
    apple_music_url: strOrNull(f.appleMusic),
    apple_music_albuns_url: numOrNull(f.appleMusicAlbuns),
    soundcloud_url: strOrNull(f.soundcloud),
    soundcloud_seguidores_url: numOrNull(f.soundcloudSeguidores),
    instagram_url: strOrNull(f.instagram),
    instagram_seguidores: numOrNull(f.instagramSeguidores),
    tiktok_url: strOrNull(f.tiktok),
    tiktok_seguidores: numOrNull(f.tiktokSeguidores),
    // Relacionamentos (novo)
    relacionamentos: relacionamentos.length > 0 ? relacionamentos : null,
    // Legado (mantido para backward compat — derivado do novo modelo relacional)
    tipo_perfil: f.tipoPerfil,
    empresario_id: strOrNull(f.empresarioId),
    empresario_nome: strOrNull(f.empresarioNome),
    empresario_telefone: strOrNull(f.empresarioTelefone),
    empresario_email: strOrNull(f.empresarioEmail),
    gravadora_id: strOrNull(f.gravadoraId),
    gravadora_nome: strOrNull(f.gravadoraNome),
    gravadora_telefone: strOrNull(f.gravadoraTelefone),
    gravadora_email: strOrNull(f.gravadoraEmail),
    // Responsável da gravadora — agora derivado do primeiro responsável do primeiro relacionamento de gravadora
    gravadora_responsavel_id: strOrNull(f.gravadoraResponsavelId),
    gravadora_responsavel_nome: firstResp ? firstResp.nome || null : strOrNull(f.gravadoraResponsavelNome),
    gravadora_responsavel_telefone: firstResp ? firstResp.telefone || null : strOrNull(f.gravadoraResponsavelTelefone),
    gravadora_responsavel_email: firstResp ? firstResp.email || null : strOrNull(f.gravadoraResponsavelEmail),
    // Distribuidoras — derivadas do novo modelo relacional para não apagar dados legados
    distribuidoras_selecionadas: Object.keys(distribuidorasSelecionadas).length > 0 ? distribuidorasSelecionadas : null,
    distribuidoras_emails: Object.keys(distribuidorasEmails).length > 0 ? distribuidorasEmails : null,
    distribuidoras_empresa_selecionadas: Object.keys(distribuidorasEmpresaSelecionadas).length > 0 ? distribuidorasEmpresaSelecionadas : null,
    distribuidoras_empresa_emails: Object.keys(distribuidorasEmpresaEmails).length > 0 ? distribuidorasEmpresaEmails : null,
    notas_internas: strOrNull(f.notasInternas),
    // Documentos / presskit
    documentos_pessoais_url: strOrNull(f.documentosPessoaisUrl),
    presskit_url: strOrNull(f.presskitUrl),
  } as any;
}

// Re-export emptyRelacionamento for use in the form component
export { emptyRelacionamento };

