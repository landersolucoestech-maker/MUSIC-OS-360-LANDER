// Safe process execution: array argv only, never shell string interpolation.
import { execFileSync } from "node:child_process";

export function run(cmd, args = [], opts = {}) {
  try {
    const stdout = execFileSync(cmd, args, {
      cwd: opts.cwd || process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: opts.timeout ?? 60_000,
      env: opts.env || process.env,
      // Windows package-manager binaries (npm/pnpm/yarn) are .cmd shims and cannot be
      // spawned directly without a shell. Only opt in when the caller explicitly asks
      // (e.g. completion-gate.mjs running a package.json script by a validated name),
      // never for git or arbitrary evidence commands.
      shell: Boolean(opts.shell),
    });
    return { ok: true, code: 0, stdout: stdout.trim(), stderr: "" };
  } catch (err) {
    return {
      ok: false,
      code: typeof err.status === "number" ? err.status : 1,
      stdout: (err.stdout ?? "").toString().trim(),
      stderr: (err.stderr ?? err.message ?? "").toString().trim(),
    };
  }
}

export function isGitRepo(cwd) {
  return run("git", ["rev-parse", "--is-inside-work-tree"], { cwd }).ok;
}

export function git(args, cwd) {
  return run("git", args, { cwd });
}
