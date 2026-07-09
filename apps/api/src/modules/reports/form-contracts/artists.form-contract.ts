export const ARTIST_FORM_FIELDS = [
  'nome_artistico',
  'nome_civil',
  'tipo',
  'status',
  'genero_musical',
  'observacoes',
  'foto_url',
  'spotify_url',
  'youtube_url',
  'deezer_url',
  'apple_music_url',
  'soundcloud_url',
  'especialidades',
  'email',
  'telefone',
  'cpf_cnpj',
  'galeria_urls',
  'documentos',
  'manager_nome',
  'manager_contato',
  'produtor_executivo',
  'agencia_booking',
  'label_parceira',
  'contrato_id',
] as const;

export const ARTIST_DIRECT_COLUMNS = new Set<string>([
  'nome_artistico',
  'nome_civil',
  'tipo',
  'status',
  'genero_musical',
  'observacoes',
  'foto_url',
  'spotify_url',
  'youtube_url',
  'deezer_url',
  'apple_music_url',
  'soundcloud_url',
  'especialidades',
  'galeria_urls',
  'documentos',
  'manager_nome',
  'produtor_executivo',
  'agencia_booking',
  'label_parceira',
  'contrato_id',
]);

export const ARTIST_ENCRYPTED_FIELDS: Record<string, string> = {
  email: 'email_encrypted',
  telefone: 'telefone_encrypted',
  cpf_cnpj: 'cpf_cnpj_encrypted',
  manager_contato: 'manager_contato_encrypted',
};

export function isArtistFormField(field: string): boolean {
  return (ARTIST_FORM_FIELDS as readonly string[]).includes(field);
}

export function isArtistMetadataField(field: string): boolean {
  return (
    isArtistFormField(field) &&
    !ARTIST_DIRECT_COLUMNS.has(field) &&
    !ARTIST_ENCRYPTED_FIELDS[field]
  );
}
