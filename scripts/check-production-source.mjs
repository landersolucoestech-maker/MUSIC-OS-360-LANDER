#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const violations = [];

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

const planFeatures = read('apps/web/src/shared/hooks/usePlanFeatures.ts');
if (/bypassBilling\s*=\s*true\b/.test(planFeatures)) {
  violations.push('billing bypass is permanently enabled');
}

const storage = read('apps/web/src/shared/lib/storage.ts');
if (/if\s*\(\s*IS_PROD\s*\)\s*return\s*\[\]/.test(storage)) {
  violations.push('pending backend tables are silently converted to empty production data');
}

const marketing = read('apps/web/src/modules/marketing/services/marketing.service.ts');
if (
  marketing.includes('../data/marketing-mock') ||
  marketing.includes('new Repository<Marketing')
) {
  violations.push('Marketing production service still depends on in-memory mock repositories');
}

const assetsDir = resolve(root, 'dist/assets');
for (const file of readdirSync(assetsDir, { withFileTypes: true })) {
  if (file.isFile() && /\.mock[-.]/i.test(file.name)) {
    violations.push(`production bundle contains mock chunk: ${file.name}`);
  }
}

if (violations.length) {
  console.error('[production-source] FAIL');
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log('[production-source] PASS');
