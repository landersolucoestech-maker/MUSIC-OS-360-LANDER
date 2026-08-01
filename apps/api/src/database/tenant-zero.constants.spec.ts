import { v5 as uuidv5 } from 'uuid';
import {
  TENANT_ZERO_ORG_ID,
  TENANT_ZERO_TENANT_ID,
  TENANT_ZERO_SLUG,
  TENANT_ZERO_NAME,
  TENANT_ZERO_SYNTHETIC_OWNER_AUTH_USER_ID,
  TENANT_ZERO_SYNTHETIC_OWNER_EMAIL,
} from './tenant-zero.constants';

const MUSICOS360_NAMESPACE_UUID = '142d39d6-8454-4ba1-b2f0-695b120ae83f';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('tenant-zero.constants', () => {
  it('deriva org/tenant IDs deterministicamente via UUIDv5 do namespace congelado', () => {
    // Recomputa de forma independente — prova que os exports não são
    // literais soltos, e sim resultado da fórmula documentada.
    expect(TENANT_ZERO_ORG_ID).toBe(uuidv5(`${TENANT_ZERO_SLUG}:organization`, MUSICOS360_NAMESPACE_UUID));
    expect(TENANT_ZERO_TENANT_ID).toBe(uuidv5(`${TENANT_ZERO_SLUG}:tenant`, MUSICOS360_NAMESPACE_UUID));
    expect(TENANT_ZERO_SYNTHETIC_OWNER_AUTH_USER_ID).toBe(uuidv5(`${TENANT_ZERO_SLUG}:synthetic-owner`, MUSICOS360_NAMESPACE_UUID));
  });

  it('produz UUIDv5 válidos (versão e variant corretos)', () => {
    expect(TENANT_ZERO_ORG_ID).toMatch(UUID_RE);
    expect(TENANT_ZERO_TENANT_ID).toMatch(UUID_RE);
    expect(TENANT_ZERO_SYNTHETIC_OWNER_AUTH_USER_ID).toMatch(UUID_RE);
  });

  it('org, tenant e owner sintético nunca colidem entre si', () => {
    const ids = [TENANT_ZERO_ORG_ID, TENANT_ZERO_TENANT_ID, TENANT_ZERO_SYNTHETIC_OWNER_AUTH_USER_ID];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('nome/slug canônicos são estáveis (regressão contra rename acidental)', () => {
    expect(TENANT_ZERO_SLUG).toBe('lander-records');
    expect(TENANT_ZERO_NAME).toBe('LANDER RECORDS');
  });

  it('owner sintético usa domínio example.com — nunca um domínio real de cliente', () => {
    expect(TENANT_ZERO_SYNTHETIC_OWNER_EMAIL.endsWith('@lander-records.example.com')).toBe(true);
  });

  it('IDs canônicos são congelados: mudar o namespace ou a seed é uma quebra de compatibilidade', () => {
    // Snapshot explícito — se este teste falhar, o namespace ou a seed mudaram
    // e TODO ambiente (DEV/STAGING/PROD) precisa de um plano de migração de dados.
    expect(TENANT_ZERO_ORG_ID).toMatchSnapshot();
    expect(TENANT_ZERO_TENANT_ID).toMatchSnapshot();
  });
});
