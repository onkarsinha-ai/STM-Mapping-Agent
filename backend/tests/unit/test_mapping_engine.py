import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.mapping_engine import MappingEngine
from app.models.mapping import MappingStatus


def test_calculate_confidence():
    score = MappingEngine.calculate_confidence("customer_id", "cust_id", "int", "int", 0.8)
    assert 0 <= score <= 1


@pytest.mark.asyncio
async def test_update_mapping_status_approve():
    mock_mapping = MagicMock()
    mock_mapping.source_table = "users"
    mock_mapping.source_column = "id"
    mock_mapping.business_logic = "test"
    mock_mapping.transformation_rule = None
    mock_mapping.status = MappingStatus.proposed

    mock_session = AsyncMock()
    mock_session.get = AsyncMock(return_value=mock_mapping)

    with patch('app.services.mapping_engine.AsyncSessionLocal') as mock_session_class:
        mock_session_class.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_class.return_value.__aexit__ = AsyncMock(return_value=None)

        result = await MappingEngine.update_mapping_status("mapping-id", "approve")
        assert result.status == MappingStatus.approved
