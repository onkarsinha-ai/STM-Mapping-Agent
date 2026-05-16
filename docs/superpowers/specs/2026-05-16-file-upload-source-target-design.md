# File Upload for Source/Target Schema Input — Design Spec

**Date:** 2026-05-16  
**Status:** Approved  
**Approach:** Approach 1 — Upload-to-Schema Endpoint + Project Schema Fields

---

## Problem Statement

Currently, the STM Mapping Agent requires users to pre-create database connections before starting a project. There is no way to directly upload a file (CSV, Excel, Parquet, etc.) and use its schema as a source or target for mapping. This creates friction for users who have data files but no running database.

## Goals

- Allow users to upload files directly during project creation (no pre-made connection)
- Support any combination of DB connections and uploaded files for source/target
- Support multiple source files per project
- Discard uploaded files after schema extraction (no persistent file storage)
- Reuse existing mapping engine, LLM orchestrator, and export flows

## Non-Goals

- Persistent file storage or re-download
- Sample data extraction for LLM context
- Support for more than one target schema

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  ProjectWizard  │────▶│ POST /files/     │────▶│  SchemaExtractor│
│  (File picker)  │     │ extract-schema   │     │ (CSV/JSON/      │
└─────────────────┘     └──────────────────┘     │  XLSX/PQ/AVRO)  │
                                                  └─────────────────┘
                                                          │
                          ┌──────────────────┐           ▼
                          │  Discovery       │◀──┌─────────────────┐
                          │  (write inline   │   │  Schema JSON    │
                          │   schema to      │   │  (col names,    │
                          │   schema_cache)  │   │   types)        │
                          └──────────────────┘   └─────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  schema_cache    │
                          │  (source_name,   │
                          │   schema_data)   │
                          └──────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ LLMOrchestrator  │──▶ Proposed mappings
                          │ (reads cache)    │     (unchanged)
                          └──────────────────┘
```

### Key Design Decisions

1. **Files are temporary** — parsed once, schema extracted, file discarded. No storage.
2. **Schema flows through `schema_cache`** — downstream code (LLM, mapping engine) reads from cache as before.
3. **Multiple sources supported** — each source file gets its own `schema_cache` entry with a `source_name`.
4. **Single target only** — one target schema (DB or inline file).
5. **Extensible parser registry** — new formats added by registering a new parser class.

---

## Backend Changes

### New Endpoint: `POST /files/extract-schema`

Accepts multipart file upload. Returns extracted schema JSON.

**Request:**
- `Content-Type: multipart/form-data`
- Body: `file` (binary)

**Response (200):**
```json
{
  "source_name": "customers.csv",
  "columns": [
    {"name": "first_name", "type": "string"},
    {"name": "last_name", "type": "string"},
    {"name": "age", "type": "integer"}
  ],
  "format": "csv"
}
```

**Errors:**
- `400` — Unsupported file format
- `413` — File exceeds size limit (10MB)
- `422` — Parse failure or no columns found

### Project Model Changes

```python
# backend/app/models/project.py

source_schemas: Mapped[Optional[list[dict]]] = mapped_column(JSON, nullable=True)
target_schema: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
```

`source_schemas` is a list of schema objects, one per uploaded file. `target_schema` is a single schema object.

### Project Schema Changes

```python
# backend/app/schemas/project.py

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source_connection_id: Optional[UUID] = None
    source_schemas: Optional[list[dict]] = None
    target_connection_id: Optional[UUID] = None
    target_schema: Optional[dict] = None
    jira_connection_id: Optional[UUID] = None
    llm_connection_id: Optional[UUID] = None
    jira_ticket_key: Optional[str] = None
```

**Validation rules:**
- At least one source: `source_connection_id is not None` OR `source_schemas` is non-empty
- Exactly one target: XOR of `target_connection_id` and `target_schema`

### schema_cache Changes

Add `source_name` column (nullable string):

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `project_id` | UUID | FK |
| `connection_id` | UUID | FK, nullable |
| `source_name` | String | New. e.g., `customers.csv` or connection name |
| `schema_data` | JSON | Column list |
| `source_type` | Enum | `inline_file`, `database` — nullable, defaults to `database` for existing rows |

### Discovery Endpoint Changes

`POST /projects/{id}/discover`

For each source:
1. If `project.source_schemas` exists: validate structure, write each to `schema_cache` with `source_name` and `source_type='inline_file'`
2. If `project.source_connection_id` exists: query DB, write to `schema_cache` with `source_name=connection.name` and `source_type='database'`

For target:
1. If `project.target_schema` exists: write to `schema_cache` with `source_type='inline_file'`
2. If `project.target_connection_id` exists: query DB, write to `schema_cache` with `source_type='database'`

### LLM Orchestrator Changes

`LLMOrchestrator.build_prompt()` reads all `schema_cache` entries for the project. Groups source entries by `source_name` and formats them for the prompt:

```
Source: customers.csv
- first_name (string)
- last_name (string)

