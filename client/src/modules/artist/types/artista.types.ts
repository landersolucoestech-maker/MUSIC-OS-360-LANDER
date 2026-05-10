import type { ArtistaStatus, ArtistaTipo, ArtistaTipoPerfil, ArtistaEspecialidade } from "@/shared/types/enums";

export type { ArtistaStatus, ArtistaTipo, ArtistaTipoPerfil, ArtistaEspecialidade };

export interface ArtistaDistribuidoraEntry {
  id: string;
  email: string;
  nomeCustom?: string;
}

export interface ArtistaResponsavel {
  nome: string;
  telefone: string;
  email: string;
}

export interface ArtistaRelacionamento {
  tipo: "empresario" | "gravadora" | "editora" | "booker" | "juridico" | "financeiro" | "contador" | "assessoria";
  nome: string;
  telefone: string;
  email: string;
  escritorio?: string;
  crc?: string;
  responsaveis?: ArtistaResponsavel[];
  distribuidoras?: ArtistaDistribuidoraEntry[];
}

export interface Artista {
  id: string;
  user_id?: string;
  nome_artistico: string;
  nome_civil?: string | null;
  nome?: string | null;
  tipo?: ArtistaTipo | string | null;
  status?: ArtistaStatus | string | null;
  status_cadastro?: string | null;
  genero_musical?: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  foto_url?: string | null;
  observacoes?: string | null;
  contrato_id?: string | null;
  slug_artistico?: string | null;
  tags_musicais?: string[] | null;
  fase_carreira?: string | null;
  relacionamentos?: ArtistaRelacionamento[] | null;
  spotify_artist_id?: string | null;
  spotify_ouvintes?: number | null;
  youtube_channel_id?: string | null;
  youtube_inscritos?: number | null;
  deezer_url?: string | null;
  deezer_fas?: number | null;
  apple_music_url?: string | null;
  apple_music_albuns?: number | null;
  soundcloud_url?: string | null;
  soundcloud_seguidores?: number | null;
  instagram?: string | null;
  instagram_seguidores?: number | null;
  facebook?: string | null;
  tiktok?: string | null;
  tiktok_seguidores?: number | null;
  twitter?: string | null;
  website?: string | null;
  tipo_pessoa?: string | null;
  data_nascimento?: string | null;
  rg?: string | null;
  endereco?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  chave_pix?: string | null;
  titular_conta?: string | null;
  especialidades?: Array<ArtistaEspecialidade | string> | null;
  tipo_perfil?: ArtistaTipoPerfil | string | null;
  empresario_id?: string | null;
  empresario_nome?: string | null;
  empresario_telefone?: string | null;
  empresario_email?: string | null;
  gravadora_id?: string | null;
  gravadora_nome?: string | null;
  gravadora_telefone?: string | null;
  gravadora_email?: string | null;
  gravadora_responsavel_id?: string | null;
  gravadora_responsavel_nome?: string | null;
  gravadora_responsavel_telefone?: string | null;
  gravadora_responsavel_email?: string | null;
  distribuidoras_selecionadas?: Record<string, boolean> | null;
  distribuidoras_emails?: Record<string, string> | null;
  distribuidoras_empresa_selecionadas?: Record<string, boolean> | null;
  distribuidoras_empresa_emails?: Record<string, string> | null;
  documentos_pessoais_url?: string | null;
  presskit_url?: string | null;
  notas_internas?: string | null;
  banner_url?: string | null;
  galeria_urls?: string[] | null;
  video_apresentacao_url?: string | null;
  manager_nome?: string | null;
  manager_contato?: string | null;
  produtor_executivo?: string | null;
  agencia_booking?: string | null;
  label_parceira?: string | null;
  documentos?: { nome: string; url: string }[] | null;
  distribuidoras_gerais?: Array<{ id: string; email: string; nomeCustom?: string }> | null;
  contatos_equipe?: Array<{
    nome: string;
    categoria: string;
    telefone: string;
    email: string;
    distribuidoras: Array<{ id: string; email: string; nomeCustom?: string }>;
  }> | null;
  org_slug?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export type ArtistaInsert = Omit<Artista, "id" | "user_id" | "created_at" | "updated_at">;
export type ArtistaUpdate = Partial<ArtistaInsert>;
export type ArtistaAssinado = Artista;
