#!/usr/bin/env node
// Real security tooling this dependency-free pack CAN honestly ship, without
// vendoring an external scanner (CodeQL/Semgrep) or a DB/browser client:
//   - scanSecrets: regex-based secret-pattern detection over real file content.
//   - auditDependencies: detect-and-invoke the project's OWN `npm audit`
//     (already installed with npm — not a new dependency) rather than
//     reimplementing a vulnerability database.
//   - generateSBOM: a minimal CycloneDX-lite component list from the lockfile
//     already on disk (package-lock.json) — no dependency needed to read JSON.
// Each function reports { available: false, unavailableReason } explicitly
// when its precondition isn't met (no lockfile, npm not on PATH), rather than
// silently returning an empty, misleadingly-clean result.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { run } from "./lib/exec.mjs";
import { validate } from "./lib/schema-validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "..", "contracts", "security-scan-result.schema.json");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rb", ".go", ".java", ".env", ".yml", ".yaml", ".json", ".md", ""]);

// High-precision patterns only — chosen to minimize false positives (a secret
// scanner nobody trusts because it cries wolf gets ignored, which is worse
// than not having one).
const SECRET_PATTERNS = [
  { name: "AWS Access Key ID", regex: /AKIA[0-9A-Z]{16}/g, severity: "CRITICAL" },
  { name: "GitHub Personal Access Token", regex: /ghp_[A-Za-z0-9]{36}/g, severity: "CRITICAL" },
  { name: "Slack Token", regex: /xox[baprs]-[0-9A-Za-z-]{10,48}/g, severity: "ALTO" },
  { name: "Private Key Block", regex: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g, severity: "CRITICAL" },
  { name: "Generic API key assignment", regex: /(api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, severity: "ALTO" },
];

function listTextFilesManual(root, maxFiles = 3000) {
  const files = [];
  function walk(dir) {
    if (files.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (TEXT_EXTENSIONS.has(extname(entry.name)) || entry.name.startsWith(".env")) files.push(full);
    }
  }
  walk(root);
  return files;
}

/** rg accelerator for the SAME file-selection job as listTextFilesManual —
 * used only when a real `rg` is detected (section 15: accelerator, never
 * authority; absence never blocks anything). `--no-ignore --hidden` is
 * deliberate: rg's default .gitignore-aware mode would SKIP exactly the
 * kind of gitignored .env/secret file this scan exists to catch, which
 * would be a real coverage regression versus the manual walk it replaces —
 * so ignore rules are disabled here, trading rg's usual "respect
 * .gitignore" behavior for equal-or-better security coverage at the speed
 * of a real ripgrep file walk. Falls back to the manual walk on any
 * failure (rg absent, or execution error) rather than ever blocking. */
function listTextFilesViaRg(root, maxFiles = 3000) {
  const result = run("rg", ["--files", "--no-ignore", "--hidden", "--glob", "!node_modules", "--glob", "!.git", root], { timeout: 30_000 });
  if (!result.ok) return listTextFilesManual(root, maxFiles);
  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((f) => TEXT_EXTENSIONS.has(extname(f)) || f.split(/[/\\]/).pop().startsWith(".env"))
    .slice(0, maxFiles);
}

function listTextFiles(root, maxFiles = 3000) {
  const rgAvailable = run(process.platform === "win32" ? "where" : "which", ["rg"]).ok;
  return rgAvailable ? listTextFilesViaRg(root, maxFiles) : listTextFilesManual(root, maxFiles);
}

function envelope(kind, data) {
  const result = { kind, scannedAt: new Date().toISOString(), ...data };
  const check = validate(SCHEMA_PATH, result);
  if (!check.valid) throw new Error(`SCHEMA_VALIDATION_FAILED (security-scan-result): ${check.errors.join("; ")}`);
  return result;
}

export function scanSecrets(root = process.cwd()) {
  const findings = [];
  for (const file of listTextFiles(root)) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(content))) {
        const line = content.slice(0, match.index).split("\n").length;
        const relFile = file.replace(root, "").replace(/^[/\\]/, "").replace(/\\/g, "/");
        findings.push({ file: relFile, line, pattern: pattern.name, severity: pattern.severity });
      }
    }
  }
  return envelope("secret-scan", { available: true, findings });
}

