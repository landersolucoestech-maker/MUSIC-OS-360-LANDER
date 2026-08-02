/**
 * Parte 74 — regressão: GlobalExceptionFilter tinha uma linha
 * incondicional (`error = exception.name;`) executada DEPOIS de já ter
 * lido `resp['error']` do payload da exceção, sobrescrevendo qualquer
 * código de máquina customizado (ex.: `MUST_CHANGE_PASSWORD`,
 * `TENANT_SUSPENDED`) pelo nome genérico da classe (`ForbiddenException`).
 * Isso quebrava silenciosamente todo guard que dependia de um `error` code
 * próprio para o frontend diferenciar motivos de 403 — incluindo o fluxo
 * de troca obrigatória de senha (Parte 73/74).
 */
import { ForbiddenException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

function buildHost(request: Record<string, unknown> = {}) {
  const json = jest.fn();
  const header = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ header, json });
  const response = { status, header, json };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'GET', url: '/api/v1/artists', headers: {}, ...request }),
    }),
  };
  return { host: host as any, status, json };
}

describe('GlobalExceptionFilter', () => {
  it('preserva o código customizado `error` do payload da exceção (ex.: MUST_CHANGE_PASSWORD)', () => {
    const filter = new GlobalExceptionFilter();
    const { host, status, json } = buildHost();

    filter.catch(
      new ForbiddenException({ error: 'MUST_CHANGE_PASSWORD', message: 'Troca de senha obrigatória.' }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'MUST_CHANGE_PASSWORD',
      message: 'Troca de senha obrigatória.',
    }));
  });

  it('preserva outros códigos customizados (ex.: TENANT_SUSPENDED)', () => {
    const filter = new GlobalExceptionFilter();
    const { host, json } = buildHost();

    filter.catch(new ForbiddenException({ error: 'TENANT_SUSPENDED', message: 'Tenant suspenso.' }), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'TENANT_SUSPENDED' }));
  });

  it('preserva a reason-phrase HTTP padrão que os built-ins do Nest já geram (ex.: "Bad Request")', () => {
    const filter = new GlobalExceptionFilter();
    const { host, json } = buildHost();

    filter.catch(new BadRequestException('payload inválido'), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Bad Request',
      message: 'payload inválido',
    }));
  });

  it('usa o nome da classe quando a exceção é genérica (HttpException com string)', () => {
    const filter = new GlobalExceptionFilter();
    const { host, json } = buildHost();

    filter.catch(new HttpException('erro genérico', HttpStatus.NOT_FOUND), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'HttpException',
      message: 'erro genérico',
    }));
  });
});
