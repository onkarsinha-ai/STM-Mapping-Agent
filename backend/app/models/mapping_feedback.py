import uuid
from datetime import datetime
from sqlalchemy import Column, Text, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum

class UserAction(str, enum.Enum):
    approved = "approved"
    rejected = "rejected"
    modified = "modified"

class MappingFeedback(Base):
    __tablename__ = "mapping_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mapping_id = Column(UUID(as_uuid=True), ForeignKey("mappings.id"), nullable=False)
    user_action = Column(Enum(UserAction), nullable=False)
    user_notes = Column(Text, nullable=True)
    original_proposal = Column(JSON, default=dict)
    final_state = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
