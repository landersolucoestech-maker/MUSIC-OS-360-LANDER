import { evaluateRealtimeState, type RealtimePolicyRow } from './realtime-external-verifier';

const CANONICAL_TENANT_POLICY: RealtimePolicyRow = {
  policyname: 'tenant_can_receive_broadcast',
  roles: ['authenticated'],
  cmd: 'SELECT',
  qual: "((realtime.messages.extension = 'broadcast'::text) AND (realtime.topic() = (('tenant:'::text || (((auth.jwt() -> 'app_metadata'::text) ->> 'org_id'::text)))))",
  with_check: null,
};

const CANONICAL_USER_POLICY: RealtimePolicyRow = {
  policyname: 'user_can_receive_own_broadcast',
  roles: ['authenticated'],
  cmd: 'SELECT',
  qual: "((realtime.messages.extension = 'broadcast'::text) AND (realtime.topic() = ('user:'::text || ((auth.jwt() ->> 'sub'::text)))))",
  with_check: null,
};

describe('evaluateRealtimeState', () => {
  it('APPLIED_AND_VERIFIED: RLS habilitada, as duas policies canônicas com predicados corretos', () => {
    const result = evaluateRealtimeState({
      tableExists: true,
      rlsEnabled: true,
      owner: 'supabase_realtime_admin',
      currentUser: 'postgres',
      policies: [CANONICAL_TENANT_POLICY, CANONICAL_USER_POLICY],
    });
    expect(result.state).toBe('APPLIED_AND_VERIFIED');
  });

  it('PENDING_EXTERNAL_PRIVILEGE: RLS desabilitada, nenhuma policy, role não é owner (caso real confirmado na Parte 72)', () => {
    const result = evaluateRealtimeState({
      tableExists: true,
      rlsEnabled: false,
      owner: 'supabase_realtime_admin',
      currentUser: 'postgres',
      policies: [],
    });
    expect(result.state).toBe('PENDING_EXTERNAL_PRIVILEGE');
    expect(result.reason).toContain('não é a owner');
  });

  it('PENDING_EXTERNAL_PRIVILEGE: RLS desabilitada, nenhuma policy, mesmo quando a role já é owner (só ainda não aplicada)', () => {
    const result = evaluateRealtimeState({
      tableExists: true,
      rlsEnabled: false,
      owner: 'postgres',
      currentUser: 'postgres',
      policies: [],
    });
    expect(result.state).toBe('PENDING_EXTERNAL_PRIVILEGE');
    expect(result.reason).toContain('ainda não foi aplicada');
  });

  it('UNSAFE_PUBLIC_ACCESS: qualquer policy com USING (true), mesmo com as outras corretas', () => {
    const result = evaluateRealtimeState({
      tableExists: true,
      rlsEnabled: true,
      owner: 'supabase_realtime_admin',
      currentUser: 'postgres',
      policies: [CANONICAL_TENANT_POLICY, { ...CANONICAL_USER_POLICY, qual: 'true' }],
    });
    expect(result.state).toBe('UNSAFE_PUBLIC_ACCESS');
  });

  it('DRIFT: RLS habilitada mas falta uma das duas policies canônicas', () => {
    const result = evaluateRealtimeState({
      tableExists: true,
      rlsEnabled: true,
      owner: 'supabase_realtime_admin',
      currentUser: 'postgres',
      policies: [CANONICAL_TENANT_POLICY],
    });
    expect(result.state).toBe('DRIFT');
  });

  it('DRIFT: RLS habilitada com uma policy extra não reconhecida', () => {
    const result = evaluateRealtimeState({
      tableExists: true,
      rlsEnabled: true,
      owner: 'supabase_realtime_admin',
      currentUser: 'postgres',
      policies: [CANONICAL_TENANT_POLICY, CANONICAL_USER_POLICY, { policyname: 'algo_inesperado', roles: [], cmd: 'SELECT', qual: 'x = 1', with_check: null }],
    });
    expect(result.state).toBe('DRIFT');
  });

  it('DRIFT: policies existem mas RLS está desabilitada (estado inconsistente)', () => {
    const result = evaluateRealtimeState({
      tableExists: true,
      rlsEnabled: false,
      owner: 'supabase_realtime_admin',
      currentUser: 'postgres',
      policies: [CANONICAL_TENANT_POLICY, CANONICAL_USER_POLICY],
    });
    expect(result.state).toBe('DRIFT');
  });

  it('INVALID_POLICY: nomes corretos mas predicado divergente (ex.: comparando org_id errado)', () => {
    const result = evaluateRealtimeState({
      tableExists: true,
      rlsEnabled: true,
      owner: 'supabase_realtime_admin',
      currentUser: 'postgres',
      policies: [
        { ...CANONICAL_TENANT_POLICY, qual: "realtime.messages.extension = 'broadcast'" }, // falta 'tenant:'/'app_metadata'/'org_id'
        CANONICAL_USER_POLICY,
      ],
    });
    expect(result.state).toBe('INVALID_POLICY');
  });

  it('lança erro claro quando a tabela não existe — nunca finge um dos 5 estados nesse caso', () => {
    expect(() => evaluateRealtimeState({
      tableExists: false,
      rlsEnabled: false,
      owner: '',
      currentUser: '',
      policies: [],
    })).toThrow(/não existe neste projeto/);
  });
});
