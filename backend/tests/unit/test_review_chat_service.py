import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from app.services.review_chat_service import ReviewChatService


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
