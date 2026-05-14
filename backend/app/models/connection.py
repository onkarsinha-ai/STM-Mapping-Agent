import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum

class ConnectionType(str, enum.Enum):
    source = "source"
    target = "target"
    jira = "jira"
    llm = "llm"

class DBType(str, enum.Enum):
    postgresql = "postgresql"
    mysql = "mysql"
    sqlserver = "sqlserver"
    oracle = "oracle"
    snowflake = "snowflake"
    bigquery = "bigquery"
    csv = "csv"
    parquet = "parquet"

class Connection(Base):
    __tablename__ = "connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    connection_type = Column(Enum(ConnectionType), nullable=False)
    db_type = Column(Enum(DBType), nullable=True)
    encrypted_connection_string = Column(Text, nullable=False)
    connection_metadata = Column("metadata", JSON, default=dict)
    is_tested = Column(Boolean, default=False)
    last_tested_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