export function auditDependencies(cwd = process.cwd()) {
  if (!existsSync(join(cwd, "package-lock.json")) && !existsSync(join(cwd, "package.json"))) {
    return envelope("dependency-audit", { available: false, unavailableReason: "no package.json/package-lock.json found", findings: [] });
  }
  const npmCheck = run(process.platform === "win32" ? "where" : "which", ["npm"]);
  if (!npmCheck.ok) {
    return envelope("dependency-audit", { available: false, unavailableReason: "npm is not on PATH", findings: [] });
  }
  const result = run("npm", ["audit", "--json"], { cwd, timeout: 120_000, shell: process.platform === "win32" });
  let parsed;
  try {
    parsed = JSON.parse(result.stdout || "{}");
  } catch {
    return envelope("dependency-audit", { available: false, unavailableReason: "npm audit did not return parseable JSON", findings: [] });
  }
  const vulns = parsed.vulnerabilities ? Object.values(parsed.vulnerabilities) : [];
  const findings = vulns.map((v) => {
    const viaEntries = Array.isArray(v.via) ? v.via : [];
    // `via` mixes plain dependency-name strings (transitive path) with rich
    // advisory objects ({source, url, title, cwe, ...}) — keep the names for
    // display but also surface the advisory URL/source id, which is the only
    // thing lib/finding-correlation.mjs can use to correlate this finding
    // with an OSV/CodeQL result reporting the same underlying advisory.
    const advisoryIds = viaEntries.filter((x) => typeof x === "object" && x !== null).map((x) => x.url || (x.source != null ? `npm-advisory:${x.source}` : null)).filter(Boolean);
    return {
      name: v.name,
      severity: v.severity,
      via: viaEntries.filter((x) => typeof x === "string"),
      advisoryIds,
    };
  });
  return envelope("dependency-audit", { available: true, findings });
}

/** Real OSV-Scanner adapter: NOT a replacement for auditDependencies/npm audit
 * (section 18) — both may run and produce independent evidence for the same
 * package, correlated later by lib/finding-correlation.mjs. `executablePath`
 * lets a caller point at a known install when it isn't on PATH (osv-scanner
 * ships via package managers like winget/brew that don't always add it to
 * PATH) without this pack ever hardcoding a machine-specific location itself. */
export function runOSVScan(cwd = process.cwd(), { executablePath = "osv-scanner" } = {}) {
  const check = run(process.platform === "win32" ? "where" : "which", [executablePath], { shell: /\.(cmd|bat)$/i.test(executablePath) });
  const resolvable = check.ok || existsSync(executablePath);
  if (!resolvable) {
    return envelope("osv-scan", { available: false, unavailableReason: `${executablePath} not found`, findings: [] });
  }
  const result = run(executablePath, ["--format", "json", cwd], { cwd, timeout: 120_000, shell: /\.(cmd|bat)$/i.test(executablePath) });
  // osv-scanner exits non-zero when it FOUND vulnerabilities (that's a
  // success case for us, not a tool failure) — only a genuinely unparseable
  // response means real execution failure.
  let parsed;
  try {
    parsed = JSON.parse(result.stdout || "{}");
  } catch {
    return envelope("osv-scan", { available: false, unavailableReason: "osv-scanner did not return parseable JSON", findings: [], raw: result.stdout + result.stderr });
  }
  return envelope("osv-scan", { available: true, findings: parsed.results || [], raw: parsed });
}

export function generateSBOM(cwd = process.cwd()) {
  const lockPath = join(cwd, "package-lock.json");
  if (!existsSync(lockPath)) {
    return envelope("sbom", { available: false, unavailableReason: "no package-lock.json found (pnpm-lock.yaml/yarn.lock are not YAML-parsed by this dependency-free pack)", findings: [] });
  }
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const packages = lock.packages || {};
  const components = Object.entries(packages)
    .filter(([name]) => name && name.startsWith("node_modules/"))
    .map(([name, meta]) => ({ name: name.replace("node_modules/", ""), version: meta.version || "unknown", license: meta.license || null }));
  return envelope("sbom", { available: true, findings: components });
}

function main() {
  const kind = process.argv[2];
  const fns = { "secret-scan": scanSecrets, "dependency-audit": auditDependencies, sbom: generateSBOM, "osv-scan": runOSVScan };
  if (!fns[kind]) {
    console.log(JSON.stringify({ status: "ERROR", message: "USAGE: security-scan.mjs secret-scan|dependency-audit|sbom|osv-scan" }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(fns[kind](), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
