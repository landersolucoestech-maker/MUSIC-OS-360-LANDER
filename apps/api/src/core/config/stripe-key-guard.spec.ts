import { classifyStripeSecretKeyFormat, classifyStripePublishableKeyFormat, checkStripeKeyLiveness } from './stripe-key-guard';

describe('classifyStripeSecretKeyFormat', () => {
  it('MISSING quando ausente, vazio ou só espaços', () => {
    expect(classifyStripeSecretKeyFormat(undefined)).toBe('MISSING');
    expect(classifyStripeSecretKeyFormat(null)).toBe('MISSING');
    expect(classifyStripeSecretKeyFormat('')).toBe('MISSING');
    expect(classifyStripeSecretKeyFormat('   ')).toBe('MISSING');
  });

  it('LIVE_KEY_REJECTED para sk_live_ e rk_live_, em qualquer ambiente', () => {
    expect(classifyStripeSecretKeyFormat('sk_live_abc123')).toBe('LIVE_KEY_REJECTED');
    expect(classifyStripeSecretKeyFormat('rk_live_abc123')).toBe('LIVE_KEY_REJECTED');
  });

  it('VALID_TEST_KEY para sk_test_ e rk_test_', () => {
    expect(classifyStripeSecretKeyFormat('sk_test_abc123')).toBe('VALID_TEST_KEY');
    expect(classifyStripeSecretKeyFormat('rk_test_abc123')).toBe('VALID_TEST_KEY');
    // formato usado pelo fixture existente de billing.service.spec.ts — nunca deve regressar
    expect(classifyStripeSecretKeyFormat('sk_test_key')).toBe('VALID_TEST_KEY');
  });

  it('INVALID_FORMAT para qualquer coisa que não seja um prefixo Stripe reconhecido', () => {
    expect(classifyStripeSecretKeyFormat('not-a-stripe-key')).toBe('INVALID_FORMAT');
    expect(classifyStripeSecretKeyFormat('pk_test_abc123')).toBe('INVALID_FORMAT'); // publishable, não secret
  });
});

describe('classifyStripePublishableKeyFormat', () => {
  it('MISSING / LIVE_KEY_REJECTED / VALID_TEST_KEY / INVALID_FORMAT', () => {
    expect(classifyStripePublishableKeyFormat(undefined)).toBe('MISSING');
    expect(classifyStripePublishableKeyFormat('pk_live_abc')).toBe('LIVE_KEY_REJECTED');
    expect(classifyStripePublishableKeyFormat('pk_test_abc')).toBe('VALID_TEST_KEY');
    expect(classifyStripePublishableKeyFormat('sk_test_abc')).toBe('INVALID_FORMAT');
  });
});

describe('checkStripeKeyLiveness', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('VALID_TEST_KEY quando a Stripe responde 200', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    expect(await checkStripeKeyLiveness('sk_test_x')).toBe('VALID_TEST_KEY');
  });

  it('EXPIRED_OR_REVOKED quando a Stripe rejeita a chave (caso real encontrado na Parte 71)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Expired API Key provided: sk_test_...1vcjvj' } }),
    }) as any;
    expect(await checkStripeKeyLiveness('sk_test_x')).toBe('EXPIRED_OR_REVOKED');
  });

  it('NETWORK_ERROR quando o fetch falha (sem internet, DNS, etc.) — nunca finge sucesso', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')) as any;
    expect(await checkStripeKeyLiveness('sk_test_x')).toBe('NETWORK_ERROR');
  });

  it('nunca inclui a chave na mensagem de autorização em texto plano fora do header Basic', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    global.fetch = jest.fn().mockImplementation((_url: string, opts: any) => {
      capturedHeaders = opts.headers;
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as any;
    await checkStripeKeyLiveness('sk_test_super-secret-value');
    expect(capturedHeaders?.Authorization).not.toContain('super-secret-value');
    expect(capturedHeaders?.Authorization).toMatch(/^Basic /);
  });
});
