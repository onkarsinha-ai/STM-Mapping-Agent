from pydantic import BaseModel, model_validator
from uuid import UUID
from typing import Optional, List, Dict, Any
from app.models.project import ProjectStatus, ProjectPhase


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source_connection_id: Optional[UUID] = None
    target_connection_id: Optional[UUID] = None
    jira_connection_id: Optional[UUID] = None
    llm_connection_id: Optional[UUID] = None
    jira_ticket_key: Optional[str] = None
    source_schemas: Optional[List[Dict[str, Any]]] = None
    target_schema: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def validate_source_and_target(self):
        has_db_source = self.source_connection_id is not None
        has_inline_source = self.source_schemas is not None and len(self.source_schemas) > 0
        if not has_db_source and not has_inline_source:
            raise ValueError("At least one source required (connection or file)")

        has_db_target = self.target_connection_id is not None
        has_inline_target = self.target_schema is not None
        if has_db_target and has_inline_target:
            raise ValueError("Cannot specify both target connection and target file")
        if not has_db_target and not has_inline_target:
            raise ValueError("Exactly one target required (connection or file)")

        return self


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    status: str
    current_phase: str
    source_connection_id: Optional[UUID]
    target_connection_id: Optional[UUID]
    source_schemas: Optional[List[Dict[str, Any]]] = None
    target_schema: Optional[Dict[str, Any]] = None
    review_chat_completed: Optional[str] = None

    class Config:
        from_attributes = True
