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
