import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from app.services.review_chat_service import ReviewChatService


@pytest.mark.asyncio
async def test_send_message_returns_ai_response_and_applied_actions():
    db = AsyncMock()

    # Mock project and connection
    project = MagicMock()
    project.llm_connection_id = "conn-1"
    conn = MagicMock()
    conn.encrypted_connection_string = "enc"
    conn.provider = "openai"
    db.get = AsyncMock(side_effect=[project, conn])

    # Mock db.execute -> result.scalars().all()
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=mock_result)

    # Mock decrypt and json.loads for connection params
    with patch("app.services.review_chat_service.decrypt", return_value='{"api_key":"k","model":"gpt-4"}'):
        with patch("app.services.review_chat_service.MappingEngine") as mock_engine:
            mock_engine.update_mapping_fields = AsyncMock(return_value=None)

            # Mock litellm.acompletion
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = (
                "I updated the mapping.\n\n"
                '```json\n{"actions": [{"mapping_id": "map-1", "updates": {"source_column": "user_id"}}]}\n```'
            )

            with patch("app.services.review_chat_service.litellm.acompletion", new_callable=AsyncMock, return_value=mock_response):
                with patch.object(ReviewChatService, "_build_system_prompt", return_value="system"):
                    ai_text, applied = await ReviewChatService.send_message(
                        project_id="proj-1",
                        user_message="Change source to user_id",
                        db=db
                    )

    assert "updated" in ai_text.lower()
    assert len(applied) == 1
    assert applied[0]["mapping_id"] == "map-1"
    assert applied[0]["updates"]["source_column"] == "user_id"
    assert db.add.call_count == 2  # user + assistant messages
    assert db.commit.call_count == 2


def test_build_system_prompt_with_mappings():
    mappings = [
        {
            "id": "map-1",
            "target_table": "customers",
            "target_column": "cust_id",
            "source_table": "users",
            "source_column": "id",
            "business_logic": "Direct map",
            "confidence_score": 0.95,
            "status": "proposed"
        }
    ]
    prompt = ReviewChatService._build_system_prompt(mappings)
    assert "customers.cust_id" in prompt
    assert "users.id" in prompt
    assert "Direct map" in prompt
    assert "mapping review assistant" in prompt.lower()


def test_build_system_prompt_empty_mappings():
    prompt = ReviewChatService._build_system_prompt([])
    assert "No mappings" in prompt


def test_parse_actions_from_response_no_actions():
    response = "This looks good to me."
    actions = ReviewChatService._parse_actions_from_response(response)
    assert actions == []


def test_parse_actions_from_response_with_actions():
    response = '''I updated the mapping.

```json
{"actions": [{"mapping_id": "map-1", "updates": {"source_column": "user_id"}}]}
```'''
    actions = ReviewChatService._parse_actions_from_response(response)
    assert len(actions) == 1
    assert actions[0]["mapping_id"] == "map-1"
    assert actions[0]["updates"]["source_column"] == "user_id"
