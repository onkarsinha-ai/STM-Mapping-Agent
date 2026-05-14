from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Dict, Any
from app.models.connection import ConnectionType, DBType


class ConnectionCreate(BaseModel):
    name: str
    connection_type: ConnectionType
    db_type: Optional[DBType] = None
    params: Dict[str, Any]


class ConnectionResponse(BaseModel):
    id: UUID
    name: str
    connection_type: str
    db_type: Optional[str]
    is_tested: bool

    class Config:
        from_attributes = True


class ConnectionTestRequest(BaseModel):
    db_type: DBType
    params: Dict[str, Any]


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
