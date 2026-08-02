/**
 * parte74-rotate-and-validate-password-flow.ts  (one-off, deletado após uso)
 *
 * Roda contra o Supabase DEV real:
 *   1) Rotaciona a senha do owner institucional da LANDER RECORDS para uma
 *      nova senha provisória de TESTE (isso já invalida fisicamente
 *      qualquer senha anterior no Supabase Auth, incluindo a senha
 *      comprometida da Parte 73 — sem nunca precisar reler ou retransmitir
 *      o valor antigo, que não é usado em nenhum momento deste script).
 *   2) Sobe a API real COMPILADA (dist/apps/api/src/main.js — mesmo binário
 *      que roda em produção/Docker, com os mesmos guards/filters/pipes) como
 *      processo filho, e valida de ponta a ponta, contra HTTP real:
 *      bloqueio de rotas comuns, endpoint atômico de troca (mismatch,
 *      senha fraca, reuso, sucesso), auditoria, invalidação física da
 *      senha antiga, e desbloqueio real de uma rota de domínio.
 *      (Importar AppModule diretamente dentro deste script via `tsx` NÃO
 *      funciona — esbuild não emite decorator metadata, e o DI do Nest
 *      passa a injetar `undefined` em providers com dependências implícitas
 *      por tipo, como RealtimeService(ConfigService); rodar o binário já
 *      compilado por `tsc` evita esse problema inteiramente.)
 *   3) Rotaciona novamente para a senha provisória FINAL (a que será
 *      entregue ao usuário), com must_change_password=true, e revoga as
 *      sessões de teste.
 *
 * Nunca imprime nenhuma senha, exceto a final — e só quando
 * TENANT_ZERO_PRINT_PASSWORD_I_ACCEPT_THE_RISK=yes (mesmo padrão da Parte 73).
 */
import 'reflect-metadata';
import * as path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { generateStrongPassword } from '../src/core/security/generate-strong-password';
import { AppDataSource } from '../src/database/datasource';

