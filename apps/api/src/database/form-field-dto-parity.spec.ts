import * as fs from 'fs';
import * as path from 'path';

/**
 * Guarda estática: campos persistidos pelos formulários devem existir no DTO
 * aceito pelo backend. O teste evita regressões em que a UI exibe e envia um
 * campo, mas whitelist/forbidNonWhitelisted o rejeita ou descarta.
 */
const entitiesSrc = fs.readFileSync(path.resolve(__dirname, 'entities.ts'), 'utf8');

function entityBlock(entityClassName: string): string {
  const start = entitiesSrc.indexOf(`export class ${entityClassName}`);
  if (start === -1) throw new Error(`Entity ${entityClassName} não encontrada em entities.ts`);
  const closingBrace = /\r?\n\}\r?\n/.exec(entitiesSrc.slice(start));
  if (!closingBrace) throw new Error(`Não foi possível localizar o fechamento da classe ${entityClassName}`);
  return entitiesSrc.slice(start, start + closingBrace.index);
}

function dtoSrc(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

function expectFields(source: string, fields: readonly string[], pattern = (field: string) => `\\b${field}\\??:`) {
  for (const field of fields) expect(source).toMatch(new RegExp(pattern(field)));
}

describe('Colunas dedicadas de formulário sempre expostas no DTO correspondente', () => {
  it('EventEntity mantém os campos do formulário em CreateEventDto', () => {
    const block = entityBlock('EventEntity');
    const dto = dtoSrc('../modules/events/dto/events.dto.ts');
    const fields = [
      'endereco', 'contato_local', 'valor_cache', 'publico_esperado',
      'descricao', 'observacoes', 'participantes',
    ] as const;
    expectFields(block, fields, (field) => `\\b${field}\\b`);
    expectFields(dto, fields);
  });

  it('ReleaseEntity mantém os campos do formulário em CreateReleaseDto', () => {
    const block = entityBlock('ReleaseEntity');
    const dto = dtoSrc('../modules/releases/dto/releases.dto.ts');
    const fields = [
      'isrc_global', 'notas_internas', 'observacoes', 'gravadora',
      'copyright', 'genero', 'idioma', 'assets', 'cronograma',
    ] as const;
    expectFields(block, fields, (field) => `\\b${field}\\b`);
    expectFields(dto, fields);
  });

  it('TakedownEntity e CreateTakedownDto refletem integralmente o modal real', () => {
    const block = entityBlock('TakedownEntity');
    const dto = dtoSrc('../modules/takedowns/dto/takedowns.dto.ts');
    const fields = [
      'titulo', 'tipo', 'obra_afetada', 'artista', 'plataforma',
      'prioridade', 'url_infracao', 'motivo', 'descricao', 'evidencias',
      'data_identificacao', 'status', 'observacoes',
    ] as const;
    expectFields(block, fields, (field) => `\\b${field}\\b`);
    expectFields(dto, fields);
  });

  it('InvoiceEntity e CreateInvoiceDto refletem os dados e tributos da Nota Fiscal', () => {
    const block = entityBlock('InvoiceEntity');
    const dto = dtoSrc('../modules/invoices/dto/invoices.dto.ts');
    const fields = [
      'numero', 'serie', 'tipo_nota', 'cliente_id', 'natureza_operacao',
      'codigo_servico_municipal', 'codigo_municipio', 'cfop',
      'descricao_servicos', 'data_emissao', 'vencimento', 'status',
      'tomador_cnpj', 'tomador_razao_social', 'tomador_inscricao_estadual',
      'tomador_inscricao_municipal', 'tomador_email', 'tomador_endereco',
      'tomador_cidade', 'tomador_uf', 'tomador_cep', 'valor_servicos',
      'valor_deducoes', 'base_calculo', 'aliquota_iss', 'valor_iss',
      'iss_retido', 'valor_pis', 'valor_cofins', 'valor_inss', 'valor_ir',
      'valor_csll', 'valor_liquido', 'forma_pagamento', 'condicao_pagamento',
      'url_pdf', 'observacoes', 'itens',
    ] as const;
    expectFields(block, fields, (field) => `\\b${field}\\b`);
    expectFields(dto, fields);
  });

  it('Licenciamento aceita todos os campos condicionais de remuneração do modal', () => {
    const dto = dtoSrc('../modules/licensing/dto/licensing.dto.ts');
    const service = dtoSrc('../modules/licensing/licensing.service.ts');
    expectFields(dto, ['remuneration_type', 'currency', 'amount', 'percentage']);
    expect(service).toContain('payload.valor =');
    expect(service).toContain('payload.moeda =');
    expect(service).toContain("metadata['percentage']");
  });
});
