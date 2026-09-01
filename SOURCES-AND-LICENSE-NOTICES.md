# Sources and license notices

This pack is original integration/configuration work. It does not vendor source code from the external projects below. It adapts mechanisms and, where retained, invokes separately installed packages.

- **OmniRoute** — https://github.com/diegosouzapw/OmniRoute — MIT. Retained as routing/resilience gateway.
- **Headroom** — https://github.com/headroomlabs-ai/headroom — upstream license applies. Retained as context-optimization proxy.
- **Claude-Mem** — https://github.com/thedotmack/claude-mem — upstream license applies. Its progressive-disclosure/persistent-observation architecture informed the native bounded memory design; its automatic observer daemon is not installed by this pack.
- **Task Observer / One Skill to Rule Them All** — https://github.com/rebelytics/one-skill-to-rule-them-all — Eoghan Henn / rebelytics.com, CC BY 4.0. Methodology is credited; the pack implements an independent smaller observation/staging mechanism.
- **Claude Code Setup** — https://github.com/rse/claude-code-setup — MIT. High-level launcher, prime/why/quorum and status-line ergonomics are independently adapted project-locally.
- **Claude Code** — current hook/subagent/skills semantics follow official `code.claude.com` documentation.
- The user-supplied MUSIC OS 360 `.claude.zip` is the primary project-specific source; its strongest execution, specialist-agent, scope, hash-baseline and completion-gate mechanisms were refactored rather than replaced wholesale.
- **Open Policy Agent concepts** — https://www.openpolicyagent.org/ — policy decision/enforcement separation informed the policy-engine boundary; OPA source is not vendored.
- **SLSA** — https://slsa.dev/ — supply-chain provenance/build integrity concepts inform release policy/contracts; no SLSA implementation is vendored.
- **NIST SSDF (SP 800-218)** — https://csrc.nist.gov/pubs/sp/800/218/final — secure development practices inform security governance.
- **OpenTelemetry** — https://opentelemetry.io/ — trace/metric/log correlation concepts inform the observability model; no SDK is bundled by default.

