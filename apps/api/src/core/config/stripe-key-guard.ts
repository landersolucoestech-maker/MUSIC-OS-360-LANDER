/**
 * stripe-key-guard.ts  (Parte 72)
 *
 * Classificação segura de chaves Stripe — nunca imprime o valor da chave,
 * apenas o estado. Esta parte do projeto usa Stripe exclusivamente em TEST
 * MODE (ver regras absolutas das Partes 69-72): uma chave `sk_live_`/
 * `pk_live_` é sempre rejeitada aqui, em qualquer ambiente, não apenas em
 * DEV/STAGING — não há uma fase "produção com Stripe live" habilitada ainda.
 *
 * `classifyStripeSecretKeyFormat` é síncrona e não faz nenhuma chamada de
 * rede — segura para rodar no boot/build. Ela NÃO consegue detectar uma
 * chave revogada/expirada (formato continua válido); isso só é observável
 * chamando a API da Stripe, o que `checkStripeKeyLiveness` faz sob demanda
 * (nunca automaticamente no boot/build).
 */

export type StripeKeyFormatState =
  | 'MISSING'
  | 'INVALID_FORMAT'
  | 'LIVE_KEY_REJECTED'
  | 'VALID_TEST_KEY';

export type StripeKeyLivenessState =
  | 'VALID_TEST_KEY'
  | 'EXPIRED_OR_REVOKED'
  | 'NETWORK_ERROR';

const TEST_KEY_PATTERN = /^[sr]k_test_/;
const LIVE_KEY_PATTERN = /^[sr]k_live_/;

export function classifyStripeSecretKeyFormat(key: string | undefined | null): StripeKeyFormatState {
  if (!key || key.trim() === '') return 'MISSING';
  if (LIVE_KEY_PATTERN.test(key)) return 'LIVE_KEY_REJECTED';
  if (TEST_KEY_PATTERN.test(key)) return 'VALID_TEST_KEY';
  return 'INVALID_FORMAT';
}

export function classifyStripePublishableKeyFormat(key: string | undefined | null): StripeKeyFormatState {
  if (!key || key.trim() === '') return 'MISSING';
  if (/^pk_live_/.test(key)) return 'LIVE_KEY_REJECTED';
  if (/^pk_test_/.test(key)) return 'VALID_TEST_KEY';
  return 'INVALID_FORMAT';
}

/**
 * Chama GET /v1/balance — endpoint autenticado, somente-leitura, sem efeito
 * colateral — apenas para confirmar que a chave ainda é aceita pela Stripe.
 * Nunca deve ser chamada automaticamente no boot; é para uso sob demanda
 * (ex.: um endpoint de readiness ou script de verificação manual).
 */
export async function checkStripeKeyLiveness(key: string): Promise<StripeKeyLivenessState> {
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}` },
    });
    if (res.ok) return 'VALID_TEST_KEY';
    const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
    const message = body?.error?.message ?? '';
    if (/expired|revoked/i.test(message)) return 'EXPIRED_OR_REVOKED';
    return 'EXPIRED_OR_REVOKED';
  } catch {
    return 'NETWORK_ERROR';
  }
}
