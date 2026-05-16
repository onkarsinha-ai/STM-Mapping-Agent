import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, Text, Enum, ForeignKey, DateTime, JSON, Uuid
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
