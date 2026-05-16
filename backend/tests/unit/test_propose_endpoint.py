import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.mark.asyncio
async def test_propose_no_llm_connection():
    with patch("app.routers.mappings.AsyncSessionLocal") as mock_session:
        project = MagicMock()
        project.llm_connection_id = None
        mock_db = AsyncMock()
        mock_db.get.return_value = project
        app.dependency_overrides = {}

        response = client.post("/projects/test-id/propose")
        assert response.status_code == 404 or response.status_code == 400


def test_propose_project_not_found():
    with patch("app.routers.mappings.AsyncSessionLocal") as mock_session:
        mock_db = AsyncMock()
        mock_db.get.return_value = None
        app.dependency_overrides = {}

        response = client.post("/projects/nonexistent/propose")
        assert response.status_code == 404
