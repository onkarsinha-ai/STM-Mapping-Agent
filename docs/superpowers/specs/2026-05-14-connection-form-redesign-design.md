# Connection Form Redesign — Design Spec

## Goal
Replace the generic one-size-fits-all connection form with a tabbed, type-aware form that shows only relevant fields per database type, LLM provider, and Jira instance. Include smart defaults, inline validation, and an improved connection list.

## Context
The STM Mapping Agent backend already supports 8 database types (postgresql, mysql, sqlserver, oracle, snowflake, bigquery, csv, parquet) and 4 connection types (source, target, jira, llm). The current frontend form shows the same generic host/port/database fields for all types, which is wrong for Snowflake (needs account/warehouse), BigQuery (needs project ID), LLMs (needs API key/model), and Jira (needs base URL/auth).

---

## Architecture

### Frontend

```
ConnectionsPage
├── ConnectionForm (wrapper with tabs)
│   ├── DatabaseConnectionForm
│   │   ├── BasicSection (name, description)
│   │   ├── ConnectionSection (type-specific endpoint params)
│   │   ├── AuthenticationSection (credentials)
│   │   └── AdvancedSection (SSL, timeouts, extras)
│   ├── LLMConnectionForm
│   │   ├── BasicSection
│   │   ├── ProviderSelector
│   │   ├── ConnectionSection (model, base URL)
│   │   ├── AuthenticationSection (API key)
│   │   └── AdvancedSection (organization ID, custom headers)
│   └── JiraConnectionForm
│       ├── BasicSection
│       ├── InstanceTypeSelector (Cloud vs Server)
│       ├── ConnectionSection (base URL, project keys)
│       ├── AuthenticationSection (auth method + credentials)
│       └── AdvancedSection (SSL verification)
└── ConnectionList
    ├── TypeFilterPills (All | Database | LLM | Jira)
    └── GroupedTable (by connection type, with flavor badges)
```

### Backend

```
ConnectionService
├── test_connection(params) → dispatches to:
│   ├── test_database_connection(db_type, params)
│   ├── test_llm_connection(provider, params)
│   └── test_jira_connection(instance_type, auth_method, params)
└── create_connection(...) → stores provider in metadata
```

New endpoint: `GET /connections/jira/callback` — OAuth 2.0 code exchange.

---

## Component Design

### ConnectionsPage

- Keeps current header with "Add Connection" button
- Form opens as a card below the header (same as current toggle behavior)
- Tabs inside the form card: `[ Database ] [ LLM Model ] [ Jira ]`
- Active tab state managed locally

### DatabaseConnectionForm

**Basic Section:**
- Name (required)
- Description (optional)
- Connection Type badge (read-only: "Source" or "Target", based on tab context or selector)

**Connection Section:**
- Database Type selector: PostgreSQL, MySQL, SQL Server, Oracle, Snowflake, BigQuery, CSV, Parquet
- Fields adapt immediately on selection

**PostgreSQL fields:**
- Host (`localhost`)
- Port (`5432`)
- Database (required)
- Schema (`public`, optional)

**MySQL fields:**
- Host (`localhost`)
- Port (`3306`)
- Database (required)

**SQL Server fields:**
- Host (required)
- Port (`1433`)
- Database (required)
- Instance Name (optional)

**Oracle fields:**
- Host (required)
- Port (`1521`)
- Service Name (required, with toggle to SID)

**Snowflake fields:**
- Account (required, e.g. `xy12345.us-east-1`)
- Warehouse (required)
- Database (required)
- Schema (required)

**BigQuery fields:**
- Project ID (required)
- Dataset (required)
- Location (`US`, optional)

**CSV fields:**
- File Path / URL (required)
- Delimiter (`,`, optional)
- Encoding (`utf-8`, optional)

**Parquet fields:**
- File Path / URL (required)

**Authentication Section:**
- PostgreSQL/MySQL/SQL Server/Oracle: Username + Password
- SQL Server: "Windows Authentication" toggle (hides user/pass)
- Snowflake: "Key-Pair Auth" toggle (shows Private Key File + Passphrase instead of password)
- BigQuery: Auth Method selector — Application Default Credentials (no fields) or Service Account Key (JSON text area)
- CSV/Parquet: None, or HTTP Basic Auth if URL

