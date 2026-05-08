import type { AuditResult } from "./types";

export function runAudit(): AuditResult {
  return {
    issues: [],
    summary: { total_issues: 0, obrigatorio: 0, recomendado: 0 },
    generated_at: new Date().toISOString(),
  };
}
