import uuid
from datetime import datetime
from sqlalchemy import Column, Text, Enum, ForeignKey, DateTime, JSON, Uuid
from app.database import Base
import enum

class UserAction(str, enum.Enum):
    approved = "approved"
    rejected = "rejected"
    modified = "modified"

class MappingFeedback(Base):
    __tablename__ = "mapping_feedback"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=uuid.uuid4)
    mapping_id = Column(Uuid(as_uuid=False), ForeignKey("mappings.id"), nullable=False)
    user_action = Column(Enum(UserAction), nullable=False)
    user_notes = Column(Text, nullable=True)
    original_proposal = Column(JSON, default=dict)
    final_state = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
