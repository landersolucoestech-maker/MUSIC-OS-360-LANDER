/**
 * scripts/verify-canonical-column-order.ts
 *
 * Compara a ordem física real (information_schema.columns.ordinal_position)
 * de uma tabela com a ordem canônica documentada (extraída do formulário
 * real). Usado após cada reconstrução física de tabela (Rebuild*InCanonicalFormOrder).
 *
 * Uso: tsx scripts/verify-canonical-column-order.ts <tabela>
 */
import 'reflect-metadata';
import { AppDataSource } from '../src/database/datasource';

// Ordem canônica documentada por tabela — atualizada a cada reconstrução física.
const CANONICAL_ORDER: Record<string, string[]> = {
  artists: [
    'id', 'tenant_id',
    'foto_url', 'nome_artistico', 'genero_musical', 'especialidades',
    'documentos_pessoais_url', 'presskit_url', 'observacoes', 'nome_civil',
    'data_nascimento', 'cpf_cnpj_encrypted', 'rg', 'genero', 'endereco',
    'telefone_encrypted', 'email_encrypted', 'banco', 'agencia', 'conta',
    'chave_pix', 'titular_conta', 'spotify_url', 'instagram', 'youtube_url',
    'tiktok', 'soundcloud_url', 'apple_music_url', 'deezer_url', 'tipo_perfil',
    'contatos_vinculados', 'distribuidoras_gerais', 'notas_internas',
    'contrato_id',
    'slug_artistico', 'tags_musicais', 'fase_carreira', 'tipo', 'status',
    'status_cadastro', 'spotify_ouvintes', 'youtube_inscritos', 'deezer_fas',
    'apple_music_albuns', 'soundcloud_seguidores', 'instagram_seguidores',
    'tiktok_seguidores', 'relacionamentos', 'empresario_id', 'empresario_nome',
    'empresario_telefone', 'empresario_email', 'gravadora_id', 'gravadora_nome',
    'gravadora_telefone', 'gravadora_email', 'gravadora_responsavel_id',
    'gravadora_responsavel_nome', 'gravadora_responsavel_telefone',
    'gravadora_responsavel_email', 'distribuidoras_selecionadas',
    'distribuidoras_emails', 'distribuidoras_empresa_selecionadas',
    'distribuidoras_empresa_emails', 'contatos_equipe', 'manager_nome',
    'manager_contato_encrypted', 'produtor_executivo', 'agencia_booking',
    'label_parceira', 'galeria_urls', 'documentos',
    'metadata', 'created_at', 'updated_at', 'created_by', 'updated_by',
    'deleted_at',
  ],
  works: [
    'id', 'tenant_id',
    'projeto_id', 'cod_entidade', 'cod_ecad', 'iswc', 'titulo', 'genero', 'idioma',
    'duracao', 'instrumental', 'criada_por_ia', 'status', 'tipo_ia', 'ia_harmonia',
    'ia_melodia', 'ia_letra', 'outros_titulos', 'referencias_conexas', 'letra_completa',
    'artista_id', 'tipo', 'tipo_obra', 'compositor', 'compositores', 'editora', 'letristas',
    'isrc', 'alternative_titles', 'language', 'lyrics', 'is_instrumental', 'duration_seconds',
    'registry_status', 'external_reference', 'ai_used', 'ai_tools', 'ai_prompts',
    'origem_externa', 'origem_externa_id', 'origem_externa_sincronizado_em',
    'metadata', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  work_participants: [
    'id', 'tenant_id', 'work_id', 'nome', 'classe_funcao', 'link', 'percentual', 'ordem',
    'created_at', 'updated_at',
  ],
  phonograms: [
    'id', 'tenant_id', 'obra_id', 'titulo', 'cod_entidade', 'cod_ecad', 'agregadora', 'isrc',
    'isrc_pais', 'isrc_registrante', 'isrc_ano', 'isrc_designacao', 'criada_por_ia',
    'instrumental', 'emissao', 'gravacao_original', 'data_lancamento', 'duracao', 'duracao_min',
    'duracao_seg', 'genero_musical', 'midia', 'nacional', 'pub_simultanea', 'pais_origem',
    'pais_publicacao', 'classificacao', 'status', 'participacao', 'arquivo_audio', 'observacoes',
    'artista_id', 'tipo', 'compositores', 'interpretes', 'produtores', 'gravadora',
    'version_title', 'recording_date', 'release_date', 'phonographic_producer_id',
    'main_artist_id', 'label_id', 'copyright_year', 'copyright_owner', 'country_of_recording',
    'audio_file_id', 'duration_seconds', 'registry_status', 'external_reference',
    'origem_externa', 'origem_externa_id', 'origem_externa_sincronizado_em', 'metadata',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  releases: [
    'id', 'tenant_id', 'titulo', 'tipo', 'artista_id', 'genero', 'idioma', 'gravadora',
    'copyright', 'upc', 'distribuidora', 'data_lancamento', 'capa_url', 'plataformas',
    'isrc_global', 'assets', 'cronograma', 'notas_internas', 'observacoes', 'status',
    'metadata', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  projects: [
    'id', 'tenant_id', 'tipo', 'titulo', 'genero', 'observacoes', 'status', 'artista_id',
    'orcamento', 'descricao', 'metadata', 'created_at', 'updated_at', 'created_by',
    'updated_by', 'deleted_at',
  ],
  project_tracks: [
    'id', 'tenant_id', 'project_id', 'nome', 'solo_feat', 'original_remix', 'instrumental',
    'duracao_min', 'duracao_seg', 'genero', 'idioma', 'letra', 'audio_url', 'ordem',
    'created_at', 'updated_at',
  ],
  project_track_participants: [
    'id', 'tenant_id', 'project_track_id', 'nome', 'role', 'ordem', 'created_at',
  ],
};

async function main() {
  const table = process.argv[2];
  if (!table || !CANONICAL_ORDER[table]) {
    console.error(`Uso: tsx verify-canonical-column-order.ts <${Object.keys(CANONICAL_ORDER).join('|')}>`);
    process.exit(1);
  }

  await AppDataSource.initialize();
  const rows: { column_name: string }[] = await AppDataSource.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table],
  );
  const actual = rows.map((r) => r.column_name);
  const expected = CANONICAL_ORDER[table];

  const mismatches: string[] = [];
  const max = Math.max(actual.length, expected.length);
  for (let i = 0; i < max; i++) {
    if (actual[i] !== expected[i]) {
      mismatches.push(`  posição ${i + 1}: esperado="${expected[i] ?? '<ausente>'}" real="${actual[i] ?? '<ausente>'}"`);
    }
  }

  await AppDataSource.destroy();

  if (mismatches.length > 0) {
    console.error(`[verify-canonical-column-order] "${table}" DIVERGE da ordem canônica:`);
    console.error(mismatches.join('\n'));
    process.exit(1);
  }
  console.log(`[verify-canonical-column-order] "${table}" ✓ ordem física == ordem canônica (${actual.length} colunas).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
