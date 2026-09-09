#!/usr/bin/env pwsh
# Cross-platform (PowerShell 5.1+/7+) launcher: validates the pack install is
# healthy, then starts Claude Code in this project's context. Named generically
# ("engineering-os-claude", not a specific product) since this pack installs
# into arbitrary projects — see docs/ARCHITECTURE.md's genericity requirement.
$ErrorActionPreference = "Stop"

function Find-Root {
  $dir = Get-Location
  while ($dir -ne $null -and (Split-Path $dir -Parent) -ne "") {
    if (Test-Path (Join-Path $dir ".claude/engineering-os.json")) { return $dir }
    $parent = Split-Path $dir -Parent
    if ($parent -eq $dir) { break }
    $dir = $parent
  }
  return $null
}

$root = Find-Root
if (-not $root) {
  Write-Error "engineering-os-claude: no .claude/engineering-os.json found in this directory or any parent. Install the pack first: node <pack-path>/installer/install.mjs --target=."
  exit 1
}
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "engineering-os-claude: node is not on PATH. Install Node.js >= 18 first."
  exit 1
}

# 2. Validate installation
# NOTE: `2>&1` on a native command wraps each stderr line in a NativeCommandError
# and, combined with $ErrorActionPreference = "Stop", turns Node's own stderr
# output (e.g. an uncaught exception) into a terminating error BEFORE the
# $LASTEXITCODE check below ever runs — producing a raw PowerShell stack trace
# instead of this script's own message. Scope ErrorActionPreference to
# "Continue" around just the native call so the custom check runs either way.
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$doctorOutput = & node .claude/runtime/doctor.mjs 2>&1
$ErrorActionPreference = $prevEAP
if ($LASTEXITCODE -ne 0) {
  Write-Error "engineering-os-claude: doctor check FAILED — the pack install at $root is unhealthy:`n$doctorOutput"
  exit 1
}

# 3. Validate manifest (registry)
$ErrorActionPreference = "Continue"
$registryOutput = & node .claude/runtime/registry.mjs 2>&1
$ErrorActionPreference = $prevEAP
if ($LASTEXITCODE -ne 0) {
  Write-Error "engineering-os-claude: registry validation FAILED — an agent/skill is malformed or exceeds its capability ceiling:`n$registryOutput"
  exit 1
}

# 4. Start Claude Code in this project's context, if installed
if (Get-Command claude -ErrorAction SilentlyContinue) {
  & claude @args
} else {
  Write-Error "engineering-os-claude: pack validated OK at $root, but the 'claude' CLI is not on PATH. Install Claude Code, then re-run this launcher from $root."
  exit 1
}
