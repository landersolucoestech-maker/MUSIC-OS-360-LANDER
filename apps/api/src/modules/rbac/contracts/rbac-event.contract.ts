export type RbacDecision = 'ALLOW' | 'DENY';

export type RbacComparisonResult =
  | 'ALLOW_MATCH'
  | 'DENY_MATCH'
  | 'WOULD_ALLOW'
  | 'WOULD_DENY';

export interface RbacEvent {
  requestId: string;
  traceId: string;
  timestamp: string;

  tenantId: string | null;
  workspaceId: string | null;

  userId: string | null;
  membershipId: string | null;

  roleId: string | null;
  roleSlug: string | null;

  resource: string;
  action: string;
  permission: string;

  endpoint: string;
  method: string;

  activeDecision: RbacDecision;
  shadowDecision: RbacDecision;
  comparison: RbacComparisonResult;

  decisionSource: string;
  resolverReason: string | null;

  wouldAllow: boolean;
  wouldDeny: boolean;

  latencyMs: number;
  cacheHit: boolean;

  authorityMode: 'OFF' | 'SHADOW' | 'ON';
}

export interface RbacActiveDecisionState {
  decision: RbacDecision;
  source: 'legacy_role_hierarchy';
  reason: string | null;
  requiredRoles: string[];
  startedAt: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required to augment the global Express.Request type
  namespace Express {
    interface Request {
      traceId?: string;
      rbacActiveDecision?: RbacActiveDecisionState;
    }
  }
}

