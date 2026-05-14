# STM Mapping Agent — Design Specification

**Date:** 2026-05-14
**Status:** Approved
**Approach:** FastAPI Backend + React Frontend (SaaS-Ready)

---

## 1. Overview

The STM (Source-to-Target Mapping) Agent is an AI-powered tool that automates the discovery and documentation of data mappings between source systems and target data warehouses or databases. The agent follows a phased workflow, checking with the user at every step, and produces a professional Excel output documenting the mappings.

### 1.1 Core Value Proposition

- **Target-driven:** User defines the target table; the agent discovers which source tables and columns map to it.
- **Multi-source:** Supports database connections (PostgreSQL, MySQL, SQL Server, Oracle, Snowflake, BigQuery, etc.) and file uploads (CSV, Parquet).
- **AI-powered:** Uses configurable LLM providers (OpenAI, Anthropic, Azure, custom endpoints via BYO API key).
- **Self-learning:** Improves proposals over time by learning from user approvals, rejections, and modifications.
- **Collaborative:** User reviews and refines every proposal before final export.

### 1.2 Target Users

- Data engineers building ETL/ELT pipelines
- Data analysts documenting lineage
- BI developers mapping source systems to data warehouses

---

## 2. High-Level Architecture

```
+------------------+         REST API         +------------------+
|                  | <-----------------------> |                  |
|  React Frontend  |   (JSON + file upload)   |  FastAPI Backend |
|  (Vite + TS)     |                         |  (Python 3.11+)  |
|                  | <-----------------------> |                  |
+------------------+                         +------------------+
                                                      |
                       +------------------------------+------------------------------+
                       |                              |                              |
                       v                              v                              v
                +-------------+              +-------------+                +-------------+
                |  PostgreSQL |              |    LLM      |                |  Source DBs |
                |  (Metadata) |              |  (LiteLLM)  |                |  (Various)  |
                +-------------+              +-------------+                +-------------+
```

### 2.1 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui | Modern, fast build, great component library |
| State Management | TanStack Query (React Query) | Server state sync, caching, mutations |
| Tables | TanStack Table | Powerful data tables for mapping review |
| Backend | FastAPI, Python 3.11+ | Async native, auto-generated OpenAPI, Pydantic validation |
| ORM | SQLAlchemy 2.0 (async) | Mature, supports async, database-agnostic |
| Migrations | Alembic | Schema versioning |
| LLM | LiteLLM | Unified interface for OpenAI, Anthropic, Azure, custom base URLs |
| DB Drivers | asyncpg, aiomysql, pyodbc, snowflake-connector-python, google-cloud-bigquery | Cover major databases |
| Files | pandas, pyarrow, openpyxl | CSV/Parquet ingestion, Excel export |
| Jira | jira (Python library) | Read-only ticket fetching |
| Security | cryptography (Fernet) | Encrypt credentials at rest |
| Testing | pytest, pytest-asyncio, testcontainers, React Testing Library, Playwright | Full test pyramid |

### 2.2 Deployment Model

**Now (Personal Tool):** Docker Compose with 3 services: frontend, backend, PostgreSQL.

