import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.connection_service import ConnectionService


@pytest.mark.asyncio
async def test_test_connection_database():
    with patch('app.services.testers.database_tester.DatabaseTester') as mock_tester:
        mock_tester.test = AsyncMock(return_value=MagicMock(success=True, message="ok"))

        result = await ConnectionService.test_connection(
            "source",
            "postgresql",
            {"host": "localhost", "port": 5432, "database": "test", "username": "user", "password": "pass"}
        )
        assert result.success is True
        mock_tester.test.assert_awaited_once_with("postgresql", {"host": "localhost", "port": 5432, "database": "test", "username": "user", "password": "pass"})


@pytest.mark.asyncio
async def test_test_connection_llm():
    with patch('app.services.testers.llm_tester.LLMTester') as mock_tester:
        mock_tester.test = AsyncMock(return_value=MagicMock(success=True, message="ok"))

        result = await ConnectionService.test_connection(
            "llm",
            "openai",
            {"api_key": "sk-test", "model": "gpt-4o"}
        )
        assert result.success is True
        mock_tester.test.assert_awaited_once_with("openai", {"api_key": "sk-test", "model": "gpt-4o"})


@pytest.mark.asyncio
async def test_test_connection_jira():
    with patch('app.services.testers.jira_tester.JiraTester') as mock_tester:
        mock_tester.test = AsyncMock(return_value=MagicMock(success=True, message="ok"))

        result = await ConnectionService.test_connection(
            "jira",
            "jira_cloud",
            {"base_url": "https://test.atlassian.net", "auth_method": "basic", "email": "test@test.com", "api_token": "token"}
        )
        assert result.success is True
        mock_tester.test.assert_awaited_once_with("jira_cloud", {"base_url": "https://test.atlassian.net", "auth_method": "basic", "email": "test@test.com", "api_token": "token"})


@pytest.mark.asyncio
async def test_test_connection_unknown_type():
    result = await ConnectionService.test_connection("unknown", None, {})
    assert result.success is False
    assert "Unknown connection type" in result.message
