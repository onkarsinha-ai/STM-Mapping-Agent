import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum, ForeignKey, JSON, Uuid
from app.database import Base
import enum

class ObjectType(str, enum.Enum):
    table = "table"
    column = "column"
    constraint = "constraint"
    index = "index"

class SchemaCache(Base):
    __tablename__ = "schema_cache"

    id = Column(Uuid(as_uuid=False), primary_key=True, default=uuid.uuid4)
    connection_id = Column(Uuid(as_uuid=False), ForeignKey("connections.id"), nullable=True)
    project_id = Column(Uuid(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    object_type = Column(Enum(ObjectType), nullable=False)
    schema_name = Column(String(255), nullable=True)
    table_name = Column(String(255), nullable=True)
    column_name = Column(String(255), nullable=True)
    data_type = Column(String(255), nullable=True)
    is_nullable = Column(Boolean, nullable=True)
    column_default = Column(Text, nullable=True)
    is_target = Column(Boolean, nullable=True)
    sample_data = Column(JSON, default=list)
    stats = Column(JSON, default=dict)
    fetched_at = Column(DateTime, default=datetime.utcnow)
