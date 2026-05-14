import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.llm_orchestrator import LLMOrchestrator


def test_build_prompt():
    target_schema = {"public": {"dim_customer": [{"name": "customer_id", "type": "int"}]}}
    source_schema = {"public": {"users": [{"name": "id", "type": "int"}]}}

    prompt = LLMOrchestrator.build_prompt(target_schema, source_schema, None, "", [])
    assert "dim_customer" in prompt
    assert "users" in prompt


@pytest.mark.asyncio
async def test_propose_mappings():
    with patch('app.services.llm_orchestrator.litellm.acompletion') as mock_completion:
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '[{"target_table": "dim_customer", "target_column": "customer_id", "source_table": "users", "source_column": "id", "confidence_score": 0.95}]'
        mock_completion.return_value = mock_response

        with patch('app.services.llm_orchestrator.AsyncSessionLocal'):
            result = await LLMOrchestrator.propose_mappings(
                "project-id",
                {"public": {"dim_customer": [{"name": "customer_id", "type": "int"}]}},
                {"public": {"users": [{"name": "id", "type": "int"}]}},
                {"api_key": "test-key", "model": "gpt-4"}
            )
            assert len(result) == 1
            assert result[0].target_table == "dim_customer"
