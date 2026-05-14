import pytest
from unittest.mock import patch, AsyncMock
from app.services.testers.database_tester import DatabaseTester

@pytest.mark.asyncio
async def test_test_postgresql():
    with patch('app.services.testers.database_tester.create_async_engine') as mock_engine:
        mock_conn = AsyncMock()
        mock_engine.return_value.connect.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_engine.return_value.connect.return_value.__aexit__ = AsyncMock(return_value=None)
        mock_engine.return_value.dispose = AsyncMock()

        result = await DatabaseTester.test("postgresql", {
            "host": "localhost", "port": 5432, "database": "test",
            "username": "user", "password": "pass"
        })
        assert result.success is True
        assert "successful" in result.message

@pytest.mark.asyncio
async def test_test_unsupported_db():
    result = await DatabaseTester.test("unknown_db", {"host": "localhost"})
    assert result.success is False
    assert "Unsupported" in result.message
