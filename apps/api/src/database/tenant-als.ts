/**
 * database/tenant-als.ts
 *
 * FASE 3J — Propagação TRANSPARENTE do contexto de tenant para repositórios
 * globais (`ds.getRepository(...)` capturado no construtor dos services).
 *
 * Problema (confirmado na FASE 3I): os services capturam o repo no construtor a
 * partir do DataSource. Um Proxy só em `getRepository` não bastaria — o repo já
 * está capturado. Solução: o Proxy de `getRepository` devolve um Proxy de
 * Repository que RE-RESOLVE o repo a CADA operação, consultando um
 * AsyncLocalStorage. Quando há um manager de tenant no ALS (definido por
 * `DatabaseContextService.runInTenantContext`), todas as queries — mesmo de repos
 * capturados no construtor — passam a rodar na conexão/transação com
 * `app.current_tenant_id` setado. Sem store no ALS → comportamento IDÊNTICO ao
 * atual (pass-through), o que limita o blast radius (opt-in por presença de
 * contexto).
 *
 * NÃO altera RLS, policies, schema nem `private_get_tenant_id()`. Reusa o
 * primitivo existente `runInTenantContext` (não cria segundo mecanismo).
 */
import { AsyncLocalStorage } from 'async_hooks';
import { DataSource, EntityManager } from 'typeorm';

interface TenantStore {
  manager: EntityManager;
}

/** Store por-request/por-contexto com o EntityManager contextualizado. */
export const tenantAls = new AsyncLocalStorage<TenantStore>();

/** Liga o manager contextualizado ao ALS pela duração de `fn`. */
export function runWithTenantManager<T>(manager: EntityManager, fn: () => Promise<T>): Promise<T> {
  return tenantAls.run({ manager }, fn);
}

/** O manager ativo do contexto, se houver (background/HTTP via runInTenantContext). */
export function currentTenantManager(): EntityManager | null {
  return tenantAls.getStore()?.manager ?? null;
}

type EntityTarget = Parameters<DataSource['getRepository']>[0];

/** Repositório que re-resolve por operação: ALS-manager quando ativo, senão o real. */
function makeRepoProxy(real: DataSource, target: EntityTarget): unknown {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        const store = tenantAls.getStore();
        const repo = store
          ? store.manager.getRepository(target)
          : real.getRepository(target);
        const value = (repo as unknown as Record<string | symbol, unknown>)[prop];
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(repo) : value;
      },
    },
  );
}

// Métodos do DataSource que devem rodar no manager do contexto quando ativo.
const ROUTED_WHEN_CONTEXT = new Set(['query', 'createQueryBuilder', 'transaction']);

/**
 * Envolve um DataSource real num Proxy ALS-aware. Services que injetam o token
 * DATA_SOURCE recebem este Proxy e passam a ser contextualizados automaticamente
 * — sem alterar uma linha sequer dos services.
 */
export function makeTenantAwareDataSource(real: DataSource): DataSource {
  return new Proxy(real, {
    get(target, prop, _receiver) {
      // getRepository SEMPRE devolve um repo-proxy que re-resolve por chamada
      // (cobre o caso de captura no construtor).
      if (prop === 'getRepository') {
        return (entity: EntityTarget) => makeRepoProxy(target, entity);
      }
      const store = tenantAls.getStore();
      if (prop === 'manager') {
        return store ? store.manager : target.manager;
      }
      if (store && typeof prop === 'string' && ROUTED_WHEN_CONTEXT.has(prop)) {
        const mgr = store.manager as unknown as Record<string, (...a: unknown[]) => unknown>;
        return mgr[prop].bind(store.manager);
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  });
}
