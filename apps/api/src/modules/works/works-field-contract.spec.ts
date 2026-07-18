import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWorkDto } from './dto/create-work.dto';

/**
 * works-field-contract.spec.ts
 *
 * Guarda permanente (auditoria 2026-07-18 — contrato canônico de `works`).
 *
 * Corrige uma auditoria anterior que presumiu, sem verificar o código real,
 * que o campo canônico seria "codigo_abramus" ou "codigo_entidade". Busca
 * exaustiva no repositório (apps/api/src, apps/web/src) provou que nenhum
 * desses nomes jamais existiu — o único nome real, usado de ponta a ponta
 * (obra-schema.ts Zod, ObraFormModal, registro-musicas.mapper.ts,
 * CreateWorkDto, WorkEntity, migration InitialSchema, coluna física,
 * WORKS_CONTRACT de Reports) é `cod_abramus` / `codAbramus`.
 *
 * ValidationPipe global roda com { whitelist: true, forbidNonWhitelisted: true }:
 * qualquer chave fora do DTO derruba a request inteira com 400. Este teste
 * usa a mesma configuração para provar comportamentalmente o contrato.
 */
async function validateDto(payload: Record<string, unknown>) {
  const instance = plainToInstance(CreateWorkDto, payload);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

const MINIMAL_VALID = { titulo: 'Obra de Teste' };

describe('CreateWorkDto — contrato canônico de campos', () => {
  it('aceita `cod_abramus` (nome canônico real)', async () => {
    const errors = await validateDto({ ...MINIMAL_VALID, cod_abramus: 'ABR-123' });
    expect(errors).toHaveLength(0);
  });

  it('rejeita `codigo_abramus` — nunca existiu como nome de campo real', async () => {
    const errors = await validateDto({ ...MINIMAL_VALID, codigo_abramus: 'ABR-123' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejeita `codigo_entidade` / `cod_entidade` / `entity_code` — não existem no contrato real', async () => {
    for (const key of ['codigo_entidade', 'cod_entidade', 'entity_code']) {
      const errors = await validateDto({ ...MINIMAL_VALID, [key]: 'X' });
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('aceita compositor/compositores/editora/co_compositores-like legado sem quebrar (compat bulk/import)', async () => {
    const errors = await validateDto({
      ...MINIMAL_VALID,
      compositor: 'João Silva',
      compositores: [{ nome: 'João Silva' }],
      editora: 'Editora XYZ',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejeita `detentor`/`holders` inventados — só `metadata`/campos declarados são aceitos', async () => {
    const errors = await validateDto({ ...MINIMAL_VALID, holders: ['x'], titulares: ['y'] });
    expect(errors.length).toBeGreaterThan(0);
  });
});
