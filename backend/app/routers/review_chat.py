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
