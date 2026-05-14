import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.schema_discovery_service import SchemaDiscoveryService

@pytest.mark.asyncio
async def test_discover_postgresql_schema():
    with patch('app.services.schema_discovery_service.create_async_engine') as mock_engine:
        mock_result = MagicMock()
        mock_result.mappings.return_value.all.return_value = [
            {"table_schema": "public", "table_name": "users", "column_name": "id", "data_type": "uuid", "is_nullable": "NO", "column_default": None}
        ]
        
        mock_conn = AsyncMock()
        mock_conn.execute = AsyncMock(return_value=mock_result)
        
        async_cm = AsyncMock()
        async_cm.__aenter__ = AsyncMock(return_value=mock_conn)
        async_cm.__aexit__ = AsyncMock(return_value=None)
        
        mock_engine.return_value.connect = MagicMock(return_value=async_cm)
        mock_engine.return_value.dispose = AsyncMock(return_value=None)
        
        # Properly mock AsyncSessionLocal as async context manager
        mock_session = AsyncMock()
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock(return_value=None)
        
        async_session_cm = AsyncMock()
        async_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
        async_session_cm.__aexit__ = AsyncMock(return_value=None)
        
        with patch('app.services.schema_discovery_service.AsyncSessionLocal', return_value=async_session_cm):
            result = await SchemaDiscoveryService.discover_schema("conn-id", "project-id", {
                "db_type": "postgresql",
                "host": "localhost", "port": 5432, "database": "test",
                "username": "user", "password": "pass"
            })
            assert len(result) == 1
            assert result[0].table_name == "users"
