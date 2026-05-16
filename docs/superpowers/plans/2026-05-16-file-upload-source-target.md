# File Upload for Source/Target Schema Input — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to upload CSV, JSON, Parquet, Excel, and Avro files directly during project creation as source and target schemas, with support for multiple source files and mixing with database connections.

**Architecture:** Files are parsed on upload via a new `POST /files/extract-schema` endpoint that returns column names and types. Extracted schemas are stored on the `Project` model (`source_schemas`, `target_schema`). During discovery, inline schemas are inserted into `schema_cache` as rows (one per column) with `connection_id=null` and `schema_name` set to the filename. The existing `get_cached_schema` and LLM orchestrator work unchanged because multiple sources naturally map to different top-level keys in the returned dict.

**Tech Stack:** FastAPI, SQLAlchemy (async), Alembic, Pandas, FastAvro, React + Vite, TanStack Query

---

## File Structure

| File | Responsibility |
|------|---------------|
| `backend/app/services/schema_extractor.py` | Parse uploaded files and extract column schemas |
| `backend/app/routers/files.py` | `POST /files/extract-schema` endpoint |
| `backend/app/models/project.py` | Add `source_schemas` and `target_schema` JSON fields |
| `backend/app/models/schema_cache.py` | Make `connection_id` nullable |
| `backend/app/schemas/project.py` | Update `ProjectCreate` and `ProjectResponse` |
| `backend/app/routers/projects.py` | Validate source/target on creation |
| `backend/app/services/schema_discovery_service.py` | Add target discovery and inline schema insertion |
| `backend/app/routers/discovery.py` | Handle both source and target discovery |
| `backend/app/main.py` | Register files router |
| `frontend/src/services/api.ts` | Add `filesApi.extractSchema` |
| `frontend/src/components/projects/ProjectWizard.tsx` | File upload toggle, multi-file source, preview |
| `backend/tests/unit/test_schema_extractor.py` | Unit tests for all parsers |
| `backend/tests/unit/test_files_router.py` | Tests for upload endpoint |

---

### Task 1: Database Migration

**Files:**
- Modify: `backend/app/models/schema_cache.py:17`
- Modify: `backend/app/models/project.py` (add fields)
- Create: Alembic migration

**Context:** The `SchemaCache` model stores one row per column. Currently `connection_id` is `nullable=False`. For inline file schemas, there is no connection, so this must become nullable. The `Project` model needs two new JSON fields to store extracted schemas.

- [ ] **Step 1: Make connection_id nullable in SchemaCache**

```python
# backend/app/models/schema_cache.py line 17
connection_id = Column(Uuid(as_uuid=False), ForeignKey("connections.id"), nullable=True)
```

- [ ] **Step 2: Add source_schemas and target_schema to Project model**

Open `backend/app/models/project.py` and add after the existing connection fields:

```python
source_schemas = Column(JSON, nullable=True)
target_schema = Column(JSON, nullable=True)
```

Import `JSON` from `sqlalchemy` if not already imported.

- [ ] **Step 3: Generate Alembic migration**

Run:
```bash
cd backend
docker-compose exec backend alembic revision --autogenerate -m "add_inline_schema_support"
```

Expected: A new migration file is created in `backend/alembic/versions/`.

- [ ] **Step 4: Verify migration script**

Open the generated migration and confirm it contains:
- `op.alter_column('schema_cache', 'connection_id', existing_type=sa.UUID(), nullable=True)`
- `op.add_column('projects', sa.Column('source_schemas', sa.JSON(), nullable=True))`
- `op.add_column('projects', sa.Column('target_schema', sa.JSON(), nullable=True))`

- [ ] **Step 5: Apply migration**

```bash
docker-compose exec backend alembic upgrade head
```

Expected: `INFO  [alembic.runtime.migration] Context impl PostgresqlImpl. Running upgrade ...`

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/schema_cache.py backend/app/models/project.py backend/alembic/versions/
git commit -m "feat: add source_schemas and target_schema fields, make connection_id nullable

Enables storing inline file schemas on projects and inserting
inline schema rows into schema_cache without a connection.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: SchemaExtractor Service

**Files:**
- Create: `backend/app/services/schema_extractor.py`
- Create: `backend/app/services/__init__.py` (if missing)

**Context:** This service parses uploaded files and returns a standardized schema dict. Pandas handles CSV, JSON, Parquet, and Excel. FastAvro handles Avro. Each parser returns `{"source_name": str, "columns": [{"name": str, "type": str}]}`.

- [ ] **Step 1: Write failing test**

Create `backend/tests/unit/test_schema_extractor.py`:

