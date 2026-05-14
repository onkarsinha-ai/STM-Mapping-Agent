from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.models.mapping import MappingStatus


class MappingUpdate(BaseModel):
    status: MappingStatus
    source_table: Optional[str] = None
    source_column: Optional[str] = None
    business_logic: Optional[str] = None
    transformation_rule: Optional[str] = None


class MappingResponse(BaseModel):
    id: UUID
    target_table: str
    target_column: str
    source_table: Optional[str]
    source_column: Optional[str]
    business_logic: Optional[str]
    transformation_rule: Optional[str]
    confidence_score: Optional[float]
    status: str
    llm_reasoning: Optional[str]

    class Config:
        from_attributes = True
