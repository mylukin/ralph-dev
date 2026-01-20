#!/usr/bin/env bash
#
# Ralph-dev CLI Bootstrap Script
# Include this at the top of every skill that uses ralph-dev
#
# Usage in SKILL.md:
#   source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh
#
# This script will:
# 1. Check if ralph-dev CLI is globally installed
# 2. If not, install via npm install -g
# 3. Fall back to local build if global install fails
# 4. Validate CLI works correctly
#
# Environment variables:
#   SKIP_BOOTSTRAP=1   Skip automatic bootstrap (for testing)
#   FORCE_REBUILD=1    Force local rebuild (skip global, rebuild local)
#

set -euo pipefail

# ============================================================
# Color Output Helpers
# ============================================================

if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  CYAN=''
  BOLD=''
  NC=''
fi

# ============================================================
# Configuration
# ============================================================

RALPH_DEV_PACKAGE="ralph-dev"

# Determine project root for local fallback
RALPH_DEV_ROOT=""

if [ -d "$PWD/cli" ]; then
  RALPH_DEV_ROOT="$PWD"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -d "${CLAUDE_PLUGIN_ROOT}/cli" ]; then
  RALPH_DEV_ROOT="${CLAUDE_PLUGIN_ROOT}"
elif [ -n "${BASH_SOURCE[0]:-}" ]; then
  RALPH_DEV_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
else
  RALPH_DEV_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi

LOCAL_CLI_PATH="${RALPH_DEV_ROOT}/cli/dist/index.js"
LOCAL_CLI_DIR="${RALPH_DEV_ROOT}/cli"

# ============================================================
# Logging helpers
# ============================================================

log_info() {
  echo -e "${BLUE}ℹ${NC} $*" >&2
}

log_success() {
  echo -e "${GREEN}✓${NC} $*" >&2
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $*" >&2
}

log_error() {
  echo -e "${RED}✗${NC} $*" >&2
}

log_step() {
  echo -e "${CYAN}▸${NC} $*" >&2
}

# ============================================================
# CLI Detection Functions
# ============================================================

check_global_cli() {
  command -v ralph-dev &> /dev/null
}

get_global_version() {
  ralph-dev --version 2>/dev/null || echo "unknown"
}

check_local_cli_exists() {
  [ -f "$LOCAL_CLI_PATH" ]
}

check_local_dependencies_installed() {
  [ -d "${LOCAL_CLI_DIR}/node_modules" ]
}

validate_cli() {
  ralph-dev --version > /dev/null 2>&1
}

check_node_version() {
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    log_error "Ralph-dev requires Node.js >= 18.0.0"
    log_error "Install from: https://nodejs.org/"
    return 1
  fi

  local node_version major_version
  node_version=$(node --version | sed 's/v//')
  major_version=$(echo "$node_version" | cut -d. -f1)

  if [ "$major_version" -lt 18 ]; then
    log_error "Node.js version $node_version is too old"
    log_error "Ralph-dev requires Node.js >= 18.0.0"
    return 1
  fi

  return 0
}

# ============================================================
# Installation Functions
# ============================================================

install_global_cli() {
  log_step "Installing ralph-dev globally..."

  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}📦 Installing Ralph-dev CLI${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if ! check_node_version; then
    return 1
  fi

  if npm install -g "$RALPH_DEV_PACKAGE" 2>&1 | grep -v "^npm WARN"; then
    if check_global_cli && validate_cli; then
      log_success "Ralph-dev installed globally: $(get_global_version)"
      return 0
    fi
  fi

  log_warning "Global installation failed, will use local build fallback"
  return 1
}

