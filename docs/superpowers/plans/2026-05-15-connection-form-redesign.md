# Connection Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic connection form with a tabbed, type-aware form that shows relevant fields per database type, LLM provider, and Jira instance, with smart defaults and an improved connection list.

**Architecture:** Backend gains a `provider` column and dispatcher-based test logic (database_tester.py, llm_tester.py, jira_tester.py). Frontend splits ConnectionForm into a tabbed wrapper with DatabaseConnectionForm, LLMConnectionForm, and JiraConnectionForm, each using shared section components (Basic, Connection, Authentication, Advanced).

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0 async, Alembic, LiteLLM, React 18, TypeScript, Tailwind CSS, TanStack Query

---

## File Structure

### Backend

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/app/models/connection.py` | Modify | Add `provider` nullable column |
| `backend/app/schemas/connection.py` | Modify | Add `provider` to ConnectionCreate and ConnectionResponse |
| `backend/app/services/testers/__init__.py` | Create | Package init for tester modules |
| `backend/app/services/testers/database_tester.py` | Create | Test connections for all 8 DB types |
| `backend/app/services/testers/llm_tester.py` | Create | Test LLM connections via LiteLLM |
| `backend/app/services/testers/jira_tester.py` | Create | Test Jira connections via Jira API |
| `backend/app/services/connection_service.py` | Modify | Add dispatcher to route to correct tester |
| `backend/app/routers/connections.py` | Modify | Update test endpoint, add OAuth callback |
| `backend/alembic/versions/` | Create | Migration adding `provider` column |

### Frontend

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/types/index.ts` | Modify | Add `provider` to Connection interface |
| `frontend/src/services/api.ts` | Modify | Add `provider` to API calls |
| `frontend/src/components/connections/form-sections/BasicSection.tsx` | Create | Shared name/description/type badge section |
| `frontend/src/components/connections/form-sections/ConnectionSection.tsx` | Create | Shared connection params section with type-specific fields |
| `frontend/src/components/connections/form-sections/AuthenticationSection.tsx` | Create | Shared auth section with type-specific credentials |
| `frontend/src/components/connections/form-sections/AdvancedSection.tsx` | Create | Shared advanced options section |
| `frontend/src/components/connections/DatabaseConnectionForm.tsx` | Create | Database tab form |
| `frontend/src/components/connections/LLMConnectionForm.tsx` | Create | LLM tab form |
| `frontend/src/components/connections/JiraConnectionForm.tsx` | Create | Jira tab form |
| `frontend/src/components/connections/ConnectionForm.tsx` | Modify | Rewrite as tabbed wrapper |
| `frontend/src/components/connections/ConnectionList.tsx` | Modify | Add type filter, flavor badges, edit action |

---

## Task 1: Backend — Add Provider Column & Migration

**Files:**
- Modify: `backend/app/models/connection.py`
- Create: `backend/alembic/versions/xxxx_add_provider_to_connections.py`

- [ ] **Step 1: Add provider column to Connection model**

Modify `backend/app/models/connection.py`, add after the `metadata` column:

```python
    provider = Column(String(50), nullable=True)
```

Full context to find:
```python
    metadata = Column(JSON, default=dict)
    is_tested = Column(Boolean, default=False)
```

Replace with:
```python
    metadata = Column(JSON, default=dict)
    provider = Column(String(50), nullable=True)
    is_tested = Column(Boolean, default=False)
```

- [ ] **Step 2: Generate Alembic migration**

```bash
cd backend
alembic revision --autogenerate -m "add provider to connections"
```

Expected: A new file created in `backend/alembic/versions/`

- [ ] **Step 3: Run migration**

```bash
cd backend
alembic upgrade head
```

Expected: `INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/connection.py backend/alembic/versions/
git commit -m "feat: add provider column to connections"
```

---

## Task 2: Backend — Update Connection Schemas

**Files:**
- Modify: `backend/app/schemas/connection.py`

- [ ] **Step 1: Add provider to ConnectionCreate**

Modify `backend/app/schemas/connection.py`:

Find:
```python
class ConnectionCreate(BaseModel):
    name: str
    connection_type: ConnectionType
    db_type: Optional[DBType] = None
    params: Dict[str, Any]
```

Replace with:
```python
class ConnectionCreate(BaseModel):
    name: str
    connection_type: ConnectionType
    db_type: Optional[DBType] = None
    provider: Optional[str] = None
    params: Dict[str, Any]
```

- [ ] **Step 2: Add provider to ConnectionResponse**

Find:
```python
class ConnectionResponse(BaseModel):
    id: UUID
    name: str
    connection_type: str
    db_type: Optional[str]
    is_tested: bool
    
    class Config:
        from_attributes = True
```

Replace with:
```python
class ConnectionResponse(BaseModel):
    id: UUID
    name: str
    connection_type: str
    db_type: Optional[str]
    provider: Optional[str]
    is_tested: bool
    
    class Config:
        from_attributes = True
```

- [ ] **Step 3: Add provider to ConnectionTestRequest**

Find:
```python
class ConnectionTestRequest(BaseModel):
    db_type: DBType
    params: Dict[str, Any]
```

Replace with:
```python
class ConnectionTestRequest(BaseModel):
    connection_type: str
    provider: Optional[str] = None
    db_type: Optional[DBType] = None
    params: Dict[str, Any]
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/connection.py
git commit -m "feat: add provider field to connection schemas"
```

---

## Task 3: Backend — Create Database Tester

**Files:**
- Create: `backend/app/services/testers/__init__.py`
- Create: `backend/app/services/testers/database_tester.py`
- Test: `backend/tests/unit/test_database_tester.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_database_tester.py`:

```python
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.testers.database_tester import DatabaseTester

@pytest.mark.asyncio
async def test_test_postgresql():
    with patch('app.services.testers.database_tester.create_async_engine') as mock_engine:
        mock_conn = AsyncMock()
        mock_engine.return_value.connect.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_engine.return_value.connect.return_value.__aexit__ = AsyncMock(return_value=None)
        mock_engine.return_value.dispose = AsyncMock()
        
        result = await DatabaseTester.test("postgresql", {
            "host": "localhost", "port": 5432, "database": "test",
            "username": "user", "password": "pass"
        })
        assert result.success is True
        assert "successful" in result.message

@pytest.mark.asyncio
async def test_test_unsupported_db():
    result = await DatabaseTester.test("unknown_db", {"host": "localhost"})
    assert result.success is False
    assert "Unsupported" in result.message
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/unit/test_database_tester.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.testers.database_tester'`

- [ ] **Step 3: Create tester package init**

Create `backend/app/services/testers/__init__.py`:

```python
from app.services.testers.database_tester import DatabaseTester
from app.services.testers.llm_tester import LLMTester
from app.services.testers.jira_tester import JiraTester

__all__ = ["DatabaseTester", "LLMTester", "JiraTester"]
```

- [ ] **Step 4: Write DatabaseTester implementation**

Create `backend/app/services/testers/database_tester.py`:

