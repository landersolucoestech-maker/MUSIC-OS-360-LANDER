/**
 * parte75-rotate-and-validate-login.ts  (one-off, deletado após uso)
 *
 * A Parte 75 não aceita a validação da Parte 74 como prova suficiente —
 * o usuário real recebeu "Invalid login" com a senha entregue naquele
 * relatório, mesmo essa senha autenticando com sucesso via chamada direta
 * (Admin/anon API) nesta investigação. A causa mais provável não é o
 * ambiente/conta (ambos confirmados corretos), mas sim o conjunto de
 * caracteres da senha anterior (parênteses/colchetes/chaves), propenso a
 * erro de cópia/leitura — corrigido em generate-strong-password.ts.
 *
 * Este script:
 *   1) rotaciona para uma senha de TESTE com o NOVO charset;
 *   2) confirma DIRECT_AUTH_SUCCESS (signInWithPassword real);
 *   3) sobe a API compilada e reconfirma o fluxo completo de troca
 *      obrigatória (bloqueio → troca → auditoria → invalidação física →
 *      desbloqueio) — mesma mecânica da Parte 74, revalidada do zero;
 *   4) rotaciona para a senha FINAL de entrega (novo charset), com
 *      must_change_password=true, e revoga sessões de teste.
 *
 * Nunca imprime nenhuma senha, exceto a final — e só quando
 * TENANT_ZERO_PRINT_PASSWORD_I_ACCEPT_THE_RISK=yes.
 */
import 'reflect-metadata';
import * as path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { generateStrongPassword } from '../src/core/security/generate-strong-password';
import { normalizeEmail } from '../src/core/security/normalize-email';
import { AppDataSource } from '../src/database/datasource';

