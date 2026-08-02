/**
 * bootstrap-tenant-zero.cli.ts
 *
 * Entry point de `npm run db:bootstrap:tenant-zero`. Separado de
 * `bootstrap-tenant-zero.ts` de propósito: aquele módulo é puro (só recebe
 * um `DataSource` já pronto) para ser testável em unit tests sem abrir
 * conexão nenhuma; este arquivo é quem importa `./datasource`
 * (que valida env/DATABASE_URL no import — ver datasource.ts:43), fala com
 * a Supabase Admin API quando um owner real é solicitado, e decide quando
 * abrir/fechar a conexão real.
 *
 * Owner real (Parte 73): quando TENANT_ZERO_OWNER_EMAIL está definida,
 * cria (ou localiza, se já existir) um usuário Supabase Auth de verdade
 * para esse e-mail, com uma senha provisória forte e
 * `app_metadata.must_change_password = true`, e passa isso para a função
 * pura em vez do owner sintético. A senha provisória:
 *   - nunca é logada, commitada ou persistida por este script;
 *   - só é impressa em stdout quando rodando interativamente num terminal
 *     local (`process.stdout.isTTY`) — nunca em CI/execução não-interativa,
 *     onde o log seria um artefato persistente e visível a qualquer pessoa
 *     com acesso de leitura ao repositório;
 *   - EXCEÇÃO explícita e opt-in: TENANT_ZERO_PRINT_PASSWORD_I_ACCEPT_THE_RISK=yes
 *     força a impressão mesmo fora de TTY. Existe só para uma execução única
 *     e deliberada onde o operador já decidiu aceitar o risco (equivalente ao
 *     padrão CONFIRM_ROLLBACK=YES_I_KNOW_WHAT_I_AM_DOING de db-ops.ts) — a
 *     senha ainda expira no primeiro login (must_change_password=true), mas
 *     fica visível no log até então. Nunca usar isso como padrão operacional.
 */
import 'reflect-metadata';
import { createClient } from '@supabase/supabase-js';
import { AppDataSource } from './datasource';
import { extractSupabaseRef, SUPABASE_MAIN_REF } from '../core/config/env.schema';
import { bootstrapTenantZero, type RealOwnerInput } from './bootstrap-tenant-zero';
import { generateStrongPassword } from '../core/security/generate-strong-password';
import { normalizeEmail } from '../core/security/normalize-email';

async function resolveRealOwner(rawEmail: string): Promise<{ owner: RealOwnerInput; created: boolean; provisionalPassword: string | null }> {
  const email = normalizeEmail(rawEmail);
  const supabaseUrl = process.env['SUPABASE_URL'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para provisionar um owner real (TENANT_ZERO_OWNER_EMAIL).');
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Não existe getUserByEmail na Admin API — busca na primeira página de
  // listUsers(). Adequado nesta fase (poucos usuários); se isso deixar de
  // ser verdade, paginar aqui.
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) {
    throw new Error(`Falha ao listar usuários Supabase Auth: ${listError.message}`);
  }
  const found = existing.users.find((u) => u.email && normalizeEmail(u.email) === email);
  if (found) {
    return { owner: { authUserId: found.id, email, fullName: null }, created: false, provisionalPassword: null };
  }

  // app_metadata (org_id/role/must_change_password) é setado depois, por
  // applyOwnerAppMetadata() — só depois que o bootstrap relacional tiver
  // sucesso (ver run()), nunca aqui.
  const provisionalPassword = generateStrongPassword();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: provisionalPassword,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`Falha ao criar usuário Supabase Auth para "${email}": ${createError?.message ?? 'resposta vazia'}`);
  }

  return { owner: { authUserId: created.user.id, email, fullName: null }, created: true, provisionalPassword };
}