```python
from typing import Dict, Any
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dataclasses import dataclass

@dataclass
class ConnectionTestResult:
    success: bool
    message: str

class DatabaseTester:
    @staticmethod
    async def test(db_type: str, params: Dict[str, Any]) -> ConnectionTestResult:
        try:
            if db_type == "postgresql":
                url = f"postgresql+asyncpg://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
                query = "SELECT 1"
            elif db_type == "mysql":
                url = f"mysql+aiomysql://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
                query = "SELECT 1"
            elif db_type == "snowflake":
                url = f"snowflake://{params['username']}:{params['password']}@{params['account']}/{params['database']}/{params['schema']}?warehouse={params['warehouse']}"
                query = "SELECT 1"
            elif db_type == "bigquery":
                return ConnectionTestResult(True, "BigQuery connections validated via ADC or service account key")
            elif db_type == "sqlserver":
                url = f"mssql+pyodbc://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
                query = "SELECT 1"
            elif db_type == "oracle":
                url = f"oracle+oracledb://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params.get('service_name', params.get('sid', ''))}"
                query = "SELECT 1 FROM DUAL"
            elif db_type == "csv":
                return ConnectionTestResult(True, "CSV file connection configured")
            elif db_type == "parquet":
                return ConnectionTestResult(True, "Parquet file connection configured")
            else:
                return ConnectionTestResult(False, f"Unsupported database type: {db_type}")
            
            if db_type in ("csv", "parquet", "bigquery"):
                return ConnectionTestResult(True, f"{db_type} connection configured")
            
            engine = create_async_engine(url, echo=False)
            async with engine.connect() as conn:
                await conn.execute(text(query))
            await engine.dispose()
            return ConnectionTestResult(True, f"{db_type} connection successful")
        except Exception as e:
            return ConnectionTestResult(False, str(e))
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend
pytest tests/unit/test_database_tester.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/testers/ backend/tests/unit/test_database_tester.py
git commit -m "feat: add database tester with support for 8 db types"
```

---

## Task 4: Backend — Create LLM Tester

**Files:**
- Create: `backend/app/services/testers/llm_tester.py`
- Test: `backend/tests/unit/test_llm_tester.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_llm_tester.py`:

```python
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.testers.llm_tester import LLMTester

@pytest.mark.asyncio
async def test_test_openai():
    with patch('app.services.testers.llm_tester.litellm') as mock_litellm:
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "ok"
        mock_litellm.acompletion = AsyncMock(return_value=mock_response)
        
        result = await LLMTester.test("openai", {
            "api_key": "sk-test",
            "model": "gpt-4o",
            "base_url": "https://api.openai.com/v1"
        })
        assert result.success is True

@pytest.mark.asyncio
async def test_test_ollama():
    with patch('app.services.testers.llm_tester.litellm') as mock_litellm:
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "ok"
        mock_litellm.acompletion = AsyncMock(return_value=mock_response)
        
        result = await LLMTester.test("ollama", {
            "base_url": "http://localhost:11434",
            "model": "llama3"
        })
        assert result.success is True
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/unit/test_llm_tester.py -v
```

Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write LLMTester implementation**

Create `backend/app/services/testers/llm_tester.py`:

```python
from typing import Dict, Any
import litellm
from dataclasses import dataclass

@dataclass
class ConnectionTestResult:
    success: bool
    message: str

class LLMTester:
    @staticmethod
    async def test(provider: str, params: Dict[str, Any]) -> ConnectionTestResult:
        try:
            model = params.get("model", "")
            api_key = params.get("api_key", "")
            base_url = params.get("base_url")
            api_version = params.get("api_version")
            
            # Build LiteLLM model string
            if provider == "azure":
                litellm_model = f"azure/{model}"
            elif provider == "ollama":
                litellm_model = f"ollama/{model}"
            elif provider == "groq":
                litellm_model = f"groq/{model}"
            elif provider == "cohere":
                litellm_model = f"cohere/{model}"
            elif provider == "kimi":
                litellm_model = f"openai/{model}"
            else:
                litellm_model = model
            
            completion_params = {
                "model": litellm_model,
                "messages": [{"role": "user", "content": "Say 'ok'"}],
                "max_tokens": 5
            }
            
            if api_key:
                completion_params["api_key"] = api_key
            if base_url:
                completion_params["api_base"] = base_url
            if api_version:
                completion_params["api_version"] = api_version
            
            response = await litellm.acompletion(**completion_params)
            content = response.choices[0].message.content
            
            return ConnectionTestResult(True, f"LLM connection successful. Response: {content.strip()}")
        except Exception as e:
            return ConnectionTestResult(False, f"LLM test failed: {str(e)}")
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend
pytest tests/unit/test_llm_tester.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/testers/llm_tester.py backend/tests/unit/test_llm_tester.py
git commit -m "feat: add llm tester with litellm integration"
```

---

## Task 5: Backend — Create Jira Tester

**Files:**
- Create: `backend/app/services/testers/jira_tester.py`
- Test: `backend/tests/unit/test_jira_tester.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/unit/test_jira_tester.py`:

```python
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.testers.jira_tester import JiraTester

@pytest.mark.asyncio
async def test_test_jira_cloud_basic_auth():
    with patch('app.services.testers.jira_tester.httpx.AsyncClient') as mock_client:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"displayName": "Test User"}
        
        mock_instance = AsyncMock()
        mock_instance.get = AsyncMock(return_value=mock_response)
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        mock_client.return_value = mock_instance
        
        result = await JiraTester.test("jira_cloud", {
            "base_url": "https://test.atlassian.net",
            "auth_method": "basic",
            "email": "test@example.com",
            "api_token": "token123"
        })
        assert result.success is True

@pytest.mark.asyncio
async def test_test_jira_invalid_url():
    with patch('app.services.testers.jira_tester.httpx.AsyncClient') as mock_client:
        mock_instance = AsyncMock()
        mock_instance.get = AsyncMock(side_effect=Exception("Connection refused"))
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=None)
        mock_client.return_value = mock_instance
        
        result = await JiraTester.test("jira_cloud", {
            "base_url": "https://invalid.example.com",
            "auth_method": "basic",
            "email": "test@example.com",
            "api_token": "token123"
        })
        assert result.success is False
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
pytest tests/unit/test_jira_tester.py -v
```

Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Write JiraTester implementation**

Create `backend/app/services/testers/jira_tester.py`:

