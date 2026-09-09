# Release and Production Governance

Integration, release, deployment and production health are distinct states. A successful build is not a release; a successful deploy command is not proof of healthy production.

For release-sensitive changes preserve source commit, artifact identity/hash, required evidence/gates and deployment target. For production writes use the smallest blast radius practical: preview/staging, canary, blue-green, feature flag or progressive rollout when supported.

Post-deploy validation should cover health plus critical journeys and relevant logs/metrics/traces/SLO signals. If telemetry points to a different release or is unavailable, do not infer success.

Production actions require explicit authorization appropriate to autonomy level and policy.
