import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum

class ObjectType(str, enum.Enum):
    table = "table"
    column = "column"
    constraint = "constraint"
    index = "index"

class SchemaCache(Base):
    __tablename__ = "schema_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("connections.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    object_type = Column(Enum(ObjectType), nullable=False)
    schema_name = Column(String(255), nullable=True)
    table_name = Column(String(255), nullable=True)
    column_name = Column(String(255), nullable=True)
    data_type = Column(String(255), nullable=True)
    is_nullable = Column(Boolean, nullable=True)
    column_default = Column(Text, nullable=True)
    sample_data = Column(JSON, default=list)
    stats = Column(JSON, default=dict)
    fetched_at = Column(DateTime, default=datetime.utcnow)
