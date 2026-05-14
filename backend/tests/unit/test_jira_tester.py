import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.testers.jira_tester import JiraTester


@pytest.mark.asyncio
async def test_test_jira_cloud_basic_auth():
    with patch('app.services.testers.jira_tester.httpx.AsyncClient') as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"displayName": "Test User"}

        mock_instance = AsyncMock()
        mock_instance.get = AsyncMock(return_value=mock_response)
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        mock_client.return_value = mock_instance

        result = await JiraTester.test("jira_cloud", {
            "base_url": "https://test.atlassian.net",
            "auth_method": "basic",
            "email": "test@example.com",
            "api_token": "token123"
        })
        assert result.success is True


@pytest.mark.asyncio
async def test_test_jira_invalid_url():
    with patch('app.services.testers.jira_tester.httpx.AsyncClient') as mock_client:
        mock_instance = AsyncMock()
        mock_instance.get = AsyncMock(side_effect=Exception("Connection refused"))
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        mock_client.return_value = mock_instance

        result = await JiraTester.test("jira_cloud", {
            "base_url": "https://invalid.example.com",
            "auth_method": "basic",
            "email": "test@example.com",
            "api_token": "token123"
        })
        assert result.success is False


@pytest.mark.asyncio
async def test_test_jira_pat_auth():
    with patch('app.services.testers.jira_tester.httpx.AsyncClient') as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"displayName": "PAT User"}

        mock_instance = AsyncMock()
        mock_instance.get = AsyncMock(return_value=mock_response)
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        mock_client.return_value = mock_instance

        result = await JiraTester.test("jira_server", {
            "base_url": "https://jira.company.com",
            "auth_method": "pat",
            "token": "pat-token-123"
        })
        assert result.success is True

        call_kwargs = mock_instance.get.await_args.kwargs
        assert call_kwargs["headers"]["Authorization"] == "Bearer pat-token-123"


@pytest.mark.asyncio
async def test_test_jira_401_unauthorized():
    with patch('app.services.testers.jira_tester.httpx.AsyncClient') as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 401

        mock_instance = AsyncMock()
        mock_instance.get = AsyncMock(return_value=mock_response)
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        mock_client.return_value = mock_instance

        result = await JiraTester.test("jira_cloud", {
            "base_url": "https://test.atlassian.net",
            "auth_method": "basic",
            "email": "test@example.com",
            "api_token": "bad-token"
        })
        assert result.success is False
        assert "Authentication failed" in result.message


@pytest.mark.asyncio
async def test_test_jira_empty_base_url():
    result = await JiraTester.test("jira_cloud", {
        "base_url": "",
        "auth_method": "basic",
        "email": "test@example.com",
        "api_token": "token123"
    })
    assert result.success is False
    assert "Base URL is required" in result.message


@pytest.mark.asyncio
async def test_test_jira_connect_error():
    import httpx
    with patch('app.services.testers.jira_tester.httpx.AsyncClient') as mock_client:
        mock_instance = AsyncMock()
        mock_instance.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        mock_client.return_value = mock_instance

        result = await JiraTester.test("jira_cloud", {
            "base_url": "https://invalid.example.com",
            "auth_method": "basic",
            "email": "test@example.com",
            "api_token": "token123"
        })
        assert result.success is False
        assert "Cannot reach Jira" in result.message
