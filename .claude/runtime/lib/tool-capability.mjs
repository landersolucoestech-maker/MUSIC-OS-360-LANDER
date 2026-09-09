// Real, normalized detection for external tools (rg, CodeQL, Graphify,
// OSV-Scanner) and PROJECT_NATIVE toolchains (TypeScript, ESLint) — the
// registry section 14 of the tool-integration mission asked for, distinct
// from .claude/policies/capabilities.json (which is a per-AGENT tool-use
// ceiling, an unrelated concept). Availability is NEVER inferred from an
// adapter/doc/registry entry existing: every result here comes from an
// actual PATH lookup + --version invocation (or, for PROJECT_NATIVE tools,
// actual config-file presence), so "AVAILABLE" always means "an executed
// probe just succeeded," never "should exist."
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./exec.mjs";
import { validate } from "./schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "..", "..", "contracts", "tool-capability.schema.json");
const WHERE_CMD = process.platform === "win32" ? "where" : "which";

function envelope(fields) {
  const result = { detectedAt: new Date().toISOString(), ...fields };
  const check = validate(SCHEMA_PATH, result);
  if (!check.valid) throw new Error(`SCHEMA_VALIDATION_FAILED (tool-capability): ${check.errors.join("; ")}`);
  return result;
}

function expandWindowsEnvVars(value) {
  return value.replace(/%([^%]+)%/g, (_, name) => process.env[name] ?? `%${name}%`);
}

/** On Windows, updating the User/Machine PATH (Environment Variables dialog,
 * winget, an installer) writes straight to the registry but does NOT
 * propagate to any process tree already running — only a NEW process
 * started after the change inherits it. A long-lived session (this one)
 * can end up with a `process.env.PATH` that's stale relative to what the
 * user's own registry-configured PATH actually contains, even though a
 * brand-new shell the user opens sees the update immediately. Reading
 * HKCU/HKLM's Path values directly and merging them in gives detection the
 * same real, current, portable PATH a fresh process would get — no
 * machine-specific directory is ever hardcoded here, only the two standard
 * registry locations Windows itself uses for PATH. */
function effectivePath() {
  if (process.platform !== "win32") return process.env.PATH;
  const registryPaths = [
    ["HKCU\\Environment", "Path"],
    ["HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment", "Path"],
  ];
  const extra = [];
  for (const [key, valueName] of registryPaths) {
    const result = run("reg", ["query", key, "/v", valueName]);
    if (!result.ok) continue;
    const line = result.stdout.split(/\r?\n/).find((l) => l.trim().startsWith(valueName));
    if (!line) continue;
    const match = line.match(/REG_(?:EXPAND_)?SZ\s+(.*)$/);
    if (!match) continue;
    extra.push(...expandWindowsEnvVars(match[1]).split(";").filter(Boolean));
  }
  const current = (process.env.PATH || "").split(";").filter(Boolean);
  const merged = [...current];
  for (const dir of extra) if (!merged.includes(dir)) merged.push(dir);
  return merged.join(";");
}

/** Detects a real, PATH-resolvable external executable and its reported
 * version. Never checks known per-vendor install directories directly — it
 * resolves against the real, current PATH (see effectivePath() above for
 * why that isn't always identical to `process.env.PATH` on Windows), same
 * as any other tool this pack shells out to (npm, git). An explicit `env`
 * override (tests, or a caller with a specific executablePath) always wins. */
export function detectExecutable(name, { versionArgs = ["--version"], versionRegex = /(\d+\.\d+(?:\.\d+)?)/, env } = {}) {
  const lookupEnv = env || { ...process.env, PATH: effectivePath() };
  const where = run(WHERE_CMD, [name], { env: lookupEnv });
  if (!where.ok) {
    return envelope({ name, executable: null, version: null, availability: "NOT_INSTALLED", source: "NONE", executionAllowed: false, reason: `${name} not found on PATH` });
  }
  const executable = where.stdout.split(/\r?\n/)[0].trim();
  // .cmd/.bat shims (like npm/pnpm elsewhere in this codebase) need the OS
  // shell to execute; real .exe binaries (rg.exe, codeql.exe, etc.) don't
  // and are invoked directly, consistent with how this pack always shells
  // out — shell:true only when the resolved executable actually needs it.
  const needsShell = /\.(cmd|bat)$/i.test(executable);
  const versionResult = run(name, versionArgs, { timeout: 20_000, env: lookupEnv, shell: needsShell });
  if (!versionResult.ok) {
    return envelope({ name, executable, version: null, availability: "EXECUTION_FAILED", source: "PATH", executionAllowed: false, reason: versionResult.stderr || "version probe failed" });
  }
  const match = (versionResult.stdout + versionResult.stderr).match(versionRegex);
  return envelope({ name, executable, version: match ? match[1] : null, availability: "AVAILABLE", source: "PATH", executionAllowed: true });
}

