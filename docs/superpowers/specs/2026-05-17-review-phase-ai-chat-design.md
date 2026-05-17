# Review Phase AI Chat — Design Spec

## Overview
Add an optional AI Review Assistant chat drawer to the Review phase. Users can chat with an AI agent about their mappings — ask questions, get explanations, and request changes. The AI has full mapping context and can directly modify mappings. Chat history is persisted per-project.

## Context
- The project has a 5-phase stepper: Configure → Discovery → Propose → Review → Export
- The Review phase currently shows a MappingTable with approve/reject actions and an Export button
- There is an existing standalone LLM Chat page (`/chat`) for testing connections
- The backend uses LiteLLM with multiple provider support

## UI/UX Design

### Review Phase Layout
- **MappingTable toolbar** gets two buttons on the right:
  - **"AI Review Assistant"** (sparkle/robot icon) — opens the drawer
  - **"Export Excel"** — always available, not gated by chat
- Clicking **AI Review Assistant** slides open a **right-side drawer** (400px wide, full height, backdrop blur)

### Inside the Drawer
- **Header**: "AI Review Assistant" with a close (X) button
- **Messages area**: scrollable, shows persisted chat history per project
- Each AI message can optionally include a small "Mappings updated" pill if changes were made
- **Input area** at bottom: text field + send button, same styling as existing LLM Chat page
- **"Finish Review"** button pinned above the input, styled as primary. Clicking it:
  - Sets `review_chat_completed = true` on the project
  - Shows a toast: "Review marked as complete"
  - Optionally auto-advances stepper to Export phase

### Empty State
When the drawer opens with no messages, the AI sends an auto-generated welcome:
> "Hi! I'm your mapping review assistant. Ask me about any mapping — I can explain the logic, suggest better sources, or update mappings for you."

### Export Behavior
- Export button is always available in Review and Export phases
- The stepper still flows Review → Export as today
- AI chat is a value-add, not a hard requirement

## Backend Architecture

### New Database Table
```
review_chat_messages
  - id (uuid, pk)
  - project_id (uuid, fk → projects)
  - role (enum: 'user' | 'assistant')
  - content (text)
  - mapping_changes (json, nullable) — stores any mapping updates the AI made
  - created_at (timestamp)
```

### New Field on Project Model
```python
review_chat_completed: bool = False
```

### New API Endpoints
- `GET /projects/{id}/review-chat` — fetch message history for a project
- `POST /projects/{id}/review-chat` — send user message, get AI response (includes full mapping context)
- `POST /projects/{id}/finish-review` — mark review as complete (`review_chat_completed = true`)

## AI Agent Behavior

### System Prompt
Sent with every message. Includes all project mappings (id, target_table, target_column, source_table, source_column, business_logic, confidence_score, status).

### Capabilities
1. Answer questions about why a mapping was proposed
2. Suggest better source columns or transformation logic
3. Directly update mappings when explicitly asked

### Response Format
The AI responds with natural text. If it makes mapping changes, the backend parses a hidden JSON action block:

```json
{"actions": [{"mapping_id": "...", "field": "source_column", "value": "new_value"}]}
```

The backend:
- Applies changes via the existing `mapping_engine` / `mappingsApi.update()`
- Stores the actions in `mapping_changes` on the assistant message record
- Returns the response to the frontend

## Data Flow

1. User opens drawer → `GET /review-chat` loads history
2. User types message → `POST /review-chat` with message text
3. Backend:
   - Fetches all mappings for the project
   - Builds system prompt with full mapping context
   - Calls LLM via existing `llm_orchestrator`
   - Parses response for any JSON action blocks
   - Applies mapping updates
   - Saves assistant message with `mapping_changes`
   - Returns response
4. Frontend:
   - New message appears in drawer
   - Mappings table refreshes via React Query invalidation

## Error Handling

- **LLM call fails:** Return friendly error message in chat, don't block anything
- **Mapping update fails:** AI explains the failure, no partial updates committed
- **Invalid AI action JSON:** Log warning, ignore malformed actions, still return text response

## Testing Strategy

- **Backend:** Test chat endpoint with mocked LLM; verify mapping context is included in prompt; verify actions are parsed and applied correctly; verify history is persisted
- **Frontend:** Test drawer open/close, message send/receive, history load, Export button remains enabled

## Decisions

- **Optional, not gated:** AI chat is a helper tool. Export is always available.
- **Drawer, not inline:** Keeps mapping table uncluttered; familiar assistant pattern.
- **Structured JSON actions:** Allows AI to modify mappings without requiring full function-calling support from all LLM providers.
