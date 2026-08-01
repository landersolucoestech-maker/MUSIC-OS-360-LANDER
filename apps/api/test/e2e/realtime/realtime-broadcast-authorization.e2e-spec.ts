/**
 * test/e2e/realtime/realtime-broadcast-authorization.e2e-spec.ts
 *
 * Teste FUNCIONAL (Postgres real, não apenas texto de SQL mockado — ver
 * database/realtime-broadcast-authorization.migration.spec.ts para o teste de
 * forma) das policies de 20260801000001_RealtimeBroadcastAuthorization.
 *
 * Usa uma única conexão `pg.Client` (não um pool) porque `SET ROLE` e as GUCs
 * de sessão (request.jwt.claims, realtime.topic) só têm efeito na conexão
 * física exata em que foram definidas — um DataSource/pool não garante isso
 * entre chamadas .query() sucessivas.
 *
 * Espelha exatamente o mecanismo real do Supabase Realtime: o servidor decide
 * quem pode entrar num canal fazendo o Postgres avaliar as policies de SELECT
 * em realtime.messages sob o role `authenticated`, com `auth.jwt()` a ler o
 * JWT do cliente e `realtime.topic()` a ler o tópico requisitado.
 */
import { Client } from 'pg';

function readDatabaseUrl(): string {
  return process.env['DATABASE_URL'] ?? '';
}

const TENANT_A = '11111111-0000-0000-0000-0000000000a1';
const TENANT_B = '22222222-0000-0000-0000-0000000000b2';
const USER_A   = '33333333-0000-0000-0000-0000000000c3';
const USER_B   = '44444444-0000-0000-0000-0000000000d4';

const hasDb = !!readDatabaseUrl();
const d = hasDb ? describe : describe.skip;

d('Realtime broadcast authorization (RLS real) — realtime.messages', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: readDatabaseUrl(), ssl: false });
    await client.connect();
    // service_role (owner) semeia as duas mensagens de teste — bypassa RLS,
    // tal como o RealtimeService real ao publicar via service_role key.
    await client.query(
      `INSERT INTO realtime.messages (topic, extension, event, payload) VALUES
         ($1, 'broadcast', 'notification:new', '{}'),
         ($2, 'broadcast', 'notification:new', '{}')`,
      [`tenant:${TENANT_A}`, `user:${USER_A}`],
    );
  });

  afterAll(async () => {
    await client.query(`DELETE FROM realtime.messages WHERE topic = ANY($1)`, [
      [`tenant:${TENANT_A}`, `user:${USER_A}`],
    ]);
    await client.end();
  });

  afterEach(async () => {
    await client.query(`RESET ROLE`);
    await client.query(`RESET request.jwt.claims`);
    await client.query(`RESET realtime.topic`);
  });

  async function selectAs(jwtClaims: Record<string, unknown> | null, topic: string): Promise<number> {
    await client.query(`SET ROLE authenticated`);
    // SET/SET LOCAL não aceitam parâmetros ($1) — set_config() é a forma
    // parametrizável equivalente (mesma semântica de GUC de sessão).
    if (jwtClaims) await client.query(`SELECT set_config('request.jwt.claims', $1, false)`, [JSON.stringify(jwtClaims)]);
    await client.query(`SELECT set_config('realtime.topic', $1, false)`, [topic]);
    const res = await client.query(`SELECT * FROM realtime.messages WHERE topic = $1`, [topic]);
    return res.rowCount ?? 0;
  }

  it('1. tenant A assinando tenant:A vê a mensagem do seu tenant', async () => {
    const rows = await selectAs({ sub: USER_A, role: 'authenticated', app_metadata: { org_id: TENANT_A } }, `tenant:${TENANT_A}`);
    expect(rows).toBe(1);
  });

  it('2. tenant B assinando tenant:A NÃO recebe (RLS bloqueia — org_id não bate)', async () => {
    const rows = await selectAs({ sub: USER_B, role: 'authenticated', app_metadata: { org_id: TENANT_B } }, `tenant:${TENANT_A}`);
    expect(rows).toBe(0);
  });

  it('3. utilizador A assinando user:<subA> vê a sua própria notificação', async () => {
    const rows = await selectAs({ sub: USER_A, role: 'authenticated', app_metadata: { org_id: TENANT_A } }, `user:${USER_A}`);
    expect(rows).toBe(1);
  });

  it('4. utilizador B assinando user:<subA> NÃO recebe (sub não bate)', async () => {
    const rows = await selectAs({ sub: USER_B, role: 'authenticated', app_metadata: { org_id: TENANT_B } }, `user:${USER_A}`);
    expect(rows).toBe(0);
  });

  it('5. sem JWT (claims vazias) é negado em qualquer canal', async () => {
    const rows = await selectAs({}, `tenant:${TENANT_A}`);
    expect(rows).toBe(0);
  });

  it('6. authenticated sem org_id no app_metadata não recebe o canal de tenant', async () => {
    const rows = await selectAs({ sub: USER_A, role: 'authenticated' }, `tenant:${TENANT_A}`);
    expect(rows).toBe(0);
  });

  it('9. o nome do canal não é livre — o utilizador não escolhe qual tenant: consegue ler, só o seu', async () => {
    // Mesmo JWT válido do tenant A tentando ler o tópico de um tenant arbitrário
    // (não o seu) continua bloqueado — a policy amarra topic ao claim, não ao
    // valor que o cliente pede.
    const rows = await selectAs({ sub: USER_A, role: 'authenticated', app_metadata: { org_id: TENANT_A } }, `tenant:${TENANT_B}`);
    expect(rows).toBe(0);
  });
});
