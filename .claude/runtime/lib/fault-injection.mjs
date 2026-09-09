// Real, dependency-free fault-injection harness for chaos-testing a target
// function: wrap it so it fails a configured fraction of calls, or after N
// calls, or with added latency — for exercising retry/backoff/circuit-breaker
// logic the reliability-observability-reviewer checklist asks about, without
// needing a live dependency to actually go down.
export function withFailureRate(fn, rate, { errorFactory = () => new Error("injected fault") } = {}) {
  if (rate < 0 || rate > 1) throw new Error("rate must be between 0 and 1");
  return (...args) => {
    if (Math.random() < rate) throw errorFactory();
    return fn(...args);
  };
}

export function withFailAfter(fn, n, { errorFactory = () => new Error("injected fault") } = {}) {
  let calls = 0;
  return (...args) => {
    calls++;
    if (calls > n) throw errorFactory();
    return fn(...args);
  };
}

export function withLatency(fn, ms) {
  return async (...args) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return fn(...args);
  };
}

/** Runs `fn` (async) `attempts` times against a fault-wrapped dependency and
 * reports how many succeeded — the basis for asserting a retry policy
 * actually tolerates a given failure rate instead of assuming it does. */
export async function runFaultTrial(fn, attempts) {
  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < attempts; i++) {
    try {
      await fn();
      succeeded++;
    } catch {
      failed++;
    }
  }
  return { attempts, succeeded, failed, successRate: succeeded / attempts };
}
