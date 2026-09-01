# Governance OS Stability Diagnostic

Status: **ROOT CAUSE CONFIRMED, FIX DRAFTED, BLOCKED_BY_PERMISSION** (not applied — see "Why this wasn't applied").

## Identity (evidence, read-only)

- repository_root: `C:/Users/Usuario/Documents/MUSIC-OS-360`
- git_root: same (`.git` present)
- branch: `dev`, HEAD at time of audit: `590d3c9b878850f0bbafe012edff6ed8efb3ed6b`
- remotes: `origin` → `github.com/landersolucoestech-maker/MUSIC-OS-360.git`; `gitsafe-backup` → `git://gitsafe:5418/backup.git` (unusual custom remote — not investigated further, out of scope for this diagnostic)
- `package.json` name: `music-os-360-monorepo` — consistent with expected identity, no cross-project contamination found.

## What already exists

`.claude/` already contains a full "Engineering OS v2" pack: 31 agents, 30+ skills, 21 rules, 30 contract
schemas, 6 workflows, 7 policies, and a runtime engine (`impact.mjs`, `completion-gate.mjs`, `gate-engine.mjs`,
`hooks.mjs`, `memory.mjs`, `manifest.mjs`, `ops.mjs`, `self-test.mjs`, `validate-pack.mjs`, `journal-verify.mjs`,
`doctor.mjs`). A near-identical prior prompt (`prompt.txt.txt`, repo root) already drove a previous session to build
and activate this exact system.

## Root cause chain (each step reproduced with evidence, not inferred)

1. `PACK-MANIFEST.json` was built `2026-08-26T18:20:42.498Z` with **191 files, zero `node_modules` entries**
   (`grep -c node_modules PACK-MANIFEST.json` → 0; `composition.filesExcludingManifest` → 191).
2. `.claude/runtime/manifest.mjs` (`excluded()`, line 8) and `.claude/runtime/validate-pack.mjs` (`walk()`, line 17)
   both recursively walk `root` (the whole repo), excluding only `.claude/ops/` (+ `.git` in manifest.mjs only).
   Neither excludes `node_modules`, `dist`, `.turbo`, `coverage`, `test-results`, or the `.claude/ops-corrupt-*` /
   `.claude/ops-backup-*` / `.claude/ops-forensic-*` incident-snapshot directories.
3. `node_modules` currently has **144,454 files** (`find node_modules -type f | wc -l`). `validate-pack.mjs` additionally
   `readFileSync`s the full content of every file it finds (line 34, semantic link-check scan) — i.e. it attempts to
   read the entire dependency tree synchronously.
4. Reproduced live: `node .claude/runtime/doctor.mjs` (which shells out to `validate-pack.mjs`) did not complete in
   120s and produced **zero stdout** — a silent hang, not a slow-but-working pass.
5. `.claude\install.ps1` line 9 runs `validate-pack.mjs` as its first mandatory gate before anything else — so the
   sanctioned installer is currently broken by the same defect. Reinstalling would not fix this.
6. This matches the incident history in `.claude/`: `ops-backup-20260828-232132/`, `ops-corrupt-20260828-232244/`,
   `ops-corrupt-20260829-014207/`, `ops-corrupt-state-journal-20260829-091525/`, `ops-forensic-20260830-003625/`,
   root-level `repair-state-journal.ps1` with hardcoded `EXPECTED_STATE_REVISION = 2720` vs
   `EXPECTED_JOURNAL_REVISION = 2719`. A multi-minute-plus synchronous scan holding the control-plane lock
   (`.claude/ops/runtime/control-plane.lock`, 8s–120s timeout/staleness window in `lib/core.mjs`) is a direct
   mechanism for producing exactly this kind of state/journal desync if interrupted or timed out mid-run.
7. Independent, secondary defect: `compat.mjs#readClaudeCodeVersion()` and `doctor.mjs#cmd()` call `execFileSync`
   with **no `timeout` option**. If the child process hangs (as reproduced above — `execFileSync('claude', ['--version'])`
   never returned), the parent hangs forever with no error, no log, nothing catchable. This is a second, independent
   source of exactly the "silent infinite loop" failure mode the governance system is meant to prevent.
8. `.claude/` is entirely `.gitignore`d (`.gitignore:22`). The governance system has no real version history of its
   own — which is why past incidents required manual `ops-corrupt-*`/`ops-forensic-*` folder copies and a bespoke
   PowerShell repair script instead of `git checkout`/`git revert`.

Other runtime scripts that also walk `.claude/` recursively (`hooks.mjs#listControlFiles`, `ops.mjs`, `registry.mjs`)
were checked and are **not** affected — they scope their walk to `path.join(root, '.claude')` only, not the repo root.
The defect is isolated to exactly `manifest.mjs` and `validate-pack.mjs`.

## Fix (drafted, verified against current file contents, not yet applied)

### 1. `.claude/runtime/lib/core.mjs` — add shared exclusion helper, after `isOpsPath`:

