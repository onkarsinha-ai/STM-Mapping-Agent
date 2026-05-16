import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient

from app.main import app
from app.database import get_db


class TestReviewChatRouter:

    @pytest.fixture(autouse=True)
    def reset_dependency_overrides(self):
        app.dependency_overrides = {}
        yield
        app.dependency_overrides = {}

    @pytest.mark.asyncio
    async def test_get_chat_history(self):
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.routers.review_chat.ReviewChatService.get_history', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = []
            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get(f"/projects/{project_id}/review-chat")

        assert response.status_code == 200
        assert response.json() == []
        mock_get.assert_awaited_once_with(project_id, mock_db)

    @pytest.mark.asyncio
    async def test_send_chat_message(self):
        project_id = "00000000-0000-0000-0000-000000000001"
        llm_conn_id = "00000000-0000-0000-0000-000000000002"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.llm_connection_id = llm_conn_id

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.routers.review_chat.ReviewChatService.send_message', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = ("Hello!", [])
            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(f"/projects/{project_id}/review-chat", json={"message": "hi"})

        assert response.status_code == 200
        assert response.json()["response"] == "Hello!"
        mock_send.assert_awaited_once_with(project_id, "hi", mock_db)

    @pytest.mark.asyncio
    async def test_finish_review(self):
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.review_chat_completed = "true"

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        with patch('app.routers.review_chat.ReviewChatService.finish_review', new_callable=AsyncMock) as mock_finish:
            mock_finish.return_value = mock_project
            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(f"/projects/{project_id}/finish-review")

        assert response.status_code == 200
        assert response.json()["review_chat_completed"] == "true"
        mock_finish.assert_awaited_once_with(project_id, mock_db)

    @pytest.mark.asyncio
    async def test_get_chat_history_project_not_found(self):
        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=None)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/projects/nonexistent/review-chat")

        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_send_chat_message_no_llm_connection(self):
        project_id = "00000000-0000-0000-0000-000000000001"

        mock_project = MagicMock()
        mock_project.id = project_id
        mock_project.llm_connection_id = None

        mock_db = AsyncMock()
        mock_db.get = AsyncMock(return_value=mock_project)

        async def mock_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = mock_get_db

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(f"/projects/{project_id}/review-chat", json={"message": "hi"})

        assert response.status_code == 400
        assert "LLM connection not configured" in response.json()["detail"]
