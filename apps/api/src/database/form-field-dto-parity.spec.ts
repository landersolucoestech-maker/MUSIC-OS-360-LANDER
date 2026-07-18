import * as fs from 'fs';
import * as path from 'path';

/**
 * form-field-dto-parity.spec.ts
 *
 * Guarda permanente (auditoria 2026-07-18 — regra sem-metadata).
 *
 * Achado real: EventEntity já tinha as colunas `endereco`, `contato_local`,
 * `valor_cache`, `publico_esperado`, `descricao`, `participantes` E `observacoes`
 * (migration CrmFinanceOpsFormFieldColumns20260712000005 + coluna legada), mas
 * `observacoes` nunca foi exposta em CreateEventDto/UpdateEventDto — o
 * frontend, sem campo de DTO disponível, caía de volta para `metadata`.
 * O mesmo padrão existia inteiramente para `releases` (nenhuma das colunas
 * do formulário de Lançamento tinha DTO nem coluna — migration
 * ReleasesFormFieldColumns20260718000010 fechou a lacuna).
 *
 * Este teste é estático (lê o texto-fonte) e falha se uma coluna dedicada de
 * formulário existir na entity sem o campo correspondente no DTO de
 * create/update — sinal de que o form voltará a usar `metadata` como
 * workaround.
 */
const entitiesSrc = fs.readFileSync(
  path.resolve(__dirname, 'entities.ts'),
  'utf8',
);

function entityBlock(entityClassName: string): string {
  const start = entitiesSrc.indexOf(`export class ${entityClassName}`);
  if (start === -1) throw new Error(`Entity ${entityClassName} não encontrada em entities.ts`);
  // CRLF no arquivo real — indexOf('\n}\n') não bate e faz o slice ir até o
  // fim do arquivo (bug encontrado na auditoria 2026-07-18, que mascarava
  // asserts negativos ao capturar entities subsequentes por engano).
  const closingBrace = /\r?\n\}\r?\n/.exec(entitiesSrc.slice(start));
  if (!closingBrace) throw new Error(`Não foi possível localizar o fechamento da classe ${entityClassName}`);
  return entitiesSrc.slice(start, start + closingBrace.index);
}

function dtoSrc(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

describe('Colunas dedicadas de formulário sempre expostas no DTO correspondente', () => {
  it('EventEntity: endereco/contato_local/valor_cache/publico_esperado/descricao/observacoes/participantes estão em CreateEventDto', () => {
    const block = entityBlock('EventEntity');
    const dto = dtoSrc('../modules/events/dto/events.dto.ts');
    const formFields = [
      'endereco', 'contato_local', 'valor_cache', 'publico_esperado',
      'descricao', 'observacoes', 'participantes',
    ];
    for (const field of formFields) {
      expect(block).toMatch(new RegExp(`\\b${field}\\b`));
      expect(dto).toMatch(new RegExp(`\\b${field}\\??:`));
    }
  });

  it('ReleaseEntity: isrc_global/notas_internas/observacoes/gravadora/copyright/genero/idioma/assets/cronograma estão em CreateReleaseDto', () => {
    const block = entityBlock('ReleaseEntity');
    const dto = dtoSrc('../modules/releases/dto/releases.dto.ts');
    const formFields = [
      'isrc_global', 'notas_internas', 'observacoes', 'gravadora',
      'copyright', 'genero', 'idioma', 'assets', 'cronograma',
    ];
    for (const field of formFields) {
      expect(block).toMatch(new RegExp(`\\b${field}\\b`));
      expect(dto).toMatch(new RegExp(`\\b${field}\\??:`));
    }
  });
});
