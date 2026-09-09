#!/usr/bin/env node
// Orchestrates external security tooling into the EXISTING finding/evidence
// pipeline — it is NOT a scanner, NOT a new evidence engine, NOT a new
// finding engine, NOT a gate (section 21). Its only job:
//
//   detect capabilities -> evaluate security-testing.json policy ->
//   invoke permitted tools -> normalize -> correlate/dedupe ->
//   return canonical findings for the CALLER to record via the existing
//   `ops.mjs finding add` / `evidence review` mechanism.
//
// It deliberately does NOT call ops.mjs itself: doing so would require an
// active mission (requireState) this engine has no business assuming, and
// would make it a second writer of finding/evidence state. security-reviewer
// (or mission-orchestrator) consumes its output and does the actual
// recording — reviewer authority, quorum, and the gate stay exactly where
// they already are.
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { detectAll } from "./lib/tool-capability.mjs";
import { scanSecrets, auditDependencies, runOSVScan } from "./security-scan.mjs";
import { normalizeOSV, normalizeNpmAudit, correlateFindings } from "./lib/finding-correlation.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadPolicy(cwd) {
  const candidates = [join(cwd, ".claude", "policies", "security-testing.json"), join(__dirname, "..", "policies", "security-testing.json")];
  for (const p of candidates) if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  return null;
}

/** Runs every PASSIVE-classified tool that capability detection reports
 * AVAILABLE, skips (with a recorded reason) everything else — a tool
 * classified SAFE_ACTIVE/INTRUSIVE/EXTERNAL_UNAUTHORIZED is NEVER
 * auto-invoked by this engine; that requires the explicit
 * approval-request/authorization flow the policy itself points to. */
export function runSecurityVerification(cwd = process.cwd(), { requiredCapabilities = [] } = {}) {
  const policy = loadPolicy(cwd);
  if (!policy) {
    return { status: "BLOCKED", reason: "security-testing.json policy not found", capabilities: {}, canonicalFindings: [] };
  }
  const capabilities = detectAll(cwd);

  const requiredBlocked = requiredCapabilities.filter((name) => {
    const cap = capabilities[name];
    return !cap || !["AVAILABLE"].includes(cap.availability);
  });
  if (requiredBlocked.length > 0) {
    return { status: "BLOCKED", reason: `required capability unavailable: ${requiredBlocked.join(", ")}`, capabilities, canonicalFindings: [], requiredBlocked };
  }

  const raw = [];
  const invoked = [];
  const skipped = [];

  const secretPolicy = policy.tools["secret-scan"];
  if (secretPolicy?.classification === "PASSIVE") {
    const result = scanSecrets(cwd);
    invoked.push("secret-scan");
    for (const f of result.findings) raw.push({ tool: "secret-scan", fingerprint: `${f.file}:${f.line}:${f.pattern}`, file: f.file, line: f.line, severity: f.severity, summary: `${f.pattern} detected` });
  } else {
    skipped.push({ tool: "secret-scan", reason: `classification ${secretPolicy?.classification} is not auto-invocable` });
  }

  const npmAuditPolicy = policy.tools["npm-audit"];
  if (npmAuditPolicy?.classification === "PASSIVE") {
    const result = auditDependencies(cwd);
    if (result.available) {
      invoked.push("npm-audit");
      raw.push(...normalizeNpmAudit(result));
    } else {
      skipped.push({ tool: "npm-audit", reason: result.unavailableReason });
    }
  } else {
    skipped.push({ tool: "npm-audit", reason: `classification ${npmAuditPolicy?.classification} is not auto-invocable` });
  }

  // osv-scanner's default JSON-output mode is PASSIVE (read-only) but
  // real-world tested (tests/osv-scan.test.mjs) to query the live OSV.dev
  // API for vulnerability data — networkRequired: true in the policy
  // reflects that honestly. It is gated on BOTH classification AND
  // networkAllowed: invoking it while networkAllowed is false would
  // directly contradict the declared policy, so that combination degrades
  // gracefully (skip with a clear reason) rather than BLOCKing — OSV stays
  // OPTIONAL either way, exactly as section 18 requires.
  const osvPolicy = policy.tools["osv-scanner"];
  const osvNetworkOk = !osvPolicy?.networkRequired || policy.networkAllowed;
  if (osvPolicy?.classification === "PASSIVE" && osvNetworkOk && capabilities["osv-scanner"]?.availability === "AVAILABLE") {
    const result = runOSVScan(cwd, { executablePath: capabilities["osv-scanner"].executable });
    if (result.available) {
      invoked.push("osv-scanner");
      raw.push(...normalizeOSV(result.raw));
    } else {
      skipped.push({ tool: "osv-scanner", reason: result.unavailableReason });
    }
  } else if (!osvNetworkOk) {
    skipped.push({ tool: "osv-scanner", reason: "networkRequired but networkAllowed is false in security-testing.json — graceful degradation, OSV stays OPTIONAL" });
  } else {
    skipped.push({ tool: "osv-scanner", reason: capabilities["osv-scanner"]?.availability !== "AVAILABLE" ? capabilities["osv-scanner"]?.reason : `classification ${osvPolicy?.classification} is not auto-invocable` });
  }

  // CodeQL and every Graphify operation except local read-only queries
  // (path/explain/diagnose/merge-graphs — all PASSIVE) require explicit
  // authorization and are never invoked here. A caller with that
  // authorization uses lib/codeql-adapter.mjs / lib/graphify-adapter.mjs
  // directly; graphify-adapter.mjs itself only ever calls the PASSIVE
  // "path" operation, never clone/add/install.
  skipped.push({ tool: "codeql", reason: `classification ${policy.tools.codeql?.classification} requires explicit authorization — not auto-invoked` });
  skipped.push({ tool: "graphify", reason: "only PASSIVE per-operation queries (path/explain/diagnose/merge-graphs) are permitted without authorization, and even those are invoked by the caller via lib/graphify-adapter.mjs directly, not auto-invoked here" });

  const canonicalFindings = correlateFindings(raw);
  return { status: "OK", capabilities, invoked, skipped, canonicalFindings };
}

function main() {
  console.log(JSON.stringify(runSecurityVerification(), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
