# Review Phase AI Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional AI Review Assistant chat drawer to the Review phase, where users can chat with an AI about mappings and the AI can directly modify them.

**Architecture:** A right-side drawer in the Review phase holds the chat. Backend persists messages per-project, builds LLM prompts with full mapping context, parses JSON action blocks from AI responses to apply mapping updates. Export remains always-available.

**Tech Stack:** FastAPI, SQLAlchemy (async), Alembic, PostgreSQL, React + Vite, TanStack Query, LiteLLM

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `backend/app/models/review_chat.py` | Create | ReviewChatMessage ORM model |
| `backend/app/schemas/review_chat.py` | Create | Pydantic schemas for chat API |
| `backend/app/services/review_chat_service.py` | Create | Core chat logic: prompt building, LLM call, action parsing, mapping updates |
| `backend/app/routers/review_chat.py` | Create | FastAPI endpoints for chat history, send message, finish review |
| `backend/alembic/versions/20260517_add_review_chat.py` | Create | Alembic migration for new table + column |
| `backend/tests/unit/test_review_chat_service.py` | Create | Unit tests for service layer |
| `backend/app/models/project.py` | Modify | Add `review_chat_completed` boolean field |
| `backend/app/schemas/project.py` | Modify | Add `review_chat_completed` to ProjectResponse |
| `backend/app/main.py` | Modify | Register review_chat router |
| `frontend/src/services/api.ts` | Modify | Add `reviewChatApi` with 3 endpoints |
| `frontend/src/components/mappings/ReviewChatDrawer.tsx` | Create | Chat drawer UI component |
| `frontend/src/components/mappings/MappingTable.tsx` | Modify | Add "AI Review Assistant" button to toolbar |
| `frontend/src/pages/ProjectPage.tsx` | Modify | Integrate drawer, pass project data |

---

### Task 1: Database Model & Migration

**Files:**
- Create: `backend/app/models/review_chat.py`
- Modify: `backend/app/models/project.py`
- Create: `backend/alembic/versions/20260517_add_review_chat.py`
- Test: `backend/tests/unit/test_review_chat_models.py`

- [ ] **Step 1: Write ReviewChatMessage model**

```python
# backend/app/models/review_chat.py
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, DateTime, JSON, Uuid
from app.database import Base


class ChatRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class ReviewChatMessage(Base):
    __tablename__ = "review_chat_messages"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=uuid.uuid4)
    project_id = Column(Uuid(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    role = Column(Enum(ChatRole), nullable=False)
    content = Column(Text, nullable=False)
    mapping_changes = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 2: Add review_chat_completed to Project model**

```python
# backend/app/models/project.py — add inside Project class
    review_chat_completed = Column(String(10), default="false", nullable=True)
