/**
 * realtime-external-verifier.ts  (Parte 72)
 *
 * Lógica pura de avaliação do estado físico de `realtime.messages` —
 * independente da tabela de tracking `musicos360_migrations`.
 * RealtimeBroadcastAuthorization20260801000001 é EXTERNAL_MANAGED (ver
 * migration-classification.ts): sua linha de tracking pode nunca existir
 * mesmo com as policies corretas (aplicadas manualmente via Dashboard), e
 * pode existir uma expectativa de tracking sem que o efeito físico esteja
 * realmente lá. Esta função nunca confia na tabela de tracking — recebe o
 * estado já consultado diretamente de pg_class/pg_policies (ver
 * scripts/verify-realtime-external.ts, que faz o I/O real).
 *
 * Função pura e testável sem banco de dados.
 */

export type RealtimeExternalState =
  | 'APPLIED_AND_VERIFIED'
  | 'PENDING_EXTERNAL_PRIVILEGE'
  | 'DRIFT'
  | 'UNSAFE_PUBLIC_ACCESS'
  | 'INVALID_POLICY';

export interface RealtimePolicyRow {
  policyname: string;
  roles: string[];
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

export interface RealtimeStateInput {
  tableExists: boolean;
  rlsEnabled: boolean;
  owner: string;
  currentUser: string;
  policies: RealtimePolicyRow[];
}

export interface RealtimeStateResult {
  state: RealtimeExternalState;
  reason: string;
}

// Fragmentos deliberadamente simples: apenas os literais de string da
// migration (20260801000001), que o deparser do Postgres preserva verbatim
// independente de como formata parênteses/casts dos operadores jsonb ao
// redor. Casar contra a expressão de operadores inteira seria frágil —
// pg_get_expr() pode reformatar isso de formas que variam por versão do
// Postgres.
const EXPECTED_POLICIES: Record<string, { qualIncludes: string[] }> = {
  tenant_can_receive_broadcast: {
    qualIncludes: ["'broadcast'", "'tenant:'", "'app_metadata'", "'org_id'"],
  },
  user_can_receive_own_broadcast: {
    qualIncludes: ["'broadcast'", "'user:'", "'sub'"],
  },
};

export function evaluateRealtimeState(input: RealtimeStateInput): RealtimeStateResult {
  if (!input.tableExists) {
    throw new Error('realtime.messages não existe neste projeto — confirme o project ref antes de interpretar qualquer estado.');
  }

  const publicPolicy = input.policies.find((p) => (p.qual ?? '').trim() === 'true');
  if (publicPolicy) {
    return { state: 'UNSAFE_PUBLIC_ACCESS', reason: `Policy "${publicPolicy.policyname}" usa USING (true) — acesso público a canais privados.` };
  }

  // Nenhuma policy ainda — a migration simplesmente não foi aplicada. Isto
  // vale independente de rlsEnabled: Supabase provisiona realtime.messages
  // com RLS já habilitada por padrão (fail-closed) antes de qualquer policy
  // existir (confirmado empiricamente na Parte 72 contra Supabase DEV real —
  // ALTER TABLE ENABLE ROW LEVEL SECURITY falha por ownership mesmo já
  // estando habilitada, então "RLS=true, zero policies" é o estado inicial
  // normal, não uma migration parcialmente aplicada). Tratar isso como DRIFT
  // classificaria o estado inicial normal do Supabase como uma regressão.
  if (input.policies.length === 0) {
    const ownerNote = input.owner === input.currentUser
      ? 'a role de conexão já é a owner, mas a migration ainda não foi aplicada'
      : `a role de conexão ("${input.currentUser}") não é a owner ("${input.owner}") de realtime.messages`;
    return { state: 'PENDING_EXTERNAL_PRIVILEGE', reason: `Nenhuma policy (RLS=${input.rlsEnabled}) — ${ownerNote}.` };
  }

  const expectedNames = Object.keys(EXPECTED_POLICIES);
  const foundNames = input.policies.map((p) => p.policyname);
  const hasExactSet = expectedNames.length === foundNames.length && expectedNames.every((n) => foundNames.includes(n));

  if (!input.rlsEnabled || !hasExactSet) {
    return {
      state: 'DRIFT',
      reason: `Esperava RLS habilitada com exatamente as policies [${expectedNames.join(', ')}]; ` +
        `encontrado RLS=${input.rlsEnabled}, policies=[${foundNames.join(', ') || 'nenhuma'}].`,
    };
  }

  for (const policy of input.policies) {
    const expected = EXPECTED_POLICIES[policy.policyname];
    if (!expected) continue;
    const qual = policy.qual ?? '';
    const missing = expected.qualIncludes.filter((fragment) => !qual.includes(fragment));
    if (missing.length > 0) {
      return {
        state: 'INVALID_POLICY',
        reason: `Policy "${policy.policyname}" existe mas o predicado não contém: ${missing.join(' | ')}. Predicado atual: ${qual}`,
      };
    }
  }

  return { state: 'APPLIED_AND_VERIFIED', reason: 'RLS habilitada, exatamente as duas policies canônicas, predicados corretos, sem acesso público.' };
}
