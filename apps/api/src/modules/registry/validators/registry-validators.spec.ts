import {
  isValidCpf,
  isValidCnpj,
  isValidDocument,
  isValidIsrc,
  isValidIswc,
  normalizeIsrc,
} from './registry-validators';

describe('registry-validators', () => {
  describe('CPF', () => {
    it('accepts a valid CPF (with mask)', () => expect(isValidCpf('111.444.777-35')).toBe(true));
    it('rejects a bad check digit', () => expect(isValidCpf('111.444.777-30')).toBe(false));
    it('rejects repeated digits', () => expect(isValidCpf('11111111111')).toBe(false));
  });

  describe('CNPJ', () => {
    it('accepts a valid CNPJ', () => expect(isValidCnpj('11.222.333/0001-81')).toBe(true));
    it('rejects a bad check digit', () => expect(isValidCnpj('11.222.333/0001-80')).toBe(false));
  });

  describe('isValidDocument', () => {
    it('validates by declared type', () => {
      expect(isValidDocument('CPF', '111.444.777-35')).toBe(true);
      expect(isValidDocument('CNPJ', '123')).toBe(false);
      expect(isValidDocument('PASSPORT', 'X123')).toBe(true);
      expect(isValidDocument('CPF', undefined)).toBe(true); // optional
    });
  });

  describe('ISRC / ISWC', () => {
    it('accepts ISRC with or without dashes and normalises', () => {
      expect(isValidIsrc('BR-ABC-26-00001')).toBe(true);
      expect(normalizeIsrc('br-abc-26-00001')).toBe('BRABC2600001');
    });
    it('rejects malformed ISRC', () => expect(isValidIsrc('NOPE')).toBe(false));
    it('accepts valid ISWC', () => expect(isValidIswc('T-034.524.680-1')).toBe(true));
    it('rejects malformed ISWC', () => expect(isValidIswc('034524680')).toBe(false));
  });
});
