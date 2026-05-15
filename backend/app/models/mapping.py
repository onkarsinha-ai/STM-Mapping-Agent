import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, DateTime, Numeric, Uuid
from app.database import Base
import enum

class MappingStatus(str, enum.Enum):
    proposed = "proposed"
    approved = "approved"
    rejected = "rejected"
    modified = "modified"

class Mapping(Base):
    __tablename__ = "mappings"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=uuid.uuid4)
    project_id = Column(Uuid(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    target_connection_id = Column(Uuid(as_uuid=False), ForeignKey("connections.id"), nullable=True)
    target_schema = Column(String(255), nullable=True)
    target_table = Column(String(255), nullable=False)
    target_column = Column(String(255), nullable=False)
    source_connection_id = Column(Uuid(as_uuid=False), ForeignKey("connections.id"), nullable=True)
    source_schema = Column(String(255), nullable=True)
    source_table = Column(String(255), nullable=True)
    source_column = Column(String(255), nullable=True)
    business_logic = Column(Text, nullable=True)
    transformation_rule = Column(Text, nullable=True)
    confidence_score = Column(Numeric(3, 2), nullable=True)
    status = Column(Enum(MappingStatus), default=MappingStatus.proposed)
    llm_reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
