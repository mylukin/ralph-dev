#!/bin/bash
#
# Ralph-dev SessionStart Hook
# Auto-installs workflow rules to target project's .claude/rules/ directory
#
# This ensures workflow instructions persist across context compression.
#
# Environment variables provided by Claude Code:
# - CLAUDE_PLUGIN_ROOT: Path to where the plugin is cached
# - CLAUDE_PROJECT_DIR: Path to the current project directory
# - CLAUDE_ENV_FILE: File to write environment variables to persist
#

# Don't exit on error - we want to be non-blocking
set +e

# Get plugin root (where ralph-dev is installed)
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT}"

# If CLAUDE_PLUGIN_ROOT is not set, try to derive it
if [ -z "$PLUGIN_ROOT" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
fi

# Get target project directory
TARGET_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"

# Source rules directory (in plugin)
SOURCE_RULES="${PLUGIN_ROOT}/.claude/rules"

# Target rules directory (in project)
TARGET_RULES="${TARGET_DIR}/.claude/rules"

# Skip if we're in the ralph-dev plugin directory itself
if [ "${TARGET_DIR}" = "${PLUGIN_ROOT}" ]; then
  exit 0
fi

# Skip if source rules don't exist
if [ ! -d "${SOURCE_RULES}" ]; then
  exit 0
fi

# Check if this is a ralph-dev project (has .ralph-dev dir or ralph-dev state)
IS_RALPH_DEV_PROJECT=false

if [ -d "${TARGET_DIR}/.ralph-dev" ]; then
  IS_RALPH_DEV_PROJECT=true
fi

# Also check if ralph-dev CLI returns valid state
if [ "$IS_RALPH_DEV_PROJECT" = false ]; then
  if command -v ralph-dev &> /dev/null; then
    if ralph-dev state get --json 2>/dev/null | grep -q '"phase"'; then
      IS_RALPH_DEV_PROJECT=true
    fi
  fi
fi

# Skip if not a ralph-dev project
if [ "$IS_RALPH_DEV_PROJECT" = false ]; then
  exit 0
fi

# Create target rules directory if needed
mkdir -p "${TARGET_RULES}" 2>/dev/null || exit 0

# Track installed files
INSTALLED_COUNT=0

# Copy ralph-dev rules to target project
for rule_file in "${SOURCE_RULES}"/ralph-dev-*.md; do
  if [ -f "$rule_file" ]; then
    filename=$(basename "$rule_file")
    target_file="${TARGET_RULES}/${filename}"

    # Only copy if source is newer or target doesn't exist
    if [ ! -f "$target_file" ] || [ "$rule_file" -nt "$target_file" ]; then
      if cp "$rule_file" "$target_file" 2>/dev/null; then
        INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
      fi
    fi
  fi
done

# Log results
if [ $INSTALLED_COUNT -gt 0 ]; then
  echo "[ralph-dev] Installed ${INSTALLED_COUNT} workflow rule(s) to ${TARGET_RULES}"
fi

# Optionally persist environment variables via CLAUDE_ENV_FILE
if [ -n "$CLAUDE_ENV_FILE" ] && [ -f "$CLAUDE_ENV_FILE" ]; then
  # Export RALPH_DEV_WORKSPACE to help CLI find the right directory
  echo "export RALPH_DEV_WORKSPACE=\"${TARGET_DIR}\"" >> "$CLAUDE_ENV_FILE"
fi

# Auto-recovery: Query and display current state for context awareness
# This helps Claude understand the current workflow state at session start
if command -v ralph-dev &> /dev/null && [ -d "${TARGET_DIR}/.ralph-dev" ]; then
  STATE_JSON=$(ralph-dev state get --json 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$STATE_JSON" ]; then
    PHASE=$(echo "$STATE_JSON" | jq -r '.phase // "none"' 2>/dev/null)
    CURRENT_TASK=$(echo "$STATE_JSON" | jq -r '.currentTask // "none"' 2>/dev/null)

    if [ "$PHASE" != "none" ] && [ "$PHASE" != "null" ] && [ -n "$PHASE" ]; then
      echo ""
      echo "[ralph-dev] Active session detected"
      echo "  Phase: ${PHASE}"
      echo "  Current Task: ${CURRENT_TASK}"

      # Query task progress
      TASKS_JSON=$(ralph-dev tasks list --json 2>/dev/null)
      if [ $? -eq 0 ]; then
        TOTAL=$(echo "$TASKS_JSON" | jq -r '.data.total // 0' 2>/dev/null)
        COMPLETED=$(echo "$TASKS_JSON" | jq -r '.data.completed // 0' 2>/dev/null)
        PENDING=$(echo "$TASKS_JSON" | jq -r '.data.pending // 0' 2>/dev/null)
        IN_PROGRESS=$(echo "$TASKS_JSON" | jq -r '.data.in_progress // 0' 2>/dev/null)
        echo "  Progress: ${COMPLETED}/${TOTAL} completed, ${IN_PROGRESS} in progress, ${PENDING} pending"
      fi

      # Show next task if in implement phase
      if [ "$PHASE" = "implement" ]; then
        NEXT_TASK_JSON=$(ralph-dev tasks next --json 2>/dev/null)
        if [ $? -eq 0 ]; then
          NEXT_TASK_ID=$(echo "$NEXT_TASK_JSON" | jq -r '.task.id // "none"' 2>/dev/null)
          if [ "$NEXT_TASK_ID" != "none" ] && [ "$NEXT_TASK_ID" != "null" ]; then
            echo "  Next Task: ${NEXT_TASK_ID}"
          fi
        fi
      fi
      echo ""
    fi
  fi
fi

exit 0
