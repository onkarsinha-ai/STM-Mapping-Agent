from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.models.project import ProjectStatus, ProjectPhase


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source_connection_id: Optional[UUID] = None
    target_connection_id: Optional[UUID] = None
    jira_connection_id: Optional[UUID] = None
    llm_connection_id: Optional[UUID] = None
    jira_ticket_key: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    status: str
    current_phase: str
    source_connection_id: Optional[UUID]
    target_connection_id: Optional[UUID]

    class Config:
        from_attributes = True
