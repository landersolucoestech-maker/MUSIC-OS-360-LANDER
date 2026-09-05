#!/usr/bin/env bash
#
# set-staging-secrets.sh — grava os 6 secrets exigidos pelo workflow
# .github/workflows/staging.yml no GitHub Environment `staging`.
#
# Segurança:
#   - Lê valores de arquivos locais gitignored em .secrets/staging/<NAME>
#   - NUNCA imprime valores; NUNCA usa `--body` (evita histórico do shell)
#   - Valida presença/conteúdo e bloqueia marcadores de PRODUÇÃO antes de gravar
#   - Fail-fast: não grava nada se qualquer validação falhar (sem escrita parcial)
#
# Uso:
#   1) preencha .secrets/staging/<NAME> (um valor por arquivo, sem aspas)
#   2) ./scripts/set-staging-secrets.sh
#
set -euo pipefail

REPO="landersolucoestech-maker/MUSIC-OS-360-LANDER"
ENVIRONMENT="staging"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_DIR="$ROOT/.secrets/staging"

SECRETS=(
  STAGING_DATABASE_URL
  STAGING_APP_DATABASE_URL
  STAGING_DEPLOY_WEBHOOK_URL
  STAGING_API_URL
  STAGING_SMOKE_TOKEN
  STAGING_SMOKE_TENANT
)

# ── Marcadores de PRODUÇÃO (bloqueiam a gravação) ─────────────────────────────
# Pré-carregado com o ref do Supabase de produção. ADICIONE aqui o domínio real
# da API de produção e o host do deploy hook de produção antes de usar.
PROD_MARKERS=(
  "iundcoubyaiwzqyytvdr"      # ref do projeto Supabase de PRODUÇÃO
  # "api.seudominio.com"      # <- adicione o domínio da API de produção
  # "prod-deploy-hook-host"   # <- adicione o host do deploy hook de produção
)

fail() { echo "❌ $*" >&2; exit 1; }
ok()   { echo "✓ $*"; }
warn() { echo "⚠  $*" >&2; }

# ── 0. Pré-condições ──────────────────────────────────────────────────────────
command -v gh >/dev/null 2>&1 || fail "gh CLI não encontrado."
gh auth status >/dev/null 2>&1 || fail "gh não autenticado — rode: gh auth login"
gh repo view "$REPO" >/dev/null 2>&1 || fail "sem acesso ao repo $REPO"
[ -d "$SECRETS_DIR" ] || fail "diretório ausente: $SECRETS_DIR"

# ── 1. Validar TODOS os arquivos ANTES de gravar (fail-fast) ─────────────────
for name in "${SECRETS[@]}"; do
  f="$SECRETS_DIR/$name"
  [ -f "$f" ]                               || fail "arquivo ausente: .secrets/staging/$name"
  [ -s "$f" ]                               || fail "arquivo vazio: .secrets/staging/$name"
  [ -n "$(tr -d '[:space:]' < "$f")" ]      || fail "arquivo só com espaços: .secrets/staging/$name"
  if grep -qiE '(REPLACE_ME|CHANGEME|placeholder|xxxx|<[^>]+>)' "$f"; then
    fail "$name parece conter placeholder — preencha com o valor real de staging."
  fi
done
ok "6 arquivos presentes, não-vazios e sem placeholders."

# ── 2. Checagens anti-produção (nunca imprime o valor) ───────────────────────
check_no_prod() {
  local name="$1"; local f="$SECRETS_DIR/$name"
  local m
  for m in "${PROD_MARKERS[@]}"; do
    [ -z "$m" ] && continue
    if grep -qiF -- "$m" "$f"; then
      fail "$name contém marcador de PRODUÇÃO ('$m') — abortando (nenhum secret gravado)."
    fi
  done
}
for name in STAGING_DATABASE_URL STAGING_APP_DATABASE_URL STAGING_API_URL STAGING_DEPLOY_WEBHOOK_URL; do
  check_no_prod "$name"
done

# DB URLs precisam ser alcançáveis pelo GitHub Actions (não local)
for name in STAGING_DATABASE_URL STAGING_APP_DATABASE_URL; do
  if grep -qiE 'localhost|127\.0\.0\.1|(\[|:)::1|@db:|@postgres:' "$SECRETS_DIR/$name"; then
    fail "$name aponta para host LOCAL — o GitHub Actions não o alcança. Use host público de staging."
  fi
done

# app-role deve ser NOBYPASSRLS (musicos_app) — aviso, não bloqueio
if ! grep -qiE '://[[:space:]]*musicos_app[:@]' "$SECRETS_DIR/STAGING_APP_DATABASE_URL"; then
  warn "STAGING_APP_DATABASE_URL não parece usar o usuário 'musicos_app' — confirme que é a app-role NOBYPASSRLS."
fi
# API/URLs devem ser https públicos (aviso)
grep -qiE '^https://' "$SECRETS_DIR/STAGING_API_URL" || warn "STAGING_API_URL não começa com https:// — confirme."
ok "checagens anti-produção passaram."

# ── 3. Gravar (stdin; sem --body; sem eco) ───────────────────────────────────
for name in "${SECRETS[@]}"; do
  gh secret set "$name" --env "$ENVIRONMENT" --repo "$REPO" < "$SECRETS_DIR/$name"
  ok "gravado: $name"
done

# ── 4. Validar presença ──────────────────────────────────────────────────────
echo ""
echo "== gh secret list --env $ENVIRONMENT --repo $REPO =="
gh secret list --env "$ENVIRONMENT" --repo "$REPO"

present="$(gh secret list --env "$ENVIRONMENT" --repo "$REPO" --json name --jq '.[].name' 2>/dev/null \
          || gh secret list --env "$ENVIRONMENT" --repo "$REPO" | awk 'NR>0{print $1}')"
missing=0
for name in "${SECRETS[@]}"; do
  echo "$present" | grep -qx "$name" || { echo "❌ ausente após gravação: $name" >&2; missing=1; }
done
[ "$missing" -eq 0 ] && echo "✅ Todos os 6 secrets presentes no environment '$ENVIRONMENT'." \
                     || fail "alguns secrets não foram gravados — revise acima."