async function applyOwnerAppMetadata(authUserId: string, orgId: string): Promise<void> {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!supabaseUrl || !serviceRoleKey) return; // já validado em resolveRealOwner; guarda por robustez
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase.auth.admin.updateUserById(authUserId, {
    app_metadata: { org_id: orgId, role: 'owner', must_change_password: true },
  });
  if (error) {
    throw new Error(`Falha ao definir app_metadata do owner real: ${error.message}`);
  }
}

async function run(): Promise<void> {
  const env = process.env['NODE_ENV'] ?? 'development';
  const force = process.argv.includes('--force');
  const ownerEmail = process.env['TENANT_ZERO_OWNER_EMAIL']?.trim();

  if (env === 'production' && !force) {
    console.error(
      '\n[MUSIC OS 360] Bootstrap do tenant-zero em produção requer a flag --force ' +
      'e TENANT_ZERO_OWNER_EMAIL.\n',
    );
    process.exit(1);
  }
  if (env === 'production' && !ownerEmail) {
    console.error('\n[MUSIC OS 360] Em produção, TENANT_ZERO_OWNER_EMAIL é obrigatória.\n');
    process.exit(1);
  }

  const targetRef = extractSupabaseRef(process.env['DATABASE_URL']);
  if (targetRef === SUPABASE_MAIN_REF) {
    console.error(
      '\n[MUSIC OS 360] Recusado: DATABASE_URL aponta para a branch MAIN do Supabase. ' +
      'O bootstrap do tenant-zero nunca pode rodar contra MAIN.\n',
    );
    process.exit(1);
  }

  console.log(`\n[MUSIC OS 360] Bootstrap do tenant-zero — LANDER RECORDS (env=${env}, owner=${ownerEmail ? 'real' : 'sintético'})…`);

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  try {
    let realOwner: RealOwnerInput | null = null;
    let provisionalPassword: string | null = null;
    let ownerCreated = false;

    if (ownerEmail) {
      const resolved = await resolveRealOwner(ownerEmail);
      realOwner = resolved.owner;
      provisionalPassword = resolved.provisionalPassword;
      ownerCreated = resolved.created;
    }

    const result = await bootstrapTenantZero(AppDataSource, realOwner);

    if (realOwner) {
      // app_metadata (org_id/role/must_change_password) é setado depois do
      // bootstrap relacional ter sucesso — nunca deixa um usuário Supabase
      // Auth "meio-configurado" apontando para um tenant que falhou ao ser criado.
      await applyOwnerAppMetadata(realOwner.authUserId, result.orgId);
    }

    console.log(
      result.created
        ? `  ✓ LANDER RECORDS criada — org=${result.orgId} tenant=${result.tenantId}`
        : `  ✓ LANDER RECORDS já existia e foi validada — org=${result.orgId} tenant=${result.tenantId}`,
    );

    if (realOwner) {
      console.log(`  ✓ Owner real: ${realOwner.email} (${ownerCreated ? 'criado agora' : 'já existia, reutilizado'})`);
      if (provisionalPassword) {
        const acceptedRisk = process.env['TENANT_ZERO_PRINT_PASSWORD_I_ACCEPT_THE_RISK'] === 'yes';
        if (process.stdout.isTTY || acceptedRisk) {
          console.log('\n  ⚠ SENHA PROVISÓRIA (exibida uma única vez, não persiste em nenhum lugar):');
          console.log(`    ${provisionalPassword}`);
          console.log('  Troca de senha será exigida no primeiro login.\n');
          if (acceptedRisk && !process.stdout.isTTY) {
            console.log('  ⚠ Impressa em execução não-interativa por TENANT_ZERO_PRINT_PASSWORD_I_ACCEPT_THE_RISK=yes — troque assim que possível.\n');
          }
        } else {
          console.log('  ⚠ Senha provisória gerada, mas NÃO impressa (execução não-interativa/CI) — rode este script localmente para vê-la.');
        }
      }
    }
  } catch (err) {
    console.error('\n[MUSIC OS 360] Erro no bootstrap do tenant-zero:', (err as Error).message);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

run();
