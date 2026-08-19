#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_dir=$(dirname -- "$script_dir")
keychain_service="tranquilbeads-retail-ops"
credential_account="${RETAIL_AGENT_CREDENTIAL_ACCOUNT:-production-agent}"

token="${RETAIL_AGENT_TOKEN:-}"

if [ -z "$token" ] && [ -n "${RETAIL_AGENT_TOKEN_FILE:-}" ]; then
  token_file=$RETAIL_AGENT_TOKEN_FILE
  if [ ! -f "$token_file" ] || [ ! -r "$token_file" ]; then
    printf '%s\n' "RETAIL_AGENT_TOKEN_FILE is not a readable regular file." >&2
    exit 1
  fi
  if mode=$(stat -c '%a' "$token_file" 2>/dev/null); then :
  elif mode=$(stat -f '%Lp' "$token_file" 2>/dev/null); then :
  else mode=""; fi
  if [ -n "$mode" ] && [ $((0$mode & 077)) -ne 0 ]; then
    printf '%s\n' "RETAIL_AGENT_TOKEN_FILE must not be readable by group or other users." >&2
    exit 1
  fi
  token=$(tr -d '\r\n' < "$token_file")
fi

if [ -z "$token" ] && [ "$(uname -s)" = "Darwin" ] && command -v security >/dev/null 2>&1; then
  token=$(security find-generic-password -w -s "$keychain_service" -a "$credential_account" 2>/dev/null || true)
fi

if [ -z "$token" ] && command -v secret-tool >/dev/null 2>&1; then
  token=$(secret-tool lookup service "$keychain_service" account "$credential_account" 2>/dev/null || true)
fi

if [ ${#token} -lt 32 ]; then
  printf '%s\n' "TranquilBeads retail Agent credential is not configured." >&2
  exit 1
fi

export RETAIL_AGENT_TOKEN="$token"
export RETAIL_AGENT_BASE_URL="${RETAIL_AGENT_BASE_URL:-https://www.tranquilbeads.com}"
export RETAIL_AGENT_MEDIA_ROOT="${RETAIL_AGENT_MEDIA_ROOT:-$repo_dir/retail-agent-media}"
export RETAIL_AGENT_EXPORT_ROOT="${RETAIL_AGENT_EXPORT_ROOT:-$repo_dir/retail-agent-exports}"

if [ -n "${RETAIL_AGENT_PROXY_URL:-}" ]; then
  export HTTPS_PROXY="$RETAIL_AGENT_PROXY_URL"
  export HTTP_PROXY="$RETAIL_AGENT_PROXY_URL"
elif [ -z "${HTTPS_PROXY:-}" ] && command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 7890 >/dev/null 2>&1; then
  export HTTPS_PROXY="http://127.0.0.1:7890"
  export HTTP_PROXY="http://127.0.0.1:7890"
fi
if [ -n "${HTTPS_PROXY:-}" ] || [ -n "${HTTP_PROXY:-}" ]; then
  export NODE_USE_ENV_PROXY=1
fi

cd "$repo_dir"
exec npm run --silent mcp:retail
