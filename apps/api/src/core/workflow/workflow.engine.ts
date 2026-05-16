/**
 * workflow.engine.ts
 *
 * Generic Workflow Engine for MUSIC OS 360.
 * Validates and executes state transitions defined in WorkflowDefinition.
 */

import {
  WorkflowDefinition,
  WorkflowContext,
  AllowedTransition,
  WorkflowTransitionError,
} from './workflow.types';

export class WorkflowEngine<TState extends string = string> {
  constructor(private readonly definition: WorkflowDefinition<TState>) {}

  /** Returns all transitions the actor can take from the current status */
  getAllowedTransitions(
    currentStatus: TState,
    actorRole?: string,
  ): AllowedTransition<TState>[] {
    return this.definition.transitions
      .filter((t) => {
        const froms = Array.isArray(t.from) ? t.from : [t.from];
        if (!froms.includes(currentStatus)) return false;
        if (t.roles && actorRole && !t.roles.includes(actorRole)) return false;
        return true;
      })
      .map((t) => ({ to: t.to, label: t.label }));
  }

  /** Returns true if the transition from→to is defined (role-agnostic) */
  canTransition(fromStatus: TState, toStatus: TState, actorRole?: string): boolean {
    return this.definition.transitions.some((t) => {
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      if (!froms.includes(fromStatus) || t.to !== toStatus) return false;
      if (t.roles && actorRole && !t.roles.includes(actorRole)) return false;
      return true;
    });
  }

  /** Executes the transition, running guards and hooks. Throws WorkflowTransitionError on failure. */
  async transition(context: WorkflowContext<TState>): Promise<void> {
    const { fromStatus, toStatus, actorRole } = context;

    const matched = this.definition.transitions.find((t) => {
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      return froms.includes(fromStatus) && t.to === toStatus;
    });

    if (!matched) {
      throw new WorkflowTransitionError(
        `Transição inválida: '${fromStatus}' → '${toStatus}' não é permitida no workflow '${this.definition.name}'`,
        fromStatus,
        toStatus,
        'transition_not_defined',
      );
    }

    if (matched.roles && actorRole && !matched.roles.includes(actorRole)) {
      throw new WorkflowTransitionError(
        `Permissão insuficiente: role '${actorRole}' não pode executar '${fromStatus}' → '${toStatus}'`,
        fromStatus,
        toStatus,
        'role_not_authorized',
      );
    }

    if (matched.guard) {
      const result = await matched.guard(context);
      if (!result.allowed) {
        throw new WorkflowTransitionError(
          `Guard bloqueou transição: ${result.reason ?? 'condição de negócio não satisfeita'}`,
          fromStatus,
          toStatus,
          result.reason ?? 'guard_failed',
        );
      }
    }

    if (matched.hooks?.before) {
      await matched.hooks.before(context);
    }

    if (matched.hooks?.after) {
      await matched.hooks.after(context);
    }
  }

  getDefinition(): WorkflowDefinition<TState> {
    return this.definition;
  }
}
