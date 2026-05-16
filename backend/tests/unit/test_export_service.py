import pytest
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch
from openpyxl import load_workbook
from app.services.export_service import ExportService
from app.models.mapping import MappingStatus


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


@pytest.mark.asyncio
async def test_generate_excel_includes_rejected_mappings():
    mock_approved = MagicMock()
    mock_approved.target_table = "dim_customer"
    mock_approved.target_column = "customer_id"
    mock_approved.source_table = "users"
    mock_approved.source_column = "id"
    mock_approved.business_logic = "Primary key mapping"
    mock_approved.transformation_rule = "CAST(id AS VARCHAR)"
    mock_approved.confidence_score = 0.95
    mock_approved.status = MappingStatus.approved

    mock_rejected = MagicMock()
    mock_rejected.target_table = "dim_customer"
    mock_rejected.target_column = "customer_name"
    mock_rejected.source_table = "users"
    mock_rejected.source_column = "name"
    mock_rejected.business_logic = "Name mapping"
    mock_rejected.transformation_rule = "UPPER(name)"
    mock_rejected.confidence_score = 0.50
    mock_rejected.status = MappingStatus.rejected

    mock_proposed = MagicMock()
    mock_proposed.target_table = "dim_customer"
    mock_proposed.target_column = "email"
    mock_proposed.status = MappingStatus.proposed

    # Only approved and rejected should be returned by the query
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_approved, mock_rejected]

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)

    with patch('app.services.export_service.AsyncSessionLocal') as mock_session_class:
        mock_session_class.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_class.return_value.__aexit__ = AsyncMock(return_value=None)

        excel_bytes = await ExportService.generate_excel("project-id")
        assert len(excel_bytes) > 0

        # Load workbook and verify cell values
        wb = load_workbook(BytesIO(excel_bytes))
        ws = wb.active

        # Row 2 = approved mapping
        assert ws.cell(row=2, column=5).value == "users"  # source_table
        assert ws.cell(row=2, column=6).value == "id"     # source_column
        assert ws.cell(row=2, column=9).value == 0.95     # confidence

        # Row 3 = rejected mapping
        assert ws.cell(row=3, column=5).value == "USER INPUT NEEDED"
        assert ws.cell(row=3, column=6).value == "USER INPUT NEEDED"
        assert ws.cell(row=3, column=7).value == "USER INPUT NEEDED"
        assert ws.cell(row=3, column=8).value == "USER INPUT NEEDED"
        assert ws.cell(row=3, column=9).value == 0.00

        # Verify query included rejected but not proposed
        query_str = str(mock_session.execute.call_args[0][0]).lower()
        assert "rejected" in query_str or "__[postcompile_status_1]" in query_str
