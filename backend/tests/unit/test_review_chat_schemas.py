from uuid import uuid4
from datetime import datetime

from app.schemas.review_chat import (
    ReviewChatMessageCreate,
    ReviewChatMessageResponse,
    ChatSendRequest,
    ChatSendResponse,
)


def test_review_chat_message_create():
    msg = ReviewChatMessageCreate(content="Hello")
    assert msg.content == "Hello"


def test_review_chat_message_response():
    now = datetime.utcnow()
    msg = ReviewChatMessageResponse(
        id=uuid4(),
        project_id=uuid4(),
        role="assistant",
        content="Hello",
        mapping_changes=[{"mapping_id": 1, "action": "update"}],
        created_at=now,
    )
    assert msg.role == "assistant"
    assert msg.content == "Hello"
    assert msg.mapping_changes == [{"mapping_id": 1, "action": "update"}]


def test_chat_send_request():
    req = ChatSendRequest(message="Update mapping 1")
    assert req.message == "Update mapping 1"


def test_chat_send_response():
    resp = ChatSendResponse(
        response="Done",
        mapping_changes=[{"mapping_id": 2, "action": "delete"}],
    )
    assert resp.response == "Done"
    assert resp.mapping_changes == [{"mapping_id": 2, "action": "delete"}]


def test_chat_send_response_no_mapping_changes():
    resp = ChatSendResponse(response="Just chatting")
    assert resp.response == "Just chatting"
    assert resp.mapping_changes is None
