import { BadRequestException } from '@nestjs/common';
import { parseExportParams } from './reports.controller';

describe('parseExportParams — contrato XLSX e paginação', () => {
  it('usa xlsx como formato padrão', () => {
    expect(parseExportParams({}).format).toBe('xlsx');
  });

  it('aceita xlsx explícito', () => {
    expect(parseExportParams({ format: 'xlsx' }).format).toBe('xlsx');
  });

  it('rejeita qualquer formato não implementado com código estável', () => {
    for (const format of ['xml', 'pdf', 'txt']) {
      try {
        parseExportParams({ format });
        throw new Error('deveria ter lançado');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getStatus()).toBe(400);
        expect((error as BadRequestException).getResponse()).toMatchObject({
          error: 'UNSUPPORTED_EXPORT_FORMAT',
        });
      }
    }
  });

  it('deduplica colunas e preserva filtros seguros', () => {
    const params = parseExportParams({
      format: 'xlsx',
      columns: 'a, b ,a,c',
      status: 'ativo',
      sort: 'nome',
      order: 'desc',
      page: '2',
      pageSize: '50',
    });
    expect(params.columns).toEqual(['a', 'b', 'c']);
    expect(params.filters).toEqual({ status: 'ativo' });
    expect(params.sort).toBe('nome');
    expect(params.order).toBe('DESC');
    expect(params.page).toBe(2);
    expect(params.pageSize).toBe(50);
  });

  it.each([
    [{ page: '0' }, 'page'],
    [{ page: '-1' }, 'page'],
    [{ page: '1.5' }, 'page'],
    [{ page: 'abc' }, 'page'],
    [{ pageSize: '0' }, 'pageSize'],
    [{ pageSize: '1001' }, 'pageSize'],
    [{ pageSize: 'Infinity' }, 'pageSize'],
  ])('rejeita paginação inválida: %p', (query, field) => {
    try {
      parseExportParams(query);
      throw new Error('deveria ter lançado');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        error: 'INVALID_REPORT_PAGINATION',
        message: expect.stringContaining(field),
      });
    }
  });

  it('descarta chaves inseguras de filtro', () => {
    const query = Object.create(null) as Record<string, string>;
    query.status = 'ativo';
    query.__proto__ = 'contaminado';
    const params = parseExportParams(query);
    expect(params.filters).toEqual({ status: 'ativo' });
    expect(Object.prototype.polluted).toBeUndefined();
  });
});
