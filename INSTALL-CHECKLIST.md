# Install Checklist — MUSIC OS 360 Engineering OS v2.0.0

1. Copy/extract the pack into the root of the real MUSIC OS 360 checkout. Merge intentionally if `.claude/` already exists; never overwrite unrelated project code.
2. Keep all credentials outside tracked files. Real `.env*` remains denied; templates may be read for configuration shape.
3. Run `.claude/install.sh` (Linux/macOS) or `.claude\install.ps1` (PowerShell). This validates pack semantics before creating runtime state.
4. Run `node .claude/runtime/doctor.mjs`. Fix required failures before autonomous delivery.
5. Optional: install Headroom/OmniRoute with `--deps` / `-Deps`; native mode does not require them.
6. Launch native first: `.claude/launchers/music-os-claude.sh --native` (or PowerShell equivalent). Use `--stack`/`--omniroute-only` only after provider/billing/tool smoke tests.
7. Agent Teams remain explicit opt-in: append `--teams` only for genuinely independent workstreams with safe ownership/worktree isolation.
8. Run `/prime`, then verify branch/HEAD/status, project architecture and current mission reconstruction.
9. Run `node .claude/runtime/impact.mjs`; inspect whether the detected signals match the actual project paths/architecture. Project-specific signal extensions may be added without weakening existing safety signals.
10. Dry-run an L2 code change and verify: requirement + criterion creation, executed verification evidence, reviewer verdict capture, Git/scope audit and `ops.mjs gate` PASS.
11. **Mandatory freshness smoke test:** after a PASS, change the code again without committing. Confirm the gate marks prior PASS evidence stale and blocks until verification/review are regenerated.
12. Test one intentionally denied/asked operation (for example real `.env` shell read or destructive Git) and confirm PreToolUse does not silently allow it.
13. For database/RLS/tenant isolation, validate project commands in a disposable/staging target before enabling any write path. Never infer production safety from static review alone.
14. For release/production use, enforce complementary CI, branch protection, cloud IAM, database privileges and deployment approvals outside Claude Code.

## Sandbox hard requirement

- [ ] On Windows, run Claude Code inside **WSL2 or a supported container**. Native Windows does not provide Claude Code Bash sandboxing.
- [ ] Confirm `/sandbox` reports the sandbox available before autonomous work. The pack sets `failIfUnavailable: true`; missing sandbox dependencies must fail closed rather than silently run unsandboxed.
- [ ] Do not remove `disableBypassPermissionsMode`, `.claude/**`/`CLAUDE.md` deny-write boundaries, or subprocess credential scrubbing without an explicit security review.
