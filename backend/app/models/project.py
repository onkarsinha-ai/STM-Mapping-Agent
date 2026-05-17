import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, DateTime, Uuid, JSON
from app.database import Base
import enum

class ProjectStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    archived = "archived"

class ProjectPhase(str, enum.Enum):
    input = "input"
    discovery = "discovery"
    propose = "propose"
    review = "review"
    export = "export"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=False), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.active)
    current_phase = Column(Enum(ProjectPhase), default=ProjectPhase.input)
    source_connection_id = Column(Uuid(as_uuid=False), ForeignKey("connections.id"), nullable=True)
    target_connection_id = Column(Uuid(as_uuid=False), ForeignKey("connections.id"), nullable=True)
    jira_connection_id = Column(Uuid(as_uuid=False), ForeignKey("connections.id"), nullable=True)
    llm_connection_id = Column(Uuid(as_uuid=False), ForeignKey("connections.id"), nullable=True)
    jira_ticket_key = Column(String(50), nullable=True)
    user_text_input = Column(Text, nullable=True)
    source_schemas = Column(JSON, default=list, nullable=True)
    target_schema = Column(JSON, default=dict, nullable=True)
    selected_source_tables = Column(JSON, default=list, nullable=True)
    selected_target_tables = Column(JSON, default=list, nullable=True)
    review_chat_completed = Column(String(10), default="false", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