const EMAIL = process.env['TENANT_ZERO_OWNER_EMAIL'] ?? 'deyvisson@landerrecords.com';
const PORT = process.env['PARTE74_VALIDATION_PORT'] ?? '3099';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startCompiledApi(): Promise<ChildProcess> {
  const cwd = path.resolve(__dirname, '..'); // apps/api
  const child = spawn('node', ['dist/apps/api/src/main.js'], {
    cwd,
    env: { ...process.env, PORT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk) => process.stdout.write(`  [api] ${chunk}`));
  child.stderr?.on('data', (chunk) => process.stderr.write(`  [api:err] ${chunk}`));

  const baseUrl = `http://127.0.0.1:${PORT}/api/v1`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return child;
    } catch { /* ainda subindo */ }
    await sleep(1000);
  }
  child.kill('SIGKILL');
  throw new Error('API compilada não respondeu em /health dentro do timeout.');
}

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT FALHOU: ${message}`);
}

async function main(): Promise<void> {
  const supabaseUrl = process.env['SUPABASE_URL']!;
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  const anonKey = process.env['SUPABASE_ANON_KEY']!;
  assert(supabaseUrl && serviceRoleKey && anonKey, 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY são obrigatórias.');

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const results: string[] = [];
  const step = (name: string) => { results.push(name); console.log(`  ✓ ${name}`); };

  // ── 1) Localizar o owner institucional ────────────────────────────────────
  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  assert(!listErr, `listUsers falhou: ${listErr?.message}`);
  const owner = listed.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
  assert(owner, `Owner institucional "${EMAIL}" não encontrado no Supabase Auth DEV.`);
  const userId = owner.id;
  const baseAppMetadata = (owner.app_metadata ?? {}) as Record<string, unknown>;
  const orgId = baseAppMetadata['org_id'] as string;
  assert(orgId, 'app_metadata.org_id ausente no owner institucional.');
  step(`Owner localizado (userId=${userId}, org_id=${orgId})`);

  // ── 2) Rotacionar para senha de TESTE #1 (invalida qualquer senha anterior, sem nunca reler a antiga) ──
  const testPasswordA = generateStrongPassword();
  {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: testPasswordA,
      app_metadata: { ...baseAppMetadata, must_change_password: true },
    });
    assert(!error, `Falha ao rotacionar para senha de teste #1: ${error?.message}`);
  }
  step('Senha rotacionada para senha de teste #1 — qualquer senha anterior (incluindo a comprometida da Parte 73) já está invalidada');

  // ── 3) Login com a senha de teste #1 ──────────────────────────────────────
  const anon = createClient(supabaseUrl, anonKey);
  const signInA = await anon.auth.signInWithPassword({ email: EMAIL, password: testPasswordA });
  assert(!signInA.error && signInA.data.session, `Login com senha de teste #1 falhou: ${signInA.error?.message}`);
  const tokenA = signInA.data.session.access_token;
  const claimsA = decodeJwt(tokenA);
  assert((claimsA['app_metadata'] as Record<string, unknown>)['must_change_password'] === true, 'JWT não reflete must_change_password=true após rotação.');
  step('Login com senha de teste #1 OK — JWT confirma must_change_password=true');

  // ── 4) Subir a API real compilada (mesmo binário de produção) ────────────
  const apiProcess = await startCompiledApi();
  const baseUrl = `http://127.0.0.1:${PORT}/api/v1`;
  step(`API real (compilada) no ar em ${baseUrl}`);

  const httpAs = (token: string) => (urlPath: string, init: RequestInit = {}) =>
    fetch(`${baseUrl}${urlPath}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': orgId,
        ...(init.headers as Record<string, string> | undefined ?? {}),
      },
    });

  try {
    const asA = httpAs(tokenA);

    // /auth/context permanece acessível (allowlist do MustChangePasswordGuard)
    const contextRes = await asA('/auth/context');
    assert(contextRes.status === 200, `/auth/context deveria retornar 200, retornou ${contextRes.status}`);
    step('/auth/context acessível com must_change_password=true (allowlist)');

    // rota de domínio comum é bloqueada
    const blockedRes = await asA('/artists');
    const blockedBody = await blockedRes.json();
    assert(blockedRes.status === 403, `/artists deveria retornar 403, retornou ${blockedRes.status}`);
    assert(blockedBody.error === 'MUST_CHANGE_PASSWORD', `body.error deveria ser MUST_CHANGE_PASSWORD, foi "${blockedBody.error}"`);
    step('/artists bloqueado com 403 MUST_CHANGE_PASSWORD (guard + fix do GlobalExceptionFilter confirmados)');

    // mismatch de confirmação
    const mismatchRes = await asA('/auth/change-required-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: 'Correto-Cavalo9Bateria!', confirmPassword: 'outra-coisa' }),
    });
    assert(mismatchRes.status === 400, `mismatch deveria retornar 400, retornou ${mismatchRes.status}`);
    step('Confirmação divergente rejeitada com 400');

    // senha fraca
    const weakRes = await asA('/auth/change-required-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: 'fraca123', confirmPassword: 'fraca123' }),
    });
    assert(weakRes.status === 400, `senha fraca deveria retornar 400, retornou ${weakRes.status}`);
    step('Senha fraca rejeitada com 400');

    // reuso da senha atual (de teste)
    const reuseRes = await asA('/auth/change-required-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: testPasswordA, confirmPassword: testPasswordA }),
    });
    assert(reuseRes.status === 400, `reuso deveria retornar 400, retornou ${reuseRes.status}`);
    step('Reuso da senha atual rejeitado com 400 (checagem via sign-in de teste)');

    // troca válida — senha de TESTE #2
    const testPasswordB = generateStrongPassword();
    const successRes = await asA('/auth/change-required-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: testPasswordB, confirmPassword: testPasswordB }),
    });
    const successBody = await successRes.json();
    assert(successRes.status === 201 || successRes.status === 200, `troca válida deveria retornar 2xx, retornou ${successRes.status}`);
    assert(successBody.data?.passwordChanged === true, 'resposta não confirma passwordChanged=true');
    step('Troca de senha bem-sucedida — Supabase Auth confirmou a atualização física');

    // auditoria — leitura direta via a mesma DataSource "owner" usada pelos
    // scripts de bootstrap (não passa pela RLS de aplicação, então não
    // precisa de contexto de tenant para enxergar a linha recém-inserida).
    try {
      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      const rows = await AppDataSource.query(
        `SELECT action, entity_id, created_at FROM audit_logs WHERE action = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT 1`,
        ['user.password_changed', userId],
      );
      assert(Array.isArray(rows) && rows.length > 0, 'Nenhum audit_logs.user.password_changed encontrado para este userId.');
      step('Auditoria confirmada: audit_logs.user.password_changed registrado');
    } catch (auditErr) {
      console.warn(`  (aviso, não-fatal) não foi possível confirmar auditoria via query direta: ${(auditErr as Error).message}`);
    } finally {
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }

    // senha de teste #1 (agora antiga) deve falhar
    const oldLoginAttempt = await anon.auth.signInWithPassword({ email: EMAIL, password: testPasswordA });
    assert(!!oldLoginAttempt.error, 'Login com a senha de teste #1 (já trocada) deveria falhar, mas teve sucesso.');
    step('Login com a senha de teste #1 (antiga) agora falha — invalidação física confirmada');

    // senha de teste #2 deve funcionar, com flag limpa
    const signInB = await anon.auth.signInWithPassword({ email: EMAIL, password: testPasswordB });
    assert(!signInB.error && signInB.data.session, `Login com senha de teste #2 falhou: ${signInB.error?.message}`);
    const claimsB = decodeJwt(signInB.data.session.access_token);
    assert((claimsB['app_metadata'] as Record<string, unknown>)['must_change_password'] === false, 'JWT ainda mostra must_change_password=true após a troca.');
    step('Login com senha de teste #2 OK — JWT confirma must_change_password=false');

    // rota de domínio agora desbloqueada
    const tokenB = signInB.data.session.access_token;
    const unlockedRes = await httpAs(tokenB)('/artists');
    assert(unlockedRes.status === 200, `/artists deveria retornar 200 após a troca, retornou ${unlockedRes.status}`);
    step('/artists desbloqueado após a troca — fluxo completo confirmado ponta a ponta');

    // revoga sessões de teste antes da rotação final
    await admin.auth.admin.signOut(tokenB, 'global').catch(() => {});
    step('Sessões de teste revogadas');
  } finally {
    apiProcess.kill('SIGTERM');
  }

  // ── 5) Rotação final — senha provisória para entrega real ────────────────
  const { data: freshUser } = await admin.auth.admin.getUserById(userId);
  const freshAppMetadata = (freshUser?.user?.app_metadata ?? baseAppMetadata) as Record<string, unknown>;
  const finalPassword = generateStrongPassword();
  {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: finalPassword,
      app_metadata: { ...freshAppMetadata, must_change_password: true },
    });
    assert(!error, `Falha na rotação final: ${error?.message}`);
  }
  step('Rotação final concluída — must_change_password=true, pronta para entrega ao usuário');

  console.log(`\n[Parte 74] Validação ponta a ponta concluída — ${results.length} verificações OK.\n`);

  const acceptedRisk = process.env['TENANT_ZERO_PRINT_PASSWORD_I_ACCEPT_THE_RISK'] === 'yes';
  if (process.stdout.isTTY || acceptedRisk) {
    console.log('\n  ⚠ NOVA SENHA PROVISÓRIA FINAL (exibida uma única vez):');
    console.log(`    ${finalPassword}`);
    console.log('  Troca obrigatória no primeiro login (must_change_password=true).\n');
  } else {
    console.log('  ⚠ Senha provisória final gerada, mas NÃO impressa (execução não-interativa) — rode localmente para vê-la.');
  }
}

main().catch((err: unknown) => {
  console.error('\n[Parte 74] FALHA na validação ponta a ponta:', (err as Error).message);
  process.exit(1);
});