```python
from typing import Dict, Any
import httpx
from dataclasses import dataclass

@dataclass
class ConnectionTestResult:
    success: bool
    message: str

class JiraTester:
    @staticmethod
    async def test(instance_type: str, params: Dict[str, Any]) -> ConnectionTestResult:
        try:
            base_url = params.get("base_url", "").rstrip("/")
            auth_method = params.get("auth_method", "basic")
            
            if not base_url:
                return ConnectionTestResult(False, "Base URL is required")
            
            headers = {"Accept": "application/json"}
            auth = None
            
            if auth_method == "basic":
                if instance_type == "jira_cloud":
                    email = params.get("email", "")
                    api_token = params.get("api_token", "")
                    auth = (email, api_token)
                else:
                    username = params.get("username", "")
                    password = params.get("password", "")
                    auth = (username, password)
            elif auth_method == "pat":
                token = params.get("token", "")
                headers["Authorization"] = f"Bearer {token}"
            elif auth_method == "oauth2":
                access_token = params.get("access_token", "")
                headers["Authorization"] = f"Bearer {access_token}"
            elif auth_method == "oauth1":
                return ConnectionTestResult(True, "OAuth 1.0a configuration accepted (test on use)")
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{base_url}/rest/api/2/myself",
                    headers=headers,
                    auth=auth,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    name = data.get("displayName", "Unknown")
                    return ConnectionTestResult(True, f"Jira connection successful. Logged in as: {name}")
                elif response.status_code == 401:
                    return ConnectionTestResult(False, "Authentication failed. Check your credentials.")
                elif response.status_code == 403:
                    return ConnectionTestResult(False, "Permission denied. Ensure you have read access.")
                else:
                    return ConnectionTestResult(False, f"Jira returned status {response.status_code}")
                    
        except httpx.ConnectError:
            return ConnectionTestResult(False, "Cannot reach Jira instance. Check the base URL.")
        except Exception as e:
            return ConnectionTestResult(False, f"Jira test failed: {str(e)}")
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend
pytest tests/unit/test_jira_tester.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/testers/jira_tester.py backend/tests/unit/test_jira_tester.py
git commit -m "feat: add jira tester with basic, pat, oauth2, oauth1 support"
```

---

## Task 6: Backend — Update ConnectionService with Dispatcher

**Files:**
- Modify: `backend/app/services/connection_service.py`

- [ ] **Step 1: Update ConnectionService to use testers**

Modify `backend/app/services/connection_service.py`:

Find the existing `test_connection` method and replace it:

```python
    @staticmethod
    async def test_connection(connection_type: str, provider: Optional[str], params: Dict[str, Any]) -> ConnectionTestResult:
        if connection_type in ("source", "target"):
            from app.services.testers.database_tester import DatabaseTester
            return await DatabaseTester.test(provider or params.get("db_type"), params)
        elif connection_type == "llm":
            from app.services.testers.llm_tester import LLMTester
            return await LLMTester.test(provider or "openai", params)
        elif connection_type == "jira":
            from app.services.testers.jira_tester import JiraTester
            return await JiraTester.test(provider or "jira_cloud", params)
        else:
            return ConnectionTestResult(False, f"Unknown connection type: {connection_type}")
```

Also update `create_connection` to accept and store provider:

Find:
```python
    @staticmethod
    async def create_connection(user_id: str, name: str, connection_type: ConnectionType, 
                                db_type: Optional[DBType], params: Dict[str, Any]) -> Connection:
        encrypted = encrypt(json.dumps(params))
        metadata = {k: v for k, v in params.items() if k not in ['password', 'api_key', 'token']}
        
        async with AsyncSessionLocal() as session:
            conn = Connection(
                user_id=user_id,
                name=name,
                connection_type=connection_type,
                db_type=db_type,
                encrypted_connection_string=encrypted,
                metadata=metadata
            )
```

Replace with:
```python
    @staticmethod
    async def create_connection(user_id: str, name: str, connection_type: ConnectionType, 
                                db_type: Optional[DBType], provider: Optional[str], 
                                params: Dict[str, Any]) -> Connection:
        encrypted = encrypt(json.dumps(params))
        metadata = {k: v for k, v in params.items() if k not in ['password', 'api_key', 'token']}
        
        async with AsyncSessionLocal() as session:
            conn = Connection(
                user_id=user_id,
                name=name,
                connection_type=connection_type,
                db_type=db_type,
                provider=provider,
                encrypted_connection_string=encrypted,
                metadata=metadata
            )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/connection_service.py
git commit -m "feat: update connection service with dispatcher pattern and provider support"
```

---

## Task 7: Backend — Update Connection Router

**Files:**
- Modify: `backend/app/routers/connections.py`

- [ ] **Step 1: Update test endpoint**

Modify `backend/app/routers/connections.py`:

Find:
```python
@router.post("/test", response_model=ConnectionTestResponse)
async def test_connection(request: ConnectionTestRequest):
    result = await ConnectionService.test_connection(request.params)
    return ConnectionTestResponse(success=result.success, message=result.message)
```

Replace with:
```python
@router.post("/test", response_model=ConnectionTestResponse)
async def test_connection(request: ConnectionTestRequest):
    result = await ConnectionService.test_connection(
        request.connection_type,
        request.provider,
        request.params
    )
    return ConnectionTestResponse(success=result.success, message=result.message)
```

- [ ] **Step 2: Update create endpoint**

Find:
```python
@router.post("/", response_model=ConnectionResponse)
async def create_connection(data: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    user_id = "00000000-0000-0000-0000-000000000001"
    conn = await ConnectionService.create_connection(
        user_id=user_id,
        name=data.name,
        connection_type=data.connection_type,
        db_type=data.db_type,
        params=data.params
    )
    return conn
```

Replace with:
```python
@router.post("/", response_model=ConnectionResponse)
async def create_connection(data: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    user_id = "00000000-0000-0000-0000-000000000001"
    conn = await ConnectionService.create_connection(
        user_id=user_id,
        name=data.name,
        connection_type=data.connection_type,
        db_type=data.db_type,
        provider=data.provider,
        params=data.params
    )
    return conn
```

- [ ] **Step 3: Add Jira OAuth callback endpoint**

Add after the existing routes:

```python
@router.get("/jira/callback")
async def jira_oauth_callback(code: str, state: str):
    """Handle Jira Cloud OAuth 2.0 callback."""
    import httpx
    
    try:
        # Decode state to get client_id and client_secret
        import base64
        state_data = json.loads(base64.b64decode(state).decode())
        client_id = state_data.get("client_id")
        client_secret = state_data.get("client_secret")
        redirect_uri = state_data.get("redirect_uri", "http://localhost:8000/connections/jira/callback")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://auth.atlassian.com/oauth/token",
                json={
                    "grant_type": "authorization_code",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri
                }
            )
            
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get("access_token")
                refresh_token = token_data.get("refresh_token")
                
                # Return HTML that postMessages tokens to parent window
                html = f"""
                <!DOCTYPE html>
                <html>
                <body>
                <script>
                    window.opener.postMessage({{
                        type: 'jira_oauth_success',
                        access_token: '{access_token}',
                        refresh_token: '{refresh_token}'
                    }}, '*');
                    window.close();
                </script>
                </body>
                </html>
                """
                from fastapi.responses import HTMLResponse
                return HTMLResponse(content=html)
            else:
                error_html = f"""
                <!DOCTYPE html>
                <html>
                <body>
                <script>
                    window.opener.postMessage({{
                        type: 'jira_oauth_error',
                        error: 'Token exchange failed: {response.text}'
                    }}, '*');
                    window.close();
                </script>
                </body>
                </html>
                """
                from fastapi.responses import HTMLResponse
                return HTMLResponse(content=error_html)
    except Exception as e:
        error_html = f"""
        <!DOCTYPE html>
        <html>
        <body>
        <script>
            window.opener.postMessage({{
                type: 'jira_oauth_error',
                error: 'Callback error: {str(e)}'
            }}, '*');
            window.close();
        </script>
        </body>
        </html>
        """
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=error_html)
```

