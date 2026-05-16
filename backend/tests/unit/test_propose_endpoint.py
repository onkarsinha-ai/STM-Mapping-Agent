import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient

from app.main import app
from app.database import get_db


class TestProposeEndpoint:

    @pytest.fixture(autouse=True)
    def reset_dependency_overrides(self):
        app.dependency_overrides = {}
        yield
        app.dependency_overrides = {}

    @pytest.mark.asyncio
    async def test_propose_no_llm_connection(self):
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.llm_connection_id = None

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(f"/projects/{project_id}/propose")

        assert response.status_code == 400
        assert "LLM connection not configured" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_propose_project_not_found(self):
        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=None)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post("/projects/nonexistent/propose")

        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_propose_no_schemas_discovered(self):
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.llm_connection_id = "00000000-0000-0000-0000-000000000002"
        mock_project.target_connection_id = None
        mock_project.jira_ticket_key = None
        mock_project.user_text_input = None

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)
        mock_db.execute = AsyncMock()
        mock_db.execute.return_value.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch("app.routers.mappings.ConnectionService.get_connection_string", new_callable=AsyncMock) as mock_conn:
            mock_conn.return_value = {"api_key": "test-key", "model": "gpt-4"}
            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(f"/projects/{project_id}/propose")

        assert response.status_code == 400
        assert "No schemas discovered yet" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_propose_success(self):
        project_id = "00000000-0000-0000-0000-000000000001"
        llm_conn_id = "00000000-0000-0000-0000-000000000002"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.llm_connection_id = llm_conn_id
        mock_project.target_connection_id = None
        mock_project.jira_ticket_key = None
        mock_project.user_text_input = None
        mock_project.current_phase = None

        mock_entry = MagicMock()
        mock_entry.connection_id = None
        mock_entry.schema_name = "target"
        mock_entry.table_name = "users"
        mock_entry.column_name = "id"
        mock_entry.data_type = "uuid"
        mock_entry.is_nullable = False
        mock_entry.project_id = project_id

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)
        mock_db.commit = AsyncMock(return_value=None)

        mock_result = MagicMock()
        mock_result.scalars = MagicMock(return_value=MagicMock(all=MagicMock(return_value=[mock_entry])))
        mock_db.execute = AsyncMock(return_value=mock_result)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch("app.routers.mappings.ConnectionService.get_connection_string", new_callable=AsyncMock) as mock_conn:
            mock_conn.return_value = {"api_key": "test-key", "model": "gpt-4"}
            with patch("app.routers.mappings.LLMOrchestrator.propose_mappings", new_callable=AsyncMock) as mock_propose:
                async with AsyncClient(app=app, base_url="http://test") as client:
                    response = await client.post(f"/projects/{project_id}/propose")

        assert response.status_code == 200
        assert response.json()["message"] == "Mappings proposed successfully"
        mock_propose.assert_awaited_once()