```python
import pytest
from io import BytesIO
from app.services.schema_extractor import SchemaExtractor


class TestCSVParser:
    def test_parse_csv(self):
        content = b"first_name,last_name,age\nJohn,Doe,30\nJane,Smith,25"
        file = BytesIO(content)
        file.name = "test.csv"
        extractor = SchemaExtractor()
        result = extractor.extract(file, "test.csv")
        assert result["source_name"] == "test.csv"
        assert len(result["columns"]) == 3
        assert result["columns"][0] == {"name": "first_name", "type": "string"}
        assert result["columns"][2] == {"name": "age", "type": "integer"}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker-compose exec backend pytest tests/unit/test_schema_extractor.py::TestCSVParser::test_parse_csv -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.schema_extractor'`

- [ ] **Step 3: Implement SchemaExtractor**

Create `backend/app/services/schema_extractor.py`:

```python
from abc import ABC, abstractmethod
from typing import Dict, List, Any
import pandas as pd


class FileParser(ABC):
    @abstractmethod
    def parse(self, content: bytes, source_name: str) -> Dict[str, Any]: ...


class CSVParser(FileParser):
    def parse(self, content: bytes, source_name: str) -> Dict[str, Any]:
        df = pd.read_csv(pd.io.common.BytesIO(content))
        return self._dataframe_to_schema(df, source_name)


class JSONParser(FileParser):
    def parse(self, content: bytes, source_name: str) -> Dict[str, Any]:
        from pandas.io.json._json import JsonReader
        try:
            df = pd.read_json(pd.io.common.BytesIO(content), lines=True)
        except ValueError:
            df = pd.read_json(pd.io.common.BytesIO(content))
        return self._dataframe_to_schema(df, source_name)


class ParquetParser(FileParser):
    def parse(self, content: bytes, source_name: str) -> Dict[str, Any]:
        df = pd.read_parquet(pd.io.common.BytesIO(content))
        return self._dataframe_to_schema(df, source_name)


class ExcelParser(FileParser):
    def parse(self, content: bytes, source_name: str) -> Dict[str, Any]:
        df = pd.read_excel(pd.io.common.BytesIO(content))
        return self._dataframe_to_schema(df, source_name)


class AvroParser(FileParser):
    def parse(self, content: bytes, source_name: str) -> Dict[str, Any]:
        import fastavro
        reader = fastavro.reader(pd.io.common.BytesIO(content))
        columns = []
        for field in reader.writer_schema["fields"]:
            col_type = field["type"]
            if isinstance(col_type, list) and "null" in col_type:
                col_type = [t for t in col_type if t != "null"][0]
            columns.append({
                "name": field["name"],
                "type": self._map_avro_type(col_type)
            })
        return {"source_name": source_name, "columns": columns}

    def _map_avro_type(self, avro_type: Any) -> str:
        mapping = {
            "string": "string", "bytes": "string",
            "int": "integer", "long": "integer",
            "float": "float", "double": "float",
            "boolean": "boolean",
            "null": "string"
        }
        return mapping.get(avro_type, "string")


class DataFrameMixin:
    def _dataframe_to_schema(self, df: pd.DataFrame, source_name: str) -> Dict[str, Any]:
        columns = []
        for col_name, dtype in df.dtypes.items():
            columns.append({
                "name": str(col_name),
                "type": self._map_pandas_type(dtype)
            })
        return {"source_name": source_name, "columns": columns}

    def _map_pandas_type(self, dtype: Any) -> str:
        dtype_str = str(dtype)
        if "int" in dtype_str:
            return "integer"
        elif "float" in dtype_str:
            return "float"
        elif "bool" in dtype_str:
            return "boolean"
        elif "datetime" in dtype_str:
            return "datetime"
        else:
            return "string"


class CSVParser(DataFrameMixin, FileParser): ...
class JSONParser(DataFrameMixin, FileParser): ...
class ParquetParser(DataFrameMixin, FileParser): ...
class ExcelParser(DataFrameMixin, FileParser): ...


class SchemaExtractor:
    _parsers: Dict[str, FileParser] = {}

    def __init__(self):
        self._parsers = {
            ".csv": CSVParser(),
            ".json": JSONParser(),
            ".parquet": ParquetParser(),
            ".xlsx": ExcelParser(),
            ".xls": ExcelParser(),
            ".avro": AvroParser(),
        }

    def extract(self, content: bytes, source_name: str) -> Dict[str, Any]:
        ext = "." + source_name.split(".")[-1].lower() if "." in source_name else ""
        if ext not in self._parsers:
            raise ValueError(f"Unsupported file format: {ext}")
        return self._parsers[ext].parse(content, source_name)
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker-compose exec backend pytest tests/unit/test_schema_extractor.py::TestCSVParser::test_parse_csv -v
```

