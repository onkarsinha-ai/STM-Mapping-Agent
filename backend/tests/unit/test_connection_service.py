import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.connection_service import ConnectionService

@pytest.mark.asyncio
async def test_test_connection_postgresql():
    with patch('app.services.connection_service.create_async_engine') as mock_engine:
        # Setup async context manager for engine.connect()
        mock_conn = AsyncMock()
        mock_conn.execute = AsyncMock(return_value=None)
        
        # Create async context manager mock
        async_cm = AsyncMock()
        async_cm.__aenter__ = AsyncMock(return_value=mock_conn)
        async_cm.__aexit__ = AsyncMock(return_value=None)
        
        mock_engine.return_value.connect = MagicMock(return_value=async_cm)
        mock_engine.return_value.dispose = AsyncMock(return_value=None)
        
        result = await ConnectionService.test_connection({
            "db_type": "postgresql",
            "host": "localhost",
            "port": 5432,
            "database": "test",
            "username": "user",
            "password": "pass"
        })
        assert result.success is True
