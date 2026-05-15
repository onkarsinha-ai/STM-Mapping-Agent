import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, JSON, Uuid
from app.database import Base

class JiraContext(Base):
    __tablename__ = "jira_context"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=uuid.uuid4)
    project_id = Column(Uuid(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    ticket_key = Column(String(50), nullable=False)
    ticket_summary = Column(Text, nullable=True)
    ticket_description = Column(Text, nullable=True)
    acceptance_criteria = Column(Text, nullable=True)
    labels = Column(JSON, default=list)
    fetched_at = Column(DateTime, default=datetime.utcnow)
