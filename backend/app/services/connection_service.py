import json
from typing import Dict, Any, Optional
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.encryption import encrypt, decrypt
from app.database import AsyncSessionLocal
from app.models.connection import Connection, ConnectionType, DBType

@dataclass
class ConnectionTestResult:
    success: bool
    message: str

class ConnectionService:
    @staticmethod
    async def test_connection(params: Dict[str, Any]) -> ConnectionTestResult:
        db_type = params.get("db_type")
        try:
            if db_type == "postgresql":
                url = f"postgresql+asyncpg://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
            elif db_type == "mysql":
                url = f"mysql+aiomysql://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
            else:
                return ConnectionTestResult(False, f"Unsupported database type: {db_type}")
            
            engine = create_async_engine(url, echo=False)
            async with engine.connect() as conn:
                from sqlalchemy import text
                await conn.execute(text("SELECT 1"))
            await engine.dispose()
            return ConnectionTestResult(True, "Connection successful")
        except Exception as e:
            return ConnectionTestResult(False, str(e))

    @staticmethod
    async def create_connection(user_id: str, name: str, connection_type: ConnectionType, 
                                db_type: Optional[DBType], params: Dict[str, Any]) -> Connection:
        encrypted = encrypt(json.dumps(params))
        metadata = {k: v for k, v in params.items() if k not in ['password', 'api_key', 'token']}
        
        async with AsyncSessionLocal() as session:
            conn = Connection(
                user_id=user_id,
                name=name,
                connection_type=connection_type,
                db_type=db_type,
                encrypted_connection_string=encrypted,
                metadata=metadata
            )
            session.add(conn)
            await session.commit()
            await session.refresh(conn)
            return conn

    @staticmethod
    async def get_connection_string(connection_id: str) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            conn = await session.get(Connection, connection_id)
            if not conn:
                raise ValueError(f"Connection {connection_id} not found")
            return json.loads(decrypt(conn.encrypted_connection_string))
