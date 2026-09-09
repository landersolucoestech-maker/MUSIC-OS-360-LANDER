# Scope, Change Budget and Ownership

Implement the literal task and preserve explicit non-requirements. Discovering adjacent debt does not grant permission to fix it; record it as a finding/debt candidate unless required to satisfy the task safely.

Before writes, preserve a content baseline. Pre-existing dirty/untracked work is user/project state and must not be reset, cleaned or overwritten by reflex.

Each writer owns a bounded path set. Unexpected changes outside that set or unexpectedly broad lockfile/generated churn trigger scope audit and impact reassessment.

Prefer minimal coherent changes, but do not under-fix root causes. "Minimal" means no unrelated behavior, not fewer lines at the cost of correctness.
