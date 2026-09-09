// Real performance baseline/regression harness using only node:perf_hooks —
// no vendored benchmarking framework. A baseline is captured once (median of
// N runs), stored as a record, and later runs are compared against it so a
// regression is a measured fact, not a feeling.
import { performance } from "node:perf_hooks";
import { addRecord, listRecords } from "./record-store.mjs";

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function measure(fn, { runs = 5 } = {}) {
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  return { runs, samples, medianMs: median(samples) };
}

export function recordBaseline(cwd, name, measurement) {
  return addRecord(cwd, "perf-baseline", { name, medianMs: measurement.medianMs, samples: measurement.samples, runs: measurement.runs });
}

/** Compares a fresh measurement against the most recent stored baseline for
 * `name`. Returns regressed:true when the new median exceeds the baseline
 * median by more than `toleranceRatio` (default 50% slower). */
export function compareToBaseline(cwd, name, measurement, { toleranceRatio = 0.5 } = {}) {
  const baselines = listRecords(cwd, "perf-baseline")
    .filter((b) => b.name === name)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (baselines.length === 0) {
    return { hasBaseline: false, regressed: false, reason: "no prior baseline recorded for this name" };
  }
  const baseline = baselines[0];
  const ratio = (measurement.medianMs - baseline.medianMs) / baseline.medianMs;
  return {
    hasBaseline: true,
    baselineMedianMs: baseline.medianMs,
    currentMedianMs: measurement.medianMs,
    ratio,
    regressed: ratio > toleranceRatio,
  };
}
