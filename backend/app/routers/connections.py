from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.connection import Connection
from app.services.connection_service import ConnectionService
from app.schemas.connection import ConnectionCreate, ConnectionResponse, ConnectionTestRequest, ConnectionTestResponse

router = APIRouter(prefix="/connections", tags=["connections"])


@router.get("/", response_model=List[ConnectionResponse])
async def list_connections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connection))
    connections = result.scalars().all()
    return connections


@router.post("/test", response_model=ConnectionTestResponse)
async def test_connection(request: ConnectionTestRequest):
    result = await ConnectionService.test_connection(request.params)
    return ConnectionTestResponse(success=result.success, message=result.message)


@router.post("/", response_model=ConnectionResponse)
async def create_connection(data: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    # For MVP, use a hardcoded user_id
    user_id = "00000000-0000-0000-0000-000000000001"
    conn = await ConnectionService.create_connection(
        user_id=user_id,
        name=data.name,
        connection_type=data.connection_type,
        db_type=data.db_type,
        params=data.params
    )
    return conn


@router.delete("/{connection_id}")
async def delete_connection(connection_id: str, db: AsyncSession = Depends(get_db)):
    conn = await db.get(Connection, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)
    await db.commit()
    return {"message": "Connection deleted"}
