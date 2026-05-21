/**
 * workflow.types.ts
 *
 * Core type definitions for the MUSIC OS 360 Workflow Engine.
 * All domain workflow definitions implement these interfaces.
 */

export interface WorkflowTransition<TState extends string = string> {
  from: TState | TState[];
  to: TState;
  roles?: string[];
  label?: string;
  guard?: WorkflowGuard<TState>;
  hooks?: WorkflowHooks<TState>;
}

export type WorkflowGuard<TState extends string = string> = (
  context: WorkflowContext<TState>
) => Promise<WorkflowGuardResult>;

export interface WorkflowGuardResult {
  allowed: boolean;
  reason?: string;
}

export interface WorkflowHooks<TState extends string = string> {
  before?: (context: WorkflowContext<TState>) => Promise<void>;
  after?: (context: WorkflowContext<TState>) => Promise<void>;
}

export interface WorkflowContext<TState extends string = string> {
  entityType: string;
  entityId: string;
  tenantId: string;
  actorId: string;
  actorRole?: string;
  fromStatus: TState;
  toStatus: TState;
  entity: Record<string, unknown>;
  reason?: string;
}

export interface WorkflowDefinition<TState extends string = string> {
  name: string;
  entityType: string;
  initialState: TState;
  states: TState[];
  transitions: WorkflowTransition<TState>[];
}

export interface AllowedTransition<TState extends string = string> {
  to: TState;
  label?: string;
}

export class WorkflowTransitionError extends Error {
  constructor(
    message: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly reason?: string,
  ) {
    super(message);
    this.name = 'WorkflowTransitionError';
  }
}
