import pytest
from app.models.review_chat import ReviewChatMessage, ChatRole


def test_chat_role_enum():
    assert ChatRole.user.value == "user"
    assert ChatRole.assistant.value == "assistant"
