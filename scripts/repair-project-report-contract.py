from pathlib import Path
import re

contract_path = Path('apps/api/src/modules/reports/form-contracts/report-form-contracts.ts')
text = contract_path.read_text(encoding='utf-8')

text = text.replace(
    "const col = (key: string): ReportFieldSpec => ({ key, storage: 'column' });",
    "const col = (key: string, physical?: string): ReportFieldSpec => ({ key, storage: 'column', physical });",
)
text = text.replace(
    "const ro = (key: string): ReportFieldSpec => ({ key, storage: 'column', importable: false });",
    "const ro = (key: string, physical?: string): ReportFieldSpec => ({ key, storage: 'column', physical, importable: false });",
)

replacement = r'''// ─── Projetos ─────────────────────────────────────────────────────────────────
// Fonte canônica: ProjetoFormModal.tsx. Uma única aba; uma linha por música.
const PROJECTS_CONTRACT: ReportFormContract = {
  tableName: 'projects',
  identityColumn: 'nome_ep_album',
  fields: [
    col('tipo_lancamento', 'tipo'),
    col('nome_ep_album', 'titulo'),
    col('observacoes'),
    col('status_projeto', 'status'),
  ],
  excludedFormFields: {
    metadata: 'objeto jsonb interno bruto',
    artista_id: 'sem campo correspondente no modal Criar/Editar',
    orcamento: 'sem campo correspondente no modal Criar/Editar',
    descricao: 'sem campo correspondente no modal Criar/Editar',
    genero: 'derivado das músicas, não é campo geral do formulário',
    musicas: 'representada pelas colunas individuais do grupo repetível na mesma aba',
  },
  childSheets: [
    {
      key: 'musicas',
      sheetName: 'IGNORADA_SINGLE_SHEET',
      fields: [
        { key: 'nome_musica' },
        { key: 'soloFeat' },
        { key: 'originalRemix' },
        { key: 'instrumental' },
        { key: 'duracaoMinutos' },
        { key: 'duracaoSegundos' },
        { key: 'generoMusical' },
        { key: 'idiomaMusica' },
        { key: 'compositores', multi: true },
        { key: 'interpretes', multi: true },
        { key: 'produtores', multi: true },
        { key: 'letra' },
        { key: 'arquivosAudio' },
        { key: 'ordem' },
      ],
    },
  ],
};

// ─── Monitoramento'''

pattern = re.compile(
    r"// ─── Projetos .*?\nconst PROJECTS_CONTRACT: ReportFormContract = \{.*?\n\};\n\n// ─── Monitoramento",
    re.S,
)
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('PROJECTS_CONTRACT block not found exactly once')
contract_path.write_text(text, encoding='utf-8')

labels_path = Path('apps/api/src/modules/reports/i18n/field-labels.pt-br.ts')
labels = labels_path.read_text(encoding='utf-8')
required = {
    'tipoLancamento': 'Tipo de Lançamento',
    'nomeEpAlbum': 'Nome do EP/Álbum',
    'statusProjeto': 'Status',
    'nomeMusica': 'Nome da Música',
    'duracaoMinutos': 'Duração — Minutos',
    'duracaoSegundos': 'Duração — Segundos',
    'generoMusical': 'Gênero Musical',
    'idiomaMusica': 'Idioma da Música',
    'arquivosAudio': 'Arquivos de Áudio (MP3/WAV)',
}
missing = [(key, value) for key, value in required.items() if re.search(rf'^\s*{re.escape(key)}\s*:', labels, re.M) is None]
if missing:
    marker = "  // ── Parte 89 — Contabilidade (relatório computado)"
    insertion = ''.join(f"  {key}: {value!r},\n" for key, value in missing) + "\n"
    if marker not in labels:
        raise SystemExit('label insertion marker not found')
    labels = labels.replace(marker, insertion + marker, 1)
    labels_path.write_text(labels, encoding='utf-8')

print('project report contract and labels repaired')
