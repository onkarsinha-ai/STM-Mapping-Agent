from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, Dict, Any
from app.models.connection import ConnectionType, DBType


class ConnectionCreate(BaseModel):
    name: str
    connection_type: ConnectionType
    db_type: Optional[DBType] = None
    provider: Optional[str] = None
    params: Dict[str, Any]


class ConnectionResponse(BaseModel):
    id: UUID
    name: str
    connection_type: str
    db_type: Optional[str]
    provider: Optional[str]
    is_tested: bool
    metadata: Optional[Dict[str, Any]] = Field(None, validation_alias="connection_metadata")

    class Config:
        from_attributes = True


class ConnectionTestRequest(BaseModel):
    connection_type: str
    provider: Optional[str] = None
    db_type: Optional[DBType] = None
    params: Dict[str, Any]


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
