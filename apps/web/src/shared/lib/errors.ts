/**
 * STEP 4 — Global Error Hierarchy
 *
 * Sistema de erros tipados para todo o stack da aplicação.
 * Services, use-cases e integrações DEVEM lançar apenas estes tipos.
 * A UI pode fazer `instanceof` para interpretar erros de forma segura.
 */

// ─── Base ────────────────────────────────────────────────────────────────────

/** Erro raiz de domínio. Todos os erros de negócio estendem este. */
export class DomainError extends Error {
  /** Código de máquina para i18n e logging estruturado. */
  readonly code: string;
  /** Severidade para logging. */
  readonly severity: "info" | "warn" | "error" | "fatal";

  constructor(
    message: string,
    code = "DOMAIN_ERROR",
    severity: "info" | "warn" | "error" | "fatal" = "error",
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.severity = severity;
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

/** Falha de validação de dados de entrada. */
export class ValidationError extends DomainError {
  /** Mapa campo → mensagem de erro (para renderizar em formulários). */
  readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, "VALIDATION_ERROR", "warn");
    this.name = "ValidationError";
    this.fields = fields;
  }

  /** Factory para erros de campo único. */
  static field(field: string, message: string): ValidationError {
    return new ValidationError(message, { [field]: message });
  }

  /** Factory para lista de erros sem campo específico. */
  static list(errors: string[]): ValidationError {
    const fields = Object.fromEntries(errors.map((e, i) => [`_${i}`, e]));
    return new ValidationError(errors.join(", "), fields);
  }
}

// ─── Tenant ──────────────────────────────────────────────────────────────────

/** Violação de isolamento multi-tenant. */
export class TenantError extends DomainError {
  readonly currentOrgId: string;
  readonly recordOrgId: string | null;

  constructor(
    currentOrgId: string,
    recordOrgId: string | null,
    context = "operation",
  ) {
    super(
      `[tenant] Cross-tenant access denied: ${context} — record org "${recordOrgId}" ≠ current org "${currentOrgId}"`,
      "TENANT_VIOLATION",
      "fatal",
    );
    this.name = "TenantError";
    this.currentOrgId = currentOrgId;
    this.recordOrgId = recordOrgId;
  }
}

// ─── Password change required ───────────────────────────────────────────────

/** Backend recusou a requisição porque a conta tem troca de senha obrigatória pendente (Parte 74). */
export class PasswordChangeRequiredError extends DomainError {
  constructor(message = "Troca de senha obrigatória antes de continuar.") {
    super(message, "MUST_CHANGE_PASSWORD", "warn");
    this.name = "PasswordChangeRequiredError";
  }
}

// ─── Not Found ───────────────────────────────────────────────────────────────

/** Recurso não encontrado. */
export class NotFoundError extends DomainError {
  readonly entity: string;
  readonly id: string;

  constructor(entity: string, id: string) {
    super(`${entity} "${id}" não encontrado(a)`, "NOT_FOUND", "warn");
    this.name = "NotFoundError";
    this.entity = entity;
    this.id = id;
  }
}

// ─── Transaction ─────────────────────────────────────────────────────────────

/** Falha em operação transacional — rollback foi executado. */
export class TransactionError extends DomainError {
  readonly cause: unknown;

  constructor(cause: unknown) {
    const msg =
      cause instanceof Error ? cause.message : "Erro em operação transacional";
    super(`[tx] Transação abortada e revertida: ${msg}`, "TRANSACTION_ABORTED", "error");
    this.name = "TransactionError";
    this.cause = cause;
  }
}

// ─── Integration ─────────────────────────────────────────────────────────────

/** Falha de integração com serviço externo. */
export class IntegrationError extends DomainError {
  readonly service: string;
  readonly statusCode?: number;
  readonly retryable: boolean;

  constructor(
    service: string,
    message: string,
    options: { statusCode?: number; retryable?: boolean } = {},
  ) {
    super(`[${service}] ${message}`, "INTEGRATION_ERROR", "error");
    this.name = "IntegrationError";
    this.service = service;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? false;
  }

  static notConfigured(service: string): IntegrationError {
    return new IntegrationError(
      service,
      "Integração não configurada. Verifique as credenciais.",
      { retryable: false },
    );
  }

  static networkError(service: string): IntegrationError {
    return new IntegrationError(
      service,
      "Falha de rede. Tentativa de reconexão...",
      { retryable: true },
    );
  }
}

// ─── Not Implemented ─────────────────────────────────────────────────────────

/** Funcionalidade ainda não implementada (stub de integração real). */
export class NotImplementedError extends DomainError {
  readonly feature: string;

  constructor(feature: string, hint = "Esta funcionalidade ainda não está disponível em produção.") {
    super(`[not-implemented] ${feature}: ${hint}`, "NOT_IMPLEMENTED", "warn");
    this.name = "NotImplementedError";
    this.feature = feature;
  }
}

// ─── Conflict ────────────────────────────────────────────────────────────────

/** Conflito de dados — duplicata, concorrência, etc. */
export class ConflictError extends DomainError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, "CONFLICT", "warn");
    this.name = "ConflictError";
    this.field = field;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retorna true se o erro é de domínio tipado (seguro para UI interpretar). */
export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}

/** Extrai mensagem segura de qualquer erro. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erro inesperado. Tente novamente.";
}
