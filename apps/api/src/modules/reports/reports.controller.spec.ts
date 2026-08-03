import { BadRequestException } from '@nestjs/common';
import { parseExportParams } from './reports.controller';

/**
 * reports.controller.spec.ts  (Parte 81)
 *
 * parseExportParams é a única porta de entrada do formato de exportação
 * (GET /reports/entities/:entity/export?format=...). Antes desta Parte o
 * campo `format` da query string era descartado e o retorno hardcodeava
 * 'xlsx' — ou seja, um cliente pedindo ?format=csv nunca via um erro,
 * apenas recebia XLSX silenciosamente. Isso é compatibilidade implícita
 * proibida: qualquer formato fora de EXPORT_FORMATS precisa ser rejeitado
 * de forma explícita, com o código UNSUPPORTED_EXPORT_FORMAT.
 */
describe('parseExportParams — validação real de format (Parte 81)', () => {
  it('sem format na query → default xlsx', () => {
    expect(parseExportParams({}).format).toBe('xlsx');
  });

  it('format=xlsx explícito → aceito', () => {
    expect(parseExportParams({ format: 'xlsx' }).format).toBe('xlsx');
  });

  it('format=csv → rejeitado com UNSUPPORTED_EXPORT_FORMAT (400), nunca convertido silenciosamente para xlsx', () => {
    try {
      parseExportParams({ format: 'csv' });
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getStatus()).toBe(400);
      expect((err as BadRequestException).getResponse()).toMatchObject({ error: 'UNSUPPORTED_EXPORT_FORMAT' });
    }
  });

  it('format=pdf (ainda não implementado) → rejeitado com o mesmo código, não com sucesso fabricado', () => {
    try {
      parseExportParams({ format: 'pdf' });
      throw new Error('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({ error: 'UNSUPPORTED_EXPORT_FORMAT' });
    }
  });

  it('colunas/filtros continuam funcionando normalmente junto com o format válido', () => {
    const params = parseExportParams({ format: 'xlsx', columns: 'a, b ,c', status: 'ativo', sort: 'nome', order: 'desc', page: '2', pageSize: '50' });
    expect(params.columns).toEqual(['a', 'b', 'c']);
    expect(params.filters).toEqual({ status: 'ativo' });
    expect(params.sort).toBe('nome');
    expect(params.order).toBe('DESC');
    expect(params.page).toBe(2);
    expect(params.pageSize).toBe(50);
  });
});
