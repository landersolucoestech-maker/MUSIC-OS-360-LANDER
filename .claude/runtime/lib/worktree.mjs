// Git worktree isolation for concurrent writers — a real, dependency-free git
// feature (no vendoring needed) implementing .claude/rules/agent-orchestration.md's
// "Parallel writers require disjoint ownership or isolated worktrees." When two
// implementer batches must run concurrently on genuinely overlapping paths (not
// just disjoint ones ownership.json can already separate), each gets its own
// worktree — a real, separate working directory sharing the same .git history —
// so neither can corrupt the other's uncommitted changes.
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { run } from "./exec.mjs";

export function worktreesDir(repoRoot) {
  return join(repoRoot, ".claude", "ops", "worktrees");
}

/** Creates a new worktree at .claude/ops/worktrees/<name> on a new branch
 * <branchPrefix>/<name> off the current HEAD. Fails loudly (returns ok:false)
 * rather than silently if the name is already in use or git itself fails —
 * never guesses a fallback path. */
export function createWorktree(repoRoot, name, { branchPrefix = "eos-worktree" } = {}) {
  const dir = join(worktreesDir(repoRoot), name);
  if (existsSync(dir)) return { ok: false, reason: "WORKTREE_ALREADY_EXISTS", dir };
  mkdirSync(worktreesDir(repoRoot), { recursive: true });
  const branch = `${branchPrefix}/${name}`;
  const result = run("git", ["worktree", "add", "-b", branch, dir], { cwd: repoRoot });
  if (!result.ok) return { ok: false, reason: "GIT_WORKTREE_ADD_FAILED", detail: result.stderr, dir };
  return { ok: true, dir, branch };
}

export function listWorktrees(repoRoot) {
  const result = run("git", ["worktree", "list", "--porcelain"], { cwd: repoRoot });
  if (!result.ok) return [];
  const entries = [];
  let current = {};
  for (const line of result.stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current.path) entries.push(current);
      current = { path: line.slice("worktree ".length) };
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length);
    }
  }
  if (current.path) entries.push(current);
  return entries;
}

/** Removes a worktree created by createWorktree. `force` is required to remove
 * one with uncommitted changes — refusing by default mirrors git's own safety
 * behavior rather than silently discarding in-progress work. */
export function removeWorktree(repoRoot, name, { force = false } = {}) {
  const dir = join(worktreesDir(repoRoot), name);
  if (!existsSync(dir)) return { ok: false, reason: "WORKTREE_NOT_FOUND", dir };
  const args = ["worktree", "remove", dir];
  if (force) args.push("--force");
  const result = run("git", args, { cwd: repoRoot });
  if (!result.ok) return { ok: false, reason: "GIT_WORKTREE_REMOVE_FAILED", detail: result.stderr, dir };
  return { ok: true, dir };
}
