import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.export_service import ExportService


@pytest.mark.asyncio
async def test_generate_excel():
    mock_mapping = MagicMock()
    mock_mapping.target_table = "dim_customer"
    mock_mapping.target_column = "customer_id"
    mock_mapping.source_table = "users"
    mock_mapping.source_column = "id"
    mock_mapping.business_logic = "Primary key mapping"
    mock_mapping.transformation_rule = "CAST(id AS VARCHAR)"
    mock_mapping.confidence_score = 0.95
    mock_mapping.status = MagicMock()

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_mapping]

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)

    with patch('app.services.export_service.AsyncSessionLocal') as mock_session_class:
        mock_session_class.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_class.return_value.__aexit__ = AsyncMock(return_value=None)

        excel_bytes = await ExportService.generate_excel("project-id")
        assert len(excel_bytes) > 0