build_local_cli() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}🔧 Building Ralph-dev CLI (local)${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if ! check_node_version; then
    return 1
  fi

  if ! check_local_dependencies_installed; then
    log_step "Installing dependencies..."
    cd "$LOCAL_CLI_DIR"

    if [ -f "package-lock.json" ]; then
      npm ci --silent --no-progress 2>&1 | grep -v "^npm WARN" || \
        npm install --silent --no-progress 2>&1 | grep -v "^npm WARN" || true
    else
      npm install --silent --no-progress 2>&1 | grep -v "^npm WARN" || true
    fi

    if [ ! -d "node_modules" ]; then
      log_error "Failed to install dependencies"
      return 1
    fi
    log_success "Dependencies installed"
  fi

  log_step "Compiling TypeScript..."
  cd "$LOCAL_CLI_DIR"

  if npm run build --silent 2>&1 | grep -E "error TS|Build failed" >&2; then
    log_error "TypeScript compilation failed"
    return 1
  fi

  if [ -f "$LOCAL_CLI_PATH" ]; then
    chmod +x "$LOCAL_CLI_PATH"
    log_success "CLI compiled successfully"
    return 0
  else
    log_error "Build succeeded but output file not found"
    return 1
  fi
}

# ============================================================
# Main Bootstrap Logic
# ============================================================

bootstrap_ralph_dev_cli() {
  local force_rebuild="${FORCE_REBUILD:-0}"

  # Skip bootstrap if requested
  if [ "${SKIP_BOOTSTRAP:-0}" = "1" ]; then
    log_info "Bootstrap skipped (SKIP_BOOTSTRAP=1)"
    return 0
  fi

  # ═══════════════════════════════════════════
  # OPTION 1: Use global CLI (preferred)
  # ═══════════════════════════════════════════

  if [ "$force_rebuild" != "1" ]; then
    if check_global_cli && validate_cli; then
      log_success "Ralph-dev CLI ready (global: $(get_global_version))"
      return 0
    fi
  fi

  # ═══════════════════════════════════════════
  # OPTION 2: Install globally (if not forcing rebuild)
  # ═══════════════════════════════════════════

  if [ "$force_rebuild" != "1" ]; then
    log_info "Ralph-dev CLI not found globally"

    if install_global_cli; then
      return 0
    fi

    log_warning "Falling back to local build..."
  fi

  # ═══════════════════════════════════════════
  # OPTION 3: Use/build local CLI (fallback or forced)
  # ═══════════════════════════════════════════

  # Check if local CLI exists and works (unless forcing rebuild)
  if [ "$force_rebuild" != "1" ] && check_local_cli_exists; then
    ralph-dev() {
      node "$LOCAL_CLI_PATH" "$@"
    }
    export -f ralph-dev

    if validate_cli; then
      log_success "Ralph-dev CLI ready (local build)"
      return 0
    fi
  fi

  # Build local CLI
  if ! build_local_cli; then
    log_error "CRITICAL: CLI build failed"
    log_error ""
    log_error "Please report this issue:"
    log_error "  https://github.com/mylukin/ralph-dev/issues"
    log_error ""
    log_error "Include this information:"
    log_error "  - Node.js version: $(node --version 2>&1 || echo 'not found')"
    log_error "  - npm version: $(npm --version 2>&1 || echo 'not found')"
    log_error "  - OS: $(uname -s) $(uname -r)"
    return 1
  fi

  # Create wrapper function for local CLI
  ralph-dev() {
    node "$LOCAL_CLI_PATH" "$@"
  }
  export -f ralph-dev

  if validate_cli; then
    log_success "Ralph-dev CLI ready (local build)"
    return 0
  else
    log_error "CRITICAL: CLI validation failed after build"
    return 1
  fi
}

# ============================================================
# Exported Functions
# ============================================================

if ! command -v ralph-dev &> /dev/null; then
  ralph-dev() {
    if [ -f "$LOCAL_CLI_PATH" ]; then
      node "$LOCAL_CLI_PATH" "$@"
    else
      log_error "ralph-dev CLI not found"
      return 1
    fi
  }
  export -f ralph-dev
fi

# ============================================================
# Auto-Execute Bootstrap
# ============================================================

if [ -n "${BASH_SOURCE[0]:-}" ] && [ "${BASH_SOURCE[0]}" != "${0}" ]; then
  bootstrap_ralph_dev_cli
elif [ -z "${BASH_SOURCE[0]:-}" ]; then
  bootstrap_ralph_dev_cli
else
  echo "Bootstrap script loaded. Run: bootstrap_ralph_dev_cli"
fi
