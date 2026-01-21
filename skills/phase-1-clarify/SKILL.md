---
name: phase-1-clarify
description: Interactive requirement clarification through structured questions and PRD generation
allowed-tools: [Read, Write, Bash, AskUserQuestion]
user-invocable: false
---

# Phase 1: Clarify Requirements

## Goal

Transform user requirements into a comprehensive PRD (Product Requirements Document) that preserves all context from prior conversations.

## Core Principle

**Context preservation is the primary goal.** If the user discussed UI layouts, data models, or design decisions before invoking `/ralph-dev`, that information MUST be captured in the PRD - not lost.

## Workflow

### 1. Extract Context First (CRITICAL)

Before asking ANY questions, scan the conversation history for:

- **UI/UX**: layouts, wireframes, pages, components, design decisions
- **Data**: entities, models, schemas, fields, relationships
- **API**: endpoints, requests, responses, authentication
- **Flows**: user journeys, processes, interactions
- **Decisions**: choices made, alternatives considered, trade-offs accepted

Convert discussions into structured formats:
- Layout descriptions → ASCII wireframes
- Data discussions → TypeScript interfaces
- API discussions → Endpoint specifications
- Decisions → Decision log with rationale

### 2. Identify Gaps

After extraction, determine what's MISSING:
- Tech stack? Scale? Authentication? Deployment?
- Only ask about information NOT already discussed

### 3. Confirm & Ask

If context was extracted:
1. Show summary of what was extracted
2. Ask user to confirm accuracy
3. Only ask questions for gaps

If no prior context:
- Ask standard clarification questions (app type, tech stack, scale, auth)

**Tool**: Use `AskUserQuestion` with max 4 questions per call, each with `header` (≤12 chars), `multiSelect`, and 2-4 `options`.

### 4. Generate PRD

Create a comprehensive PRD that includes:

1. **Project Overview** - Goals, scope, constraints
2. **Technical Stack** - Language, frameworks, database, deployment
3. **UI/UX Design** - Wireframes, components, design tokens (if discussed)
4. **Data Model** - Entities, relationships, schemas (if discussed)
5. **API Contracts** - Endpoints, auth, errors (if discussed)
6. **User Flows** - Key journeys, edge cases (if discussed)
7. **User Stories** - Epics and stories with acceptance criteria
8. **Design Decisions** - Choices made with rationale (if discussed)
9. **Non-Functional Requirements** - Performance, security, testing
10. **Appendix: Context Summary** - Key points from conversation

**Note**: Sections 3-6 and 8 are only needed if relevant context was discussed. Don't pad with generic content.

### 5. Save & Transition

```bash
# Backup existing PRD if present
# Save to .ralph-dev/prd.md
# Update state: ralph-dev state update --phase breakdown
```

## Constraints

- **NEVER** lose context from prior discussions
- **NEVER** ask questions about information already provided
- **NEVER** generate generic filler content - only include what's relevant
- **ALWAYS** use `AskUserQuestion` tool, not plain text questions
- **ALWAYS** confirm extracted context before proceeding

## Output

Return structured result:
```yaml
---PHASE RESULT---
phase: clarify
status: complete
prd_file: .ralph-dev/prd.md
context_extracted: true/false
next_phase: breakdown
---END PHASE RESULT---
```

## Error Handling

| Error | Action |
|-------|--------|
| User cancels | Save partial state, return status: cancelled |
| Context extraction unclear | Ask user to clarify specific points |
| PRD generation fails | Use minimal viable PRD with available info |
