import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

const TEST_KEY = '0000000000000000000000000000000000000000000000000000000000000000';

function makeService(key = TEST_KEY): EncryptionService {
  const config = {
    get: jest.fn().mockReturnValue(key),
  } as unknown as ConfigService;
  return new EncryptionService(config);
}

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = makeService();
  });

  it('encrypt → decrypt roundtrip retorna o valor original', () => {
    const plaintext = 'valor-super-secreto';
    const encrypted = service.encrypt(plaintext);
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });

  it('encrypt produz string com prefixo enc:v1:', () => {
    const encrypted = service.encrypt('teste');
    expect(encrypted.startsWith('enc:v1:')).toBe(true);
  });

  it('dois encrypt do mesmo valor produzem ciphertexts diferentes (IV aleatório)', () => {
    const plaintext = 'mesmo-valor';
    const a = service.encrypt(plaintext);
    const b = service.encrypt(plaintext);
    expect(a).not.toBe(b);
    expect(service.decrypt(a)).toBe(plaintext);
    expect(service.decrypt(b)).toBe(plaintext);
  });

  it('encryptNullable(null) retorna null', () => {
    expect(service.encryptNullable(null)).toBeNull();
  });

  it('encryptNullable(undefined) retorna null', () => {
    expect(service.encryptNullable(undefined)).toBeNull();
  });

  it('encryptNullable("") retorna null', () => {
    expect(service.encryptNullable('')).toBeNull();
  });

  it('decryptNullable(null) retorna null', () => {
    expect(service.decryptNullable(null)).toBeNull();
  });

  it('decryptNullable(undefined) retorna null', () => {
    expect(service.decryptNullable(undefined)).toBeNull();
  });

  it('encryptNullable + decryptNullable roundtrip retorna o valor original', () => {
    const plaintext = 'email@empresa.com';
    const encrypted = service.encryptNullable(plaintext);
    expect(encrypted).not.toBeNull();
    expect(service.decryptNullable(encrypted!)).toBe(plaintext);
  });

  it('decrypt de ciphertext inválido retorna [encrypted] em vez de lançar erro', () => {
    expect(service.decrypt('not-valid-base64!!!')).toBe('[encrypted]');
  });
});
