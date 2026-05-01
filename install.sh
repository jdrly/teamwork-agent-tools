#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/jdrly/teamwork-agent-tools.git}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
INSTALL_ROOT="${INSTALL_ROOT:-$CODEX_HOME/plugins/teamwork}"
WORKDIR="${WORKDIR:-}"
CONFIG_FILE="${CODEX_CONFIG:-$CODEX_HOME/config.toml}"
RUN_TESTS="${RUN_TESTS:-0}"

log() {
  printf '%s\n' "$*"
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Missing required command: $1"
    exit 1
  fi
}

toml_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

ensure_env_key() {
  local key="$1"
  local value="${2:-}"
  local escaped
  escaped="$(toml_escape "$value")"

  if grep -qE "^${key}[[:space:]]*=" "$CONFIG_FILE"; then
    return
  fi

  if grep -q '^\[shell_environment_policy\.set\]' "$CONFIG_FILE"; then
    awk -v key="$key" -v value="$escaped" '
      BEGIN { inserted = 0 }
      /^\[shell_environment_policy\.set\]/ {
        print
        if (!inserted) {
          print key " = \"" value "\""
          inserted = 1
        }
        next
      }
      { print }
    ' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp"
    mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
  else
    {
      printf '\n[shell_environment_policy.set]\n'
      printf '%s = "%s"\n' "$key" "$escaped"
    } >> "$CONFIG_FILE"
  fi
}

ensure_skill_entry() {
  local skill_path="$INSTALL_ROOT/skills/teamwork/SKILL.md"

  if grep -Fq "$skill_path" "$CONFIG_FILE"; then
    return
  fi

  {
    printf '\n[[skills.config]]\n'
    printf 'path = "%s"\n' "$skill_path"
    printf 'enabled = true\n'
  } >> "$CONFIG_FILE"
}

need_command git
need_command node
need_command pnpm
need_command awk

mkdir -p "$CODEX_HOME" "$(dirname "$INSTALL_ROOT")"
touch "$CONFIG_FILE"
cp "$CONFIG_FILE" "${CONFIG_FILE}.bak-teamwork-$(date +%Y%m%d%H%M%S)"

if [ -z "$WORKDIR" ]; then
  WORKDIR="$(mktemp -d)"
  cleanup() {
    rm -rf "$WORKDIR"
  }
  trap cleanup EXIT
fi

SOURCE_DIR="$WORKDIR/teamwork-agent-tools"

if [ -d "$SOURCE_DIR/.git" ]; then
  git -C "$SOURCE_DIR" pull --ff-only
else
  rm -rf "$SOURCE_DIR"
  git clone "$REPO_URL" "$SOURCE_DIR"
fi

cd "$SOURCE_DIR"
pnpm install
pnpm build
if [ "$RUN_TESTS" = "1" ]; then
  pnpm test
fi
CODEX_HOME="$CODEX_HOME" pnpm prepare:local

ensure_env_key "TEAMWORK_URL" "https://your-site.teamwork.com"
ensure_env_key "TEAMWORK_BEARER_TOKEN" ""
ensure_env_key "TEAMWORK_API_TOKEN" ""
ensure_env_key "TEAMWORK_USER_AGENT" "Teamwork-Agent-Tools/0.1"
ensure_skill_entry

log "Installed Teamwork Agent Tools to $INSTALL_ROOT"
log "Updated Codex config at $CONFIG_FILE"
log "Fill missing TEAMWORK_* values in $CONFIG_FILE, then restart Codex."
log "Verify after restart:"
log "node $INSTALL_ROOT/dist/cli.js auth check"
