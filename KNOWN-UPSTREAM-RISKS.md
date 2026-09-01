# Known upstream risks and explicit fallbacks

This pack deliberately does not pretend that external tooling is infallible. The control plane remains usable even when a proxy/memory integration is unhealthy.

## OmniRoute 3.8.49

The npm `latest` at pack build time is 3.8.49. An open August 2026 upstream report describes Claude Code native `write`/`bash` tool failures when launched through some OmniRoute profiles. This is not assumed to affect every provider/profile, but it is significant enough that the pack provides an explicit bypass instead of silently trapping the project behind the gateway.

- full stack: `music-os-claude.* --stack`
- OmniRoute without Headroom: `--omniroute-only`
- native Claude configuration, no pack proxy override: `--native`

Do not silently fall from a gateway into native provider billing/auth because a service is unhealthy. The operator chooses the fallback.

A newer report opened on **25 August 2026** describes Claude Code 2.1.245 dispatching `auto/coding` traffic to first-party Anthropic despite a custom base URL/API key. Until that class of issue is proven resolved in the exact local Claude Code + OmniRoute combination, this pack defaults to `native` and requires explicit `--stack`/`--omniroute-only` opt-in. The routed launcher clears direct Anthropic environment credentials after the gateway process starts, but that is not represented as a complete defense against credentials stored outside the process environment. Always perform a provider/billing smoke check before sustained routed use.

Upstream current report: https://github.com/diegosouzapw/OmniRoute/issues/11525

Upstream reference: https://github.com/diegosouzapw/OmniRoute/issues/9578

## Claude-Mem automatic observer

The direct observer/plugin is intentionally not part of the runtime hot path. Recent 2026 upstream reports include extreme observer token consumption, recursive/critical-path behavior, and peer-session interference. The pack reimplements only the durable high-value mechanism: bounded persistent observations with progressive retrieval.

Upstream references:
- https://github.com/thedotmack/claude-mem/issues

## Headroom

Headroom 0.36.5 is pinned for CLI stability. In the full stack it is constrained to context optimization: semantic response cache, memory, live learning, rate limiting and duplicate retry ownership are disabled. If Headroom is unavailable, use `--omniroute-only`; do not run two independent compression/memory owners concurrently.

## General rule

External integration failure must degrade capability, not corrupt operational truth. `CLAUDE.md`, `.claude/rules/`, repository state and `.claude/ops/state.json` remain authoritative regardless of the selected routing mode.


## Claude Code version floor

The project configuration uses contemporary hook and sandbox capabilities. Basic `sandbox.credentials` support requires Claude Code 2.1.187+, but this pack deliberately sets **2.1.228** as its minimum tested/stable baseline as of 2026-08-26. The launcher and `doctor` reject an older CLI rather than risking silent partial enforcement. Native Windows still lacks the Bash OS sandbox; use WSL2/container isolation for the strongest sandbox boundary.