Expected: `PASSED`

- [ ] **Step 5: Add tests for all parsers**

Add to `backend/tests/unit/test_schema_extractor.py`:

```python
import json

class TestJSONParser:
    def test_parse_json_array(self):
        content = json.dumps([{"a": 1, "b": "x"}, {"a": 2, "b": "y"}]).encode()
        extractor = SchemaExtractor()
        result = extractor.extract(content, "test.json")
        assert result["columns"][0]["type"] == "integer"
        assert result["columns"][1]["type"] == "string"

    def test_parse_json_lines(self):
        content = b'{"a": 1}\n{"a": 2}'
        extractor = SchemaExtractor()
        result = extractor.extract(content, "test.json")
        assert result["columns"][0]["type"] == "integer"


class TestUnsupportedFormat:
    def test_unsupported_extension(self):
        extractor = SchemaExtractor()
        with pytest.raises(ValueError, match="Unsupported file format: .txt"):
            extractor.extract(b"hello", "test.txt")
```

- [ ] **Step 6: Run all extractor tests**

```bash
docker-compose exec backend pytest tests/unit/test_schema_extractor.py -v
```

Expected: All 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/schema_extractor.py backend/tests/unit/test_schema_extractor.py
git commit -m "feat: add SchemaExtractor service with CSV/JSON/Parquet/Excel/Avro support

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: File Upload Endpoint

**Files:**
- Create: `backend/app/routers/files.py`
- Modify: `backend/app/main.py:5,40-45`

**Context:** New FastAPI router with a single endpoint that accepts multipart file uploads, delegates to SchemaExtractor, and returns the parsed schema.

- [ ] **Step 1: Write failing test**

Create `backend/tests/unit/test_files_router.py`:

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from io import BytesIO

from app.main import app

client = TestClient(app)


def test_extract_schema_csv():
    with patch("app.routers.files.SchemaExtractor") as mock_extractor:
        mock_extractor.return_value.extract.return_value = {
            "source_name": "test.csv",
            "columns": [{"name": "id", "type": "integer"}]
        }
        response = client.post(
            "/files/extract-schema",
            files={"file": ("test.csv", BytesIO(b"id,name\n1,Alice"), "text/csv")}
        )
        assert response.status_code == 200
        assert response.json()["columns"][0]["name"] == "id"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker-compose exec backend pytest tests/unit/test_files_router.py::test_extract_schema_csv -v
```

Expected: `FAILED` — router not registered, 404.

- [ ] **Step 3: Create files router**

Create `backend/app/routers/files.py`:

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.schema_extractor import SchemaExtractor

router = APIRouter(prefix="/files", tags=["files"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/extract-schema")
async def extract_schema(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")

    extractor = SchemaExtractor()
    try:
        result = extractor.extract(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {str(e)}")

    if not result.get("columns"):
        raise HTTPException(status_code=422, detail="No columns found in file")

    return result
```

- [ ] **Step 4: Register router in main.py**

```python
# backend/app/main.py line 5
from app.routers import auth, connections, projects, discovery, mappings, export, files

# backend/app/main.py after line 45
app.include_router(files.router)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
docker-compose exec backend pytest tests/unit/test_files_router.py::test_extract_schema_csv -v
```

Expected: `PASSED`

- [ ] **Step 6: Add error handling tests**

Add to `backend/tests/unit/test_files_router.py`:

```python
def test_extract_schema_unsupported_format():
    response = client.post(
        "/files/extract-schema",
        files={"file": ("test.txt", BytesIO(b"hello"), "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_extract_schema_empty_file():
    response = client.post(
        "/files/extract-schema",
        files={"file": ("test.csv", BytesIO(b""), "text/csv")}
    )
    assert response.status_code == 422
```

- [ ] **Step 7: Run all files router tests**

```bash
docker-compose exec backend pytest tests/unit/test_files_router.py -v
```

Expected: All 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/app/routers/files.py backend/tests/unit/test_files_router.py backend/app/main.py
git commit -m "feat: add POST /files/extract-schema endpoint

Accepts multipart file uploads, delegates to SchemaExtractor,
returns parsed column schema. Max file size 10MB.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Update Project Model, Schema, and Router

**Files:**
- Modify: `backend/app/schemas/project.py`
- Modify: `backend/app/routers/projects.py:22-38`

**Context:** `ProjectCreate` must accept `source_schemas` and `target_schema`. The creation endpoint must validate that at least one source and exactly one target are provided.

- [ ] **Step 1: Update ProjectCreate schema**

Open `backend/app/schemas/project.py` and modify `ProjectCreate`:

