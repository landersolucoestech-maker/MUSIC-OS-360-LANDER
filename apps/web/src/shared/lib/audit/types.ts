export type AuditSeverity = "obrigatorio" | "recomendado";

export type AuditModuleId =
  | "artistas"
  | "catalog"
  | "contratos"
  | "crm"
  | "eventos"
  | "accounting"
  | "inventory"
  | "leads"
  | "licensing"
  | "marketing"
  | "monitoring"
  | "projects"
  | "lancamentos"
  | "rh";

export interface AuditIssue {
  id: string;
  module: AuditModuleId;
  severity: AuditSeverity;
  entity_type: string;
  entity_label: string;
  missing_fields: string[];
  fix_path: string;
}

export interface AuditSummary {
  total_issues: number;
  obrigatorio: number;
  recomendado: number;
}

export interface AuditResult {
  issues: AuditIssue[];
  summary: AuditSummary;
  generated_at: string;
}

export const AUDIT_MODULES: { id: AuditModuleId; label: string }[] = [
  { id: "artistas", label: "Artistas" },
  { id: "catalog", label: "Catálogo" },
  { id: "contratos", label: "Contratos" },
  { id: "crm", label: "CRM" },
  { id: "eventos", label: "Eventos" },
  { id: "accounting", label: "Accounting" },
  { id: "inventory", label: "Inventário" },
  { id: "leads", label: "Leads" },
  { id: "licensing", label: "Licenciamento" },
  { id: "marketing", label: "Marketing" },
  { id: "monitoring", label: "Monitoramento" },
  { id: "projects", label: "Projetos" },
  { id: "lancamentos", label: "Lançamentos" },
  { id: "rh", label: "RH" },
];