```js
export function isOpsPath(p) {
  const r = safeRel(p);
  return r === '.claude/ops' || r?.startsWith('.claude/ops/');
}
// Directories that must never be walked/hashed by pack tooling (manifest.mjs, validate-pack.mjs):
// node_modules alone holds 140k+ files in this monorepo, so a missing exclusion here does not just
// produce noise, it makes the scan effectively hang. Segment match (not just top-level) because pnpm
// workspaces nest node_modules/dist/coverage under apps/*/ and packages/*/ too.
const PACK_EXCLUDED_SEGMENTS = new Set([
  'node_modules', '.git', 'dist', 'build', 'test-results', 'playwright-report',
  '.local', '.turbo', '.vercel', '.vscode', '.idea', 'coverage', '.vitest-cache',
  'backups', '.validation-shots', '.secrets'
]);
export function isPackExcluded(p) {
  const r = safeRel(p);
  if (!r) return true;
  if (isOpsPath(r) || /^\.claude\/ops-/.test(r)) return true; // ops/, ops-corrupt-*, ops-backup-*, ops-forensic-*
  if (r === '.claude/settings.local.json') return true;
  if (r.endsWith('.tsbuildinfo')) return true;
  return r.split('/').some(seg => PACK_EXCLUDED_SEGMENTS.has(seg));
}
```

### 2. `.claude/runtime/manifest.mjs` — reuse it:

```diff
-import { root } from './lib/core.mjs';
+import { root, isPackExcluded } from './lib/core.mjs';
@@
-const excluded = p => p === 'PACK-MANIFEST.json' || p === '.claude/ops' || p.startsWith('.claude/ops/') || p === '.git' || p.startsWith('.git/');
+const excluded = p => p === 'PACK-MANIFEST.json' || isPackExcluded(p);
```

### 3. `.claude/runtime/validate-pack.mjs` — reuse it too:

```diff
 import fs from 'node:fs';
 import path from 'node:path';
 import { fileURLToPath } from 'node:url';
 import { execFileSync } from 'node:child_process';
 import crypto from 'node:crypto';
+import { isPackExcluded } from './lib/core.mjs';
@@
-function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name),r=rel(p);if(r.startsWith('.claude/ops/'))continue;if(e.isDirectory())walk(p);else if(e.isFile())allFiles.push(p);else if(e.isSymbolicLink()){let target;try{target=fs.realpathSync(p)}catch(err){errors.push(`${r} is a broken symlink: ${err.message}`);continue}const rr=path.relative(root,target);if(rr==='..'||rr.startsWith(`..${path.sep}`)||path.isAbsolute(rr))errors.push(`${r} symlink escapes pack root`);allFiles.push(p)}}}
+function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name),r=rel(p);if(isPackExcluded(p))continue;if(e.isDirectory())walk(p);else if(e.isFile())allFiles.push(p);else if(e.isSymbolicLink()){let target;try{target=fs.realpathSync(p)}catch(err){errors.push(`${r} is a broken symlink: ${err.message}`);continue}const rr=path.relative(root,target);if(rr==='..'||rr.startsWith(`..${path.sep}`)||path.isAbsolute(rr))errors.push(`${r} symlink escapes pack root`);allFiles.push(p)}}}
```

### 4. `.claude/runtime/compat.mjs` — timeout guard on the confirmed-hanging call:

```diff
-    const output = execFileSync(binary, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
+    const output = execFileSync(binary, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000 }).trim();
```

### 5. `.claude/runtime/doctor.mjs` — timeout guard on both subprocess call sites:

```diff
-function cmd(bin,args=['--version']){try{return execFileSync(bin,args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{return null}}
+function cmd(bin,args=['--version']){try{return execFileSync(bin,args,{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:5000}).trim()}catch{return null}}
@@
-try{const out=execFileSync(process.execPath,[path.join(root,'.claude','runtime','validate-pack.mjs')],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();add('Pack semantics',true,out)}catch(e){add('Pack semantics',false,String(e.stderr||e.message).slice(0,1000))}
+try{const out=execFileSync(process.execPath,[path.join(root,'.claude','runtime','validate-pack.mjs')],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:20000}).trim();add('Pack semantics',true,out)}catch(e){add('Pack semantics',false,String(e.stderr||e.message).slice(0,1000))}
```

## Validation plan (once applied)

1. `node .claude/runtime/manifest.mjs --write` should complete in low single-digit seconds and produce a
   `PACK-MANIFEST.json` with `filesExcludingManifest` in the low hundreds (matching the actual `.claude/` pack
   size), not tens of thousands.
2. `node .claude/runtime/validate-pack.mjs` should complete quickly and exit 0 (or report real semantic
   findings — not hang).
3. `node .claude/runtime/doctor.mjs` should complete and print PASS/FAIL rows instead of hanging silently.
4. `node .claude/runtime/journal-verify.mjs` should still report `pass:true` on the existing journal (this fix
   does not touch journal/state logic, only the pack-scan scope).

## Why this wasn't applied

`.claude/runtime/hooks.mjs`'s `pre-file` handler unconditionally denies any `Edit`/`Write` tool call targeting
`CLAUDE.md` or any path under `.claude/` (`controlPlane = rel === 'CLAUDE.md' || rel === '.claude' || rel?.startsWith('.claude/')`,
line 194–195) — no policy check, no override flag, hard deny, by design, specifically to prevent an agent from
mutating its own control plane mid-session. There is no equivalent "maintenance mode" flag implemented anywhere
in the current `hooks.mjs`. The only way to change these files is a write path that does not go through this
project's Edit/Write PreToolUse hook at all — which was intentionally not attempted here, since routing a control-plane
edit through a different tool (e.g. shell redirection) specifically to defeat this guard is a permission bypass in
substance regardless of which tool executes it, and that line was held even under direct instruction to cross it.

This file (outside `.claude/`) is the durable, actionable record of that fix so it isn't lost.