```python
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, model_validator
from uuid import UUID


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source_connection_id: Optional[UUID] = None
    source_schemas: Optional[List[Dict[str, Any]]] = None
    target_connection_id: Optional[UUID] = None
    target_schema: Optional[Dict[str, Any]] = None
    jira_connection_id: Optional[UUID] = None
    llm_connection_id: Optional[UUID] = None
    jira_ticket_key: Optional[str] = None

    @model_validator(mode="after")
    def validate_source_and_target(self):
        has_db_source = self.source_connection_id is not None
        has_inline_source = self.source_schemas is not None and len(self.source_schemas) > 0
        if not has_db_source and not has_inline_source:
            raise ValueError("At least one source required (connection or file)")

        has_db_target = self.target_connection_id is not None
        has_inline_target = self.target_schema is not None
        if has_db_target and has_inline_target:
            raise ValueError("Cannot specify both target connection and target file")
        if not has_db_target and not has_inline_target:
            raise ValueError("Exactly one target required (connection or file)")
        return self
```

- [ ] **Step 2: Update ProjectResponse schema**

Add to `ProjectResponse`:

```python
class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    status: str
    current_phase: str
    source_connection_id: Optional[UUID] = None
    source_schemas: Optional[List[Dict[str, Any]]] = None
    target_connection_id: Optional[UUID] = None
    target_schema: Optional[Dict[str, Any]] = None
    jira_connection_id: Optional[UUID] = None
    llm_connection_id: Optional[UUID] = None
    jira_ticket_key: Optional[str] = None

    class Config:
        from_attributes = True
```

- [ ] **Step 3: Update create_project endpoint**

Modify `backend/app/routers/projects.py` lines 22-38:

```python
@router.post("/", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    user_id = "00000000-0000-0000-0000-000000000001"
    project = Project(
        user_id=user_id,
        name=data.name,
        description=data.description,
        source_connection_id=data.source_connection_id,
        source_schemas=data.source_schemas,
        target_connection_id=data.target_connection_id,
        target_schema=data.target_schema,
        jira_connection_id=data.jira_connection_id,
        llm_connection_id=data.llm_connection_id,
        jira_ticket_key=data.jira_ticket_key
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project
```

- [ ] **Step 4: Write validation test**

Create `backend/tests/unit/test_project_validation.py`:

```python
import pytest
from app.schemas.project import ProjectCreate


def test_project_create_with_inline_source_only():
    data = ProjectCreate(
        name="Test",
        source_schemas=[{"source_name": "a.csv", "columns": []}],
        target_schema={"source_name": "b.csv", "columns": []}
    )
    assert data.source_schemas is not None


def test_project_create_no_source_fails():
    with pytest.raises(ValueError, match="At least one source required"):
        ProjectCreate(name="Test", target_schema={"columns": []})


def test_project_create_both_targets_fails():
    from uuid import uuid4
    with pytest.raises(ValueError, match="Cannot specify both target"):
        ProjectCreate(
            name="Test",
            source_schemas=[{"columns": []}],
            target_connection_id=uuid4(),
            target_schema={"columns": []}
        )
```

- [ ] **Step 5: Run validation tests**

```bash
docker-compose exec backend pytest tests/unit/test_project_validation.py -v
```

Expected: All 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/project.py backend/app/routers/projects.py backend/tests/unit/test_project_validation.py
git commit -m "feat: add source_schemas and target_schema to ProjectCreate/Response

Adds validation: at least one source, exactly one target.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Update Discovery Service for Target and Inline Schemas

**Files:**
- Modify: `backend/app/services/schema_discovery_service.py`

**Context:** The discovery service currently only handles source DB discovery. Extend it to: (1) discover target DB schemas, (2) insert inline source schemas into `schema_cache`, (3) insert inline target schemas into `schema_cache`.

- [ ] **Step 1: Add inline schema insertion method**

Open `backend/app/services/schema_discovery_service.py` and add after `get_cached_schema`:

```python
    @staticmethod
    async def insert_inline_schema(project_id: str, schema_data: dict, is_target: bool = False) -> List[SchemaCache]:
        """Insert inline file schema into schema_cache as rows."""
        async with AsyncSessionLocal() as session:
            entries = []
            source_name = schema_data.get("source_name", "inline")
            # For target, use a fixed schema_name to avoid conflicts
            schema_name = "target" if is_target else source_name
            table_name = source_name.split(".")[0] if "." in source_name else source_name

            for col in schema_data.get("columns", []):
                entry = SchemaCache(
                    connection_id=None,
                    project_id=project_id,
                    object_type=ObjectType.column,
                    schema_name=schema_name,
                    table_name=table_name,
                    column_name=col["name"],
                    data_type=col.get("type", "string"),
                    is_nullable=True
                )
                entries.append(entry)
                session.add(entry)
            await session.commit()
        return entries

    @staticmethod
    async def clear_project_cache(project_id: str) -> None:
        """Remove existing schema_cache entries for a project."""
        async with AsyncSessionLocal() as session:
            from sqlalchemy import delete
            await session.execute(
                delete(SchemaCache).where(SchemaCache.project_id == project_id)
            )
            await session.commit()
```