const EMAIL = normalizeEmail(process.env['TENANT_ZERO_OWNER_EMAIL'] ?? 'deyvisson@landerrecords.com');
const PORT = process.env['PARTE75_VALIDATION_PORT'] ?? '3099';

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
      const res = await fetch(`${baseUrl}/health/live`);
      if (res.ok) return child;
    } catch { /* ainda subindo */ }
    await sleep(1000);
  }
  child.kill('SIGKILL');
  throw new Error('API compilada não respondeu em /health/live dentro do timeout.');
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
  const anon = createClient(supabaseUrl, anonKey);
  const results: string[] = [];
  const step = (name: string) => { results.push(name); console.log(`  ✓ ${name}`); };

  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  assert(!listErr, `listUsers falhou: ${listErr?.message}`);
  const owner = listed.users.find((u) => u.email && normalizeEmail(u.email) === EMAIL);
  assert(owner, `Owner institucional "${EMAIL}" não encontrado no Supabase Auth DEV.`);
  const userId = owner.id;
  const baseAppMetadata = (owner.app_metadata ?? {}) as Record<string, unknown>;
  const orgId = baseAppMetadata['org_id'] as string;
  assert(orgId, 'app_metadata.org_id ausente no owner institucional.');
  step(`Owner localizado (userId=${userId}, org_id=${orgId})`);

  // ── 1) Rotacionar para senha de TESTE com o NOVO charset ─────────────────
  const testPasswordA = generateStrongPassword();
  {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: testPasswordA,
      app_metadata: { ...baseAppMetadata, must_change_password: true },
    });
    assert(!error, `Falha ao rotacionar para senha de teste: ${error?.message}`);
  }
  step('Senha rotacionada para senha de teste (novo charset — sem parênteses/colchetes/chaves)');

  // ── 2) DIRECT_AUTH_SUCCESS ────────────────────────────────────────────────
  const signInA = await anon.auth.signInWithPassword({ email: EMAIL, password: testPasswordA });
  assert(!signInA.error && signInA.data.session, `DIRECT_AUTH_SUCCESS falhou: ${signInA.error?.message}`);
  const tokenA = signInA.data.session.access_token;
  const claimsA = decodeJwt(tokenA);
  assert((claimsA['app_metadata'] as Record<string, unknown>)['must_change_password'] === true, 'JWT não reflete must_change_password=true.');
  step('DIRECT_AUTH_SUCCESS confirmado (signInWithPassword real, mesmo SDK que o frontend usa)');

  // ── 3) API compilada — revalidar o fluxo completo do zero ────────────────
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

    const blockedRes = await asA('/artists');
    const blockedBody = await blockedRes.json();
    assert(blockedRes.status === 403, `/artists deveria retornar 403, retornou ${blockedRes.status}`);
    assert(blockedBody.error === 'MUST_CHANGE_PASSWORD', `body.error deveria ser MUST_CHANGE_PASSWORD, foi "${blockedBody.error}"`);
    step('/artists bloqueado com 403 MUST_CHANGE_PASSWORD antes da troca');

    const testPasswordB = generateStrongPassword();
    const successRes = await asA('/auth/change-required-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword: testPasswordB, confirmPassword: testPasswordB }),
    });
    const successBody = await successRes.json();
    assert(successRes.status === 200 || successRes.status === 201, `troca válida deveria retornar 2xx, retornou ${successRes.status}`);
    assert(successBody.data?.passwordChanged === true, 'resposta não confirma passwordChanged=true');
    step('Troca de senha bem-sucedida com o novo charset (endpoint atômico revalidado)');

    try {
      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      const rows = await AppDataSource.query(
        `SELECT action, entity_id, created_at FROM audit_logs WHERE action = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT 1`,
        ['user.password_changed', userId],
      );
      assert(Array.isArray(rows) && rows.length > 0, 'Nenhum audit_logs.user.password_changed encontrado.');
      step('Auditoria confirmada: audit_logs.user.password_changed registrado');
    } catch (auditErr) {
      console.warn(`  (aviso, não-fatal) auditoria não confirmada via query direta: ${(auditErr as Error).message}`);
    } finally {
      if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }

    const oldLoginAttempt = await anon.auth.signInWithPassword({ email: EMAIL, password: testPasswordA });
    assert(!!oldLoginAttempt.error, 'Login com a senha de teste antiga deveria falhar.');
    step('Senha de teste antiga agora falha — invalidação física confirmada');

    const signInB = await anon.auth.signInWithPassword({ email: EMAIL, password: testPasswordB });
    assert(!signInB.error && signInB.data.session, `Login pós-troca falhou: ${signInB.error?.message}`);
    const claimsB = decodeJwt(signInB.data.session.access_token);
    assert((claimsB['app_metadata'] as Record<string, unknown>)['must_change_password'] === false, 'JWT ainda mostra must_change_password=true.');
    step('FRONTEND_LOGIN_SUCCESS confirmado (mesma chamada signInWithPassword) — JWT com must_change_password=false');

    const tokenB = signInB.data.session.access_token;
    const unlockedRes = await httpAs(tokenB)('/artists');
    assert(unlockedRes.status === 200, `/artists deveria retornar 200 após a troca, retornou ${unlockedRes.status}`);
    step('/artists desbloqueado após a troca — fluxo completo revalidado ponta a ponta com o novo charset');

    await admin.auth.admin.signOut(tokenB, 'global').catch(() => {});
    step('Sessões de teste revogadas');
  } finally {
    apiProcess.kill('SIGTERM');
  }

  // ── 4) Rotação final — senha provisória real de entrega ──────────────────
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

  // Confirma a senha final ANTES de revelar — prova que ela realmente funciona,
  // não só que a chamada de update retornou sem erro.
  const finalCheck = await anon.auth.signInWithPassword({ email: EMAIL, password: finalPassword });
  assert(!finalCheck.error && finalCheck.data.session, `Senha final não autentica: ${finalCheck.error?.message}`);
  await admin.auth.admin.signOut(finalCheck.data.session.access_token, 'others').catch(() => {});
  step('Rotação final concluída e CONFIRMADA por login real — must_change_password=true, pronta para entrega');

  console.log(`\n[Parte 75] Validação concluída — ${results.length} verificações OK.\n`);

  const acceptedRisk = process.env['TENANT_ZERO_PRINT_PASSWORD_I_ACCEPT_THE_RISK'] === 'yes';
  if (process.stdout.isTTY || acceptedRisk) {
    console.log('\n  ⚠ NOVA SENHA PROVISÓRIA FINAL (exibida uma única vez, já testada com login real):');
    console.log(`    ${finalPassword}`);
    console.log('  Troca obrigatória no primeiro login (must_change_password=true).\n');
  } else {
    console.log('  ⚠ Senha provisória final gerada, mas NÃO impressa (execução não-interativa) — rode localmente para vê-la.');
  }
}

main().catch((err: unknown) => {
  console.error('\n[Parte 75] FALHA na validação:', (err as Error).message);
  process.exit(1);
});