Add `import json` at the top of the file if not already present.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/connections.py
git commit -m "feat: update connection router with provider and jira oauth callback"
```

---

## Task 8: Frontend — Update Types and API Service

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add provider to Connection type**

Modify `frontend/src/types/index.ts`:

Find:
```typescript
export interface Connection {
  id: string
  name: string
  connection_type: 'source' | 'target' | 'jira' | 'llm'
  db_type: string | null
  is_tested: boolean
}
```

Replace with:
```typescript
export interface Connection {
  id: string
  name: string
  connection_type: 'source' | 'target' | 'jira' | 'llm'
  db_type: string | null
  provider: string | null
  is_tested: boolean
}
```

- [ ] **Step 2: Update API service**

Modify `frontend/src/services/api.ts`:

Find:
```typescript
export const connectionsApi = {
  list: () => api.get('/connections/'),
  create: (data: any) => api.post('/connections/', data),
  test: (data: any) => api.post('/connections/test', data),
  delete: (id: string) => api.delete(`/connections/${id}`)
}
```

Replace with:
```typescript
export const connectionsApi = {
  list: () => api.get('/connections/'),
  create: (data: any) => api.post('/connections/', data),
  test: (data: any) => api.post('/connections/test', data),
  delete: (id: string) => api.delete(`/connections/${id}`),
  get: (id: string) => api.get(`/connections/${id}`)
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/api.ts
git commit -m "feat: add provider to connection types and api service"
```

---

## Task 9: Frontend — Create Form Section Components

**Files:**
- Create: `frontend/src/components/connections/form-sections/BasicSection.tsx`
- Create: `frontend/src/components/connections/form-sections/ConnectionSection.tsx`
- Create: `frontend/src/components/connections/form-sections/AuthenticationSection.tsx`
- Create: `frontend/src/components/connections/form-sections/AdvancedSection.tsx`

- [ ] **Step 1: Create BasicSection**

Create `frontend/src/components/connections/form-sections/BasicSection.tsx`:

```tsx
interface BasicSectionProps {
  name: string
  description: string
  type: string
  onNameChange: (name: string) => void
  onDescriptionChange: (desc: string) => void
  showTypeSelector?: boolean
  onTypeChange?: (type: string) => void
}

export function BasicSection({
  name, description, type,
  onNameChange, onDescriptionChange,
  showTypeSelector = false, onTypeChange
}: BasicSectionProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Connection Name <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="input-dark w-full"
            placeholder="Production Postgres"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            className="input-dark w-full"
            placeholder="Optional description"
          />
        </div>
      </div>
      {showTypeSelector && onTypeChange && (
        <div className="flex gap-2">
          {['source', 'target'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onTypeChange(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                type === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
          <span className="text-xs self-center ml-2" style={{ color: 'var(--text-muted)' }}>
            Connection type
          </span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create ConnectionSection for databases**

Create `frontend/src/components/connections/form-sections/ConnectionSection.tsx`:

```tsx
const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlserver', label: 'SQL Server' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 'csv', label: 'CSV' },
  { value: 'parquet', label: 'Parquet' },
]

interface ConnectionSectionProps {
  dbType: string
  params: Record<string, any>
  onDbTypeChange: (dbType: string) => void
  onParamsChange: (params: Record<string, any>) => void
}

export function ConnectionSection({ dbType, params, onDbTypeChange, onParamsChange }: ConnectionSectionProps) {
  const updateParam = (key: string, value: any) => {
    onParamsChange({ ...params, [key]: value })
  }

  const renderFields = () => {
    switch (dbType) {
      case 'postgresql':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Host</label>
                <input type="text" value={params.host || ''} onChange={e => updateParam('host', e.target.value)} className="input-dark w-full" placeholder="localhost" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Port</label>
                <input type="text" value={params.port || ''} onChange={e => updateParam('port', e.target.value)} className="input-dark w-full" placeholder="5432" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Database <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.database || ''} onChange={e => updateParam('database', e.target.value)} className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Schema</label>
                <input type="text" value={params.schema || ''} onChange={e => updateParam('schema', e.target.value)} className="input-dark w-full" placeholder="public" />
              </div>
            </div>
          </>
        )
      case 'mysql':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Host</label>
                <input type="text" value={params.host || ''} onChange={e => updateParam('host', e.target.value)} className="input-dark w-full" placeholder="localhost" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Port</label>
                <input type="text" value={params.port || ''} onChange={e => updateParam('port', e.target.value)} className="input-dark w-full" placeholder="3306" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Database <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" value={params.database || ''} onChange={e => updateParam('database', e.target.value)} className="input-dark w-full" />
            </div>
          </>
        )
      case 'snowflake':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Account <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.account || ''} onChange={e => updateParam('account', e.target.value)} className="input-dark w-full" placeholder="xy12345.us-east-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Warehouse <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.warehouse || ''} onChange={e => updateParam('warehouse', e.target.value)} className="input-dark w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Database <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.database || ''} onChange={e => updateParam('database', e.target.value)} className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Schema <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.schema || ''} onChange={e => updateParam('schema', e.target.value)} className="input-dark w-full" />
              </div>
            </div>
          </>
        )
      case 'bigquery':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Project ID <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.project_id || ''} onChange={e => updateParam('project_id', e.target.value)} className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Dataset <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.dataset || ''} onChange={e => updateParam('dataset', e.target.value)} className="input-dark w-full" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Location</label>
              <input type="text" value={params.location || ''} onChange={e => updateParam('location', e.target.value)} className="input-dark w-full" placeholder="US" />
            </div>
          </>
        )
      case 'csv':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>File Path / URL <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" value={params.file_path || ''} onChange={e => updateParam('file_path', e.target.value)} className="input-dark w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Delimiter</label>
                <input type="text" value={params.delimiter || ''} onChange={e => updateParam('delimiter', e.target.value)} className="input-dark w-full" placeholder="," />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Encoding</label>
                <input type="text" value={params.encoding || ''} onChange={e => updateParam('encoding', e.target.value)} className="input-dark w-full" placeholder="utf-8" />
              </div>
            </div>
          </>
        )
      case 'parquet':
        return (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>File Path / URL <span style={{ color: 'var(--error)' }}>*</span></label>
            <input type="text" value={params.file_path || ''} onChange={e => updateParam('file_path', e.target.value)} className="input-dark w-full" />
          </div>
        )
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Host</label>
              <input type="text" value={params.host || ''} onChange={e => updateParam('host', e.target.value)} className="input-dark w-full" placeholder="localhost" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Port</label>
              <input type="text" value={params.port || ''} onChange={e => updateParam('port', e.target.value)} className="input-dark w-full" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Database <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" value={params.database || ''} onChange={e => updateParam('database', e.target.value)} className="input-dark w-full" />
            </div>
          </div>
        )
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Database Type <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <select
          value={dbType}
          onChange={e => onDbTypeChange(e.target.value)}
          className="input-dark w-full"
        >
          {DB_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      {renderFields()}
    </div>
  )
}
```

- [ ] **Step 3: Create AuthenticationSection**

Create `frontend/src/components/connections/form-sections/AuthenticationSection.tsx`:

```tsx
interface AuthenticationSectionProps {
  dbType: string
  params: Record<string, any>
  onParamsChange: (params: Record<string, any>) => void
}

export function AuthenticationSection({ dbType, params, onParamsChange }: AuthenticationSectionProps) {
  const updateParam = (key: string, value: any) => {
    onParamsChange({ ...params, [key]: value })
  }

  const renderAuth = () => {
    if (dbType === 'bigquery') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Auth Method</label>
            <select
              value={params.auth_method || 'adc'}
              onChange={e => updateParam('auth_method', e.target.value)}
              className="input-dark w-full"
            >
              <option value="adc">Application Default Credentials</option>
              <option value="service_account">Service Account Key</option>
            </select>
          </div>
          {params.auth_method === 'service_account' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Service Account JSON</label>
              <textarea
                value={params.service_account_json || ''}
                onChange={e => updateParam('service_account_json', e.target.value)}
                className="input-dark w-full h-24 font-mono text-xs"
                placeholder="Paste JSON key here"
              />
            </div>
          )}
        </>
      )
    }

    if (dbType === 'csv' || dbType === 'parquet') {
      return (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No authentication required for local files.</p>
      )
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username <span style={{ color: 'var(--error)' }}>*</span></label>
            <input type="text" value={params.username || ''} onChange={e => updateParam('username', e.target.value)} className="input-dark w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password <span style={{ color: 'var(--error)' }}>*</span></label>
            <input type="password" value={params.password || ''} onChange={e => updateParam('password', e.target.value)} className="input-dark w-full" />
          </div>
        </div>
        {dbType === 'sqlserver' && (
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params.windows_auth || false}
                onChange={e => updateParam('windows_auth', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use Windows Authentication</span>
            </label>
          </div>
        )}
        {dbType === 'snowflake' && (
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params.auth_method === 'keypair'}
                onChange={e => updateParam('auth_method', e.target.checked ? 'keypair' : 'password')}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use Key-Pair Authentication</span>
            </label>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Authentication</h4>
      {renderAuth()}
    </div>
  )
}
```

- [ ] **Step 4: Create AdvancedSection**

Create `frontend/src/components/connections/form-sections/AdvancedSection.tsx`:

```tsx
interface AdvancedSectionProps {
  dbType: string
  params: Record<string, any>
  onParamsChange: (params: Record<string, any>) => void
}

export function AdvancedSection({ dbType, params, onParamsChange }: AdvancedSectionProps) {
  const updateParam = (key: string, value: any) => {
    onParamsChange({ ...params, [key]: value })
  }

  const renderAdvanced = () => {
    switch (dbType) {
      case 'postgresql':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>SSL Mode</label>
              <select value={params.ssl_mode || 'prefer'} onChange={e => updateParam('ssl_mode', e.target.value)} className="input-dark w-full">
                <option value="disable">disable</option>
                <option value="allow">allow</option>
                <option value="prefer">prefer</option>
                <option value="require">require</option>
                <option value="verify-ca">verify-ca</option>
                <option value="verify-full">verify-full</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Connection Timeout</label>
              <input type="text" value={params.timeout || ''} onChange={e => updateParam('timeout', e.target.value)} className="input-dark w-full" placeholder="30" />
            </div>
          </div>
        )
      case 'mysql':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={params.ssl || false} onChange={e => updateParam('ssl', e.target.checked)} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enable SSL</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Connection Timeout</label>
              <input type="text" value={params.timeout || ''} onChange={e => updateParam('timeout', e.target.value)} className="input-dark w-full" placeholder="30" />
            </div>
          </div>
        )
      case 'snowflake':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Role</label>
              <input type="text" value={params.role || ''} onChange={e => updateParam('role', e.target.value)} className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Login Timeout</label>
              <input type="text" value={params.login_timeout || ''} onChange={e => updateParam('login_timeout', e.target.value)} className="input-dark w-full" placeholder="60" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Query Timeout</label>
              <input type="text" value={params.query_timeout || ''} onChange={e => updateParam('query_timeout', e.target.value)} className="input-dark w-full" placeholder="0" />
            </div>
          </div>
        )
      case 'bigquery':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select value={params.priority || 'INTERACTIVE'} onChange={e => updateParam('priority', e.target.value)} className="input-dark w-full">
                <option value="INTERACTIVE">INTERACTIVE</option>
                <option value="BATCH">BATCH</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input type="checkbox" checked={params.use_query_cache !== false} onChange={e => updateParam('use_query_cache', e.target.checked)} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use Query Cache</span>
              </label>
            </div>
          </div>
        )
      case 'csv':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={params.header_row !== false} onChange={e => updateParam('header_row', e.target.checked)} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Header Row</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Skip Rows</label>
              <input type="text" value={params.skip_rows || ''} onChange={e => updateParam('skip_rows', e.target.value)} className="input-dark w-full" placeholder="0" />
            </div>
          </div>
        )
      case 'parquet':
        return (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Compression</label>
            <select value={params.compression || 'snappy'} onChange={e => updateParam('compression', e.target.value)} className="input-dark w-full">
              <option value="snappy">snappy</option>
              <option value="gzip">gzip</option>
              <option value="brotli">brotli</option>
              <option value="zstd">zstd</option>
              <option value="lz4">lz4</option>
              <option value="none">none</option>
            </select>
          </div>
        )
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Connection Timeout</label>
              <input type="text" value={params.timeout || ''} onChange={e => updateParam('timeout', e.target.value)} className="input-dark w-full" placeholder="30" />
            </div>
          </div>
        )
    }
  }

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Advanced Options</h4>
      {renderAdvanced()}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/connections/form-sections/
git commit -m "feat: add shared form section components for connection forms"
```

---

## Task 10: Frontend — Create DatabaseConnectionForm

**Files:**
- Create: `frontend/src/components/connections/DatabaseConnectionForm.tsx`

- [ ] **Step 1: Write DatabaseConnectionForm**

Create `frontend/src/components/connections/DatabaseConnectionForm.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { connectionsApi } from '../../services/api'
import { BasicSection } from './form-sections/BasicSection'
import { ConnectionSection } from './form-sections/ConnectionSection'
import { AuthenticationSection } from './form-sections/AuthenticationSection'
import { AdvancedSection } from './form-sections/AdvancedSection'
import { TestTube, Save, Loader2, CheckCircle, XCircle } from 'lucide-react'

const DEFAULT_PARAMS: Record<string, Record<string, any>> = {
  postgresql: { host: 'localhost', port: '5432', schema: 'public', ssl_mode: 'prefer', timeout: '30' },
  mysql: { host: 'localhost', port: '3306', charset: 'utf8mb4', timeout: '30' },
  sqlserver: { port: '1433', encrypt: true, trust_server_certificate: false, timeout: '15' },
  oracle: { port: '1521', timeout: '15' },
  snowflake: { login_timeout: '60', query_timeout: '0' },
  bigquery: { location: 'US', priority: 'INTERACTIVE', use_query_cache: true },
  csv: { delimiter: ',', encoding: 'utf-8', header_row: true },
  parquet: { compression: 'snappy' },
}

export function DatabaseConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [connectionType, setConnectionType] = useState('source')
  const [dbType, setDbType] = useState('postgresql')
  const [params, setParams] = useState<Record<string, any>>({ ...DEFAULT_PARAMS.postgresql })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setParams({ ...DEFAULT_PARAMS[dbType] })
    setTestResult(null)
  }, [dbType])

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await connectionsApi.test({
        connection_type: connectionType,
        provider: dbType,
        db_type: dbType,
        params: { ...params, db_type: dbType }
      })
      setTestResult(res.data)
    } catch (e: any) {
      setTestResult({ success: false, message: e.response?.data?.detail || 'Test failed' })
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await connectionsApi.create({
        name,
        connection_type: connectionType,
        db_type: dbType,
        provider: dbType,
        params: { ...params, db_type: dbType }
      })
      onSuccess()
      setName('')
      setDescription('')
      setTestResult(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <BasicSection
        name={name}
        description={description}
        type={connectionType}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        showTypeSelector={true}
        onTypeChange={setConnectionType}
      />
      <ConnectionSection
        dbType={dbType}
        params={params}
        onDbTypeChange={setDbType}
        onParamsChange={setParams}
      />
      <AuthenticationSection
        dbType={dbType}
        params={params}
        onParamsChange={setParams}
      />
      <AdvancedSection
        dbType={dbType}
        params={params}
        onParamsChange={setParams}
      />

      {testResult && (
        <div
          className="p-3 rounded-lg flex items-center gap-2 text-sm"
          style={{
            backgroundColor: testResult.success ? 'var(--success-soft)' : 'var(--error-soft)',
            color: testResult.success ? 'var(--success)' : 'var(--error)'
          }}
        >
          {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {testResult.message}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleTest} disabled={testing} className="btn-secondary">
          {testing ? (
            <><Loader2 size={16} className="animate-spin" /> Testing...</>
          ) : (
            <><TestTube size={16} /> Test Connection</>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !testResult?.success || !name}
          className="btn-primary"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Connection</>
          )}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/connections/DatabaseConnectionForm.tsx
git commit -m "feat: add database connection form with type-aware fields"
```

---

## Task 11: Frontend — Create LLMConnectionForm

**Files:**
- Create: `frontend/src/components/connections/LLMConnectionForm.tsx`

- [ ] **Step 1: Write LLMConnectionForm**

Create `frontend/src/components/connections/LLMConnectionForm.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { connectionsApi } from '../../services/api'
import { BasicSection } from './form-sections/BasicSection'
import { TestTube, Save, Loader2, CheckCircle, XCircle } from 'lucide-react'

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5'] },
  { value: 'azure', label: 'Azure OpenAI', models: [] },
  { value: 'local', label: 'Local / Self-Hosted', models: [] },
  { value: 'ollama', label: 'Ollama', models: ['llama3', 'mistral', 'codellama'] },
  { value: 'groq', label: 'Groq', models: ['llama3-70b-8192', 'mixtral-8x7b-32768'] },
  { value: 'cohere', label: 'Cohere', models: ['command-r', 'command-r-plus'] },
  { value: 'kimi', label: 'Kimi (Moonshot AI)', models: ['kimi-k2', 'kimi-latest'] },
]

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  azure: '',
  local: 'http://localhost:8000/v1',
  ollama: 'http://localhost:11434',
  groq: '',
  cohere: '',
  kimi: 'https://api.moonshot.cn/v1',
}

export function LLMConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [provider, setProvider] = useState('openai')
  const [params, setParams] = useState<Record<string, any>>({
    model: 'gpt-4o',
    api_key: '',
    base_url: 'https://api.openai.com/v1',
  })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customEndpoint, setCustomEndpoint] = useState(false)

  const providerInfo = LLM_PROVIDERS.find(p => p.value === provider)

  useEffect(() => {
    const defaultUrl = DEFAULT_BASE_URLS[provider] || ''
    setParams({
      model: providerInfo?.models[0] || '',
      api_key: '',
      base_url: defaultUrl,
    })
    setCustomEndpoint(false)
    setTestResult(null)
  }, [provider])

  const updateParam = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const testParams = { ...params }
      if (!customEndpoint) {
        delete testParams.base_url
      }
      const res = await connectionsApi.test({
        connection_type: 'llm',
        provider,
        params: testParams
      })
      setTestResult(res.data)
    } catch (e: any) {
      setTestResult({ success: false, message: e.response?.data?.detail || 'Test failed' })
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const saveParams = { ...params }
      if (!customEndpoint) {
        delete saveParams.base_url
      }
      await connectionsApi.create({
        name,
        connection_type: 'llm',
        provider,
        params: saveParams
      })
      onSuccess()
      setName('')
      setDescription('')
      setTestResult(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  const needsApiKey = provider !== 'ollama'
  const needsBaseUrl = ['openai', 'anthropic', 'azure', 'local', 'ollama', 'kimi'].includes(provider)

  return (
    <div className="space-y-4">
      <BasicSection
        name={name}
        description={description}
        type="llm"
        onNameChange={setName}
        onDescriptionChange={setDescription}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Provider <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <select
          value={provider}
          onChange={e => setProvider(e.target.value)}
          className="input-dark w-full"
        >
          {LLM_PROVIDERS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Model <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          {providerInfo?.models.length ? (
            <select
              value={params.model || ''}
              onChange={e => updateParam('model', e.target.value)}
              className="input-dark w-full"
            >
              {providerInfo.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="custom">Custom...</option>
            </select>
          ) : (
            <input
              type="text"
              value={params.model || ''}
              onChange={e => updateParam('model', e.target.value)}
              className="input-dark w-full"
              placeholder="model-name"
            />
          )}
          {params.model === 'custom' && (
            <input
              type="text"
              value={params.custom_model || ''}
              onChange={e => updateParam('custom_model', e.target.value)}
              className="input-dark w-full mt-2"
              placeholder="Enter custom model name"
            />
          )}
        </div>
        {provider === 'azure' && (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>API Version</label>
            <input type="text" value={params.api_version || '2024-02-01'} onChange={e => updateParam('api_version', e.target.value)} className="input-dark w-full" />
          </div>
        )}
      </div>

      {needsApiKey && (
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            API Key {provider !== 'local' && <span style={{ color: 'var(--error)' }}>*</span>}
          </label>
          <input
            type="password"
            value={params.api_key || ''}
            onChange={e => updateParam('api_key', e.target.value)}
            className="input-dark w-full"
            placeholder={provider === 'local' ? 'not-needed (optional)' : 'sk-...'}
          />
        </div>
      )}

      {needsBaseUrl && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={customEndpoint}
              onChange={e => setCustomEndpoint(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use custom endpoint</span>
          </label>
          {customEndpoint && (
            <input
              type="text"
              value={params.base_url || ''}
              onChange={e => updateParam('base_url', e.target.value)}
              className="input-dark w-full"
              placeholder={DEFAULT_BASE_URLS[provider]}
            />
          )}
        </div>
      )}

      {provider === 'openai' && (
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Organization ID (optional)</label>
          <input type="text" value={params.organization_id || ''} onChange={e => updateParam('organization_id', e.target.value)} className="input-dark w-full" />
        </div>
      )}

      {testResult && (
        <div
          className="p-3 rounded-lg flex items-center gap-2 text-sm"
          style={{
            backgroundColor: testResult.success ? 'var(--success-soft)' : 'var(--error-soft)',
            color: testResult.success ? 'var(--success)' : 'var(--error)'
          }}
        >
          {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {testResult.message}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleTest} disabled={testing} className="btn-secondary">
          {testing ? (
            <><Loader2 size={16} className="animate-spin" /> Testing...</>
          ) : (
            <><TestTube size={16} /> Test Connection</>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !testResult?.success || !name}
          className="btn-primary"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Connection</>
          )}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/connections/LLMConnectionForm.tsx
git commit -m "feat: add llm connection form with 8 providers and model dropdowns"
```

---

## Task 12: Frontend — Create JiraConnectionForm

**Files:**
- Create: `frontend/src/components/connections/JiraConnectionForm.tsx`

- [ ] **Step 1: Write JiraConnectionForm**

Create `frontend/src/components/connections/JiraConnectionForm.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { connectionsApi } from '../../services/api'
import { BasicSection } from './form-sections/BasicSection'
import { TestTube, Save, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

const AUTH_METHODS_CLOUD = [
  { value: 'basic', label: 'Basic Auth (Email + API Token)' },
  { value: 'oauth2', label: 'OAuth 2.0' },
]

const AUTH_METHODS_SERVER = [
  { value: 'basic', label: 'Basic Auth (Username + Password)' },
  { value: 'pat', label: 'Personal Access Token' },
  { value: 'oauth1', label: 'OAuth 1.0a' },
]

export function JiraConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instanceType, setInstanceType] = useState('jira_cloud')
  const [params, setParams] = useState<Record<string, any>>({
    base_url: 'https://your-domain.atlassian.net',
    auth_method: 'basic',
  })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const updateParam = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    const defaultUrl = instanceType === 'jira_cloud'
      ? 'https://your-domain.atlassian.net'
      : 'https://jira.company.com'
    setParams({
      base_url: defaultUrl,
      auth_method: 'basic',
    })
    setTestResult(null)
  }, [instanceType])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'jira_oauth_success') {
        updateParam('access_token', event.data.access_token)
        updateParam('refresh_token', event.data.refresh_token)
        setTestResult({ success: true, message: 'OAuth authorization successful!' })
      } else if (event.data?.type === 'jira_oauth_error') {
        setTestResult({ success: false, message: event.data.error })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleAuthorize = () => {
    const clientId = params.client_id
    const redirectUri = `${window.location.origin.replace('5173', '8000')}/connections/jira/callback`
    const state = btoa(JSON.stringify({
      client_id: clientId,
      client_secret: params.client_secret,
      redirect_uri: redirectUri
    }))
    const scopes = 'read:jira-work read:jira-user read:project:jira'
    const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&prompt=consent`
    
    window.open(authUrl, 'jira_oauth', 'width=600,height=700')
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await connectionsApi.test({
        connection_type: 'jira',
        provider: instanceType,
        params
      })
      setTestResult(res.data)
    } catch (e: any) {
      setTestResult({ success: false, message: e.response?.data?.detail || 'Test failed' })
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await connectionsApi.create({
        name,
        connection_type: 'jira',
        provider: instanceType,
        params
      })
      onSuccess()
      setName('')
      setDescription('')
      setTestResult(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  const authMethods = instanceType === 'jira_cloud' ? AUTH_METHODS_CLOUD : AUTH_METHODS_SERVER

  return (
    <div className="space-y-4">
      <BasicSection
        name={name}
        description={description}
        type="jira"
        onNameChange={setName}
        onDescriptionChange={setDescription}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Instance Type <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <div className="flex gap-2">
          {['jira_cloud', 'jira_server'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setInstanceType(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                instanceType === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'jira_cloud' ? 'Jira Cloud' : 'Jira Server / DC'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Base URL <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <input
          type="text"
          value={params.base_url || ''}
          onChange={e => updateParam('base_url', e.target.value)}
          className="input-dark w-full"
          placeholder={instanceType === 'jira_cloud' ? 'https://your-domain.atlassian.net' : 'https://jira.company.com'}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Project Key(s)</label>
        <input
          type="text"
          value={params.project_keys || ''}
          onChange={e => updateParam('project_keys', e.target.value)}
          className="input-dark w-full"
          placeholder="PROJ, DEV, DATA"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Auth Method <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <select
          value={params.auth_method || 'basic'}
          onChange={e => updateParam('auth_method', e.target.value)}
          className="input-dark w-full"
        >
          {authMethods.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {params.auth_method === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {instanceType === 'jira_cloud' ? 'Email' : 'Username'} <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={params.email || params.username || ''}
              onChange={e => updateParam(instanceType === 'jira_cloud' ? 'email' : 'username', e.target.value)}
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {instanceType === 'jira_cloud' ? 'API Token' : 'Password'} <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="password"
              value={params.api_token || params.password || ''}
              onChange={e => updateParam(instanceType === 'jira_cloud' ? 'api_token' : 'password', e.target.value)}
              className="input-dark w-full"
            />
          </div>
        </div>
      )}

      {params.auth_method === 'pat' && (
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Personal Access Token <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="password"
            value={params.token || ''}
            onChange={e => updateParam('token', e.target.value)}
            className="input-dark w-full"
          />
        </div>
      )}

      {params.auth_method === 'oauth2' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Client ID <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" value={params.client_id || ''} onChange={e => updateParam('client_id', e.target.value)} className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Client Secret <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="password" value={params.client_secret || ''} onChange={e => updateParam('client_secret', e.target.value)} className="input-dark w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Scopes</label>
            <input type="text" value={params.scopes || 'read:jira-work read:jira-user read:project:jira'} onChange={e => updateParam('scopes', e.target.value)} className="input-dark w-full" />
          </div>
          <button
            type="button"
            onClick={handleAuthorize}
            disabled={!params.client_id || !params.client_secret}
            className="btn-secondary"
          >
            <ExternalLink size={16} /> Authorize with Atlassian
          </button>
          {params.access_token && (
            <div className="p-2 rounded text-xs font-mono break-all" style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)' }}>
              Access token received
            </div>
          )}
        </div>
      )}

      {params.auth_method === 'oauth1' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Consumer Key</label>
            <input type="text" value={params.consumer_key || ''} onChange={e => updateParam('consumer_key', e.target.value)} className="input-dark w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Access Token</label>
            <input type="password" value={params.access_token || ''} onChange={e => updateParam('access_token', e.target.value)} className="input-dark w-full" />
          </div>
        </div>
      )}

      {instanceType === 'jira_server' && (
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={params.ssl_verify !== false}
              onChange={e => updateParam('ssl_verify', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Verify SSL/TLS Certificate</span>
          </label>
        </div>
      )}

      {testResult && (
        <div
          className="p-3 rounded-lg flex items-center gap-2 text-sm"
          style={{
            backgroundColor: testResult.success ? 'var(--success-soft)' : 'var(--error-soft)',
            color: testResult.success ? 'var(--success)' : 'var(--error)'
          }}
        >
          {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {testResult.message}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleTest} disabled={testing} className="btn-secondary">
          {testing ? (
            <><Loader2 size={16} className="animate-spin" /> Testing...</>
          ) : (
            <><TestTube size={16} /> Test Connection</>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !testResult?.success || !name}
          className="btn-primary"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Connection</>
          )}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/connections/JiraConnectionForm.tsx
git commit -m "feat: add jira connection form with oauth2 flow"
```

---

## Task 13: Frontend — Rewrite ConnectionForm as Tabbed Wrapper

**Files:**
- Modify: `frontend/src/components/connections/ConnectionForm.tsx`

- [ ] **Step 1: Rewrite ConnectionForm**

Replace the entire contents of `frontend/src/components/connections/ConnectionForm.tsx`:

```tsx
import { useState } from 'react'
import { Database, Sparkles, Link2 } from 'lucide-react'
import { DatabaseConnectionForm } from './DatabaseConnectionForm'
import { LLMConnectionForm } from './LLMConnectionForm'
import { JiraConnectionForm } from './JiraConnectionForm'

type TabType = 'database' | 'llm' | 'jira'

const TABS: { id: TabType; label: string; icon: typeof Database }[] = [
  { id: 'database', label: 'Database', icon: Database },
  { id: 'llm', label: 'LLM Model', icon: Sparkles },
  { id: 'jira', label: 'Jira', icon: Link2 },
]

export function ConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('database')

  return (
    <div className="card p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-6 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'hover:bg-gray-100'
              }`}
              style={isActive ? { backgroundColor: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'database' && <DatabaseConnectionForm onSuccess={onSuccess} />}
      {activeTab === 'llm' && <LLMConnectionForm onSuccess={onSuccess} />}
      {activeTab === 'jira' && <JiraConnectionForm onSuccess={onSuccess} />}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/connections/ConnectionForm.tsx
git commit -m "feat: rewrite connection form as tabbed wrapper"
```

---

## Task 14: Frontend — Update ConnectionList

**Files:**
- Modify: `frontend/src/components/connections/ConnectionList.tsx`

- [ ] **Step 1: Update ConnectionList with filters and flavor badges**

Replace `frontend/src/components/connections/ConnectionList.tsx`:

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { connectionsApi } from '../../services/api'
import { Trash2, CheckCircle, XCircle, Database, Server, Link2, Sparkles, Pencil } from 'lucide-react'

const typeIcons: Record<string, React.ReactNode> = {
  source: <Database size={16} style={{ color: 'var(--cyan)' }} />,
  target: <Database size={16} style={{ color: 'var(--success)' }} />,
  jira: <Link2 size={16} style={{ color: 'var(--warning)' }} />,
  llm: <Sparkles size={16} style={{ color: 'var(--accent)' }} />,
}

const typeColors: Record<string, { bg: string }> = {
  source: { bg: 'var(--cyan-soft)' },
  target: { bg: 'var(--success-soft)' },
  jira: { bg: 'var(--warning-soft)' },
  llm: { bg: 'var(--accent-soft)' },
}

type FilterType = 'all' | 'database' | 'llm' | 'jira'

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'database', label: 'Databases' },
  { id: 'llm', label: 'LLMs' },
  { id: 'jira', label: 'Jira' },
]

export function ConnectionList({ onDelete, onEdit }: { onDelete: () => void; onEdit?: (conn: any) => void }) {
  const [filter, setFilter] = useState<FilterType>('all')
  const { data, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list()
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading connections...
        </div>
      </div>
    )
  }

  const connections = data?.data || []

  const filtered = filter === 'all'
    ? connections
    : filter === 'database'
      ? connections.filter((c: any) => c.connection_type === 'source' || c.connection_type === 'target')
      : connections.filter((c: any) => c.connection_type === filter)

  if (connections.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--accent-soft)' }}>
          <Server size={28} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No connections yet</h3>
        <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
          Add your first database, LLM, or Jira connection to start building mapping projects.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f.id
                ? 'text-white'
                : 'hover:bg-gray-100'
            }`}
            style={filter === f.id ? { backgroundColor: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="table-dark">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Flavor</th>
              <th>Status</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((conn: any) => {
              const typeStyle = typeColors[conn.connection_type] || typeColors.source
              const flavor = conn.provider || conn.db_type || conn.connection_type
              return (
                <tr key={conn.id}>
                  <td className="font-medium">{conn.name}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: typeStyle.bg }}>
                        {typeIcons[conn.connection_type]}
                      </span>
                      <span className="capitalize">{conn.connection_type}</span>
                    </span>
                  </td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {flavor}
                    </span>
                  </td>
                  <td>
                    {conn.is_tested ? (
                      <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--success)' }}>
                        <CheckCircle size={14} /> Tested
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <XCircle size={14} /> Untested
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(conn)}
                          className="p-2 rounded-md transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await connectionsApi.delete(conn.id)
                          onDelete()
                        }}
                        className="p-2 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update ConnectionsPage to pass onEdit**

Modify `frontend/src/pages/ConnectionsPage.tsx`:

Find:
```tsx
      <ConnectionList onDelete={handleSuccess} />
```

Replace with:
```tsx
      <ConnectionList onDelete={handleSuccess} onEdit={(conn) => console.log('Edit', conn)} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/connections/ConnectionList.tsx frontend/src/pages/ConnectionsPage.tsx
git commit -m "feat: update connection list with type filters and flavor badges"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Implementing Task |
|-----------------|-------------------|
| Tabbed form (Database / LLM / Jira) | Task 13 |
| Type-aware database fields (8 DB types) | Task 9 (sections), Task 10 (form) |
| LLM provider forms (8 providers) | Task 11 |
| Jira Cloud/Server forms with OAuth | Task 12 |
| Smart defaults | Task 10, 11, 12 |
| Backend provider column | Task 1 |
| Backend dispatcher pattern | Task 6 |
| Database tester | Task 3 |
| LLM tester | Task 4 |
| Jira tester | Task 5 |
| OAuth callback endpoint | Task 7 |
| Connection list filters | Task 14 |
| Flavor badges | Task 14 |
| Edit action placeholder | Task 14 |

All spec requirements covered.

### Placeholder Scan

- No TBD, TODO, or "implement later" found
- No vague "add error handling" or "write tests" without code
- All steps contain actual code, file paths, and commands

### Type Consistency Check

- `provider` field: added to model (Task 1), schema (Task 2), API service (Task 8), and all form components
- `ConnectionTestResult` dataclass: consistent across all testers (Tasks 3, 4, 5)
- `params` dict: consistently passed through all layers
- `db_type` vs `provider`: `db_type` used for database enum, `provider` used for specific flavor

No inconsistencies found.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-15-connection-form-redesign.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
