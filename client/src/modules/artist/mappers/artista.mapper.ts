/**
 * artistaMappers.ts
 * ─────────────────────────────────────────────────────────────────
 * ÚNICA FONTE DE VERDADE para toda transformação de dados de artista.
 * Exportação, importação e formulário devem consumir estas funções
 * para garantir consistência total entre CREATE, EDIT, VIEW e LIST.
 * ─────────────────────────────────────────────────────────────────
 */

import type { Artista } from "@/modules/artist/hooks/useArtistas";

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
function pickRow(row: Record<string, unknown>, ...keys: string[]): unknown {
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
function normalizeTipoPerfil(
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
 *
 * Estratégia de lookup (ordem):
 *  1. normalizeKey(raw)            → "DJ/Produtor"  → "dj/produtor"  → "dj_produtor" ✓
 *  2. normalizeKey(raw, _→/)       → "dj_produtor"  → "dj/produtor"  → "dj_produtor" ✓
 *  3. raw já é o enum direto       → "dj_produtor"  em ESPECIALIDADES_LABELS          ✓
 *
 * Nunca retorna o raw original — valores fora do padrão são descartados.
 */
function normalizeEspecialidade(raw: string): string {
  // 1. Preserva "/" — chaves do ESPECIALIDADES_ENUM têm "/" (ex: "dj/produtor")
  const v1 = normalizeKey(raw);
  if (ESPECIALIDADES_ENUM[v1]) return ESPECIALIDADES_ENUM[v1];

  // 2. Converte "_" → "/" para aceitar enums internos (ex: "dj_produtor")
  const v2 = normalizeKey(raw.replace(/_/g, "/"));
  if (ESPECIALIDADES_ENUM[v2]) return ESPECIALIDADES_ENUM[v2];

  // 3. Verifica se o próprio raw normalizado já é chave do enum interno
  const asEnum = v1.replace(/\//g, "_");
  if (ESPECIALIDADES_LABELS[asEnum]) return asEnum;

  // Valor fora do padrão — descarta
  return "";
}

// ─── Extratores de ID de plataformas ─────────────────────────────

/** Aceita URL pública do Spotify OU o próprio ID cru. */
export function extractSpotifyId(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = String(input).trim();
  if (!v) return null;
  if (/^[A-Za-z0-9]{22}$/.test(v)) return v;
  const m = v.match(/spotify\.com\/(?:intl-[a-z]{2}\/)?artist\/([A-Za-z0-9]{10,})/i);
  return m?.[1] ?? null;
}

/** Aceita URL pública do YouTube OU o ID de canal cru (começa com UC). */
export function extractYoutubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = String(input).trim();
  if (!v) return null;
  if (/^UC[A-Za-z0-9_-]{22}$/.test(v)) return v;
  const m = v.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/i);
  return m?.[1] ?? null;
}

// ─── Mapeamento canônico de colunas ──────────────────────────────

/**
 * Converte um registro de artista no objeto de linha que vai para o Excel.
 * Este é o mapeamento canônico: qualquer mudança de coluna deve ser feita aqui.
 */
export function artistaToExportRow(a: Artista): Record<string, string> {
  const distEmails = (a.distribuidoras_emails as Record<string, string> | null) ?? {};
  return {
    // 1. Informações Básicas
    "Nome Artístico":            str(a.nome_artistico),
    "Gênero Musical":            str(a.genero_musical),
    "Função":                    Array.isArray(a.especialidades)
                                   ? a.especialidades.map(e => ESPECIALIDADES_LABELS[e] ?? e).join(", ")
                                   : "",
    "Documentos Pessoais (PDF)": str((a as any).documentos_pessoais_url),
    "Presskit / Media Kit (PDF)":str((a as any).presskit_url),
    "Biografia":                 str(a.observacoes),
    "Foto URL":                  str(a.foto_url),
    // 2. Dados Pessoais
    "Nome Civil":                str(a.nome_civil),
    "Data de Nascimento":        str(a.data_nascimento),
    "CPF":                       str(a.cpf_cnpj),
    "RG":                        str(a.rg),
    "Endereço completo":         str(a.endereco),
    "Telefone":                  str(a.telefone),
    "Email":                     str(a.email),
    // 3. Dados Bancários
    "Banco":                     str(a.banco),
    "Agência":                   str(a.agencia),
    "Conta":                     str(a.conta),
    "Chave PIX":                 str(a.chave_pix),
    "Titular da Conta":          str(a.titular_conta),
    // 4. Plataformas (URLs completas para re-importação)
    "Spotify URL":  a.spotify_artist_id  ? `https://open.spotify.com/artist/${a.spotify_artist_id}`  : "",
    "YouTube URL":  a.youtube_channel_id ? `https://www.youtube.com/channel/${a.youtube_channel_id}` : "",
    "Deezer URL":   str(a.deezer_url),
    "Apple Music URL": str(a.apple_music_url),
    "SoundCloud URL":  str(a.soundcloud_url),
    // 5. Redes Sociais
    "Instagram URL": str(a.instagram),
    "TikTok URL":    str(a.tiktok),
    // 6. Tipo de Perfil / Empresário
    "Tipo de Perfil":           str(a.tipo_perfil) || "independente",
    "Empresário Nome":          str(a.empresario_nome),
    "Empresário Telefone":      str(a.empresario_telefone),
    "Empresário Email":         str(a.empresario_email),
    "Gravadora/Editora Nome":   str(a.gravadora_nome),
    "Gravadora/Editora Tel":    str(a.gravadora_telefone),
    "Gravadora/Editora Email":  str(a.gravadora_email),
    "Resp. Gravadora Nome":     str(a.gravadora_responsavel_nome),
    "Resp. Gravadora Tel":      str(a.gravadora_responsavel_telefone),
    "Resp. Gravadora Email":    str(a.gravadora_responsavel_email),
    // 7. Distribuidoras / Agregadoras (apenas e-mails)
    "ONErpm – Email":    distEmails["onerpm"]    ?? "",
    "DistroKid – Email": distEmails["distrokid"] ?? "",
    "30 Por 1 – Email":  distEmails["30por1"]    ?? "",
    "Symphonic – Email": distEmails["symphonic"] ?? "",
    "Somvibe – Email":   distEmails["somvibe"]   ?? "",
    "SoundOn – Email":   distEmails["soundon"]   ?? "",
    "MusicPro – Email":  distEmails["musicpro"]  ?? "",
    // 8. Observações internas
    "Observações": str(a.notas_internas),
  };
}

// Chaves das colunas de distribuidoras (usadas no import)
const DIST_COLS: Record<string, string> = {
  "ONErpm – Email":    "onerpm",
  "DistroKid – Email": "distrokid",
  "30 Por 1 – Email":  "30por1",
  "Symphonic – Email": "symphonic",
  "Somvibe – Email":   "somvibe",
  "SoundOn – Email":   "soundon",
  "MusicPro – Email":  "musicpro",
};

/**
 * Converte uma linha de Excel (resultado de sheet_to_json) em payload pronto
 * para `addArtista.mutateAsync`. Aceita tanto os cabeçalhos canônicos quanto
 * os nomes de campo internos como fallback.
 */
export function importRowToArtista(row: Record<string, unknown>): Omit<Artista, "id" | "user_id" | "created_at" | "updated_at"> | null {
  // Usa pickRow em vez de row[key] direto para tolerar diferenças de
  // normalização Unicode nos cabeçalhos (NFD vs NFC) geradas pelo Excel.
  const p = (...keys: string[]) => pickRow(row, ...keys);

  const nomeArtistico = strOrNull(p("Nome Artístico", "nome_artistico", "Nome", "nome"));
  if (!nomeArtistico) return null;

  const distribuidoras_emails: Record<string, string> = {};
  const distribuidoras_selecionadas: Record<string, boolean> = {};
  for (const [col, id] of Object.entries(DIST_COLS)) {
    const v = strOrNull(p(col));
    if (v) {
      distribuidoras_emails[id] = v;
      distribuidoras_selecionadas[id] = true;
    }
  }

  return {
    // 1. Básico
    nome_artistico:  nomeArtistico,
    genero_musical:  strOrNull(p("Gênero Musical", "Genero Musical", "genero_musical")),
    tipo:            null,
    status:          null,
    especialidades:  strOrNull(p("Função", "Funcao", "Especialidades", "especialidades"))
                       ?.split(",").map((s) => normalizeEspecialidade(s.trim())).filter(Boolean) ?? null,
    documentos_pessoais_url: strOrNull(p("Documentos Pessoais (PDF)", "documentos_pessoais_url")),
    presskit_url:            strOrNull(p("Presskit / Media Kit (PDF)", "presskit_url")),
    observacoes:     strOrNull(p("Biografia", "observacoes")),
    foto_url:        strOrNull(p("Foto URL", "foto_url")),
    // 2. Pessoal
    nome_civil:      strOrNull(p("Nome Civil", "nome_civil")),
    data_nascimento: strOrNull(p("Data de Nascimento", "data_nascimento")),
    cpf_cnpj:        strOrNull(p("CPF", "CPF/CNPJ", "cpf_cnpj")),
    rg:              strOrNull(p("RG", "rg")),
    endereco:        strOrNull(p("Endereço completo", "Endereco completo", "Endereço", "Endereco", "endereco")),
    telefone:        strOrNull(p("Telefone", "telefone")),
    email:           strOrNull(p("Email", "email")),
    // 3. Bancário
    banco:           strOrNull(p("Banco", "banco")),
    agencia:         strOrNull(p("Agência", "Agencia", "agencia")),
    conta:           strOrNull(p("Conta", "conta")),
    chave_pix:       strOrNull(p("Chave PIX", "chave_pix")),
    titular_conta:   strOrNull(p("Titular da Conta", "titular_conta")),
    // 4. Plataformas
    spotify_artist_id:  extractSpotifyId(strOrNull(p("Spotify URL", "spotify_artist_id"))),
    youtube_channel_id: extractYoutubeId(strOrNull(p("YouTube URL", "youtube_channel_id"))),
    deezer_url:         strOrNull(p("Deezer URL", "deezer_url")),
    apple_music_url:    strOrNull(p("Apple Music URL", "apple_music_url")),
    soundcloud_url:     strOrNull(p("SoundCloud URL", "soundcloud_url")),
    // 5. Redes Sociais
    instagram: strOrNull(p("Instagram URL", "instagram")),
    tiktok:    strOrNull(p("TikTok URL", "tiktok")),
    // 6. Perfil — normalizeTipoPerfil aceita qualquer variação de caixa/acento/espaço
    tipo_perfil: normalizeTipoPerfil(p("Tipo de Perfil", "tipo_perfil", "Perfil", "perfil")),
    empresario_nome:                strOrNull(p("Empresário Nome", "Empresario Nome", "empresario_nome")),
    empresario_telefone:            strOrNull(p("Empresário Telefone", "Empresario Telefone", "empresario_telefone")),
    empresario_email:               strOrNull(p("Empresário Email", "Empresario Email", "empresario_email")),
    gravadora_nome:                 strOrNull(p("Gravadora/Editora Nome", "gravadora_nome")),
    gravadora_telefone:             strOrNull(p("Gravadora/Editora Tel", "gravadora_telefone")),
    gravadora_email:                strOrNull(p("Gravadora/Editora Email", "gravadora_email")),
    gravadora_responsavel_nome:     strOrNull(p("Resp. Gravadora Nome", "gravadora_responsavel_nome")),
    gravadora_responsavel_telefone: strOrNull(p("Resp. Gravadora Tel", "gravadora_responsavel_telefone")),
    gravadora_responsavel_email:    strOrNull(p("Resp. Gravadora Email", "gravadora_responsavel_email")),
    notas_internas:                 strOrNull(p("Observações", "Observacoes", "Notas Internas", "notas_internas")),
    // 7. Distribuidoras
    distribuidoras_emails:       Object.keys(distribuidoras_emails).length > 0       ? distribuidoras_emails       : null,
    distribuidoras_selecionadas: Object.keys(distribuidoras_selecionadas).length > 0 ? distribuidoras_selecionadas : null,
  };
}

// ─── Form Fields Interface ────────────────────────────────────────

export interface ArtistaFormFields {
  nomeArtistico: string;
  generoMusical: string;
  tipoArtista: string;
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

/**
 * Converte um registro de artista (vindo do banco) no estado de formulário.
 * Usado no useEffect de ArtistaFormModal quando open=true.
 */
export function artistaToFormFields(artista: Artista | null | undefined): ArtistaFormFields {
  if (!artista) {
    return {
      nomeArtistico: "",
      generoMusical: "",
      tipoArtista: "artista_solo",
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
  }

  return {
    nomeArtistico: str(artista.nome_artistico),
    generoMusical: str(artista.genero_musical),
    tipoArtista: str(artista.tipo) || "artista_solo",
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
    // Plataformas — reconstrói URLs públicas a partir dos IDs salvos
    spotify: artista.spotify_artist_id
      ? `https://open.spotify.com/artist/${artista.spotify_artist_id}`
      : "",
    spotifyOuvintes: artista.spotify_ouvintes != null ? String(artista.spotify_ouvintes) : "",
    instagram: str(artista.instagram),
    instagramSeguidores: artista.instagram_seguidores != null ? String(artista.instagram_seguidores) : "",
    youtube: artista.youtube_channel_id
      ? `https://www.youtube.com/channel/${artista.youtube_channel_id}`
      : "",
    youtubeInscritos: artista.youtube_inscritos != null ? String(artista.youtube_inscritos) : "",
    tiktok: str(artista.tiktok),
    tiktokSeguidores: artista.tiktok_seguidores != null ? String(artista.tiktok_seguidores) : "",
    soundcloud: str(artista.soundcloud_url),
    soundcloudSeguidores: artista.soundcloud_seguidores != null ? String(artista.soundcloud_seguidores) : "",
    deezer: str(artista.deezer_url),
    deezerFas: artista.deezer_fas != null ? String(artista.deezer_fas) : "",
    appleMusic: str(artista.apple_music_url),
    appleMusicAlbuns: artista.apple_music_albuns != null ? String(artista.apple_music_albuns) : "",
    // Perfil
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
    // Distribuidoras do artista
    distribuidorasSelecionadas: (artista.distribuidoras_selecionadas as Record<string, boolean> | null) ?? {},
    distribuidorasEmails: (artista.distribuidoras_emails as Record<string, string> | null) ?? {},
    // Distribuidoras da empresa
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
 * Salva todos os campos — incluindo tipo e status — garantindo que
 * exportação e re-importação não percam dados.
 */
export function formToArtistaPayload(f: FormToArtistaInput): Omit<Artista, "id" | "user_id" | "created_at" | "updated_at"> {
  return {
    nome_artistico: f.nomeArtistico.trim(),
    nome_civil: strOrNull(f.nome),
    tipo: (f.tipoArtista || null) as any,
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
    // Plataformas
    spotify_artist_id: extractSpotifyId(f.spotify),
    spotify_ouvintes: numOrNull(f.spotifyOuvintes),
    youtube_channel_id: extractYoutubeId(f.youtube),
    youtube_inscritos: numOrNull(f.youtubeInscritos),
    deezer_url: strOrNull(f.deezer),
    deezer_fas: numOrNull(f.deezerFas),
    apple_music_url: strOrNull(f.appleMusic),
    apple_music_albuns: numOrNull(f.appleMusicAlbuns),
    soundcloud_url: strOrNull(f.soundcloud),
    soundcloud_seguidores: numOrNull(f.soundcloudSeguidores),
    instagram: strOrNull(f.instagram),
    instagram_seguidores: numOrNull(f.instagramSeguidores),
    tiktok: strOrNull(f.tiktok),
    tiktok_seguidores: numOrNull(f.tiktokSeguidores),
    // Perfil
    tipo_perfil: f.tipoPerfil,
    empresario_id: strOrNull(f.empresarioId),
    empresario_nome: strOrNull(f.empresarioNome),
    empresario_telefone: strOrNull(f.empresarioTelefone),
    empresario_email: strOrNull(f.empresarioEmail),
    gravadora_id: strOrNull(f.gravadoraId),
    gravadora_nome: strOrNull(f.gravadoraNome),
    gravadora_telefone: strOrNull(f.gravadoraTelefone),
    gravadora_email: strOrNull(f.gravadoraEmail),
    gravadora_responsavel_id: strOrNull(f.gravadoraResponsavelId),
    gravadora_responsavel_nome: strOrNull(f.gravadoraResponsavelNome),
    gravadora_responsavel_telefone: strOrNull(f.gravadoraResponsavelTelefone),
    gravadora_responsavel_email: strOrNull(f.gravadoraResponsavelEmail),
    // Distribuidoras do artista
    distribuidoras_selecionadas: Object.keys(f.distribuidorasSelecionadas).length > 0 ? f.distribuidorasSelecionadas : null,
    distribuidoras_emails: Object.keys(f.distribuidorasEmails).length > 0 ? f.distribuidorasEmails : null,
    // Distribuidoras da empresa
    distribuidoras_empresa_selecionadas: Object.keys(f.distribuidorasEmpresaSelecionadas).length > 0 ? f.distribuidorasEmpresaSelecionadas : null,
    distribuidoras_empresa_emails: Object.keys(f.distribuidorasEmpresaEmails).length > 0 ? f.distribuidorasEmpresaEmails : null,
    notas_internas: strOrNull(f.notasInternas),
    // Documentos / presskit
    documentos_pessoais_url: strOrNull(f.documentosPessoaisUrl),
    presskit_url: strOrNull(f.presskitUrl),
  } as any;
}
