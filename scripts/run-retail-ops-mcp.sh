#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_dir=$(dirname -- "$script_dir")
keychain_service="tranquilbeads-retail-ops"
credential_account="${RETAIL_AGENT_CREDENTIAL_ACCOUNT:-production-agent}"

token="${RETAIL_AGENT_TOKEN:-}"

if [ -z "$token" ] && [ -n "${RETAIL_AGENT_TOKEN_FILE:-}" ]; then
  token_file=$RETAIL_AGENT_TOKEN_FILE
  if [ -L "$token_file" ] || [ ! -f "$token_file" ] || [ ! -r "$token_file" ]; then
    printf '%s\n' "RETAIL_AGENT_TOKEN_FILE is not a readable regular file." >&2
    exit 1
  fi

  if metadata=$(stat -c '%a:%u:%g' -- "$token_file" 2>/dev/null); then :
  elif metadata=$(stat -f '%Lp:%u:%g' "$token_file" 2>/dev/null); then :
  else
    printf '%s\n' "RETAIL_AGENT_TOKEN_FILE permissions could not be verified." >&2
    exit 1
  fi

  mode=${metadata%%:*}
  owner_group=${metadata#*:}
  owner_uid=${owner_group%%:*}
  owner_gid=${owner_group#*:}
  case "$mode" in ''|*[!0-9]*) metadata_valid=false ;; *) metadata_valid=true ;; esac
  case "$owner_uid" in ''|*[!0-9]*) metadata_valid=false ;; esac
  case "$owner_gid" in ''|*[!0-9]*) metadata_valid=false ;; esac
  if [ "$metadata_valid" != "true" ]; then
      printf '%s\n' "RETAIL_AGENT_TOKEN_FILE permissions could not be verified." >&2
      exit 1
  fi

  systemd_credential=false
  if [ "$mode" = "440" ] && [ "$owner_uid" = "0" ] && [ "$owner_gid" = "0" ] && [ -n "${CREDENTIALS_DIRECTORY:-}" ]; then
    token_parent=$(CDPATH= cd -P "$(dirname -- "$token_file")" 2>/dev/null && pwd -P) || token_parent=""
    credentials_parent=$(CDPATH= cd -P "$CREDENTIALS_DIRECTORY" 2>/dev/null && pwd -P) || credentials_parent=""
    if [ -n "$token_parent" ] && [ "$token_parent" = "$credentials_parent" ]; then
      systemd_credential=true
    fi
  fi

  if [ "$mode" != "400" ] && [ "$mode" != "600" ] && [ "$systemd_credential" != "true" ]; then
    printf '%s\n' "RETAIL_AGENT_TOKEN_FILE permissions are not allowed." >&2
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
