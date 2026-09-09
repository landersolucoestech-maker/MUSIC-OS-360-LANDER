// Normalizes raw external-tool output (OSV-Scanner JSON, CodeQL SARIF) into
// the same shape security-scan.mjs already produces for secrets/npm-audit,
// then correlates/deduplicates by fingerprint so N tools detecting the SAME
// underlying problem collapse into ONE canonical finding with multiple
// sources — per section 22/23 of the tool-integration mission. Reuses
// finding-record.schema.json's new optional `fingerprint`/`sources` fields
// (see that file) rather than inventing a parallel finding taxonomy.
const SEVERITY_RANK = { CRITICAL: 5, CRITICO: 5, HIGH: 4, ALTO: 4, MEDIUM: 3, MEDIO: 3, LOW: 2, BAIXO: 2, INFO: 1, INFORMATIVO: 1 };

function higherSeverity(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (SEVERITY_RANK[a.toUpperCase()] || 0) >= (SEVERITY_RANK[b.toUpperCase()] || 0) ? a : b;
}

/** OSV-Scanner --json output -> normalized raw results. Real shape: a
 * top-level `results[]`, each with `source.path` and `packages[]`, each
 * package having `vulnerabilities[]` (id, severity[], summary) and
 * `package.{name,version}`. */
export function normalizeOSV(osvJson) {
  const out = [];
  for (const result of osvJson.results || []) {
    for (const pkg of result.packages || []) {
      for (const vuln of pkg.vulnerabilities || []) {
        const severityEntry = (vuln.severity || [])[0];
        out.push({
          tool: "osv-scanner",
          toolVersion: osvJson.osvScannerVersion || null,
          fingerprint: vuln.id || `pkg:${pkg.package?.name}`,
          package: pkg.package?.name || null,
          installedVersion: pkg.package?.version || null,
          vulnerabilityId: vuln.id || null,
          severity: severityEntry?.score || null,
          affectedRange: (vuln.affected || []).map((a) => a.ranges).flat(),
          fixedVersion: null,
          file: result.source?.path || null,
          summary: vuln.summary || vuln.id || "OSV finding",
        });
      }
    }
  }
  return out;
}

/** security-scan.mjs auditDependencies() output -> normalized raw results.
 * `via` may contain either a package name (string, transitive ref) or a rich
 * advisory object; only the latter carries a usable vulnerability id/url. */
export function normalizeNpmAudit(auditResult) {
  return (auditResult.findings || []).map((f) => ({
    tool: "npm-audit",
    toolVersion: null,
    // advisoryIds (a GHSA/npm advisory URL) is a much stronger correlation
    // key than the package name alone — falls back to pkg:<name> only when
    // npm audit's `via` gave us nothing but the transitive dependency chain.
    fingerprint: f.advisoryIds?.[0] || `pkg:${f.name}`,
    package: f.name,
    installedVersion: null,
    vulnerabilityId: f.advisoryIds?.[0] || null,
    severity: f.severity || null,
    affectedRange: null,
    fixedVersion: null,
    file: "package.json",
    summary: `npm audit: ${f.name} (${f.severity})`,
  }));
}

/** CodeQL SARIF (2.1.0) -> normalized raw results. Preserves the raw SARIF
 * alongside so it can be written as raw evidence (section 19's rawArtifactPath/
 * rawArtifactHash) rather than only keeping the lossy normalized summary. */
export function normalizeSarif(sarifJson, { tool = "codeql", toolVersion = null } = {}) {
  const out = [];
  for (const run of sarifJson.runs || []) {
    const rules = Object.fromEntries((run.tool?.driver?.rules || []).map((r) => [r.id, r]));
    for (const result of run.results || []) {
      const location = result.locations?.[0]?.physicalLocation;
      const file = location?.artifactLocation?.uri || null;
      const line = location?.region?.startLine ?? null;
      const rule = rules[result.ruleId] || {};
      const cwe = (rule.properties?.tags || []).find((t) => /^external\/cwe\/cwe-\d+/i.test(t));
      out.push({
        tool,
        toolVersion: toolVersion || run.tool?.driver?.version || null,
        fingerprint: result.partialFingerprints?.primaryLocationLineHash || `${result.ruleId}:${file}:${line}`,
        ruleId: result.ruleId,
        originalSeverity: result.level || rule.defaultConfiguration?.level || null,
        normalizedSeverity: sarifLevelToSeverity(result.level || rule.defaultConfiguration?.level),
        cwe: cwe ? cwe.replace(/^external\/cwe\//i, "").toUpperCase() : null,
        file,
        line,
        dataFlow: result.codeFlows ? result.codeFlows.length : 0,
        summary: result.message?.text || rule.shortDescription?.text || result.ruleId,
      });
    }
  }
  return out;
}

function sarifLevelToSeverity(level) {
  switch (level) {
    case "error":
      return "HIGH";
    case "warning":
      return "MEDIUM";
    case "note":
      return "LOW";
    default:
      return "MEDIUM";
  }
}

/** Groups raw, normalized results from any number of tools by fingerprint
 * into canonical findings — the "ONE CANONICAL FINDING / N tool evidences"
 * model from section 23. A raw result with no fingerprint gets its own
 * singleton group (never silently dropped). */
export function correlateFindings(rawResults) {
  const groups = new Map();
  for (const raw of rawResults) {
    const key = raw.fingerprint || `${raw.tool}:${raw.file}:${raw.summary}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(raw);
  }
  return [...groups.entries()].map(([fingerprint, sources]) => ({
    fingerprint,
    sources: [...new Set(sources.map((s) => s.tool))],
    severity: sources.reduce((acc, s) => higherSeverity(acc, s.severity || s.normalizedSeverity), null),
    file: sources[0].file,
    line: sources[0].line ?? null,
    summary: sources[0].summary,
    rawResults: sources,
  }));
}
