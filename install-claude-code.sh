#!/usr/bin/env bash
set -euo pipefail

CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
INSTALL_ROOT="${INSTALL_ROOT:-$CLAUDE_HOME/teamwork-agent-tools}"
SKILL_ROOT="${SKILL_ROOT:-$CLAUDE_HOME/skills/teamwork}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  printf '%s\n' "$*"
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Missing required command: $1"
    exit 1
  fi
}

need_command node
need_command pnpm

cd "$SCRIPT_DIR"
pnpm install
pnpm build

rm -rf "$INSTALL_ROOT" "$SKILL_ROOT"
mkdir -p "$INSTALL_ROOT" "$SKILL_ROOT"

cp -R dist package.json README.md LICENSE "$INSTALL_ROOT/"
cp adapters/claude-code/skills/teamwork/SKILL.md "$SKILL_ROOT/SKILL.md"

log "Installed experimental Claude Code Teamwork skill to $SKILL_ROOT"
log "Installed Teamwork CLI runtime to $INSTALL_ROOT"
log "Export TEAMWORK_URL plus TEAMWORK_BEARER_TOKEN or TEAMWORK_API_TOKEN before starting Claude Code."
log "Untested here: no Claude Code license/runtime available."