**Advanced Section:**
- PostgreSQL: SSL Mode (`prefer`), Connection Timeout (`30`)
- MySQL: SSL (toggle), Charset (`utf8mb4`), Connection Timeout (`30`)
- SQL Server: Encrypt (`true`), Trust Server Certificate (`false`), Connection Timeout (`15`)
- Oracle: Schema, Connection Timeout (`15`)
- Snowflake: Role, Login Timeout (`60`), Query Timeout (`0`)
- BigQuery: Priority (`INTERACTIVE`), Use Query Cache (`true`)
- CSV: Header Row (`true`), Skip Rows, Null Values, Date Format
- Parquet: Compression (`snappy`)

### LLMConnectionForm

**Basic Section:**
- Name (required)
- Description (optional)
- Connection Type badge (read-only: "LLM")

**Provider Section:**
- Provider selector: OpenAI, Anthropic, Azure OpenAI, Local/Self-Hosted, Ollama, Groq, Cohere, Kimi (Moonshot AI)

**Connection Section (per provider):**
- OpenAI: Model dropdown (`gpt-4o`, `gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo`, custom)
- Anthropic: Model dropdown (`claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`, custom)
- Azure OpenAI: Deployment Name (free text)
- Local/Self-Hosted: Model name (free text)
- Ollama: Model dropdown (`llama3`, `mistral`, `codellama`, custom)
- Groq: Model dropdown (`llama3-70b-8192`, `mixtral-8x7b-32768`, custom)
- Cohere: Model dropdown (`command-r`, `command-r-plus`, custom)
- Kimi: Model dropdown (`kimi-k2`, `kimi-latest`, custom)

**Authentication Section:**
- All providers except Ollama: API Key (password field)
- Local/Self-Hosted: API Key (optional, placeholder `not-needed`)

**Advanced Section:**
- OpenAI: Base URL (hidden behind "Custom endpoint" toggle, default `https://api.openai.com/v1`), Organization ID (optional)
- Anthropic: Base URL (hidden behind toggle, default `https://api.anthropic.com`)
- Azure OpenAI: API Base (endpoint URL), API Version (`2024-02-01`)
- Local/Self-Hosted: Base URL (`http://localhost:8000/v1`)
- Ollama: Base URL (`http://localhost:11434`)
- Kimi: Base URL (`https://api.moonshot.cn/v1`)

**Test Connection:** Sends a minimal completion request (`"Say 'ok'"`) via LiteLLM.

### JiraConnectionForm

**Basic Section:**
- Name (required)
- Description (optional)
- Connection Type badge (read-only: "Jira")

**Instance Section:**
- Instance Type selector: Jira Cloud, Jira Server / Data Center

**Connection Section:**
- Base URL (required)
- Project Key(s) (optional)

**Authentication Section:**
- Jira Cloud: Auth Method selector — Basic Auth, OAuth 2.0
  - Basic Auth: Email, API Token
  - OAuth 2.0: Client ID, Client Secret, Scopes. Plus "Authorize" button that opens Atlassian OAuth flow in popup. After authorization, Access Token and Refresh Token fields auto-fill (read-only).
- Jira Server/DC: Auth Method selector — Basic Auth, Personal Access Token, OAuth 1.0a
  - Basic Auth: Username, Password
  - PAT: Token string
  - OAuth 1.0a: Consumer Key, Private Key, Access Token, Access Token Secret

**Advanced Section:**
- SSL/TLS Verification toggle (Jira Server/DC only)

### ConnectionList

- **Type Filter Pills**: All | Database | LLM | Jira. Clicking filters the list client-side.
- **Grouped Table**: Rows grouped by connection type with subtle section headers.
- **Flavor Badge**: Shows the specific provider/DB type (e.g., "PostgreSQL", "OpenAI", "Jira Cloud") instead of just "source" or "llm".
- **Quick Actions**: Test (re-test), Edit (open form pre-filled), Delete.
- **Empty State**: Updated copy to mention all three connection types.

---

## Data Flow

### Creating a Connection

