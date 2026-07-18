import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserDto } from './users.dto';

/**
 * users.dto.spec.ts
 *
 * Guarda permanente (auditoria 2026-07-18 — settings/usuários): o hook
 * useUsuarios() enviava `full_name`/`phone`/`cargo` — `phone` nunca teve
 * coluna nem campo de DTO (sempre descartado/rejeitado); `full_name`/`cargo`
 * não batiam com os nomes reais do DTO (`fullName`/`role`). Corrigido no
 * hook (envia fullName/phone/role) e aqui no DTO (phone adicionado).
 */
async function validatePayload(payload: Record<string, unknown>) {
  const instance = plainToInstance(UpdateUserDto, payload);
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

describe('UpdateUserDto — contrato real (auditoria 2026-07-18)', () => {
  it('aceita fullName/phone/role — payload real enviado por useUsuarios()', async () => {
    const errors = await validatePayload({ fullName: 'Fulano da Silva', phone: '11999999999', role: 'marketing' });
    expect(errors).toEqual([]);
  });

  it('rejeita full_name/cargo (nomes antigos incorretos usados pelo hook antes da correção)', async () => {
    for (const key of ['full_name', 'cargo']) {
      const errors = await validatePayload({ [key]: 'x' });
      expect(errors.some((e) => e.property === key)).toBe(true);
    }
  });
});