export function detectRipgrep() {
  return detectExecutable("rg");
}

export function detectCodeQL() {
  return detectExecutable("codeql", { versionRegex: /release (\d+\.\d+\.\d+)/ });
}

export function detectGraphify() {
  return detectExecutable("graphify");
}

export function detectOSVScanner() {
  return detectExecutable("osv-scanner", { versionRegex: /version:\s*(\d+\.\d+\.\d+)/ });
}

/** PROJECT_NATIVE tools are available only when BOTH the toolchain is
 * installed in the target project AND the project actually configured it
 * (a tsconfig.json / eslint config present) — having the package in
 * node_modules with no config means the project doesn't really use it. */
export function detectTypeScript(cwd = process.cwd()) {
  const tsconfigPath = join(cwd, "tsconfig.json");
  if (!existsSync(tsconfigPath)) {
    return envelope({ name: "typescript", executable: null, version: null, availability: "NOT_APPLICABLE", source: "PROJECT_NATIVE", executionAllowed: false, reason: "no tsconfig.json in target project" });
  }
  const pkgPath = join(cwd, "node_modules", "typescript", "package.json");
  if (!existsSync(pkgPath)) {
    return envelope({ name: "typescript", executable: null, version: null, availability: "NOT_INSTALLED", source: "PROJECT_NATIVE", executionAllowed: false, reason: "tsconfig.json present but typescript is not installed in node_modules" });
  }
  const version = JSON.parse(readFileSync(pkgPath, "utf8")).version;
  const scripts = readScripts(cwd);
  const scriptName = ["typecheck", "type-check"].find((s) => scripts[s]);
  return envelope({
    name: "typescript",
    executable: join(cwd, "node_modules", ".bin", "tsc"),
    version,
    availability: "AVAILABLE",
    source: "PROJECT_NATIVE",
    executionAllowed: true,
    reason: scriptName ? `project script "${scriptName}" available` : "no project typecheck script — falls back to npx tsc --noEmit",
  });
}

export function detectESLint(cwd = process.cwd()) {
  const configCandidates = ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", ".eslintrc.js", ".eslintrc.json", ".eslintrc.cjs", ".eslintrc.yml"];
  const hasConfig = configCandidates.some((f) => existsSync(join(cwd, f)));
  if (!hasConfig) {
    return envelope({ name: "eslint", executable: null, version: null, availability: "NOT_APPLICABLE", source: "PROJECT_NATIVE", executionAllowed: false, reason: "no ESLint config in target project" });
  }
  const pkgPath = join(cwd, "node_modules", "eslint", "package.json");
  if (!existsSync(pkgPath)) {
    return envelope({ name: "eslint", executable: null, version: null, availability: "NOT_INSTALLED", source: "PROJECT_NATIVE", executionAllowed: false, reason: "ESLint config present but eslint is not installed in node_modules" });
  }
  const version = JSON.parse(readFileSync(pkgPath, "utf8")).version;
  const scripts = readScripts(cwd);
  const scriptName = ["lint"].find((s) => scripts[s]);
  return envelope({
    name: "eslint",
    executable: join(cwd, "node_modules", ".bin", "eslint"),
    version,
    availability: "AVAILABLE",
    source: "PROJECT_NATIVE",
    executionAllowed: true,
    reason: scriptName ? `project script "${scriptName}" available` : "no project lint script — falls back to direct eslint invocation",
  });
}

function readScripts(cwd) {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return {};
  try {
    return JSON.parse(readFileSync(pkgPath, "utf8")).scripts || {};
  } catch {
    return {};
  }
}

export function detectAll(cwd = process.cwd()) {
  return {
    rg: detectRipgrep(),
    codeql: detectCodeQL(),
    graphify: detectGraphify(),
    "osv-scanner": detectOSVScanner(),
    typescript: detectTypeScript(cwd),
    eslint: detectESLint(cwd),
  };
}
