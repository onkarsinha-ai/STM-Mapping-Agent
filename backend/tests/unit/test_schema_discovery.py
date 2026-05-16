import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.schema_discovery_service import SchemaDiscoveryService
from app.models.schema_cache import SchemaCache, ObjectType

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


@pytest.mark.asyncio
async def test_insert_inline_schema_source():
    mock_session = AsyncMock()
    mock_session.add_all = MagicMock()
    mock_session.commit = AsyncMock(return_value=None)

    async_session_cm = AsyncMock()
    async_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    async_session_cm.__aexit__ = AsyncMock(return_value=None)

    with patch('app.services.schema_discovery_service.AsyncSessionLocal', return_value=async_session_cm):
        result = await SchemaDiscoveryService.insert_inline_schema(
            "project-id",
            {"source_name": "my.data.file.csv", "columns": [{"name": "col1", "type": "int"}, {"name": "col2", "type": "string"}]},
            is_target=False
        )
        assert len(result) == 2
        assert result[0].table_name == "my.data.file"
        assert result[0].schema_name == "my.data.file.csv"
        assert result[0].column_name == "col1"
        assert result[0].data_type == "int"
        assert result[1].column_name == "col2"
        assert result[1].data_type == "string"
        mock_session.add_all.assert_called_once()


@pytest.mark.asyncio
async def test_insert_inline_schema_target():
    mock_session = AsyncMock()
    mock_session.add_all = MagicMock()
    mock_session.commit = AsyncMock(return_value=None)

    async_session_cm = AsyncMock()
    async_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    async_session_cm.__aexit__ = AsyncMock(return_value=None)

    with patch('app.services.schema_discovery_service.AsyncSessionLocal', return_value=async_session_cm):
        result = await SchemaDiscoveryService.insert_inline_schema(
            "project-id",
            {"source_name": "output", "columns": [{"name": "id", "type": "uuid"}]},
            is_target=True
        )
        assert len(result) == 1
        assert result[0].schema_name == "target"
        assert result[0].table_name == "output"
        mock_session.add_all.assert_called_once()


@pytest.mark.asyncio
async def test_insert_inline_schema_no_extension():
    mock_session = AsyncMock()
    mock_session.add_all = MagicMock()
    mock_session.commit = AsyncMock(return_value=None)

    async_session_cm = AsyncMock()
    async_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    async_session_cm.__aexit__ = AsyncMock(return_value=None)

    with patch('app.services.schema_discovery_service.AsyncSessionLocal', return_value=async_session_cm):
        result = await SchemaDiscoveryService.insert_inline_schema(
            "project-id",
            {"columns": [{"name": "a", "type": "text"}]}
        )
        assert len(result) == 1
        assert result[0].table_name == "inline"
        assert result[0].schema_name == "inline"
        mock_session.add_all.assert_called_once()


@pytest.mark.asyncio
async def test_clear_project_cache():
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=None)
    mock_session.commit = AsyncMock(return_value=None)

    async_session_cm = AsyncMock()
    async_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
    async_session_cm.__aexit__ = AsyncMock(return_value=None)

    with patch('app.services.schema_discovery_service.AsyncSessionLocal', return_value=async_session_cm):
        await SchemaDiscoveryService.clear_project_cache("project-id")
        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()
