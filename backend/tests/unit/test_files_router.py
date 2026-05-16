import io
import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock

from app.main import app


class TestFilesRouter:

    @pytest.mark.asyncio
    async def test_extract_schema_csv_success(self):
        """Test successful CSV upload returns parsed schema."""
        csv_content = b"id,name,age\n1,Alice,30\n2,Bob,25\n"

        with patch("app.routers.files.SchemaExtractor") as mock_extractor_cls:
            mock_extractor = MagicMock()
            mock_extractor.extract.return_value = {
                "source_name": "test.csv",
                "columns": [
                    {"name": "id", "type": "integer"},
                    {"name": "name", "type": "string"},
                    {"name": "age", "type": "integer"},
                ],
            }
            mock_extractor_cls.return_value = mock_extractor

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/files/extract-schema",
                    files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
                )

        assert response.status_code == 200
        data = response.json()
        assert data["source_name"] == "test.csv"
        assert data["columns"] == [
            {"name": "id", "type": "integer"},
            {"name": "name", "type": "string"},
            {"name": "age", "type": "integer"},
        ]
        mock_extractor.extract.assert_called_once()

    @pytest.mark.asyncio
    async def test_extract_schema_unsupported_format(self):
        """Test unsupported file format returns 400."""
        with patch("app.routers.files.SchemaExtractor") as mock_extractor_cls:
            mock_extractor = MagicMock()
            mock_extractor.extract.side_effect = ValueError("Unsupported file format: .xyz")
            mock_extractor_cls.return_value = mock_extractor

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/files/extract-schema",
                    files={"file": ("test.xyz", io.BytesIO(b"some data"), "application/octet-stream")},
                )

        assert response.status_code == 400
        assert "Unsupported file format" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_extract_schema_empty_file(self):
        """Test empty file (no columns) returns 422."""
        with patch("app.routers.files.SchemaExtractor") as mock_extractor_cls:
            mock_extractor = MagicMock()
            mock_extractor.extract.return_value = {"source_name": "empty.csv", "columns": []}
            mock_extractor_cls.return_value = mock_extractor

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/files/extract-schema",
                    files={"file": ("empty.csv", io.BytesIO(b""), "text/csv")},
                )

        assert response.status_code == 422
        assert "No columns found" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_extract_schema_file_too_large(self):
        """Test file exceeding 10MB returns 413."""
        oversized_content = b"x" * (10 * 1024 * 1024 + 1)

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/files/extract-schema",
                files={"file": ("large.csv", io.BytesIO(oversized_content), "text/csv")},
            )

        assert response.status_code == 413
        assert "File exceeds 10MB limit" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_extract_schema_no_filename(self):
        """Test upload with empty filename is rejected by FastAPI (422)."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/files/extract-schema",
                files={"file": ("", io.BytesIO(b"id,name\n1,Alice\n"), "text/csv")},
            )

        # FastAPI's File(...) rejects empty filename before our handler runs
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_extract_schema_parse_failure(self):
        """Test generic parse failure returns 422."""
        from app.services.schema_extractor import SchemaExtractionError

        with patch("app.routers.files.SchemaExtractor") as mock_extractor_cls:
            mock_extractor = MagicMock()
            mock_extractor.extract.side_effect = SchemaExtractionError("corrupt data")
            mock_extractor_cls.return_value = mock_extractor

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/files/extract-schema",
                    files={"file": ("bad.csv", io.BytesIO(b"not,valid"), "text/csv")},
                )

        assert response.status_code == 422
        assert "Failed to parse file" in response.json()["detail"]