Source: orders.xlsx
- order_id (integer)
- amount (float)

Target:
- full_name (string)
- total_spend (float)
```

---

## File Parsing

### Supported Formats

| Format | Extension | Library |
|--------|-----------|---------|
| CSV | `.csv` | `pandas` |
| JSON | `.json` | `pandas` |
| Parquet | `.parquet` | `pandas` |
| Excel | `.xlsx`, `.xls` | `pandas` (openpyxl) |
| Avro | `.avro` | `fastavro` |

**Format notes:**
- **JSON:** Supports both line-delimited JSONL (`{"a":1}\n{"a":2}`) and array-of-objects (`[{"a":1}, {"a":2}]`). Auto-detected.
- **Excel:** Reads the first sheet by default. Sheet selection UI is out of scope for MVP.
- **Avro:** Schema extracted from file header; no data rows read.

### Type Inference Mapping

| Pandas dtype | Mapped type |
|--------------|-------------|
| `int64`, `Int64` | `integer` |
| `float64`, `Float64` | `float` |
| `bool`, `boolean` | `boolean` |
| `datetime64[ns]` | `datetime` |
| `object`, `string` | `string` |
| `category` | `string` |

### Parser Registry

```python
class FileParser(ABC):
    @abstractmethod
    def parse(self, file: UploadFile) -> dict: ...

class SchemaExtractor:
    _parsers: dict[str, FileParser] = {}

    def register(self, mime_type: str, parser: FileParser):
        self._parsers[mime_type] = parser

    def extract(self, file: UploadFile) -> dict:
        parser = self._get_parser(file)
        return parser.parse(file)
```

### New Dependencies

Add to `backend/requirements.txt`:
```
pandas>=2.0.0
fastavro>=1.8.0
```

---

## Frontend Changes

### ProjectWizard Updates

Replace the single source/target dropdown with a toggle:

```
Source:
[○ Use Connection]  [● Upload File(s)]

[Drag files here or click to browse]
[customers.csv] [x]  [orders.xlsx] [x]

Preview:
┌─ customers.csv ─────────┐
│ first_name   string     │
│ last_name    string     │
└─────────────────────────┘
```

**Behavior:**
- Toggle between "Use Connection" and "Upload File(s)" per side
- Source supports multiple files; target supports one file
- Files uploaded immediately on selection via `POST /files/extract-schema`
- Show loading spinner during upload, error state on failure
- Store extracted schemas in component state
- Include schemas in `POST /projects` payload on creation

### Validation UI

- Disable "Create Project" until at least one source and exactly one target are provided
- Show inline error for parse failures (red border + message below file)
- Toast notification for network errors with retry option

---

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| Unsupported format | 400 | `{"error": "Unsupported file format: .txt"}` |
| File too large | 413 | `{"error": "File exceeds 10MB limit"}` |
| Parse failure | 422 | `{"error": "Failed to parse CSV: unexpected quote at line 5"}` |
| Empty file | 422 | `{"error": "No columns found in file"}` |
| No source provided | 400 | `{"error": "At least one source required"}` |
| Multiple targets | 400 | `{"error": "Exactly one target required"}` |

---

## Testing Strategy

### Backend

- Unit tests for each parser with sample files
- Edge cases: all-null columns, mixed types, empty files, unicode names
- Integration tests for discovery endpoint with inline + DB sources
- LLM orchestrator tests with multiple source schemas

### Frontend

- Mock `POST /files/extract-schema` for upload flow tests
- Test validation: source required, target single, error states
- Test schema preview rendering and file removal

---

## Migration Notes

- Add `source_schemas` and `target_schema` columns to `projects` table (nullable)
- Add `source_name` and `source_type` columns to `schema_cache` table (nullable)
- Existing projects unaffected (new columns are nullable)
