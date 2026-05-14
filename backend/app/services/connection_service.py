import json
from typing import Dict, Any, Optional
from dataclasses import dataclass
from app.core.encryption import encrypt, decrypt
from app.database import AsyncSessionLocal
from app.models.connection import Connection, ConnectionType, DBType

@dataclass
class ConnectionTestResult:
    success: bool
    message: str

class ConnectionService:
    @staticmethod
    async def test_connection(connection_type: str, provider: Optional[str], params: Dict[str, Any]) -> ConnectionTestResult:
        if connection_type in ("source", "target"):
            from app.services.testers.database_tester import DatabaseTester
            return await DatabaseTester.test(provider or params.get("db_type"), params)
        elif connection_type == "llm":
            from app.services.testers.llm_tester import LLMTester
            return await LLMTester.test(provider or "openai", params)
        elif connection_type == "jira":
            from app.services.testers.jira_tester import JiraTester
            return await JiraTester.test(provider or "jira_cloud", params)
        else:
            return ConnectionTestResult(False, f"Unknown connection type: {connection_type}")

    @staticmethod
    async def create_connection(user_id: str, name: str, connection_type: ConnectionType,
                                db_type: Optional[DBType], provider: Optional[str],
                                params: Dict[str, Any]) -> Connection:
        encrypted = encrypt(json.dumps(params))
        metadata = {k: v for k, v in params.items() if k not in ['password', 'api_key', 'token']}

        async with AsyncSessionLocal() as session:
            conn = Connection(
                user_id=user_id,
                name=name,
                connection_type=connection_type,
                db_type=db_type,
                provider=provider,
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
