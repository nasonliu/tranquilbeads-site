#!/bin/zsh
set -euo pipefail

script_dir="${0:A:h}"
repo_dir="${script_dir:h}"
keychain_service="tranquilbeads-retail-ops"
keychain_account="production-agent"

token="${RETAIL_AGENT_TOKEN:-}"
if [[ -z "$token" ]]; then
  if [[ "$(uname -s)" != "Darwin" ]] || ! command -v security >/dev/null 2>&1; then
    print -u2 "RETAIL_AGENT_TOKEN is required when macOS Keychain is unavailable."
    exit 1
  fi
  token="$(security find-generic-password -w -s "$keychain_service" -a "$keychain_account" 2>/dev/null || true)"
fi

if [[ ${#token} -lt 32 ]]; then
  print -u2 "TranquilBeads retail Agent credential is not configured."
  exit 1
fi

export RETAIL_AGENT_TOKEN="$token"
export RETAIL_AGENT_BASE_URL="${RETAIL_AGENT_BASE_URL:-https://www.tranquilbeads.com}"
export RETAIL_AGENT_MEDIA_ROOT="${RETAIL_AGENT_MEDIA_ROOT:-$repo_dir/retail-agent-media}"

cd "$repo_dir"
exec npm run --silent mcp:retail
