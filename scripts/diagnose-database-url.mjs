#!/usr/bin/env node
/**
 * scripts/diagnose-database-url.mjs
 *
 * TEMPORARY diagnostic for a live "password authentication failed" issue on
 * DB Verify — Supabase DEV, where the password has been independently
 * confirmed correct. Prints only sanitized connection metadata — never the
 * password itself, never a single character of it — to find non-password
 * causes: wrong username format for the connection mode, mixed
 * pooler/direct host+port, or corruption (quotes, trailing newline)
 * introduced when the secret was set.
 *
 * Usage:
 *   node scripts/diagnose-database-url.mjs        (reads process.env.DATABASE_URL)
 */
const raw = process.env['DATABASE_URL'];

function report(label, value) {
  console.log(`  ${label}: ${value}`);
}

console.log('=== DATABASE_URL sanitized diagnostic ===');
report('valor presente (env var set)', raw !== undefined ? 'sim' : 'não');

if (raw === undefined) {
  console.log('Nada mais a diagnosticar — variável de ambiente ausente.');
  process.exit(0);
}

report('tamanho total da string (chars)', raw.length);
report('começa com aspas (\' ou ")', /^['"]/.test(raw) ? 'sim' : 'não');
report('termina com aspas (\' ou ")', /['"]$/.test(raw) ? 'sim' : 'não');
report('contém newline (\\n) em qualquer posição', raw.includes('\n') ? 'sim' : 'não');
report('contém carriage return (\\r)', raw.includes('\r') ? 'sim' : 'não');
report('termina com newline/espaço (antes de qualquer trim)', /[\s\n\r]$/.test(raw) ? 'sim' : 'não');
report('começa com espaço/newline', /^[\s\n\r]/.test(raw) ? 'sim' : 'não');

let url;
try {
  // new URL() tolerates a trailing newline/space by throwing — that itself is signal.
  url = new URL(raw.trim());
  report('URL parseou (após trim)', 'sim');
} catch (err) {
  report('URL parseou (após trim)', `não — ${err.message}`);
  process.exit(0);
}

report('protocol', url.protocol);
report('host completo', url.hostname);
report('porta', url.port || '(default)');
report('username', url.username || '(vazio)');
report('password presente', url.password ? 'sim' : 'não');
report('tamanho da senha (chars)', url.password ? url.password.length : 0);
report('senha contém caracteres percent-encoded (%XX)', url.password?.includes('%') ? 'sim' : 'não');
report('database (pathname)', url.pathname.replace(/^\//, '') || '(vazio)');

const isPoolerHost = /pooler\.supabase\.com$/i.test(url.hostname);
const isDirectHost = /^db\.[a-z0-9]{18,22}\.supabase\.co$/i.test(url.hostname);
report('host é formato pooler (Supavisor)', isPoolerHost ? 'sim' : 'não');
report('host é formato conexão direta', isDirectHost ? 'sim' : 'não');

const usernameHasRefSuffix = /^[a-z0-9_]+\.[a-z0-9]{18,22}$/i.test(url.username);
report('username tem formato "role.ref" (esperado em pooler)', usernameHasRefSuffix ? 'sim' : 'não');

if (isPoolerHost && !usernameHasRefSuffix) {
  console.log('  ⚠  DIAGNÓSTICO: host é pooler (Supavisor) mas o username não tem o sufixo ".{project_ref}" — classificação A (username incompatível com o pooler). Supabase rejeita isso como "password authentication failed", mesmo com senha correta.');
} else if (isDirectHost && url.port && url.port !== '5432') {
  console.log(`  ⚠  DIAGNÓSTICO: host é conexão direta mas a porta é ${url.port} (esperado 5432) — classificação B (host/porta misturados).`);
} else if (isDirectHost && url.username !== 'postgres') {
  console.log(`  ⚠  DIAGNÓSTICO: host é conexão direta mas o username é "${url.username}" (esperado "postgres") — possível classificação A/B.`);
} else if (isDirectHost && url.username === 'postgres' && (!url.port || url.port === '5432')) {
  console.log('  ℹ  Host, porta e username são consistentes com uma conexão direta corretamente formada. Se a autenticação ainda falhar com esses metadados corretos, a causa provável é G/H (algo no ambiente do runner ou a senha em si) — não A-C.');
}