```

Place it after `target_schema` and before `created_at`.

- [ ] **Step 3: Create Alembic migration**

```python
# backend/alembic/versions/20260517_add_review_chat.py
"""add review chat messages and review_chat_completed flag

Revision ID: 20260517
Revises: 774374b3a14e
Create Date: 2026-05-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20260517'
down_revision = '774374b3a14e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('review_chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.Enum('user', 'assistant', name='chatrole'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('mapping_changes', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.add_column('projects', sa.Column('review_chat_completed', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'review_chat_completed')
    op.drop_table('review_chat_messages')
    op.execute("DROP TYPE IF EXISTS chatrole")
```

- [ ] **Step 4: Run migration**

```bash
cd backend
docker-compose exec backend alembic upgrade head
```

Expected: migration completes without errors.

- [ ] **Step 5: Write model test**

```python
# backend/tests/unit/test_review_chat_models.py
import pytest
from app.models.review_chat import ReviewChatMessage, ChatRole


def test_chat_role_enum():
    assert ChatRole.user.value == "user"
    assert ChatRole.assistant.value == "assistant"
```

- [ ] **Step 6: Run test**

```bash
docker-compose exec backend pytest tests/unit/test_review_chat_models.py -v
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/review_chat.py backend/app/models/project.py backend/alembic/versions/20260517_add_review_chat.py backend/tests/unit/test_review_chat_models.py
git commit -m "feat(review-chat): add ReviewChatMessage model and migration"
```

---

### Task 2: Schemas

**Files:**
- Create: `backend/app/schemas/review_chat.py`
- Modify: `backend/app/schemas/project.py`
- Test: `backend/tests/unit/test_review_chat_schemas.py`

- [ ] **Step 1: Write chat schemas**

```python
# backend/app/schemas/review_chat.py
from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import datetime


class ReviewChatMessageCreate(BaseModel):
    content: str


class ReviewChatMessageResponse(BaseModel):
    id: UUID
    project_id: UUID
    role: str
    content: str
    mapping_changes: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSendRequest(BaseModel):
    message: str


class ChatSendResponse(BaseModel):
    response: str
    mapping_changes: Optional[List[Dict[str, Any]]] = None
```

- [ ] **Step 2: Update ProjectResponse schema**

```python
# backend/app/schemas/project.py — add inside ProjectResponse
    review_chat_completed: Optional[str] = None
```

Add it after `target_schema` and before `class Config`.

- [ ] **Step 3: Write schema test**

```python
# backend/tests/unit/test_review_chat_schemas.py
from app.schemas.review_chat import ReviewChatMessageCreate, ChatSendRequest


def test_review_chat_message_create():
    msg = ReviewChatMessageCreate(content="Hello")
    assert msg.content == "Hello"


def test_chat_send_request():
    req = ChatSendRequest(message="Update mapping 1")
    assert req.message == "Update mapping 1"
```

- [ ] **Step 4: Run tests**

```bash
docker-compose exec backend pytest tests/unit/test_review_chat_schemas.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/review_chat.py backend/app/schemas/project.py backend/tests/unit/test_review_chat_schemas.py
git commit -m "feat(review-chat): add chat schemas and update ProjectResponse"
```

---

### Task 3: Review Chat Service

**Files:**
- Create: `backend/app/services/review_chat_service.py`
- Modify: `backend/app/services/mapping_engine.py` (add direct update method)
- Test: `backend/tests/unit/test_review_chat_service.py`

- [ ] **Step 1: Write failing test for build_prompt**

```python
# backend/tests/unit/test_review_chat_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from app.services.review_chat_service import ReviewChatService


def test_build_system_prompt_with_mappings():
    mappings = [
        {
            "id": "map-1",
            "target_table": "customers",
            "target_column": "cust_id",
            "source_table": "users",
            "source_column": "id",
            "business_logic": "Direct map",
            "confidence_score": 0.95,
            "status": "proposed"
        }
    ]
    prompt = ReviewChatService._build_system_prompt(mappings)
    assert "customers.cust_id" in prompt
    assert "users.id" in prompt
    assert "Direct map" in prompt
    assert "mapping review assistant" in prompt.lower()


def test_build_system_prompt_empty_mappings():
    prompt = ReviewChatService._build_system_prompt([])
    assert "No mappings" in prompt


def test_parse_actions_from_response_no_actions():
    response = "This looks good to me."
    actions = ReviewChatService._parse_actions_from_response(response)
    assert actions == []


def test_parse_actions_from_response_with_actions():
    response = '''I updated the mapping.

```json
{"actions": [{"mapping_id": "map-1", "updates": {"source_column": "user_id"}}]}
```'''
    actions = ReviewChatService._parse_actions_from_response(response)
    assert len(actions) == 1
    assert actions[0]["mapping_id"] == "map-1"
    assert actions[0]["updates"]["source_column"] == "user_id"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker-compose exec backend pytest tests/unit/test_review_chat_service.py -v
```

Expected: FAIL with "ReviewChatService not defined"

- [ ] **Step 3: Write ReviewChatService**

```python
# backend/app/services/review_chat_service.py
import json
import re
from typing import List, Dict, Any, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.review_chat import ReviewChatMessage, ChatRole
from app.models.mapping import Mapping
from app.models.project import Project
from app.models.connection import Connection
from app.services.llm_orchestrator import LLMOrchestrator
from app.services.mapping_engine import MappingEngine
from app.database import AsyncSessionLocal


class ReviewChatService:
    @staticmethod
    def _build_system_prompt(mappings: List[Dict[str, Any]]) -> str:
        if not mappings:
            mapping_text = "No mappings have been proposed yet."
        else:
            lines = []
            for m in mappings:
                lines.append(
                    f"- ID: {m['id']} | {m['target_table']}.{m['target_column']} <- "
                    f"{m.get('source_table', 'N/A')}.{m.get('source_column', 'N/A')} | "
                    f"logic: {m.get('business_logic', 'N/A')} | "
                    f"confidence: {m.get('confidence_score', 'N/A')} | "
                    f"status: {m.get('status', 'N/A')}"
                )
            mapping_text = "\n".join(lines)

        return f"""You are a mapping review assistant. You help users review and improve their data column mappings.