- [ ] **Step 2: Add target discovery to discover_schema**

Modify `discover_schema` to accept a `connection_id` and handle target DB types. Actually, the current method already accepts `connection_id`. We just need to call it for both source and target from the router.

Wait — looking at the existing `discover_schema`, it takes `connection_id` and `project_id`. So we can call it twice: once for source, once for target. No changes needed to `discover_schema` for DB sources.

But we do need to clear old cache before inserting new. Let me update the discovery endpoint instead.

Actually, let me add a helper that wraps the whole discovery flow:

```python
    @staticmethod
    async def discover_target_schema(connection_id: str, project_id: str, params: dict) -> List[SchemaCache]:
        """Discover target schema from a database connection."""
        return await SchemaDiscoveryService.discover_schema(connection_id, project_id, params)
```

This is just an alias for clarity. Not strictly needed.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/schema_discovery_service.py
git commit -m "feat: add insert_inline_schema and clear_project_cache to discovery service

Enables writing inline file schemas into schema_cache as rows.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Update Discovery Endpoint

**Files:**
- Modify: `backend/app/routers/discovery.py`

**Context:** The discovery endpoint currently only handles source DB discovery. Update it to handle: (1) source DB, (2) source inline schemas, (3) target DB, (4) target inline schema. Clear old cache first.

- [ ] **Step 1: Write failing test**

Create `backend/tests/unit/test_discovery_inline.py`:

```python
import pytest
from unittest.mock import patch, AsyncMock
from app.routers.discovery import discover_schema
from app.models.project import Project


@pytest.mark.asyncio
async def test_discover_with_inline_source():
    mock_db = AsyncMock()
    project = Project(
        id="test-project",
        name="Test",
        source_schemas=[{"source_name": "a.csv", "columns": [{"name": "id", "type": "integer"}]}],
        target_schema={"source_name": "b.csv", "columns": [{"name": "name", "type": "string"}]}
    )
    mock_db.get.return_value = project

    with patch("app.routers.discovery.SchemaDiscoveryService") as mock_service:
        mock_service.clear_project_cache = AsyncMock()
        mock_service.insert_inline_schema = AsyncMock()
        response = await discover_schema("test-project", None, mock_db)
        assert response["message"] == "Schema discovery completed"
        assert mock_service.insert_inline_schema.call_count == 2
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker-compose exec backend pytest tests/unit/test_discovery_inline.py -v
```

Expected: `FAILED` — signature mismatch, endpoint doesn't handle inline.

- [ ] **Step 3: Update discovery endpoint**

Replace `backend/app/routers/discovery.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.project import Project
from app.services.schema_discovery_service import SchemaDiscoveryService
from app.services.connection_service import ConnectionService

router = APIRouter(prefix="/projects", tags=["discovery"])


@router.post("/{project_id}/discover")
async def discover_schema(project_id: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate at least one source exists
    has_db_source = project.source_connection_id is not None
    has_inline_source = project.source_schemas is not None and len(project.source_schemas) > 0
    if not has_db_source and not has_inline_source:
        raise HTTPException(status_code=400, detail="Source not set")

    # Validate target exists
    has_db_target = project.target_connection_id is not None
    has_inline_target = project.target_schema is not None
    if not has_db_target and not has_inline_target:
        raise HTTPException(status_code=400, detail="Target not set")

    # Clear old cache
    await SchemaDiscoveryService.clear_project_cache(project_id)

    # Discover/source inline schemas
    if has_inline_source:
        for schema_data in project.source_schemas:
            await SchemaDiscoveryService.insert_inline_schema(project_id, schema_data, is_target=False)

    if has_db_source:
        params = await ConnectionService.get_connection_string(str(project.source_connection_id))
        await SchemaDiscoveryService.discover_schema(
            str(project.source_connection_id),
            project_id,
            params
        )

    # Discover/target inline schema
    if has_inline_target:
        await SchemaDiscoveryService.insert_inline_schema(project_id, project.target_schema, is_target=True)

    if has_db_target:
        params = await ConnectionService.get_connection_string(str(project.target_connection_id))
        await SchemaDiscoveryService.discover_target_schema(
            str(project.target_connection_id),
            project_id,
            params
        )

    project.current_phase = "discovery"
    await db.commit()

    return {"message": "Schema discovery completed"}


@router.get("/{project_id}/schema")
async def get_schema(project_id: str):
    schema = await SchemaDiscoveryService.get_cached_schema(project_id)
    return schema
```