1. User selects tab (Database / LLM / Jira)
2. User fills form fields
3. Frontend packs all fields into `params` dict
4. Frontend also sets `provider` field based on the specific selection (e.g., "postgresql", "openai", "jira_cloud")
5. POST `/connections/test` with `{ db_type, provider, params }`
6. Backend tests connection using type-specific logic
7. On success, POST `/connections/` with full payload
8. Backend encrypts `params`, stores `provider` in metadata
9. Frontend refreshes connection list

### Editing a Connection

1. User clicks Edit on a connection row
2. Form opens pre-populated with decrypted params
3. User modifies fields
4. Test + Save flow same as create

### Jira OAuth 2.0 Flow

1. User selects Jira Cloud + OAuth 2.0, fills Client ID/Secret
2. User clicks "Authorize"
3. Frontend opens popup to Atlassian authorization URL
4. User grants permission, Atlassian redirects to backend callback
5. Backend exchanges code for access/refresh tokens
6. Backend returns tokens to frontend via postMessage or polling
7. Form auto-fills token fields
8. User clicks Test, then Save

---

## Backend Changes

### Model Changes

```python
# app/models/connection.py
class Connection(Base):
    # ... existing fields ...
    provider = Column(String(50), nullable=True)  # NEW: "postgresql", "openai", "jira_cloud"
```

### Schema Changes

```python
# app/schemas/connection.py
class ConnectionCreate(BaseModel):
    name: str
    connection_type: ConnectionType
    db_type: Optional[DBType] = None
    provider: Optional[str] = None  # NEW
    params: Dict[str, Any]

class ConnectionResponse(BaseModel):
    id: UUID
    name: str
    connection_type: str
    db_type: Optional[str]
    provider: Optional[str]  # NEW
    is_tested: bool
    metadata: Dict[str, Any]
```

### Service Changes

```python
# app/services/connection_service.py
class ConnectionService:
    @staticmethod
    async def test_connection(connection_type: str, provider: str, params: Dict) -> ConnectionTestResult:
        if connection_type in ("source", "target"):
            return await DatabaseTester.test(provider or params.get("db_type"), params)
        elif connection_type == "llm":
            return await LLMTester.test(provider, params)
        elif connection_type == "jira":
            return await JiraTester.test(provider, params)
        else:
            return ConnectionTestResult(False, f"Unknown connection type: {connection_type}")
```

New test modules:
- `app/services/testers/database_tester.py` — tests all DB types
- `app/services/testers/llm_tester.py` — tests via LiteLLM
- `app/services/testers/jira_tester.py` — tests via Jira API

### Router Changes

```python
# app/routers/connections.py
@router.post("/test", response_model=ConnectionTestResponse)
async def test_connection(request: ConnectionTestRequest):
    result = await ConnectionService.test_connection(
        request.connection_type,
        request.provider,
        request.params
    )
    return ConnectionTestResponse(success=result.success, message=result.message)

@router.get("/jira/callback")
async def jira_oauth_callback(code: str, state: str):
    # Exchange code for tokens
    # Store tokens temporarily (in-memory or Redis)
    # Return HTML page that postMessages tokens to parent window
    pass
```

---

## Error Handling

### Client-Side Validation

- Required fields: red border + "This field is required" on blur/submit
- Port: must be integer 1-65535
- URL: must be valid URL format
- Email: must be valid email format (Jira Cloud Basic Auth)

### Server-Side Errors

- Database connection refused → "Cannot reach host:port. Check the host and port."
- Database auth failed → "Invalid username or password."
- Database timeout → "Connection timed out. Check network or increase timeout."
- LLM invalid API key → "Authentication failed. Check your API key."
- LLM invalid model → "Model not found. Check the model name."
- LLM timeout → "Request timed out. Check the base URL."
- Jira invalid URL → "Jira instance not found. Check the base URL."
- Jira auth failed → "Invalid credentials. Check your email/token."
- Jira permission denied → "Insufficient permissions. Ensure read:jira-work scope is granted."
- OAuth popup blocked → "Please allow popups for this site to authorize Jira."
- OAuth authorization denied → "Authorization was denied. Please try again."

### Error Display

