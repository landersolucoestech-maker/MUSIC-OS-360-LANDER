import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAuditAdvisories, loadWaivers, evaluate } from './verify-production-audit.mjs';

// All fixtures below are synthetic — no real advisory IDs, no network access.
const NOW = new Date('2026-08-01T00:00:00Z');

function auditWith(advisories) {
  const obj = {};
  for (const a of advisories) {
    obj[String(a.advisoryId)] = { id: a.advisoryId, module_name: a.package, severity: a.severity, title: a.title ?? 'synthetic' };
  }
  return JSON.stringify({ advisories: obj });
}

function waiverFileWith(waivers) {
  return JSON.stringify({
    waivers: waivers.map((w) => ({
      advisoryId: w.advisoryId,
      package: w.package,
      severity: w.severity ?? 'moderate',
      reason: w.reason ?? 'synthetic reason',
      owner: w.owner ?? 'test@example.com',
      introduced: w.introduced ?? '2026-01-01',
      reviewBy: w.reviewBy ?? '2099-01-01',
      closeCondition: w.closeCondition ?? 'synthetic close condition',
    })),
  });
}

test('baseline exatamente permitido -> PASS (0 unauthorized)', () => {
  const advisories = loadAuditAdvisories(auditWith([{ advisoryId: 1, package: 'foo', severity: 'moderate' }]));
  const waivers = loadWaivers(waiverFileWith([{ advisoryId: 1, package: 'foo' }]));
  const { accepted, unauthorized, orphaned } = evaluate(advisories, waivers, NOW);
  assert.equal(accepted.length, 1);
  assert.equal(unauthorized.length, 0);
  assert.equal(orphaned.length, 0);
});

test('advisory novo sem waiver -> FAIL', () => {
  const advisories = loadAuditAdvisories(auditWith([{ advisoryId: 2, package: 'bar', severity: 'moderate' }]));
  const waivers = loadWaivers(waiverFileWith([]));
  const { unauthorized } = evaluate(advisories, waivers, NOW);
  assert.equal(unauthorized.length, 1);
  assert.match(unauthorized[0].cause, /sem waiver/);
});

test('advisory HIGH novo sem waiver -> FAIL (severidade não isenta de waiver)', () => {
  const advisories = loadAuditAdvisories(auditWith([{ advisoryId: 3, package: 'baz', severity: 'high' }]));
  const waivers = loadWaivers(waiverFileWith([]));
  const { unauthorized } = evaluate(advisories, waivers, NOW);
  assert.equal(unauthorized.length, 1);
  assert.equal(unauthorized[0].severity, 'high');
});

test('waiver expirado -> FAIL', () => {
  const advisories = loadAuditAdvisories(auditWith([{ advisoryId: 4, package: 'qux', severity: 'moderate' }]));
  const waivers = loadWaivers(waiverFileWith([{ advisoryId: 4, package: 'qux', reviewBy: '2025-01-01' }]));
  const { unauthorized } = evaluate(advisories, waivers, NOW);
  assert.equal(unauthorized.length, 1);
  assert.match(unauthorized[0].cause, /expirado/);
});

test('waiver com package errado -> FAIL', () => {
  const advisories = loadAuditAdvisories(auditWith([{ advisoryId: 5, package: 'real-pkg', severity: 'moderate' }]));
  const waivers = loadWaivers(waiverFileWith([{ advisoryId: 5, package: 'different-pkg' }]));
  const { unauthorized } = evaluate(advisories, waivers, NOW);
  assert.equal(unauthorized.length, 1);
  assert.match(unauthorized[0].cause, /outro pacote/);
});

test('advisory resolvido mas waiver sobrando -> reportado como órfão, não falha o build', () => {
  const advisories = loadAuditAdvisories(auditWith([]));
  const waivers = loadWaivers(waiverFileWith([{ advisoryId: 6, package: 'fixed-pkg' }]));
  const { unauthorized, orphaned } = evaluate(advisories, waivers, NOW);
  assert.equal(unauthorized.length, 0);
  assert.equal(orphaned.length, 1);
  assert.equal(orphaned[0].advisoryId, 6);
});

test('JSON inválido no audit -> lança erro (falha o processo)', () => {
  assert.throws(() => loadAuditAdvisories('{ not valid json'), /não é JSON válido/);
});

test('JSON inválido no arquivo de waivers -> lança erro (falha o processo)', () => {
  assert.throws(() => loadWaivers('{ not valid json'), /não é JSON válido/);
});

test('waiver sem campo obrigatório -> lança erro', () => {
  const bad = JSON.stringify({ waivers: [{ advisoryId: 7, package: 'x' }] });
  assert.throws(() => loadWaivers(bad), /campo obrigatório/);
});

test('pnpm audit sem saída utilizável (ex.: processo falhou) -> tratado como entrada inválida', () => {
  assert.throws(() => loadAuditAdvisories(''), /não é JSON válido/);
});

test('múltiplos advisories mistos: aceitos + não autorizados são reportados separadamente', () => {
  const advisories = loadAuditAdvisories(
    auditWith([
      { advisoryId: 8, package: 'ok-pkg', severity: 'moderate' },
      { advisoryId: 9, package: 'bad-pkg', severity: 'high' },
    ]),
  );
  const waivers = loadWaivers(waiverFileWith([{ advisoryId: 8, package: 'ok-pkg' }]));
  const { accepted, unauthorized } = evaluate(advisories, waivers, NOW);
  assert.equal(accepted.length, 1);
  assert.equal(unauthorized.length, 1);
  assert.equal(unauthorized[0].advisoryId, 9);
});