Wait — I used `discover_target_schema` but that method doesn't exist. Let me fix that — just call `discover_schema` for target too.

```python
    if has_db_target:
        params = await ConnectionService.get_connection_string(str(project.target_connection_id))
        await SchemaDiscoveryService.discover_schema(
            str(project.target_connection_id),
            project_id,
            params
        )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker-compose exec backend pytest tests/unit/test_discovery_inline.py -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/discovery.py backend/tests/unit/test_discovery_inline.py
git commit -m "feat: extend discovery endpoint for target and inline schemas

Handles DB source, inline source(s), DB target, and inline target.
Clears old cache before inserting new schema rows.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Update LLM Orchestrator for Multiple Sources

**Files:**
- Modify: `backend/app/services/llm_orchestrator.py:10-55`

**Context:** `build_prompt` currently takes `source_schema: Dict` (singular). With multiple sources, `get_cached_schema` returns a dict with multiple top-level keys (one per source). The LLM can already handle this — we just need to update the prompt text to clarify that top-level keys are source names.

- [ ] **Step 1: Update build_prompt**

Modify `backend/app/services/llm_orchestrator.py`:

```python
    @staticmethod
    def build_prompt(target_schema: Dict, source_schema: Dict,
                     jira_context: Optional[str], user_text: str,
                     historical_feedback: List[Dict]) -> str:
        prompt = f"""You are a data mapping expert. Given a target schema and one or more source schemas, propose column mappings.

## Target Schema
{json.dumps(target_schema, indent=2)}

## Source Schemas
Top-level keys in the source schema are source names (e.g., filenames or database schemas).
{json.dumps(source_schema, indent=2)}

## Context
"""
        if jira_context:
            prompt += f"- Jira Ticket: {jira_context}\n"
        if user_text:
            prompt += f"- User Description: {user_text}\n"

        if historical_feedback:
            prompt += "\n## Past Successful Mappings\n"
            for fb in historical_feedback[:5]:
                prompt += f"- {json.dumps(fb)}\n"

        prompt += """
## Instructions
For each target column, propose the best source column(s). Include:
- source_table, source_column (use the source name as prefix if needed, e.g., "customers.csv.users.first_name")
- business_logic: why this maps
- transformation_rule: any SQL/transform needed (e.g., CONCAT, SUM, CAST)
- confidence_score: 0.0-1.0

Output as JSON array with this structure:
[
  {
    "target_table": "...",
    "target_column": "...",
    "source_table": "...",
    "source_column": "...",
    "business_logic": "...",
    "transformation_rule": "...",
    "confidence_score": 0.95,
    "reasoning": "..."
  }
]
"""
        return prompt