**Future (SaaS):** Backend and frontend containerized. PostgreSQL managed. Add Redis for caching/session store. Add OAuth2/JWT auth. The architecture supports this with minimal changes.

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
users ||--o{ projects : owns
users ||--o{ connections : owns
connections ||--o{ projects : source_for
connections ||--o{ projects : target_for
connections ||--o{ projects : jira_for
connections ||--o{ projects : llm_for
projects ||--|{ schema_cache : caches
projects ||--|{ mappings : produces
projects ||--|{ jira_context : references
mappings ||--o{ mapping_feedback : learns_from
```

### 3.2 Table Definitions

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) | Unique, indexed |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `connections`
Global connection pool. Each connection is owned by a user and can be reused across projects.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| name | VARCHAR(255) | User-defined label, e.g., "Production BigQuery" |
| connection_type | ENUM | `source`, `target`, `jira`, `llm` |
| db_type | ENUM | `postgresql`, `mysql`, `sqlserver`, `oracle`, `snowflake`, `bigquery`, `csv`, `parquet` |
| encrypted_connection_string | TEXT | Fernet-encrypted JSON with all connection params |
| metadata | JSONB | Host, port, database, schema, region, project_id, etc. (non-sensitive) |
| is_tested | BOOLEAN | True if Test Connection succeeded |
| last_tested_at | TIMESTAMP | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `projects`
A project = one STM mapping session.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| name | VARCHAR(255) | |
| description | TEXT | |
| status | ENUM | `active`, `completed`, `archived` |
| current_phase | ENUM | `input`, `discovery`, `propose`, `review`, `export` |
| source_connection_id | UUID FK → connections | Nullable until set |
| target_connection_id | UUID FK → connections | Nullable until set |
| jira_connection_id | UUID FK → connections | Nullable |
| llm_connection_id | UUID FK → connections | Nullable |
| jira_ticket_key | VARCHAR(50) | e.g., "PROJ-123" |
| user_text_input | TEXT | Freeform context from chat |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `schema_cache`
Cached schema metadata from source/target systems.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| connection_id | UUID FK → connections | |
| project_id | UUID FK → projects | |
| object_type | ENUM | `table`, `column`, `constraint`, `index` |
| schema_name | VARCHAR(255) | Database/schema name |
| table_name | VARCHAR(255) | |
| column_name | VARCHAR(255) | Nullable for table-level entries |
| data_type | VARCHAR(255) | |
| is_nullable | BOOLEAN | |
| column_default | TEXT | |
| sample_data | JSONB | Top 5 distinct values |
| stats | JSONB | Row count, cardinality, min, max |
| fetched_at | TIMESTAMP | |

#### `mappings`
The core output — one row per proposed/approved source-to-target column mapping.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| target_connection_id | UUID FK → connections | |
| target_schema | VARCHAR(255) | |
| target_table | VARCHAR(255) | |
| target_column | VARCHAR(255) | |
| source_connection_id | UUID FK → connections | |
| source_schema | VARCHAR(255) | |
| source_table | VARCHAR(255) | |
| source_column | VARCHAR(255) | |
| business_logic | TEXT | Human-readable description of what this mapping means |
| transformation_rule | TEXT | SQL expression, formula, or transformation description |
| confidence_score | DECIMAL(3,2) | 0.00 to 1.00 |
| status | ENUM | `proposed`, `approved`, `rejected`, `modified` |
| llm_reasoning | TEXT | Why the LLM proposed this mapping |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `mapping_feedback`
Self-learning data. Captures user decisions for future training.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| mapping_id | UUID FK → mappings | |
| user_action | ENUM | `approved`, `rejected`, `modified` |
| user_notes | TEXT | Optional explanation |
| original_proposal | JSONB | Snapshot of the mapping at proposal time |
| final_state | JSONB | Snapshot after user action |
| created_at | TIMESTAMP | |

#### `jira_context`
Read-only cache of Jira ticket data.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| ticket_key | VARCHAR(50) | |
| ticket_summary | TEXT | |
| ticket_description | TEXT | |
| acceptance_criteria | TEXT | |
| labels | JSONB | |
| fetched_at | TIMESTAMP | |

### 3.3 Self-Learning Loop Mechanism

1. **Before proposing mappings** for a new project, the `LearningService` queries `mapping_feedback` for entries where:
   - The target table name is similar (fuzzy match or exact)
   - The target column name is similar
   - Ordered by recency

2. **Constructs a "memory prompt"** section:
   - "Past successful mappings for similar targets: [...]"
   - "Past rejected mappings (avoid these patterns): [...]"

3. **Injects into the LLM prompt** along with schema context and user input.

4. **After user review**, saves new `mapping_feedback` rows.

5. **Over time**, the LLM's proposals improve because the prompt contains more relevant examples.

---

## 4. Backend Components

### 4.1 Service Layer

#### `ConnectionService`
- `test_connection(connection_params) → ConnectionTestResult`
  - Attempts to connect using provided params (without saving).
  - Runs `SELECT 1` or dialect-equivalent.
  - Returns success/failure with detailed error message.
- `create_connection(user_id, name, type, db_type, params) → Connection`
  - Encrypts sensitive params with Fernet.
  - Stores metadata (non-sensitive) in JSONB.
- `get_connections(user_id) → List[Connection]`
- `get_connection(user_id, connection_id) → Connection`
- `delete_connection(user_id, connection_id)`
- `decrypt_connection_string(connection_id) → dict`
  - Decrypts on-demand, only when actively connecting.

#### `SchemaDiscoveryService`
- `discover_schema(connection_id, project_id) → List[SchemaCacheEntry]`
  - Connects to DB using decrypted credentials.
  - Executes dialect-specific information_schema queries.
  - Fetches tables, columns, data types, constraints, sample data.
  - Paginates for large schemas (100 tables per batch).
  - Caches results in `schema_cache`.
- `get_cached_schema(project_id) → SchemaTree`
  - Returns hierarchical tree (schema → table → column) from cache.
- `refresh_schema(project_id, connection_id)`
  - Re-runs discovery, updates cache.

**Dialect-Specific Queries:**
| Database | Schema Discovery Method |
|----------|------------------------|
| PostgreSQL | `information_schema.columns`, `information_schema.tables` |
| MySQL | `information_schema.columns`, `SHOW COLUMNS` |
| SQL Server | `INFORMATION_SCHEMA.COLUMNS`, `sys.tables` |
| Oracle | `ALL_TAB_COLUMNS`, `ALL_TABLES` |
| Snowflake | `INFORMATION_SCHEMA.COLUMNS` |
| BigQuery | `INFORMATION_SCHEMA.COLUMNS` via API |
| CSV/Parquet | Pandas/pyarrow schema inference |

#### `JiraService`
- `fetch_ticket(jira_connection_id, ticket_key) → JiraTicket`
  - Connects to Jira API using stored credentials.
  - Fetches summary, description, comments, acceptance criteria, labels.
  - Stores in `jira_context`.
- Gracefully handles 404 (ticket not found) and 403 (no permission) without failing the project.

#### `IngestionService`
- `upload_file(project_id, file) → SchemaCacheEntry`
  - Accepts CSV or Parquet uploads.
  - Saves to temporary storage.
  - Infers schema: column names, data types, sample values.
  - Optionally loads into temporary SQLite for SQL access.
  - Returns schema info for display.

#### `LLMOrchestrator`
- `build_prompt(project_id) → str`
  - Gathers: target schema, source schema (filtered), Jira context, user text input, historical feedback.
  - Constructs a structured prompt with few-shot examples from past feedback.
- `propose_mappings(project_id) → List[Mapping]`
  - Calls LLM via LiteLLM with the built prompt.
  - Parses JSON/structured output into `Mapping` objects.
  - Assigns initial confidence scores.
  - Handles timeouts (60s default) and retries (max 2).
- `retry_with_context(project_id, user_feedback) → List[Mapping]`
  - Re-runs LLM with additional user-provided context after a failed or poor proposal.

**Prompt Structure:**
```
You are a data mapping expert. Given a target table and source schema, propose column mappings.

## Target Table
{target_schema}

## Source Schema
{filtered_source_schema}

## Context
- Jira Ticket: {jira_summary}
- User Description: {user_text}

## Past Successful Mappings (learn from these)
{historical_approvals}

## Past Rejected Mappings (avoid these patterns)
{historical_rejections}

## Instructions
For each target column, propose the best source column. Include:
- source_table, source_column
- business_logic: why this maps
- transformation_rule: any SQL/transform needed
- confidence_score: 0.0-1.0

Output as JSON array.
```

#### `MappingEngine`
- `validate_proposals(project_id, proposals) → List[Mapping]`
  - Heuristic validation: type compatibility, name similarity.
  - Flags low-confidence or incompatible proposals.
- `apply_user_action(mapping_id, action, modifications) → Mapping`
  - Updates status: approved, rejected, modified.
  - Stores snapshot in `mapping_feedback`.
- `calculate_confidence(proposal) → float`
  - Combines LLM confidence with heuristic scores.

#### `LearningService`
- `get_relevant_feedback(user_id, target_table, target_column, limit=10) → List[Feedback]`
  - Fetches past feedback for similar targets.
  - Uses fuzzy matching on table/column names.
- `record_feedback(mapping_id, action, notes)`
  - Stores user decision for future learning.

#### `ExportService`
- `generate_excel(project_id) → bytes`
  - Queries all approved + modified mappings.
  - Generates Excel with one sheet per target table.
  - Columns: Target DB, Target Table, Target Column, Source DB, Source Table, Source Column, Business Logic, Transformation, User Input, Confidence Score.
  - Applies basic styling (headers bold, auto-width, filters).

### 4.2 API Endpoints

#### Authentication (Minimal for Personal Tool)
- `POST /auth/register` — Create user
- `POST /auth/login` — Get JWT token
- `GET /auth/me` — Current user

#### Connections
- `GET /connections` — List user's connections
- `POST /connections` — Create connection
- `POST /connections/test` — Test connection without saving
- `GET /connections/{id}` — Get connection details
- `DELETE /connections/{id}` — Delete connection

#### Projects
- `GET /projects` — List user's projects
- `POST /projects` — Create project
- `GET /projects/{id}` — Get project with phase state
- `PUT /projects/{id}/phase` — Advance phase (input → discovery → propose → review → export)
- `DELETE /projects/{id}` — Delete project

#### Discovery
- `POST /projects/{id}/discover` — Trigger schema discovery
- `GET /projects/{id}/schema` — Get cached schema tree
- `POST /projects/{id}/schema/refresh` — Re-run discovery

#### Mappings
- `POST /projects/{id}/propose` — Trigger LLM proposal
- `GET /projects/{id}/mappings` — List all mappings
- `PUT /mappings/{id}` — Update mapping status (approve/reject/modify)
- `POST /projects/{id}/propose/retry` — Re-run with additional context

#### Files
- `POST /projects/{id}/upload` — Upload CSV/Parquet
- `GET /projects/{id}/files` — List uploaded files

#### Jira
- `POST /projects/{id}/jira/fetch` — Fetch Jira ticket context

#### Export
- `POST /projects/{id}/export` — Generate Excel
- `GET /projects/{id}/export` — Download Excel

### 4.3 Error Handling Strategy

| Error Type | Behavior |
|-----------|----------|
| DB Connection Failure | Retry once with backoff. Surface clear error. Allow editing connection without losing state. |
| LLM Timeout/Error | Retry max 2 times. Fallback to heuristic mapper (name similarity + type matching). Flag with low confidence. |
| LLM Unparsable Output | Log raw output. Return empty proposals with message. User can retry with more context. |
| Schema Too Large | Paginate discovery. Filter source tables by name similarity before sending to LLM. |
| Jira 404/403 | Skip gracefully. Continue without Jira context. |
| No Mappings Found | Return empty with message. Prompt user to upload files or provide more context. |
| All Proposals Rejected | Ask user for clarification. Allow re-running with new context. |

---

## 5. Frontend Design

### 5.1 Layout

```
+-----------------------------------------------------------+
|  Logo    STM Mapping Agent                    User Menu   |
+-----------------------------------------------------------+
|  Sidebar  |  Main Content Area                              |
|           |                                                  |
|  Projects |  [Phase Stepper]                                |
|  ───────  |                                                  |
|  Proj 1   |  ┌─────────────────┬──────────────────────┐    |
|  Proj 2   |  │  Chat Panel     │  Connection Panel    │    |
|  + New    │  │  (Phase 1)      │  (Phase 1-2)         │    |
|           │  └─────────────────┴──────────────────────┘    |
|  Connec-  |                                                  |
|  tions    │  [Schema Browser / Mapping Table / Export]     |
|  ───────  │  (Phases 2-5)                                  |
|  BigQuery |                                                  |
|  Postgres │                                                  |
|  + New    │                                                  |
|           |                                                  |
+-----------------------------------------------------------+
```

### 5.2 Navigation & Routing

| Route | Content |
|-------|---------|
| `/` | Dashboard — list of projects |
| `/connections` | Connection manager — add, test, edit, delete |
| `/projects/new` | New project wizard (starts at Phase 1) |
| `/projects/:id` | Active project — shows current phase content |
| `/projects/:id/export` | Export preview and download |

### 5.3 Phase Screens

#### Phase 1 — Input Gathering

**Left Panel (Chat):**
- Conversational interface where the "agent" asks:
  1. "What target table are you mapping to?"
  2. "Which source connections should I use?" (dropdown of saved connections)
  3. "Any Jira ticket or additional context?"
  4. "Upload any reference files (CSV, Parquet)."
- User can type freeform responses.
- Agent confirms understanding and suggests next steps.

**Right Panel (Configuration):**
- Target connection: dropdown of tested connections
- Source connections: multi-select dropdown
- Jira ticket key: text input (fetches when blurred)
- LLM configuration: dropdown of saved LLM connections
- "Start Discovery" button (enabled when all required fields set)

#### Phase 2 — Discovery

**Schema Browser (Split Pane):**
- **Left:** Target schema tree (expandable: schema → tables → columns with types and samples)
- **Right:** Source schema tree (same structure)
- Search/filter boxes above each tree.
- Progress bar while fetching.
- "Refresh Schema" button to re-fetch.
- Auto-advances to Phase 3 when complete (user can manually advance too).

#### Phase 3 — Propose

**Loading State:**
- Animated spinner: "Analyzing schemas and proposing mappings..."
- Live-updating count: "Found 23 potential mappings so far..."
- Cancel button.

**Preview (after complete):**
- Summary card: "Proposed 45 mappings across 3 source tables. Average confidence: 0.78."
- "Review Mappings" button to enter Phase 4.

#### Phase 4 — Review & Refine (Primary Dashboard)

**Mapping Table (TanStack Table):**
- Sortable, filterable columns
- Bulk actions: Approve All, Reject All, Re-run LLM
- Row actions: Approve (✓), Reject (✗), Edit (pencil)
- Filter presets: "Low confidence (<0.5)", "Unreviewed", "Approved"

**Detail Panel (Right Side):**
- Shows LLM reasoning for selected row
- Shows source and target column details
- Shows historical similar mappings (from learning loop)

**Edit Modal:**
- Form to modify: source table, source column, business logic, transformation, confidence.
- "Save" updates to `modified` status.

**Actions:**
- "Re-run with Context" — opens chat to add more info and re-propose.
- "Generate Excel" — advances to Phase 5 (enabled when at least one mapping approved).

#### Phase 5 — Export

**Preview:**
- Table preview of what the Excel will contain.
- Sheet selector (one sheet per target table).

**Download:**
- "Download Excel" button.
- Filename: `{project_name}_stm_mapping_{date}.xlsx`

**Next Steps:**
- "Start New Project" — goes to `/projects/new`
- "Clone as Template" — creates new project with same connections

### 5.4 Connection Manager (`/connections`)

**List View:**
- Cards or table showing all saved connections.
- Each card: name, type (source/target/jira/llm), db type, last tested status, created date.
- Actions: Test, Edit, Delete.

**Add Connection Form:**
- Step 1: Select type (Database / Jira / LLM)
- Step 2: Select provider (PostgreSQL, MySQL, BigQuery, etc.)
- Step 3: Enter connection details (host, port, username, password, database, schema)
- **Test Connection button** — validates before allowing save.
- Step 4: Save with custom name.

**LLM Connection Form:**
- Provider: OpenAI, Anthropic, Azure OpenAI, Custom
- API Key: password input
- Base URL: optional (for custom endpoints like Kimi)
- Model: dropdown (gpt-4, claude-sonnet, etc.)
- Test button: sends a simple completion to verify.

---

## 6. Data Flow

### 6.1 Happy Path: Database Source

```
1. User creates project, selects saved source & target connections, enters Jira ticket.
2. Frontend: POST /projects → creates project in `input` phase.
3. User clicks "Start Discovery".
4. Backend: SchemaDiscoveryService connects to source & target DBs.
5. Backend: Fetches information_schema, caches in `schema_cache`.
6. Frontend: polls GET /projects/{id}/schema, displays trees.
7. User clicks "Propose Mappings".
8. Backend: LLMOrchestrator builds prompt from schema + context + historical feedback.
9. Backend: Calls LLM via LiteLLM. Parses response into `mappings` table (status=`proposed`).
10. Frontend: displays proposals in review table.
11. User reviews: approves, rejects, modifies individual mappings.
12. Backend: MappingEngine updates statuses. LearningService records feedback.
13. User clicks "Generate Excel".
14. Backend: ExportService queries approved mappings, generates Excel file.
15. Frontend: offers download.
```

### 6.2 Happy Path: File Upload Source

```
1. User uploads CSV/Parquet during Phase 1.
2. Backend: IngestionService saves file, infers schema.
3. Schema appears in source tree alongside (or instead of) DB schema.
4. Rest of flow identical to DB source.
```

### 6.3 Self-Learning Flow

```
1. New project created with target table `dim_customer`.
2. Before proposing, LearningService queries mapping_feedback for `dim_customer`.
3. Finds 5 past approved mappings, 2 rejections.
4. Injects into LLM prompt as few-shot examples.
5. LLM proposes mappings, influenced by past patterns.
6. User reviews and approves/rejects.
7. New feedback recorded for future projects.
```

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| DB Credentials | Encrypted at rest with Fernet (symmetric AES-128). Decrypted only in memory during active connections. Never logged. |
| API Keys | Same encryption as DB credentials. |
| File Uploads | Validate file types (CSV, Parquet only). Size limit (100MB). Stored in temp directory, cleaned up after project completion. |
| SQL Injection | All schema discovery queries use parameterized queries. No user input interpolated into SQL. |
| LLM Data Leak | Schema metadata and sample data are sent to LLM. Users should not upload PII as sample data. Add a toggle: "Exclude sample data from LLM prompts." |
| Auth (Future) | JWT tokens with expiration. Refresh token rotation. OAuth2 for SSO. |

---

## 8. Testing Strategy

### 8.1 Unit Tests (pytest)

| Component | Coverage |
|-----------|----------|
| ConnectionService | Encrypt/decrypt roundtrip, test connection mock |
| SchemaDiscoveryService | Each dialect query generation, parsing |
| LLMOrchestrator | Prompt building, response parsing, timeout handling |
| MappingEngine | Confidence calculation, validation logic |
| LearningService | Fuzzy matching, feedback retrieval |
| ExportService | Excel generation, column ordering |

### 8.2 Integration Tests (testcontainers)

- Spin up PostgreSQL and MySQL containers.
- Test full flow: create connection → discover schema → propose mappings → export Excel.
- Mock LLM responses for deterministic tests.

### 8.3 Frontend Tests (React Testing Library)

- Connection form: validation, test connection flow.
- Mapping table: approve/reject buttons update state.
- Phase transitions: correct content shown per phase.

### 8.4 E2E Tests (Playwright)

- Create project → add connection → discover → propose → approve mapping → export Excel.
- Runs against local Docker Compose stack.

---

## 9. Future SaaS Considerations

The architecture is designed to minimize rework when transitioning to SaaS:

| Feature | Now | Future |
|---------|-----|--------|
| Auth | Simple JWT | OAuth2, SSO, MFA |
| Database | SQLite or local PostgreSQL | Managed PostgreSQL (RDS, Cloud SQL) |
| Cache | In-memory | Redis |
| File Storage | Local temp | S3, GCS |
| LLM | User's API key | Platform-provided with usage billing |
| Multi-tenancy | Single user | Row-level security, isolated schemas |
| Collaboration | N/A | Share projects, comments, approvals |
| CI/CD | Manual Docker | GitHub Actions, automated deploy |

---

## 10. Open Questions / Decisions

1. **SQLite vs PostgreSQL for personal tool?** Recommendation: PostgreSQL via Docker Compose. SQLite is simpler but lacks JSONB and async support. PostgreSQL gives us the exact same schema we'll use in SaaS.

2. **File persistence:** Uploaded CSV/Parquet files — keep until project is deleted, or auto-delete after export? Recommendation: Keep until project deletion. User may want to re-export.

3. **LLM token limits:** Large schemas may exceed LLM context window. Strategy: Filter source tables by name similarity before sending. If still too large, paginate by target table (one LLM call per target table).

4. **Confidence score algorithm:** Start with LLM-reported confidence. Future: combine with name similarity (Levenshtein), type compatibility, and historical approval rate.

---

## 11. Success Criteria

- [ ] User can create a project, connect to source and target databases, and discover schema.
- [ ] User can upload CSV/Parquet files and see them as source schema.
- [ ] LLM proposes mappings with confidence scores and reasoning.
- [ ] User can approve, reject, or modify each proposal individually.
- [ ] Approved mappings export to a styled Excel file with all required columns.
- [ ] Self-learning loop: second project with similar target gets better proposals.
- [ ] Test Connection works for all supported database types.
- [ ] Global connections: configure once, reuse across projects.
- [ ] Jira integration pulls ticket context successfully.
- [ ] All tests pass (unit, integration, frontend, E2E).
