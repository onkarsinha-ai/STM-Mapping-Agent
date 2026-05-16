import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient

from app.main import app
from app.database import get_db


class TestDiscoveryInline:

    @pytest.fixture(autouse=True)
    def reset_dependency_overrides(self):
        app.dependency_overrides = {}
        yield
        app.dependency_overrides = {}

    @pytest.mark.asyncio
    async def test_discover_inline_source_and_target(self):
        """Test discovery endpoint handles inline source schemas and inline target schema."""
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.source_connection_id = None
        mock_project.target_connection_id = None
        mock_project.source_schemas = [
            {"source_name": "file1.csv", "columns": [{"name": "col1", "type": "int"}]},
            {"source_name": "file2.csv", "columns": [{"name": "col2", "type": "string"}]},
        ]
        mock_project.target_schema = {"source_name": "output", "columns": [{"name": "id", "type": "uuid"}]}
        mock_project.current_phase = "input"

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)
        mock_db.commit = AsyncMock(return_value=None)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch("app.routers.discovery.SchemaDiscoveryService") as mock_service:
            mock_service.clear_project_cache = AsyncMock(return_value=None)
            mock_service.insert_inline_schema = AsyncMock(return_value=[])
            mock_service.discover_schema = AsyncMock(return_value=[])

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(f"/projects/{project_id}/discover")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Schema discovery completed"

        mock_service.clear_project_cache.assert_called_once_with(project_id)
        assert mock_service.insert_inline_schema.call_count == 3
        mock_service.insert_inline_schema.assert_any_call(project_id, mock_project.source_schemas[0], is_target=False)
        mock_service.insert_inline_schema.assert_any_call(project_id, mock_project.source_schemas[1], is_target=False)
        mock_service.insert_inline_schema.assert_any_call(project_id, mock_project.target_schema, is_target=True)
        mock_service.discover_schema.assert_not_called()
        assert mock_project.current_phase == "discovery"
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_discover_db_source_and_target(self):
        """Test discovery endpoint handles DB source and DB target."""
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.source_connection_id = "11111111-1111-1111-1111-111111111111"
        mock_project.target_connection_id = "22222222-2222-2222-2222-222222222222"
        mock_project.source_schemas = None
        mock_project.target_schema = None
        mock_project.current_phase = "input"

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)
        mock_db.commit = AsyncMock(return_value=None)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch("app.routers.discovery.ConnectionService") as mock_conn_service:
            mock_conn_service.get_connection_string = AsyncMock(return_value={"db_type": "postgresql"})
            with patch("app.routers.discovery.SchemaDiscoveryService") as mock_service:
                mock_service.clear_project_cache = AsyncMock(return_value=None)
                mock_service.insert_inline_schema = AsyncMock(return_value=[])
                mock_service.discover_schema = AsyncMock(return_value=[])

                async with AsyncClient(app=app, base_url="http://test") as client:
                    response = await client.post(f"/projects/{project_id}/discover")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Schema discovery completed"

        mock_service.clear_project_cache.assert_called_once_with(project_id)
        mock_service.insert_inline_schema.assert_not_called()
        assert mock_service.discover_schema.call_count == 2
        mock_service.discover_schema.assert_any_call("11111111-1111-1111-1111-111111111111", project_id, {"db_type": "postgresql"})
        mock_service.discover_schema.assert_any_call("22222222-2222-2222-2222-222222222222", project_id, {"db_type": "postgresql"})
        assert mock_project.current_phase == "discovery"
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_discover_mixed_source_and_target(self):
        """Test discovery endpoint handles inline source + DB target."""
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.source_connection_id = None
        mock_project.target_connection_id = "22222222-2222-2222-2222-222222222222"
        mock_project.source_schemas = [
            {"source_name": "file1.csv", "columns": [{"name": "col1", "type": "int"}]},
        ]
        mock_project.target_schema = None
        mock_project.current_phase = "input"

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)
        mock_db.commit = AsyncMock(return_value=None)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch("app.routers.discovery.ConnectionService") as mock_conn_service:
            mock_conn_service.get_connection_string = AsyncMock(return_value={"db_type": "postgresql"})
            with patch("app.routers.discovery.SchemaDiscoveryService") as mock_service:
                mock_service.clear_project_cache = AsyncMock(return_value=None)
                mock_service.insert_inline_schema = AsyncMock(return_value=[])
                mock_service.discover_schema = AsyncMock(return_value=[])

                async with AsyncClient(app=app, base_url="http://test") as client:
                    response = await client.post(f"/projects/{project_id}/discover")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Schema discovery completed"

        mock_service.clear_project_cache.assert_called_once_with(project_id)
        mock_service.insert_inline_schema.assert_called_once_with(project_id, mock_project.source_schemas[0], is_target=False)
        mock_service.discover_schema.assert_called_once_with("22222222-2222-2222-2222-222222222222", project_id, {"db_type": "postgresql"})
        assert mock_project.current_phase == "discovery"
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_discover_no_source_raises_400(self):
        """Test discovery endpoint raises 400 when no source is configured."""
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.source_connection_id = None
        mock_project.target_connection_id = "22222222-2222-2222-2222-222222222222"
        mock_project.source_schemas = None
        mock_project.target_schema = None
        mock_project.current_phase = "input"

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(f"/projects/{project_id}/discover")

        assert response.status_code == 400
        assert "Source not set" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_discover_no_target_raises_400(self):
        """Test discovery endpoint raises 400 when no target is configured."""
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.source_connection_id = "11111111-1111-1111-1111-111111111111"
        mock_project.target_connection_id = None
        mock_project.source_schemas = None
        mock_project.target_schema = None
        mock_project.current_phase = "input"

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(f"/projects/{project_id}/discover")

        assert response.status_code == 400
        assert "Target not set" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_discover_project_not_found(self):
        """Test discovery endpoint returns 404 when project does not exist."""
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=None)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(f"/projects/{project_id}/discover")

        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]
