# Migration — v1.2.1 to v2.0.0

v2 is intentionally a major breaking governance upgrade. Do not copy only individual new agent prompts into a v1 runtime.

1. Back up any existing `.claude/ops/` history you need to preserve.
2. Replace tracked `CLAUDE.md` and `.claude/` control-plane files with v2, leaving real project code/config untouched.
3. Keep environment/provider credentials outside the pack. Reapply only local settings that do not weaken v2 permissions/sandbox/policies.
4. Run `node .claude/runtime/validate-pack.mjs` and `node .claude/runtime/doctor.mjs` in the real MUSIC OS 360 checkout.
5. v2 can load legacy `validations` into the new `evidence` collection for migration, but old free-form PASS records do **not** have a current workspace fingerprint and therefore cannot satisfy fresh-evidence gates.
6. Start a new mission. Re-model L2+ requirements/criteria and regenerate verification/reviewer evidence on the actual current workspace.
7. Smoke-test PreToolUse approval, touched-file tracking, SubagentStop verdict capture, evidence invalidation after a patch and Stop blocking before trusting autonomous execution.
8. Keep Agent Teams and optional proxy stack disabled until the base native workflow is proven in the actual repository.

Do not attempt to preserve T0–T3 task classifications. v2 replaces them with runtime-detected L0–L5 impact and independent risk signals.