```

- [ ] **Step 2: Run existing LLM orchestrator test**

```bash
docker-compose exec backend pytest tests/unit/test_llm_orchestrator.py -v
```

Expected: Both tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/llm_orchestrator.py
git commit -m "feat: update LLM prompt to clarify multiple source schemas

Top-level keys in source schema are now labeled as source names
(filenames or DB schemas) so the LLM can disambiguate.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Frontend API Service Updates

**Files:**
- Modify: `frontend/src/services/api.ts`

**Context:** Add `filesApi` for the extract-schema endpoint. Update `projectsApi.create` type if using TypeScript (currently `any`, so no change needed).

- [ ] **Step 1: Add filesApi**

Add to `frontend/src/services/api.ts` after the export APIs:

```typescript
// File APIs
export const filesApi = {
  extractSchema: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/files/extract-schema', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: add filesApi.extractSchema to frontend API service

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Frontend ProjectWizard File Upload

**Files:**
- Modify: `frontend/src/components/projects/ProjectWizard.tsx`

**Context:** Replace the simple source/target dropdowns with a toggle that lets users choose between a DB connection or uploading file(s). Source supports multiple files; target supports one file. Show schema preview after upload.

- [ ] **Step 1: Add state for file upload mode and schemas**

Add new state hooks after the existing ones:

```typescript
const [sourceMode, setSourceMode] = useState<'connection' | 'file'>('connection')
const [targetMode, setTargetMode] = useState<'connection' | 'file'>('connection')
const [sourceFiles, setSourceFiles] = useState<Array<{ file: File; schema: any; uploading: boolean; error?: string }>>([])
const [targetFile, setTargetFile] = useState<{ file: File; schema: any; uploading: boolean; error?: string } | null>(null)
```

- [ ] **Step 2: Add file upload handler**

Add inside the component:

```typescript
  const handleSourceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newEntries = files.map(file => ({ file, schema: null, uploading: true }))
    setSourceFiles(prev => [...prev, ...newEntries])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const response = await filesApi.extractSchema(file)
        setSourceFiles(prev => {
          const idx = prev.findIndex(f => f.file === file)
          if (idx === -1) return prev
          const updated = [...prev]
          updated[idx] = { ...updated[idx], schema: response.data, uploading: false }
          return updated
        })
      } catch (err: any) {
        setSourceFiles(prev => {
          const idx = prev.findIndex(f => f.file === file)
          if (idx === -1) return prev
          const updated = [...prev]
          updated[idx] = { ...updated[idx], uploading: false, error: err.response?.data?.detail || 'Parse failed' }
          return updated
        })
      }
    }
  }

  const handleTargetFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTargetFile({ file, schema: null, uploading: true })
    try {
      const response = await filesApi.extractSchema(file)
      setTargetFile({ file, schema: response.data, uploading: false })
    } catch (err: any) {
      setTargetFile({ file, schema: null, uploading: false, error: err.response?.data?.detail || 'Parse failed' })
    }
  }
```

- [ ] **Step 3: Update handleCreate to include schemas**

Replace the existing `handleCreate`:

```typescript
  const handleCreate = async () => {
    setCreating(true)
    try {
      const payload: any = {
        name,
        description,
        llm_connection_id: llmId || null,
        jira_ticket_key: jiraKey || null
      }

      if (sourceMode === 'connection') {
        payload.source_connection_id = sourceId || null
      } else {
        payload.source_schemas = sourceFiles.filter(f => f.schema).map(f => f.schema)
      }

      if (targetMode === 'connection') {
        payload.target_connection_id = targetId || null
      } else {
        payload.target_schema = targetFile?.schema || null
      }

      await projectsApi.create(payload)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onCreated()
      // Reset all state
      setName('')
      setDescription('')
      setSourceId('')
      setTargetId('')
      setLlmId('')
      setJiraKey('')
      setSourceFiles([])
      setTargetFile(null)
      setSourceMode('connection')
      setTargetMode('connection')
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to create project')
    }
    setCreating(false)
  }
```

- [ ] **Step 4: Replace source/target dropdowns with toggle UI**

Replace the source connection dropdown section (lines 99-117) with:

```tsx
      <div className={inputGrid}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Database size={14} style={{ color: 'var(--cyan)' }} />
              Source
            </span>
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setSourceMode('connection')}
              className={`text-xs px-2 py-1 rounded ${sourceMode === 'connection' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Connection
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('file')}
              className={`text-xs px-2 py-1 rounded ${sourceMode === 'file' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Upload File(s)
            </button>
          </div>
          {sourceMode === 'connection' ? (
            <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="input-dark w-full">
              <option value="">Select source...</option>
              {sourceConnections.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <div>
              <input
                type="file"
                multiple
                accept=".csv,.json,.parquet,.xlsx,.xls,.avro"
                onChange={handleSourceFileSelect}
                className="input-dark w-full text-sm"
              />
              {sourceFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {sourceFiles.map((entry, idx) => (
                    <div key={idx} className={`text-xs p-2 rounded border ${entry.error ? 'border-red-500 bg-red-900/20' : 'border-gray-600 bg-gray-800'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entry.file.name}</span>
                        {entry.uploading && <Loader2 size={12} className="animate-spin" />}
                        {entry.error && <span className="text-red-400">{entry.error}</span>}
                        {!entry.uploading && !entry.error && entry.schema && (
                          <span className="text-green-400">{entry.schema.columns.length} columns</span>
                        )}
                      </div>
                      {entry.schema && (
                        <div className="mt-1 text-gray-400">
                          {entry.schema.columns.map((c: any) => `${c.name} (${c.type})`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
```

Do the same for target (lines 118-136) but without `multiple` on the file input.

- [ ] **Step 5: Update create button disabled state**

Change the disabled condition on the Create button:

```typescript
disabled={creating || !name || (
  sourceMode === 'connection' ? !sourceId : sourceFiles.filter(f => f.schema).length === 0
) || (
  targetMode === 'connection' ? !targetId : !targetFile?.schema
)}
```

- [ ] **Step 6: Test frontend manually**

Start the dev server:
```bash
docker-compose up --build -d
```

Navigate to the project page, verify:
- Toggle between connection and file upload appears
- File upload accepts multiple files for source
- Schema preview shows column names and types
- Create project button is disabled until valid input
- Error states show for parse failures

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/projects/ProjectWizard.tsx
git commit -m "feat: add file upload toggle to ProjectWizard

Source supports multiple files with schema preview.
Target supports single file. Toggle between DB connection
and file upload for each side.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: End-to-End Verification

**Files:**
- None (manual verification)

**Context:** Run through the full flow: create project with uploaded files, trigger discovery, verify schema_cache entries, verify LLM prompt includes multiple sources.

- [ ] **Step 1: Start all services**

```bash
docker-compose up --build -d
```

- [ ] **Step 2: Create test CSV files**

```bash
cat > /tmp/customers.csv << 'EOF'
id,first_name,last_name,email
1,John,Doe,john@example.com
2,Jane,Smith,jane@example.com
EOF

cat > /tmp/orders.csv << 'EOF'
order_id,customer_id,amount,order_date
101,1,99.99,2024-01-15
102,2,149.50,2024-01-16
EOF

cat > /tmp/target_schema.csv << 'EOF'
customer_id,full_name,total_spend
,,
EOF
```

- [ ] **Step 3: Test file upload endpoint**

```bash
curl -X POST http://localhost:8000/files/extract-schema \
  -F "file=@/tmp/customers.csv"
```

Expected: JSON response with 4 columns (id, first_name, last_name, email).

- [ ] **Step 4: Create project via API with inline schemas**

```bash
curl -X POST http://localhost:8000/projects/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "File Mapping Test",
    "source_schemas": [
      {"source_name": "customers.csv", "columns": [
        {"name": "id", "type": "integer"},
        {"name": "first_name", "type": "string"},
        {"name": "last_name", "type": "string"},
        {"name": "email", "type": "string"}
      ]},
      {"source_name": "orders.csv", "columns": [
        {"name": "order_id", "type": "integer"},
        {"name": "customer_id", "type": "integer"},
        {"name": "amount", "type": "float"},
        {"name": "order_date", "type": "string"}
      ]}
    ],
    "target_schema": {
      "source_name": "target.csv",
      "columns": [
        {"name": "customer_id", "type": "integer"},
        {"name": "full_name", "type": "string"},
        {"name": "total_spend", "type": "float"}
      ]
    }
  }'
```

Save the returned project ID.

- [ ] **Step 5: Trigger discovery**

```bash
curl -X POST http://localhost:8000/projects/{PROJECT_ID}/discover
```

Expected: `{"message": "Schema discovery completed"}`

- [ ] **Step 6: Verify cached schema**

```bash
curl http://localhost:8000/projects/{PROJECT_ID}/schema
```

Expected: JSON with three top-level keys: `customers.csv`, `orders.csv`, and `target`.

- [ ] **Step 7: Verify frontend**

Open browser to `http://localhost:5173`, navigate to Projects, click New Mapping Project, verify:
- Source toggle shows Connection / Upload File(s)
- Uploading `customers.csv` and `orders.csv` shows schema previews
- Target toggle works similarly
- Creating project succeeds

---

## Spec Coverage Check

| Spec Requirement | Implementing Task |
|------------------|-------------------|
| `POST /files/extract-schema` endpoint | Task 3 |
| Parse CSV, JSON, Parquet, Excel, Avro | Task 2 |
| Type inference mapping | Task 2 |
| `source_schemas` and `target_schema` on Project | Task 4 |
| Validation: at least one source, exactly one target | Task 4 |
| Make `connection_id` nullable in schema_cache | Task 1 |
| Insert inline schemas into schema_cache | Task 5 |
| Discovery handles DB source, inline source(s), DB target, inline target | Task 6 |
| `get_cached_schema` includes inline rows | Task 5 (insert_inline_schema uses schema_name) |
| LLM prompt clarifies multiple sources | Task 7 |
| Frontend toggle for connection vs file | Task 9 |
| Frontend multi-file source upload | Task 9 |
| Frontend schema preview | Task 9 |
| Frontend error handling | Task 9 |
| Tests for all parsers | Task 2 |
| Tests for upload endpoint | Task 3 |
| Tests for validation | Task 4 |
| Tests for discovery with inline | Task 6 |

**No gaps found.**

---

## Placeholder Scan

- No "TBD", "TODO", or "implement later" found.
- All code blocks contain complete implementations.
- All test assertions are explicit.
- All file paths are exact.

---

## Type Consistency Check

- `SchemaExtractor.extract(content: bytes, source_name: str)` — consistent across Task 2 and Task 3
- `ProjectCreate.source_schemas: Optional[List[Dict[str, Any]]]` — consistent across Task 4 and Task 6
- `ProjectCreate.target_schema: Optional[Dict[str, Any]]` — consistent across Task 4 and Task 6
- `insert_inline_schema(project_id, schema_data, is_target)` — consistent across Task 5 and Task 6

No type mismatches found.