Here are all current mappings for this project:
{mapping_text}

You can:
1. Answer questions about why a mapping was proposed
2. Suggest better source columns or transformation logic
3. Directly update mappings when the user asks you to

When updating a mapping, respond naturally AND include a JSON action block like this:
```json
{{"actions": [{{"mapping_id": "<uuid>", "updates": {{"source_column": "new_value", "business_logic": "new logic"}}}}]}}
```

You may update these fields: source_table, source_column, business_logic, transformation_rule.
Do not include the JSON block unless you actually made changes.
"""

    @staticmethod
    def _parse_actions_from_response(response: str) -> List[Dict[str, Any]]:
        # Look for JSON block in markdown code fences
        pattern = r'```json\s*\n?(.*?)\n?```'
        matches = re.findall(pattern, response, re.DOTALL)

        for match in matches:
            try:
                data = json.loads(match.strip())
                if isinstance(data, dict) and "actions" in data:
                    return data["actions"]
            except json.JSONDecodeError:
                continue

        # Fallback: look for raw JSON object with actions key
        pattern2 = r'\{\s*"actions"\s*:.*\}'
        match2 = re.search(pattern2, response, re.DOTALL)
        if match2:
            try:
                data = json.loads(match2.group())
                return data.get("actions", [])
            except json.JSONDecodeError:
                pass

        return []

    @staticmethod
    async def _apply_mapping_actions(actions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        applied = []
        for action in actions:
            mapping_id = action.get("mapping_id")
            updates = action.get("updates", {})
            if not mapping_id or not updates:
                continue

            # Filter to allowed fields
            allowed = {"source_table", "source_column", "business_logic", "transformation_rule"}
            modifications = {k: v for k, v in updates.items() if k in allowed}
            if not modifications:
                continue

            try:
                await MappingEngine.update_mapping_status(
                    mapping_id,
                    "modify",
                    modifications
                )
                applied.append({"mapping_id": mapping_id, "updates": modifications})
            except Exception:
                # Log and continue — don't fail the whole chat
                pass

        return applied

    @staticmethod
    async def send_message(
        project_id: str,
        user_message: str,
        db: AsyncSession
    ) -> Tuple[str, List[Dict[str, Any]]]:
        # Save user message
        user_msg = ReviewChatMessage(
            project_id=project_id,
            role=ChatRole.user,
            content=user_message
        )
        db.add(user_msg)
        await db.commit()

        # Fetch project for LLM config
        project = await db.get(Project, project_id)
        if not project:
            raise ValueError("Project not found")
        if not project.llm_connection_id:
            raise ValueError("LLM connection not configured")

        # Fetch LLM config
        conn = await db.get(Connection, str(project.llm_connection_id))
        if not conn:
            raise ValueError("LLM connection not found")

        import json as _json
        from app.core.encryption import decrypt
        params = _json.loads(decrypt(conn.encrypted_connection_string))
        llm_config = {
            "api_key": params.get("api_key"),
            "model": params.get("model", "gpt-4"),
            "base_url": params.get("base_url"),
            "provider": conn.provider,
        }

        # Fetch all mappings for this project
        result = await db.execute(select(Mapping).where(Mapping.project_id == project_id))
        mappings = result.scalars().all()
        mapping_dicts = [
            {
                "id": str(m.id),
                "target_table": m.target_table,
                "target_column": m.target_column,
                "source_table": m.source_table,
                "source_column": m.source_column,
                "business_logic": m.business_logic,
                "confidence_score": float(m.confidence_score) if m.confidence_score else None,
                "status": m.status.value
            }
            for m in mappings
        ]

        # Build messages for LLM
        system_prompt = ReviewChatService._build_system_prompt(mapping_dicts)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]

        # Call LLM
        litellm_model = LLMOrchestrator._build_litellm_model(
            llm_config.get("provider"),
            llm_config.get("model"),
            llm_config.get("base_url")
        )

        import litellm
        response = await litellm.acompletion(
            model=litellm_model,
            messages=messages,
            api_key=llm_config.get("api_key"),
            api_base=llm_config.get("base_url"),
            max_tokens=2048
        )
        ai_text = response.choices[0].message.content

        # Parse and apply actions
        actions = ReviewChatService._parse_actions_from_response(ai_text)
        applied = await ReviewChatService._apply_mapping_actions(actions)

        # Save assistant message
        assistant_msg = ReviewChatMessage(
            project_id=project_id,
            role=ChatRole.assistant,
            content=ai_text,
            mapping_changes=applied if applied else None
        )
        db.add(assistant_msg)
        await db.commit()

        return ai_text, applied

    @staticmethod
    async def get_history(project_id: str, db: AsyncSession) -> List[ReviewChatMessage]:
        result = await db.execute(
            select(ReviewChatMessage)
            .where(ReviewChatMessage.project_id == project_id)
            .order_by(ReviewChatMessage.created_at)
        )
        return result.scalars().all()

    @staticmethod
    async def finish_review(project_id: str, db: AsyncSession) -> Project:
        project = await db.get(Project, project_id)
        if not project:
            raise ValueError("Project not found")
        project.review_chat_completed = "true"
        await db.commit()
        await db.refresh(project)
        return project
```

- [ ] **Step 4: Add direct update method to MappingEngine**

```python
# backend/app/services/mapping_engine.py — add after update_mapping_status

    @staticmethod
    async def update_mapping_fields(mapping_id: str, modifications: dict) -> Mapping:
        async with AsyncSessionLocal() as session:
            mapping = await session.get(Mapping, mapping_id)
            if not mapping:
                raise ValueError(f"Mapping {mapping_id} not found")

            original = {
                "source_table": mapping.source_table,
                "source_column": mapping.source_column,
                "business_logic": mapping.business_logic,
                "transformation_rule": mapping.transformation_rule
            }

            for key, value in modifications.items():
                if hasattr(mapping, key):
                    setattr(mapping, key, value)

            mapping.status = MappingStatus.modified

            feedback = MappingFeedback(
                mapping_id=mapping_id,
                user_action=UserAction.modified,
                original_proposal=original,
                final_state={
                    "source_table": mapping.source_table,
                    "source_column": mapping.source_column,
                    "business_logic": mapping.business_logic,
                    "transformation_rule": mapping.transformation_rule
                }
            )
            session.add(feedback)
            await session.commit()
            await session.refresh(mapping)
            return mapping
```

- [ ] **Step 5: Update MappingEngine.update_mapping_status to use update_mapping_fields**

Replace the inline modification logic in `update_mapping_status` with a call to the new method:

```python
# In update_mapping_status, replace the modification branch:
            elif action == "modify" and modifications:
                return await MappingEngine.update_mapping_fields(mapping_id, modifications)
```

- [ ] **Step 6: Run tests**

```bash
docker-compose exec backend pytest tests/unit/test_review_chat_service.py -v
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/review_chat_service.py backend/app/services/mapping_engine.py backend/tests/unit/test_review_chat_service.py
git commit -m "feat(review-chat): add ReviewChatService with prompt building, LLM call, and action parsing"
```

---

### Task 4: API Router

**Files:**
- Create: `backend/app/routers/review_chat.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/unit/test_review_chat_router.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/unit/test_review_chat_router.py
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.mark.asyncio
async def test_get_chat_history():
    with patch('app.routers.review_chat.ReviewChatService.get_history') as mock_get:
        mock_get.return_value = []
        response = client.get("/projects/proj-123/review-chat")
        assert response.status_code == 200
        assert response.json() == []


@pytest.mark.asyncio
async def test_send_chat_message():
    with patch('app.routers.review_chat.ReviewChatService.send_message') as mock_send:
        mock_send.return_value = ("Hello!", [])
        response = client.post("/projects/proj-123/review-chat", json={"message": "hi"})
        assert response.status_code == 200
        assert response.json()["response"] == "Hello!"


@pytest.mark.asyncio
async def test_finish_review():
    with patch('app.routers.review_chat.ReviewChatService.finish_review') as mock_finish:
        mock_project = AsyncMock()
        mock_project.review_chat_completed = "true"
        mock_finish.return_value = mock_project
        response = client.post("/projects/proj-123/finish-review")
        assert response.status_code == 200
        assert response.json()["review_chat_completed"] == "true"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker-compose exec backend pytest tests/unit/test_review_chat_router.py -v
```

Expected: FAIL with "review_chat" router not found or 404

- [ ] **Step 3: Write router**

```python
# backend/app/routers/review_chat.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models.project import Project
from app.schemas.review_chat import (
    ReviewChatMessageResponse,
    ChatSendRequest,
    ChatSendResponse
)
from app.services.review_chat_service import ReviewChatService

router = APIRouter(prefix="/projects", tags=["review-chat"])


@router.get("/{project_id}/review-chat", response_model=List[ReviewChatMessageResponse])
async def get_chat_history(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    messages = await ReviewChatService.get_history(project_id, db)
    return messages


@router.post("/{project_id}/review-chat", response_model=ChatSendResponse)
async def send_chat_message(
    project_id: str,
    request: ChatSendRequest,
    db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.llm_connection_id:
        raise HTTPException(status_code=400, detail="LLM connection not configured")

    try:
        response_text, changes = await ReviewChatService.send_message(
            project_id, request.message, db
        )
        return ChatSendResponse(response=response_text, mapping_changes=changes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM failed: {str(e)}")


@router.post("/{project_id}/finish-review")
async def finish_review(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        updated = await ReviewChatService.finish_review(project_id, db)
        return {
            "message": "Review marked as complete",
            "review_chat_completed": updated.review_chat_completed
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

- [ ] **Step 4: Register router in main.py**

```python
# backend/app/main.py — add import
from app.routers import auth, connections, projects, discovery, mappings, export, files, review_chat

# And add:
app.include_router(review_chat.router)
```

- [ ] **Step 5: Run tests**

```bash
docker-compose exec backend pytest tests/unit/test_review_chat_router.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/review_chat.py backend/app/main.py backend/tests/unit/test_review_chat_router.py
git commit -m "feat(review-chat): add chat API endpoints"
```

---

### Task 5: Frontend API Layer

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add reviewChatApi**

```typescript
// frontend/src/services/api.ts — add after exportApi

// Review Chat APIs
export const reviewChatApi = {
  getHistory: (projectId: string) => api.get(`/projects/${projectId}/review-chat`),
  sendMessage: (projectId: string, message: string) =>
    api.post(`/projects/${projectId}/review-chat`, { message }),
  finishReview: (projectId: string) =>
    api.post(`/projects/${projectId}/finish-review`)
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat(review-chat): add reviewChatApi to frontend services"
```

---

### Task 6: Frontend Drawer Component

**Files:**
- Create: `frontend/src/components/mappings/ReviewChatDrawer.tsx`
- Test: Verify manually in browser

- [ ] **Step 1: Write ReviewChatDrawer component**

```tsx
// frontend/src/components/mappings/ReviewChatDrawer.tsx
import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewChatApi } from '../../services/api'
import { Send, Bot, User, Loader2, X, Sparkles, CheckCircle } from 'lucide-react'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  mapping_changes?: any[]
}

interface ReviewChatDrawerProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function ReviewChatDrawer({ projectId, isOpen, onClose }: ReviewChatDrawerProps) {
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [finishing, setFinishing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['review-chat', projectId],
    queryFn: () => reviewChatApi.getHistory(projectId),
    enabled: isOpen && !!projectId
  })

  useEffect(() => {
    if (historyData?.data) {
      setLocalMessages(historyData.data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        mapping_changes: m.mapping_changes
      })))
    }
  }, [historyData])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  const handleSend = async () => {
    if (!input.trim() || sending) return

    const userMsg = input.trim()
    setLocalMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setSending(true)

    try {
      const res = await reviewChatApi.sendMessage(projectId, userMsg)
      setLocalMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        mapping_changes: res.data.mapping_changes
      }])
      // Refresh mappings table since AI may have updated mappings
      queryClient.invalidateQueries({ queryKey: ['mappings', projectId] })
    } catch (e: any) {
      setLocalMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    }

    setSending(false)
  }

  const handleFinishReview = async () => {
    setFinishing(true)
    try {
      await reviewChatApi.finishReview(projectId)
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      onClose()
    } catch (e) {
      alert('Failed to finish review')
    }
    setFinishing(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col animate-slide-in-right"
        style={{
          width: '400px',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              AI Review Assistant
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
          {historyLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}

          {localMessages.length === 0 && !historyLoading && (
            <div className="text-center py-8">
              <Bot size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Hi! I'm your mapping review assistant.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Ask me about any mapping — I can explain logic, suggest improvements, or update mappings.
              </p>
            </div>
          )}

          {localMessages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-surface-hover)'
                }}
              >
                {msg.role === 'user' ? (
                  <User size={16} style={{ color: 'var(--accent)' }} />
                ) : (
                  <Bot size={16} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <div className="max-w-[80%]">
                <div
                  className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={{
                    backgroundColor: msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-surface-hover)',
                    color: 'var(--text-primary)',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                  }}
                >
                  {msg.content}
                </div>
                {msg.mapping_changes && msg.mapping_changes.length > 0 && (
                  <div
                    className="mt-1.5 text-xs px-2 py-1 rounded-md inline-flex items-center gap-1"
                    style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)' }}
                  >
                    <CheckCircle size={12} />
                    Updated {msg.mapping_changes.length} mapping{msg.mapping_changes.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-surface-hover)' }}
              >
                <Bot size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div
                className="px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-surface-hover)',
                  color: 'var(--text-muted)',
                  borderRadius: '16px 16px 16px 4px'
                }}
              >
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={handleFinishReview}
            disabled={finishing || localMessages.length === 0}
            className="w-full btn-primary py-2 text-sm"
          >
            {finishing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Finishing...
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                Finish Review
              </>
            )}
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Ask about your mappings..."
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm border outline-none focus:ring-1"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                caretColor: 'var(--accent)'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="btn-primary px-4"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add drawer animation to CSS**

Check `frontend/src/index.css` or global styles for animations. Add if missing:

```css
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.animate-slide-in-right {
  animation: slide-in-right 0.2s ease-out;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/mappings/ReviewChatDrawer.tsx frontend/src/index.css
git commit -m "feat(review-chat): add ReviewChatDrawer component"
```

---

### Task 7: Frontend Integration — MappingTable

**Files:**
- Modify: `frontend/src/components/mappings/MappingTable.tsx`

- [ ] **Step 1: Add AI Review Assistant button and drawer**

```tsx
// frontend/src/components/mappings/MappingTable.tsx
// Add imports at top:
import { Sparkles } from 'lucide-react'
import { ReviewChatDrawer } from './ReviewChatDrawer'

// Add state inside MappingTable:
const [drawerOpen, setDrawerOpen] = useState(false)

// In the toolbar, add the AI Review Assistant button before Export:
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="btn-secondary flex items-center gap-1.5"
          >
            <Sparkles size={16} />
            AI Review Assistant
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary"
          >
            {/* existing export button content */}
          </button>
        </div>

// Add drawer at the end of the returned JSX:
      <ReviewChatDrawer
        projectId={projectId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/mappings/MappingTable.tsx
git commit -m "feat(review-chat): integrate AI Review Assistant button into MappingTable"
```

---

### Task 8: Frontend Integration — ProjectPage

**Files:**
- Modify: `frontend/src/pages/ProjectPage.tsx`

- [ ] **Step 1: Import ReviewChatDrawer**

```tsx
// frontend/src/pages/ProjectPage.tsx
import { ReviewChatDrawer } from '../components/mappings/ReviewChatDrawer'
```

- [ ] **Step 2: Add drawer state and pass to MappingTable (if not already done in Task 7)**

Actually, the drawer is already inside MappingTable from Task 7. No changes needed here unless you want the drawer at the ProjectPage level. Since the spec says the drawer is part of the MappingTable toolbar, Task 7 covers it.

However, if you want the drawer accessible from the Export phase too, add it there as well. But per the design, the AI Review Assistant is primarily a Review phase feature.

Skip this task if Task 7 placement is sufficient. If you want it at ProjectPage level instead, move the drawer from MappingTable to ProjectPage and pass `setDrawerOpen` to MappingTable.

- [ ] **Step 3: Commit (if changes made)**

---

### Task 9: End-to-End Verification

- [ ] **Step 1: Rebuild and start services**

```bash
docker-compose down
docker-compose up --build -d
```

- [ ] **Step 2: Run all backend tests**

```bash
docker-compose exec backend pytest tests/unit/ -v
```

Expected: All tests pass.

- [ ] **Step 3: Manual test in browser**

1. Open `http://localhost:5173`
2. Navigate to a project in Review phase
3. Click "AI Review Assistant" button — drawer should slide open
4. Send a message — AI should respond with mapping context
5. Ask AI to update a mapping — verify mapping table refreshes
6. Click "Finish Review" — verify API call succeeds
7. Verify Export button still works

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "feat(review-chat): complete integration and verification"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Reactive chat in Review phase — Task 6, 7
- ✅ AI has full mapping context — Task 3 `_build_system_prompt`
- ✅ AI can modify mappings — Task 3 `_apply_mapping_actions`
- ✅ "Finish Review" button — Task 3 `finish_review`, Task 6 UI
- ✅ Chat history persisted — Task 1 model, Task 3 `get_history`
- ✅ Export always available — Task 7 (no gating logic)
- ✅ Drawer UI — Task 6

**2. Placeholder scan:** No TBD, TODO, or vague steps found.

**3. Type consistency:**
- `review_chat_completed` is `Optional[str]` in schema (matches model's `String(10)`)
- `ChatRole` enum used consistently in model and service
- API paths use `/projects/{id}/review-chat` consistently

**4. Gap found and fixed:** Added `update_mapping_fields` to MappingEngine (Task 3 Step 4) so the service doesn't duplicate feedback-recording logic.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-17-review-phase-ai-chat.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
