import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { git, isGitRepo } from "./exec.mjs";

export function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function sha256File(path) {
  if (!existsSync(path)) return null;
  return sha256(readFileSync(path, "utf8"));
}

/**
 * Workspace fingerprint: identity of the exact tree state evidence is bound to.
 * Combines HEAD commit + a hash of the full working-tree status/diff so that
 * both committed and uncommitted changes invalidate stale evidence.
 */
// .claude/ops holds the tool's own mutable bookkeeping (state.json, memory.json,
// evidence). Including it in the fingerprint would make every evidence write
// change the fingerprint it just recorded — exclude it so the fingerprint
// reflects the workspace under audit, not the audit trail itself.
const EXCLUDE_PATHSPEC = ":(exclude).claude/ops";

export function workspaceFingerprint(cwd = process.cwd()) {
  if (!isGitRepo(cwd)) {
    return { ok: false, reason: "NOT_A_GIT_REPO" };
  }
  const head = git(["rev-parse", "HEAD"], cwd);
  const status = git(["status", "--porcelain=v1", "--", ".", EXCLUDE_PATHSPEC], cwd);
  const diff = git(["diff", "HEAD", "--", ".", EXCLUDE_PATHSPEC], cwd);
  if (!head.ok) {
    // No commits yet (fresh repo) — fingerprint from status+diff only.
    const material = `NO_HEAD\n${status.stdout}\n${diff.stdout}`;
    return { ok: true, fingerprint: sha256(material), head: null };
  }
  const material = `${head.stdout}\n${status.stdout}\n${diff.stdout}`;
  return { ok: true, fingerprint: sha256(material), head: head.stdout };
}
