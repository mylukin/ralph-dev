#!/bin/bash
#
# Ralph-dev Stop Hook
# Prevents session exit when an active ralph-dev session is in progress
# Allows exit only when: no session exists OR phase == "complete"
#
# Based on ralph-loop technique: returns {"decision": "block"} to continue
#

set -euo pipefail

# Get project directory
TARGET_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
STATE_FILE="${TARGET_DIR}/.ralph-dev/state.json"

# ═══════════════════════════════════════════
# CONDITION 1: No state file = No session = Allow stop
# ═══════════════════════════════════════════

if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi

# ═══════════════════════════════════════════
# CONDITION 2: Check current phase
# ═══════════════════════════════════════════

# Read phase from state file
PHASE=$(jq -r '.phase // "none"' "$STATE_FILE" 2>/dev/null)

# If jq failed or phase is empty, allow stop (corrupted state)
if [[ $? -ne 0 ]] || [[ -z "$PHASE" ]]; then
  echo "⚠️  Ralph-dev: State file corrupted, allowing stop" >&2
  exit 0
fi

# ═══════════════════════════════════════════
# CONDITION 3: phase == "complete" = Allow stop
# ═══════════════════════════════════════════

if [[ "$PHASE" == "complete" ]]; then
  echo "✅ Ralph-dev: Session complete, allowing stop" >&2
  exit 0
fi

# ═══════════════════════════════════════════
# OTHERWISE: Block stop and resume workflow
# ═══════════════════════════════════════════

# Get current task info
CURRENT_TASK=$(jq -r '.currentTask // "none"' "$STATE_FILE" 2>/dev/null || echo "none")

# Get task progress
TASKS_JSON=$(ralph-dev tasks list --json 2>/dev/null || echo '{"data":{"total":0,"completed":0,"pending":0}}')
TOTAL=$(echo "$TASKS_JSON" | jq -r '.data.total // 0' 2>/dev/null || echo "0")
COMPLETED=$(echo "$TASKS_JSON" | jq -r '.data.completed // 0' 2>/dev/null || echo "0")
PENDING=$(echo "$TASKS_JSON" | jq -r '.data.pending // 0' 2>/dev/null || echo "0")

# Determine skill to invoke based on phase
case "$PHASE" in
  clarify)
    SKILL="ralph-dev:phase-1-clarify"
    ;;
  breakdown)
    SKILL="ralph-dev:phase-2-breakdown"
    ;;
  implement)
    SKILL="ralph-dev:phase-3-implement"
    ;;
  heal)
    SKILL="ralph-dev:phase-4-heal"
    ;;
  deliver)
    SKILL="ralph-dev:phase-5-deliver"
    ;;
  *)
    # Unknown phase, allow stop
    echo "⚠️  Ralph-dev: Unknown phase '$PHASE', allowing stop" >&2
    exit 0
    ;;
esac

# Build resume prompt
RESUME_PROMPT="Ralph-dev session in progress. Resume from current phase.

Current State:
- Phase: $PHASE
- Current Task: $CURRENT_TASK
- Progress: $COMPLETED/$TOTAL completed, $PENDING pending

To continue, invoke the appropriate skill:
Use Skill tool with: skill: \"$SKILL\"

Or query current state:
ralph-dev state get --json
ralph-dev tasks next --json"

# Build system message
SYSTEM_MSG="🔄 Ralph-dev session active | Phase: $PHASE | Progress: $COMPLETED/$TOTAL"

# Output JSON to block the stop and resume workflow
jq -n \
  --arg prompt "$RESUME_PROMPT" \
  --arg msg "$SYSTEM_MSG" \
  '{
    "decision": "block",
    "reason": $prompt,
    "systemMessage": $msg
  }'

exit 0
