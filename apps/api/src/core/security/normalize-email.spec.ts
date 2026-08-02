import { normalizeEmail } from './normalize-email';

describe('normalizeEmail', () => {
  it('converte para minúsculas', () => {
    expect(normalizeEmail('Deyvisson@LanderRecords.com')).toBe('deyvisson@landerrecords.com');
  });

  it('remove espaços no início', () => {
    expect(normalizeEmail('  deyvisson@landerrecords.com')).toBe('deyvisson@landerrecords.com');
  });

  it('remove espaços no fim', () => {
    expect(normalizeEmail('deyvisson@landerrecords.com  ')).toBe('deyvisson@landerrecords.com');
  });

  it('e-mail em caixa mista com espaços nas duas pontas', () => {
    expect(normalizeEmail('  Deyvisson@LANDERRECORDS.com  ')).toBe('deyvisson@landerrecords.com');
  });

  it('input vazio permanece vazio (validação de formato é responsabilidade do chamador)', () => {
    expect(normalizeEmail('')).toBe('');
    expect(normalizeEmail('   ')).toBe('');
  });

  it('já normalizado permanece idêntico (idempotente)', () => {
    expect(normalizeEmail('deyvisson@landerrecords.com')).toBe('deyvisson@landerrecords.com');
  });
});
