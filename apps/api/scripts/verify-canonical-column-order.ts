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
    'chave_pix', 'titular_conta', 'spotify_url', 'youtube_url',
    'soundcloud_url', 'apple_music_url', 'deezer_url', 'tipo_perfil',
    'contatos_vinculados', 'distribuidoras_gerais', 'notas_internas',
    'contrato_id',
    'slug_artistico', 'tags_musicais', 'fase_carreira', 'tipo', 'status',
    'status_cadastro',
    'relacionamentos', 'empresario_id', 'empresario_nome',
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
  audiovisual_projects: [
    'id', 'tenant_id', 'phonogram_id', 'music_title', 'title', 'artist_name', 'type', 'format',
    'director', 'videomaker', 'editor', 'shooting_date', 'location', 'capture_status',
    'editing_status', 'approval_status', 'pre_release_date', 'release_date', 'budget_estimated',
    'budget_actual', 'concept', 'observations', 'status', 'final_status', 'completed_at',
    'publish_date', 'artist_id', 'release_id', 'campaign_id', 'event_id', 'financial_project_id',
    'slug', 'description', 'objective', 'priority', 'stage', 'production_company', 'producer',
    'start_date', 'recording_date', 'delivery_date', 'metadata', 'created_at', 'updated_at',
    'created_by', 'updated_by', 'deleted_at',
  ],
  events: [
    'id', 'tenant_id', 'titulo', 'tipo', 'participantes', 'status', 'data', 'starts_at',
    'data_fim', 'local', 'contato_local', 'endereco', 'valor_cache', 'publico_esperado',
    'descricao', 'observacoes', 'artista_id', 'metadata', 'created_at', 'updated_at',
    'created_by', 'updated_by', 'deleted_at',
  ],
  marketing_projects: [
    'id', 'tenant_id', 'type', 'title', 'description', 'status', 'priority', 'source_project_id',
    'artist_id', 'company_id', 'label_id', 'publisher_id', 'studio_id', 'event_id', 'campaign_id',
    'financial_project_id', 'starts_at', 'ends_at', 'goals', 'metrics', 'context', 'metadata',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  marketing_tasks: [
    'id', 'tenant_id', 'marketing_project_id', 'title', 'description', 'status', 'completed_at',
    'priority', 'kind', 'assigned_to', 'due_date', 'dependencies', 'metrics', 'task_key',
    'metadata', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  clients: [
    'id', 'tenant_id', 'tipo_pessoa', 'categoria', 'perfil', 'nome', 'foto', 'nome_pf',
    'razao_social', 'nome_fantasia', 'cpf_cnpj_encrypted', 'email_encrypted',
    'telefone_encrypted', 'instagram', 'funcao', 'logradouro', 'numero', 'complemento',
    'bairro', 'cidade', 'estado', 'cep', 'endereco_completo', 'status_contato',
    'prioridade_contato', 'responsavel_nome', 'responsavel_cargo', 'responsavel_email',
    'responsavel_telefone', 'attachments', 'observacoes', 'interacoes', 'status', 'metadata',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  leads: [
    'id', 'tenant_id', 'nome', 'nome_completo', 'empresa', 'email_encrypted', 'whatsapp',
    'instagram', 'cidade', 'estado', 'tipo_cliente', 'tipo_servico', 'payload_servico',
    'origem_lead', 'responsavel', 'status', 'prioridade', 'proximo_follow_up', 'valor_estimado',
    'temperatura', 'dados_internos_crm', 'uploads', 'pais', 'probabilidade_fechamento',
    'nome_artistico', 'telefone_encrypted', 'cliente_id', 'fonte', 'tags', 'metadata',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  contracts: [
    'id', 'tenant_id', 'template_id', 'titulo', 'tipo', 'status', 'artista_id', 'cliente_id',
    'lancamento_id', 'data_inicio', 'data_fim', 'valor', 'exclusivo', 'observacoes',
    'arquivo_url', 'autentique_doc_id', 'signing_platform', 'versoes', 'signers', 'metadata',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  rights_holders: [
    'id', 'tenant_id', 'legal_name', 'artistic_name', 'document_type', 'document_number',
    'country', 'ipi_cae', 'society', 'society_member_code', 'holder_type', 'metadata',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  shares: [
    'id', 'tenant_id', 'obra_id', 'fonograma_id', 'titular_nome', 'titular_doc', 'papel',
    'rights_holder_id', 'publisher_id', 'role', 'territory', 'instrument', 'credited_name',
    'is_primary', 'is_featured', 'start_date', 'end_date', 'share_type', 'percentual', 'status',
    'acordo_notas', 'acordo_url', 'observacoes', 'direcao', 'lancamento_id', 'nome_musica',
    'detentor', 'destinatario', 'tipo', 'artista_externo', 'artista_projeto_id', 'artista_id',
    'pagador', 'pagador_contato', 'origem_acordo', 'data_prevista', 'documentos', 'versao',
    'historico', 'metadata', 'created_at', 'updated_at', 'deleted_at',
  ],
  licenses: [
    'id', 'tenant_id', 'titulo', 'obra_id', 'obra_musical', 'artista', 'cliente_id', 'cliente',
    'projeto', 'tipo', 'tipo_uso', 'midia_destino', 'territorio', 'status', 'data_inicio',
    'data_fim', 'valor', 'moeda', 'observacoes', 'remuneration_type', 'artista_id', 'created_at',
    'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  takedowns: [
    'id', 'tenant_id', 'titulo', 'tipo', 'obra_afetada', 'artista', 'status', 'prioridade',
    'plataforma', 'url_infracao', 'motivo', 'data_identificacao', 'descricao', 'evidencias',
    'observacoes', 'metadata', 'created_at', 'updated_at', 'created_by', 'deleted_at',
  ],
  inventory_items: [
    'id', 'tenant_id', 'nome', 'categoria', 'quantidade', 'valor_unitario', 'localizacao',
    'status', 'responsavel', 'setor', 'data_entrada', 'local_compra', 'numero_nota_fiscal',
    'observacoes', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  employees: [
    'id', 'tenant_id', 'nome_completo', 'nome', 'cpf_encrypted', 'rg', 'data_nascimento',
    'email_encrypted', 'telefone_encrypted', 'endereco', 'cargo', 'setor', 'departamento',
    'tipo_contrato', 'data_admissao', 'data_demissao', 'salario_base', 'salario', 'status',
    'observacoes', 'vinculo_usuario_id', 'documentos', 'metadata',
    'created_at', 'updated_at', 'created_by', 'deleted_at',
  ],
  payroll_entries: [
    'id', 'tenant_id', 'funcionario_id', 'employee_id', 'mes_referencia', 'competencia',
    'salario_bruto', 'descontos', 'bonus', 'salario_liquido', 'data_pagamento', 'status',
    'observacoes', 'arquivo_url', 'pago_em', 'metadata', 'created_at', 'updated_at', 'deleted_at',
  ],
  org_members: [
    'id', 'tenant_id', 'auth_user_id', 'email', 'full_name', 'phone', 'role', 'is_active',
    'org_id', 'role_id', 'department_id', 'position_id', 'joined_at',
    'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
  ],
  musicchat_automation_settings: [
    'id', 'tenant_id', 'enabled', 'welcome_message', 'main_menu_message', 'menu_options',
    'templates', 'required_fields', 'optional_fields', 'invalid_option_message',
    'absence_message', 'out_of_hours_message', 'closing_message', 'return_to_menu_rule',
    'escalation_rules', 'notification_channels', 'supervisor_user_id', 'manager_user_id',
    'created_at', 'updated_at', 'updated_by',
  ],
  campaigns: [
    'id', 'tenant_id', 'nome', 'tipo', 'status', 'objetivo', 'orcamento', 'data_inicio',
    'data_fim', 'artista_id', 'metadata', 'created_at', 'updated_at', 'created_by',
    'updated_by', 'deleted_at',
  ],
  campaign_tasks: [
    'id', 'tenant_id', 'campaign_id', 'title', 'description', 'status', 'priority',
    'assigned_to', 'due_date', 'completed_at', 'created_at', 'updated_at', 'created_by',
  ],
  campaign_assets: [
    'id', 'tenant_id', 'campaign_id', 'name', 'asset_type', 'file_url', 'description',
    'metadata', 'created_at', 'created_by', 'deleted_at',
  ],
  leave_requests: [
    'id', 'tenant_id', 'funcionario_id', 'employee_id', 'tipo', 'data_inicio', 'data_fim',
    'dias_totais', 'status', 'aprovado_por', 'observacoes', 'motivo', 'documento_url',
    'metadata', 'created_at', 'updated_at', 'created_by', 'deleted_at',
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