- Inline field errors for client-side validation
- Test result banner at bottom of form for server-side test results
- Save button disabled until test succeeds

---

## Smart Defaults

| Type / Provider | Default Values |
|-----------------|----------------|
| PostgreSQL | host: `localhost`, port: `5432`, schema: `public`, ssl_mode: `prefer`, timeout: `30` |
| MySQL | host: `localhost`, port: `3306`, charset: `utf8mb4`, timeout: `30` |
| SQL Server | port: `1433`, encrypt: `true`, trust_cert: `false`, timeout: `15` |
| Oracle | port: `1521`, timeout: `15` |
| Snowflake | authenticator: `snowflake`, login_timeout: `60`, query_timeout: `0` |
| BigQuery | location: `US`, priority: `INTERACTIVE`, use_query_cache: `true` |
| CSV | delimiter: `,`, encoding: `utf-8`, header_row: `true` |
| Parquet | compression: `snappy` |
| OpenAI | base_url: `https://api.openai.com/v1` |
| Anthropic | base_url: `https://api.anthropic.com` |
| Azure OpenAI | api_version: `2024-02-01` |
| Local/Self-Hosted | base_url: `http://localhost:8000/v1` |
| Ollama | base_url: `http://localhost:11434` |
| Kimi | base_url: `https://api.moonshot.cn/v1` |
| Jira Cloud | base_url: `https://<domain>.atlassian.net` |
| Jira Server | base_url: `https://jira.company.com` |

---

## Testing Strategy

### Unit Tests
- Each form component renders correct fields for each type/provider
- Smart defaults populate correctly on selection change
- Validation rules reject invalid input

### Integration Tests
- Test connection endpoint works for each DB type (using mocks)
- Test connection endpoint works for each LLM provider (using mocks)
- Test connection endpoint works for Jira (using mocks)
- OAuth callback exchanges code for tokens

### E2E Tests
- Create a PostgreSQL connection end-to-end
- Create an OpenAI connection end-to-end
- Create a Jira Cloud Basic Auth connection end-to-end

---

## Files to Create / Modify

### Frontend
- Modify: `frontend/src/components/connections/ConnectionForm.tsx` — split into tabbed wrapper
- Create: `frontend/src/components/connections/DatabaseConnectionForm.tsx`
- Create: `frontend/src/components/connections/LLMConnectionForm.tsx`
- Create: `frontend/src/components/connections/JiraConnectionForm.tsx`
- Create: `frontend/src/components/connections/form-sections/BasicSection.tsx`
- Create: `frontend/src/components/connections/form-sections/ConnectionSection.tsx`
- Create: `frontend/src/components/connections/form-sections/AuthenticationSection.tsx`
- Create: `frontend/src/components/connections/form-sections/AdvancedSection.tsx`
- Modify: `frontend/src/components/connections/ConnectionList.tsx` — add filter, flavor badges, edit action
- Modify: `frontend/src/services/api.ts` — add `provider` field, update test endpoint
- Modify: `frontend/src/types/index.ts` — add `provider` to Connection type

### Backend
- Modify: `backend/app/models/connection.py` — add `provider` column, migration
- Modify: `backend/app/schemas/connection.py` — add `provider` field
- Modify: `backend/app/services/connection_service.py` — add dispatcher pattern
- Create: `backend/app/services/testers/__init__.py`
- Create: `backend/app/services/testers/database_tester.py`
- Create: `backend/app/services/testers/llm_tester.py`
- Create: `backend/app/services/testers/jira_tester.py`
- Modify: `backend/app/routers/connections.py` — update test endpoint, add OAuth callback
- Create: Alembic migration for `provider` column

---

## Open Questions / Deferred

1. **File upload for BigQuery service account keys** — For MVP, use JSON text paste. File upload can be a v2 enhancement.
2. **CSV/Parquet cloud storage auth** — For MVP, assume local files or public URLs. Cloud storage credentials can be v2.
3. **Connection editing with decrypted params** — Requires backend to return decrypted params for owned connections. Currently the backend only returns metadata. This is in scope for this redesign.
4. **Oracle thick mode / instant client** — For MVP, assume thin mode. Thick mode can be v2.
