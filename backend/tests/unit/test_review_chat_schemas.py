from app.schemas.review_chat import ReviewChatMessageCreate, ChatSendRequest


def test_review_chat_message_create():
    msg = ReviewChatMessageCreate(content="Hello")
    assert msg.content == "Hello"


def test_chat_send_request():
    req = ChatSendRequest(message="Update mapping 1")
    assert req.message == "Update mapping 1"
