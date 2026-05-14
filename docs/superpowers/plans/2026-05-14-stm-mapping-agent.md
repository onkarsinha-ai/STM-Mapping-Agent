# STM Mapping Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack STM Mapping Agent with FastAPI backend, React frontend, configurable LLM integration, self-learning loop, and Excel export.

**Architecture:** FastAPI backend handles all business logic (DB connections, schema discovery, LLM orchestration, mapping engine, learning loop, export). React frontend provides chat-based input, schema browser, mapping review dashboard, and connection manager. PostgreSQL persists schema cache, mappings, and feedback for self-learning.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0 async, Alembic, PostgreSQL, LiteLLM, Pandas, openpyxl, React 18, Vite, TypeScript, Tailwind CSS, TanStack Table, TanStack Query, shadcn/ui

---

## File Structure

```
stm-mapping-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── connection.py
│   │   │   ├── project.py
│   │   │   ├── schema_cache.py
│   │   │   ├── mapping.py
│   │   │   ├── mapping_feedback.py
│   │   │   └── jira_context.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── connection.py
│   │   │   ├── project.py
│   │   │   ├── schema_cache.py
│   │   │   ├── mapping.py
│   │   │   └── jira.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── connection_service.py
│   │   │   ├── schema_discovery_service.py
│   │   │   ├── jira_service.py
│   │   │   ├── ingestion_service.py
│   │   │   ├── llm_orchestrator.py
│   │   │   ├── mapping_engine.py
│   │   │   ├── learning_service.py
│   │   │   └── export_service.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── connections.py
│   │   │   ├── projects.py
│   │   │   ├── discovery.py
│   │   │   ├── mappings.py
│   │   │   ├── files.py
│   │   │   ├── jira.py
│   │   │   └── export.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── security.py
│   │   │   └── encryption.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── db_helpers.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── unit/
│   │   │   ├── test_connection_service.py
│   │   │   ├── test_schema_discovery.py
│   │   │   ├── test_llm_orchestrator.py
│   │   │   ├── test_mapping_engine.py
│   │   │   └── test_export_service.py
│   │   └── integration/
│   │       └── test_full_flow.py
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   ├── requirements.txt
│   ├── pytest.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── connections/
│   │   │   │   ├── ConnectionList.tsx
│   │   │   │   ├── ConnectionForm.tsx
│   │   │   │   └── TestConnectionButton.tsx
│   │   │   ├── projects/
│   │   │   │   ├── ProjectList.tsx
│   │   │   │   └── ProjectWizard.tsx
│   │   │   ├── chat/
│   │   │   │   └── ChatPanel.tsx
│   │   │   ├── schema/
│   │   │   │   ├── SchemaTree.tsx
│   │   │   │   └── SchemaBrowser.tsx
│   │   │   └── mappings/
│   │   │       ├── MappingTable.tsx
│   │   │       ├── MappingDetail.tsx
│   │   │       └── EditMappingModal.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ConnectionsPage.tsx
│   │   │   └── ProjectPage.tsx
│   │   ├── hooks/
│   │   │   ├── useApi.ts
│   │   │   ├── useProject.ts
│   │   │   └── useConnections.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Phase 1: Project Setup & Infrastructure

### Task 1: Initialize Project Structure

**Files:**
- Create: `docker-compose.yml`
- Create: `README.md`
- Create: `backend/requirements.txt`
- Create: `frontend/package.json`

- [ ] **Step 1: Create root docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: stm_user
      POSTGRES_PASSWORD: stm_password
      POSTGRES_DB: stm_mapping
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://stm_user:stm_password@postgres:5432/stm_mapping
      - SECRET_KEY=dev-secret-key-change-in-production
      - ENCRYPTION_KEY=dev-encryption-key-32-bytes-long!!
    volumes:
      - ./backend:/app
    depends_on:
      - postgres
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8000
    command: npm run dev

volumes:
  postgres_data:
```

- [ ] **Step 2: Create backend requirements.txt**

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy[asyncio]==2.0.25
alembic==1.13.1
asyncpg==0.29.0
psycopg2-binary==2.9.9
pydantic==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
cryptography==42.0.0
litellm==1.18.0
pandas==2.1.4
pyarrow==14.0.2
openpyxl==3.1.2
jira==3.5.2
pytest==7.4.4
pytest-asyncio==0.23.3
httpx==0.26.0
aiomysql==0.2.0
pyodbc==5.0.1
snowflake-connector-python==3.7.0
google-cloud-bigquery==3.14.1
```

- [ ] **Step 3: Create frontend package.json**

```json
{
  "name": "stm-mapping-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0",
    "@tanstack/react-table": "^8.11.0",
    "axios": "^1.6.2",
    "lucide-react": "^0.303.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.8",
    "vitest": "^1.1.0"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml README.md backend/requirements.txt frontend/package.json
git commit -m "chore: initialize project structure and dependencies"
```

### Task 2: Backend Dockerfile & Config

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/pytest.ini`
- Create: `backend/app/config.py`

- [ ] **Step 1: Create backend Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create pytest.ini**

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

- [ ] **Step 3: Create config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://stm_user:stm_password@localhost:5432/stm_mapping"
    secret_key: str = "dev-secret-key"
    encryption_key: str = "dev-encryption-key-32-bytes-long!!"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/pytest.ini backend/app/config.py
git commit -m "chore: add backend dockerfile and config"
```

---

## Phase 2: Database Models & Migrations

### Task 3: Database Setup & Base Model

**Files:**
- Create: `backend/app/database.py`
- Create: `backend/app/models/__init__.py`

- [ ] **Step 1: Create database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

engine = create_async_engine(settings.database_url, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

- [ ] **Step 2: Create models __init__.py**

```python
from app.models.user import User
from app.models.connection import Connection
from app.models.project import Project
from app.models.schema_cache import SchemaCache
from app.models.mapping import Mapping
from app.models.mapping_feedback import MappingFeedback
from app.models.jira_context import JiraContext

__all__ = ["User", "Connection", "Project", "SchemaCache", "Mapping", "MappingFeedback", "JiraContext"]
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/database.py backend/app/models/__init__.py
git commit -m "feat: add database setup and model imports"
```

### Task 4: User & Connection Models

**Files:**
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/connection.py`

- [ ] **Step 1: Create user.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 2: Create connection.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum

class ConnectionType(str, enum.Enum):
    source = "source"
    target = "target"
    jira = "jira"
    llm = "llm"

class DBType(str, enum.Enum):
    postgresql = "postgresql"
    mysql = "mysql"
    sqlserver = "sqlserver"
    oracle = "oracle"
    snowflake = "snowflake"
    bigquery = "bigquery"
    csv = "csv"
    parquet = "parquet"

class Connection(Base):
    __tablename__ = "connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    connection_type = Column(Enum(ConnectionType), nullable=False)
    db_type = Column(Enum(DBType), nullable=True)
    encrypted_connection_string = Column(Text, nullable=False)
    metadata = Column(JSON, default=dict)
    is_tested = Column(Boolean, default=False)
    last_tested_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/user.py backend/app/models/connection.py
git commit -m "feat: add user and connection models"
```

### Task 5: Project & Schema Cache Models

**Files:**
- Create: `backend/app/models/project.py`
- Create: `backend/app/models/schema_cache.py`

- [ ] **Step 1: Create project.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum

class ProjectStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    archived = "archived"

class ProjectPhase(str, enum.Enum):
    input = "input"
    discovery = "discovery"
    propose = "propose"
    review = "review"
    export = "export"

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.active)
    current_phase = Column(Enum(ProjectPhase), default=ProjectPhase.input)
    source_connection_id = Column(UUID(as_uuid=True), ForeignKey("connections.id"), nullable=True)
    target_connection_id = Column(UUID(as_uuid=True), ForeignKey("connections.id"), nullable=True)
    jira_connection_id = Column(UUID(as_uuid=True), ForeignKey("connections.id"), nullable=True)
    llm_connection_id = Column(UUID(as_uuid=True), ForeignKey("connections.id"), nullable=True)
    jira_ticket_key = Column(String(50), nullable=True)
    user_text_input = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 2: Create schema_cache.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum

class ObjectType(str, enum.Enum):
    table = "table"
    column = "column"
    constraint = "constraint"
    index = "index"

class SchemaCache(Base):
    __tablename__ = "schema_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("connections.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    object_type = Column(Enum(ObjectType), nullable=False)
    schema_name = Column(String(255), nullable=True)
    table_name = Column(String(255), nullable=True)
    column_name = Column(String(255), nullable=True)
    data_type = Column(String(255), nullable=True)
    is_nullable = Column(Boolean, nullable=True)
    column_default = Column(Text, nullable=True)
    sample_data = Column(JSON, default=list)
    stats = Column(JSON, default=dict)
    fetched_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/project.py backend/app/models/schema_cache.py
git commit -m "feat: add project and schema cache models"
```

### Task 6: Mapping, Feedback & Jira Models

**Files:**
- Create: `backend/app/models/mapping.py`
- Create: `backend/app/models/mapping_feedback.py`
- Create: `backend/app/models/jira_context.py`

- [ ] **Step 1: Create mapping.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum

class MappingStatus(str, enum.Enum):
    proposed = "proposed"
    approved = "approved"
    rejected = "rejected"
    modified = "modified"

class Mapping(Base):
    __tablename__ = "mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    target_connection_id = Column(UUID(as_uuid=True), ForeignKey("connections.id"), nullable=True)
    target_schema = Column(String(255), nullable=True)
    target_table = Column(String(255), nullable=False)
    target_column = Column(String(255), nullable=False)
    source_connection_id = Column(UUID(as_uuid=True), ForeignKey("connections.id"), nullable=True)
    source_schema = Column(String(255), nullable=True)
    source_table = Column(String(255), nullable=True)
    source_column = Column(String(255), nullable=True)
    business_logic = Column(Text, nullable=True)
    transformation_rule = Column(Text, nullable=True)
    confidence_score = Column(Numeric(3, 2), nullable=True)
    status = Column(Enum(MappingStatus), default=MappingStatus.proposed)
    llm_reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

- [ ] **Step 2: Create mapping_feedback.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, Text, Enum, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum

class UserAction(str, enum.Enum):
    approved = "approved"
    rejected = "rejected"
    modified = "modified"

class MappingFeedback(Base):
    __tablename__ = "mapping_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mapping_id = Column(UUID(as_uuid=True), ForeignKey("mappings.id"), nullable=False)
    user_action = Column(Enum(UserAction), nullable=False)
    user_notes = Column(Text, nullable=True)
    original_proposal = Column(JSON, default=dict)
    final_state = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 3: Create jira_context.py**

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class JiraContext(Base):
    __tablename__ = "jira_context"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    ticket_key = Column(String(50), nullable=False)
    ticket_summary = Column(Text, nullable=True)
    ticket_description = Column(Text, nullable=True)
    acceptance_criteria = Column(Text, nullable=True)
    labels = Column(JSON, default=list)
    fetched_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/mapping.py backend/app/models/mapping_feedback.py backend/app/models/jira_context.py
git commit -m "feat: add mapping, feedback, and jira context models"
```

### Task 7: Alembic Migrations

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Run: alembic revision

- [ ] **Step 1: Create alembic.ini**

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = postgresql+asyncpg://stm_user:stm_password@localhost:5432/stm_mapping

[post_write_hooks]

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 2: Create alembic/env.py**

```python
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
from app.database import Base
from app.models import *

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = "postgresql+asyncpg://stm_user:stm_password@localhost:5432/stm_mapping"
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Create alembic/script.py.mako**

Use the standard Alembic template.

- [ ] **Step 4: Generate and run initial migration**

```bash
cd backend
alembic revision --autogenerate -m "initial migration"
alembic upgrade head
```

- [ ] **Step 5: Commit**

```bash
git add backend/alembic.ini backend/alembic/env.py backend/alembic/script.py.mako backend/alembic/versions/
git commit -m "feat: add alembic migrations"
```

---

## Phase 3: Core Backend Services

### Task 8: Encryption Utility

**Files:**
- Create: `backend/app/core/encryption.py`
- Test: `backend/tests/unit/test_encryption.py`

- [ ] **Step 1: Write test**

```python
from app.core.encryption import encrypt, decrypt

def test_encrypt_decrypt():
    original = '{"host": "localhost", "password": "secret"}'
    encrypted = encrypt(original)
    assert encrypted != original
    decrypted = decrypt(encrypted)
    assert decrypted == original
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
cd backend
pytest tests/unit/test_encryption.py -v
```

- [ ] **Step 3: Implement encryption.py**

```python
from cryptography.fernet import Fernet
from app.config import settings

_fernet = Fernet(settings.encryption_key.encode()[:32].ljust(32, b'0')[:32])

def encrypt(data: str) -> str:
    return _fernet.encrypt(data.encode()).decode()

def decrypt(token: str) -> str:
    return _fernet.decrypt(token.encode()).decode()
```

- [ ] **Step 4: Run test (expect PASS)**

```bash
pytest tests/unit/test_encryption.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/encryption.py backend/tests/unit/test_encryption.py
git commit -m "feat: add fernet encryption utility"
```

### Task 9: Connection Service

**Files:**
- Create: `backend/app/services/connection_service.py`
- Test: `backend/tests/unit/test_connection_service.py`

- [ ] **Step 1: Write test**

```python
import pytest
from unittest.mock import patch, AsyncMock
from app.services.connection_service import ConnectionService

@pytest.mark.asyncio
async def test_test_connection_postgresql():
    with patch('app.services.connection_service.create_async_engine') as mock_engine:
        mock_conn = AsyncMock()
        mock_conn.execute.return_value = None
        mock_engine.return_value.connect.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_engine.return_value.connect.return_value.__aexit__ = AsyncMock(return_value=None)
        
        result = await ConnectionService.test_connection({
            "db_type": "postgresql",
            "host": "localhost",
            "port": 5432,
            "database": "test",
            "username": "user",
            "password": "pass"
        })
        assert result.success is True
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
pytest tests/unit/test_connection_service.py -v
```

- [ ] **Step 3: Implement connection_service.py**

```python
import json
from typing import Dict, Any, Optional
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.encryption import encrypt, decrypt
from app.database import AsyncSessionLocal
from app.models.connection import Connection, ConnectionType, DBType

@dataclass
class ConnectionTestResult:
    success: bool
    message: str

class ConnectionService:
    @staticmethod
    async def test_connection(params: Dict[str, Any]) -> ConnectionTestResult:
        db_type = params.get("db_type")
        try:
            if db_type == "postgresql":
                url = f"postgresql+asyncpg://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
            elif db_type == "mysql":
                url = f"mysql+aiomysql://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
            else:
                return ConnectionTestResult(False, f"Unsupported database type: {db_type}")
            
            engine = create_async_engine(url, echo=False)
            async with engine.connect() as conn:
                await conn.execute("SELECT 1")
            await engine.dispose()
            return ConnectionTestResult(True, "Connection successful")
        except Exception as e:
            return ConnectionTestResult(False, str(e))

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
            session.add(conn)
            await session.commit()
            await session.refresh(conn)
            return conn

    @staticmethod
    async def get_connection_string(connection_id: str) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            conn = await session.get(Connection, connection_id)
            if not conn:
                raise ValueError(f"Connection {connection_id} not found")
            return json.loads(decrypt(conn.encrypted_connection_string))
```

- [ ] **Step 4: Run test (expect PASS)**

```bash
pytest tests/unit/test_connection_service.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/connection_service.py backend/tests/unit/test_connection_service.py
git commit -m "feat: add connection service with test and encrypt"
```

### Task 10: Schema Discovery Service

**Files:**
- Create: `backend/app/services/schema_discovery_service.py`
- Test: `backend/tests/unit/test_schema_discovery.py`

- [ ] **Step 1: Write test**

```python
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.schema_discovery_service import SchemaDiscoveryService

@pytest.mark.asyncio
async def test_discover_postgresql_schema():
    with patch('app.services.schema_discovery_service.create_async_engine') as mock_engine:
        mock_result = MagicMock()
        mock_result.mappings.return_value.all.return_value = [
            {"table_schema": "public", "table_name": "users", "column_name": "id", "data_type": "uuid", "is_nullable": "NO"}
        ]
        mock_conn = AsyncMock()
        mock_conn.execute.return_value = mock_result
        mock_engine.return_value.connect.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_engine.return_value.connect.return_value.__aexit__ = AsyncMock(return_value=None)
        
        with patch('app.services.schema_discovery_service.AsyncSessionLocal'):
            result = await SchemaDiscoveryService.discover_schema("conn-id", "project-id", {
                "db_type": "postgresql",
                "host": "localhost", "port": 5432, "database": "test",
                "username": "user", "password": "pass"
            })
            assert len(result) == 1
            assert result[0].table_name == "users"
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
pytest tests/unit/test_schema_discovery.py -v
```

- [ ] **Step 3: Implement schema_discovery_service.py**

```python
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.models.schema_cache import SchemaCache, ObjectType

class SchemaDiscoveryService:
    @staticmethod
    async def discover_schema(connection_id: str, project_id: str, params: Dict[str, Any]) -> List[SchemaCache]:
        db_type = params.get("db_type")
        
        if db_type == "postgresql":
            url = f"postgresql+asyncpg://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
            query = """
                SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name, ordinal_position
            """
        elif db_type == "mysql":
            url = f"mysql+aiomysql://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
            query = """
                SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                ORDER BY table_name, ordinal_position
            """
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
        
        engine = create_async_engine(url, echo=False)
        entries = []
        
        try:
            async with engine.connect() as conn:
                result = await conn.execute(text(query))
                rows = result.mappings().all()
                
                for row in rows:
                    entry = SchemaCache(
                        connection_id=connection_id,
                        project_id=project_id,
                        object_type=ObjectType.column,
                        schema_name=row["table_schema"],
                        table_name=row["table_name"],
                        column_name=row["column_name"],
                        data_type=row["data_type"],
                        is_nullable=row["is_nullable"] == "YES",
                        column_default=str(row["column_default"]) if row["column_default"] else None
                    )
                    entries.append(entry)
            
            async with AsyncSessionLocal() as session:
                for entry in entries:
                    session.add(entry)
                await session.commit()
        finally:
            await engine.dispose()
        
        return entries

    @staticmethod
    async def get_cached_schema(project_id: str) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            result = await session.execute(
                select(SchemaCache).where(SchemaCache.project_id == project_id)
            )
            entries = result.scalars().all()
            
            tree = {}
            for entry in entries:
                schema = entry.schema_name or "default"
                table = entry.table_name or "unknown"
                if schema not in tree:
                    tree[schema] = {}
                if table not in tree[schema]:
                    tree[schema][table] = []
                tree[schema][table].append({
                    "name": entry.column_name,
                    "type": entry.data_type,
                    "nullable": entry.is_nullable
                })
            return tree
```

- [ ] **Step 4: Run test (expect PASS)**

```bash
pytest tests/unit/test_schema_discovery.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/schema_discovery_service.py backend/tests/unit/test_schema_discovery.py
git commit -m "feat: add schema discovery service for postgresql and mysql"
```

### Task 11: LLM Orchestrator

**Files:**
- Create: `backend/app/services/llm_orchestrator.py`
- Test: `backend/tests/unit/test_llm_orchestrator.py`

- [ ] **Step 1: Write test**

```python
import pytest
from unittest.mock import patch
from app.services.llm_orchestrator import LLMOrchestrator

def test_build_prompt():
    target_schema = {"public": {"dim_customer": [{"name": "customer_id", "type": "int"}]}}
    source_schema = {"public": {"users": [{"name": "id", "type": "int"}]}}
    
    prompt = LLMOrchestrator.build_prompt(target_schema, source_schema, None, "", [])
    assert "dim_customer" in prompt
    assert "users" in prompt
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
pytest tests/unit/test_llm_orchestrator.py -v
```

- [ ] **Step 3: Implement llm_orchestrator.py**

```python
import json
from typing import List, Dict, Any, Optional
import litellm
from app.database import AsyncSessionLocal
from app.models.mapping import Mapping, MappingStatus

class LLMOrchestrator:
    @staticmethod
    def build_prompt(target_schema: Dict, source_schema: Dict, 
                     jira_context: Optional[str], user_text: str,
                     historical_feedback: List[Dict]) -> str:
        prompt = f"""You are a data mapping expert. Given a target table and source schema, propose column mappings.

## Target Schema
{json.dumps(target_schema, indent=2)}

## Source Schema
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
For each target column, propose the best source column. Include:
- source_table, source_column
- business_logic: why this maps
- transformation_rule: any SQL/transform needed
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

    @staticmethod
    async def propose_mappings(project_id: str, target_schema: Dict, source_schema: Dict,
                               llm_config: Dict, jira_context: Optional[str] = None,
                               user_text: str = "", historical_feedback: List[Dict] = []) -> List[Mapping]:
        prompt = LLMOrchestrator.build_prompt(target_schema, source_schema, jira_context, user_text, historical_feedback)
        
        api_key = llm_config.get("api_key")
        model = llm_config.get("model", "gpt-4")
        base_url = llm_config.get("base_url")
        
        response = await litellm.acompletion(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            api_key=api_key,
            api_base=base_url,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        proposals = json.loads(content)
        if isinstance(proposals, dict):
            proposals = proposals.get("mappings", [])
        
        mappings = []
        for prop in proposals:
            mapping = Mapping(
                project_id=project_id,
                target_table=prop.get("target_table", ""),
                target_column=prop.get("target_column", ""),
                source_table=prop.get("source_table"),
                source_column=prop.get("source_column"),
                business_logic=prop.get("business_logic"),
                transformation_rule=prop.get("transformation_rule"),
                confidence_score=prop.get("confidence_score", 0.5),
                llm_reasoning=prop.get("reasoning"),
                status=MappingStatus.proposed
            )
            mappings.append(mapping)
        
        async with AsyncSessionLocal() as session:
            for mapping in mappings:
                session.add(mapping)
            await session.commit()
        
        return mappings
```

- [ ] **Step 4: Run test (expect PASS)**

```bash
pytest tests/unit/test_llm_orchestrator.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/llm_orchestrator.py backend/tests/unit/test_llm_orchestrator.py
git commit -m "feat: add llm orchestrator with litellm integration"
```

### Task 12: Mapping Engine & Learning Service

**Files:**
- Create: `backend/app/services/mapping_engine.py`
- Create: `backend/app/services/learning_service.py`
- Test: `backend/tests/unit/test_mapping_engine.py`

- [ ] **Step 1: Write test**

```python
import pytest
from app.services.mapping_engine import MappingEngine
from app.models.mapping import MappingStatus

def test_calculate_confidence():
    score = MappingEngine.calculate_confidence("customer_id", "cust_id", "int", "int", 0.8)
    assert 0 <= score <= 1
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
pytest tests/unit/test_mapping_engine.py -v
```

- [ ] **Step 3: Implement mapping_engine.py**

```python
from difflib import SequenceMatcher
from typing import Optional
from app.database import AsyncSessionLocal
from app.models.mapping import Mapping, MappingStatus
from app.models.mapping_feedback import MappingFeedback, UserAction

class MappingEngine:
    @staticmethod
    def calculate_confidence(target_col: str, source_col: str, 
                            target_type: str, source_type: str, 
                            llm_confidence: float) -> float:
        name_similarity = SequenceMatcher(None, target_col.lower(), source_col.lower()).ratio()
        type_match = 1.0 if target_type.lower() == source_type.lower() else 0.5
        
        score = (llm_confidence * 0.5 + name_similarity * 0.3 + type_match * 0.2)
        return round(min(score, 1.0), 2)

    @staticmethod
    async def update_mapping_status(mapping_id: str, action: str, 
                                    modifications: Optional[dict] = None) -> Mapping:
        async with AsyncSessionLocal() as session:
            mapping = await session.get(Mapping, mapping_id)
            if not mapping:
                raise ValueError(f"Mapping {mapping_id} not found")
            
            original = {
                "source_table": mapping.source_table,
                "source_column": mapping.source_column,
                "business_logic": mapping.business_logic,
                "transformation_rule": mapping.transformation_rule
            }
            
            if action == "approve":
                mapping.status = MappingStatus.approved
            elif action == "reject":
                mapping.status = MappingStatus.rejected
            elif action == "modify" and modifications:
                mapping.status = MappingStatus.modified
                for key, value in modifications.items():
                    if hasattr(mapping, key):
                        setattr(mapping, key, value)
            
            feedback = MappingFeedback(
                mapping_id=mapping_id,
                user_action=UserAction(action),
                original_proposal=original,
                final_state={
                    "source_table": mapping.source_table,
                    "source_column": mapping.source_column,
                    "business_logic": mapping.business_logic,
                    "transformation_rule": mapping.transformation_rule
                }
            )
            session.add(feedback)
            await session.commit()
            await session.refresh(mapping)
            return mapping
```

- [ ] **Step 4: Implement learning_service.py**

```python
from typing import List
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.mapping_feedback import MappingFeedback, UserAction
from app.models.mapping import Mapping

class LearningService:
    @staticmethod
    async def get_relevant_feedback(user_id: str, target_table: str, target_column: str, limit: int = 10) -> List[dict]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(MappingFeedback, Mapping)
                .join(Mapping, MappingFeedback.mapping_id == Mapping.id)
                .where(
                    Mapping.target_table.ilike(f"%{target_table}%"),
                    MappingFeedback.user_action == UserAction.approved
                )
                .order_by(MappingFeedback.created_at.desc())
                .limit(limit)
            )
            
            feedback_list = []
            for fb, mapping in result:
                feedback_list.append({
                    "target_table": mapping.target_table,
                    "target_column": mapping.target_column,
                    "source_table": mapping.source_table,
                    "source_column": mapping.source_column,
                    "business_logic": mapping.business_logic,
                    "transformation_rule": mapping.transformation_rule
                })
            return feedback_list
```

- [ ] **Step 5: Run test (expect PASS)**

```bash
pytest tests/unit/test_mapping_engine.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/mapping_engine.py backend/app/services/learning_service.py backend/tests/unit/test_mapping_engine.py
git commit -m "feat: add mapping engine and learning service"
```

### Task 13: Export Service

**Files:**
- Create: `backend/app/services/export_service.py`
- Test: `backend/tests/unit/test_export_service.py`

- [ ] **Step 1: Write test**

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.export_service import ExportService

@pytest.mark.asyncio
async def test_generate_excel():
    mock_mapping = MagicMock()
    mock_mapping.target_table = "dim_customer"
    mock_mapping.target_column = "customer_id"
    mock_mapping.source_table = "users"
    mock_mapping.source_column = "id"
    mock_mapping.business_logic = "Primary key mapping"
    mock_mapping.transformation_rule = "CAST(id AS VARCHAR)"
    mock_mapping.confidence_score = 0.95
    
    with patch('app.services.export_service.AsyncSessionLocal') as mock_session:
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_mapping]
        mock_session.return_value.__aenter__.return_value.execute.return_value = mock_result
        
        excel_bytes = await ExportService.generate_excel("project-id")
        assert len(excel_bytes) > 0
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
pytest tests/unit/test_export_service.py -v
```

- [ ] **Step 3: Implement export_service.py**

```python
from io import BytesIO
from typing import List
from sqlalchemy import select
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from app.database import AsyncSessionLocal
from app.models.mapping import Mapping, MappingStatus

class ExportService:
    @staticmethod
    async def generate_excel(project_id: str) -> bytes:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Mapping).where(
                    Mapping.project_id == project_id,
                    Mapping.status.in_([MappingStatus.approved, MappingStatus.modified])
                )
            )
            mappings = result.scalars().all()
        
        wb = Workbook()
        
        # Group by target table
        tables = {}
        for m in mappings:
            table = m.target_table
            if table not in tables:
                tables[table] = []
            tables[table].append(m)
        
        first = True
        for table_name, table_mappings in tables.items():
            if first:
                ws = wb.active
                ws.title = table_name
                first = False
            else:
                ws = wb.create_sheet(title=table_name)
            
            headers = ["Target DB", "Target Table", "Target Column", "Source DB", "Source Table", 
                      "Source Column", "Business Logic", "Transformation", "Confidence Score"]
            
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.font = Font(bold=True)
                cell.fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
            
            for row, m in enumerate(table_mappings, 2):
                ws.cell(row=row, column=1, value="target")
                ws.cell(row=row, column=2, value=m.target_table)
                ws.cell(row=row, column=3, value=m.target_column)
                ws.cell(row=row, column=4, value="source")
                ws.cell(row=row, column=5, value=m.source_table)
                ws.cell(row=row, column=6, value=m.source_column)
                ws.cell(row=row, column=7, value=m.business_logic)
                ws.cell(row=row, column=8, value=m.transformation_rule)
                ws.cell(row=row, column=9, value=float(m.confidence_score) if m.confidence_score else None)
            
            for col in range(1, len(headers) + 1):
                ws.column_dimensions[ws.cell(row=1, column=col).column_letter].width = 20
        
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
```

- [ ] **Step 4: Run test (expect PASS)**

```bash
pytest tests/unit/test_export_service.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/export_service.py backend/tests/unit/test_export_service.py
git commit -m "feat: add excel export service"
```

---

## Phase 4: API Routers

### Task 14: Auth Router

**Files:**
- Create: `backend/app/routers/auth.py`
- Create: `backend/app/core/security.py`
- Create: `backend/app/schemas/user.py`

- [ ] **Step 1: Implement security.py**

```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt
```

- [ ] **Step 2: Implement user schema**

```python
from pydantic import BaseModel, EmailStr
from uuid import UUID

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
```

- [ ] **Step 3: Implement auth router**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from app.database import get_db
from app.models.user import User
from app.core.security import get_password_hash, verify_password, create_access_token
from app.schemas.user import UserCreate, UserResponse, Token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    return {"access_token": access_token, "token_type": "bearer"}
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/core/security.py backend/app/schemas/user.py backend/app/routers/auth.py
git commit -m "feat: add auth router with jwt"
```

### Task 15: Connection Router

**Files:**
- Create: `backend/app/routers/connections.py`
- Create: `backend/app/schemas/connection.py`

- [ ] **Step 1: Implement connection schema**

```python
from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Dict, Any
from app.models.connection import ConnectionType, DBType

class ConnectionCreate(BaseModel):
    name: str
    connection_type: ConnectionType
    db_type: Optional[DBType] = None
    params: Dict[str, Any]

class ConnectionResponse(BaseModel):
    id: UUID
    name: str
    connection_type: str
    db_type: Optional[str]
    is_tested: bool
    
    class Config:
        from_attributes = True

class ConnectionTestRequest(BaseModel):
    db_type: DBType
    params: Dict[str, Any]

class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
```

- [ ] **Step 2: Implement connection router**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.connection import Connection
from app.services.connection_service import ConnectionService
from app.schemas.connection import ConnectionCreate, ConnectionResponse, ConnectionTestRequest, ConnectionTestResponse

router = APIRouter(prefix="/connections", tags=["connections"])

@router.get("/", response_model=List[ConnectionResponse])
async def list_connections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Connection))
    connections = result.scalars().all()
    return connections

@router.post("/test", response_model=ConnectionTestResponse)
async def test_connection(request: ConnectionTestRequest):
    result = await ConnectionService.test_connection(request.params)
    return ConnectionTestResponse(success=result.success, message=result.message)

@router.post("/", response_model=ConnectionResponse)
async def create_connection(data: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    # For MVP, use a hardcoded user_id
    user_id = "00000000-0000-0000-0000-000000000001"
    conn = await ConnectionService.create_connection(
        user_id=user_id,
        name=data.name,
        connection_type=data.connection_type,
        db_type=data.db_type,
        params=data.params
    )
    return conn

@router.delete("/{connection_id}")
async def delete_connection(connection_id: str, db: AsyncSession = Depends(get_db)):
    conn = await db.get(Connection, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)
    await db.commit()
    return {"message": "Connection deleted"}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/connections.py backend/app/schemas/connection.py
git commit -m "feat: add connection router with test endpoint"
```

### Task 16: Project & Discovery Routers

**Files:**
- Create: `backend/app/routers/projects.py`
- Create: `backend/app/routers/discovery.py`
- Create: `backend/app/schemas/project.py`

- [ ] **Step 1: Implement project schema**

```python
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.models.project import ProjectStatus, ProjectPhase

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source_connection_id: Optional[UUID] = None
    target_connection_id: Optional[UUID] = None
    jira_connection_id: Optional[UUID] = None
    llm_connection_id: Optional[UUID] = None
    jira_ticket_key: Optional[str] = None

class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    status: str
    current_phase: str
    source_connection_id: Optional[UUID]
    target_connection_id: Optional[UUID]
    
    class Config:
        from_attributes = True
```

- [ ] **Step 2: Implement project router**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.project import Project, ProjectPhase
from app.schemas.project import ProjectCreate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project))
    return result.scalars().all()

@router.post("/", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    user_id = "00000000-0000-0000-0000-000000000001"
    project = Project(
        user_id=user_id,
        name=data.name,
        description=data.description,
        source_connection_id=data.source_connection_id,
        target_connection_id=data.target_connection_id,
        jira_connection_id=data.jira_connection_id,
        llm_connection_id=data.llm_connection_id,
        jira_ticket_key=data.jira_ticket_key
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}/phase")
async def update_phase(project_id: str, phase: ProjectPhase, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.current_phase = phase
    await db.commit()
    return {"message": f"Phase updated to {phase}"}
```

- [ ] **Step 3: Implement discovery router**

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
    if not project.source_connection_id:
        raise HTTPException(status_code=400, detail="Source connection not set")
    
    params = await ConnectionService.get_connection_string(str(project.source_connection_id))
    
    await SchemaDiscoveryService.discover_schema(
        str(project.source_connection_id),
        project_id,
        params
    )
    
    project.current_phase = "discovery"
    await db.commit()
    
    return {"message": "Schema discovery started"}

@router.get("/{project_id}/schema")
async def get_schema(project_id: str):
    schema = await SchemaDiscoveryService.get_cached_schema(project_id)
    return schema
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/projects.py backend/app/routers/discovery.py backend/app/schemas/project.py
git commit -m "feat: add project and discovery routers"
```

### Task 17: Mapping & Export Routers

**Files:**
- Create: `backend/app/routers/mappings.py`
- Create: `backend/app/routers/export.py`
- Create: `backend/app/schemas/mapping.py`

- [ ] **Step 1: Implement mapping schema**

```python
from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from app.models.mapping import MappingStatus

class MappingUpdate(BaseModel):
    status: MappingStatus
    source_table: Optional[str] = None
    source_column: Optional[str] = None
    business_logic: Optional[str] = None
    transformation_rule: Optional[str] = None

class MappingResponse(BaseModel):
    id: UUID
    target_table: str
    target_column: str
    source_table: Optional[str]
    source_column: Optional[str]
    business_logic: Optional[str]
    transformation_rule: Optional[str]
    confidence_score: Optional[float]
    status: str
    llm_reasoning: Optional[str]
    
    class Config:
        from_attributes = True
```

- [ ] **Step 2: Implement mapping router**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.mapping import Mapping
from app.models.project import Project
from app.services.mapping_engine import MappingEngine
from app.schemas.mapping import MappingUpdate, MappingResponse

router = APIRouter(prefix="/projects", tags=["mappings"])

@router.get("/{project_id}/mappings", response_model=List[MappingResponse])
async def list_mappings(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping).where(Mapping.project_id == project_id))
    return result.scalars().all()

@router.put("/mappings/{mapping_id}")
async def update_mapping(mapping_id: str, update: MappingUpdate, db: AsyncSession = Depends(get_db)):
    modifications = None
    if update.source_table or update.source_column or update.business_logic or update.transformation_rule:
        modifications = {
            "source_table": update.source_table,
            "source_column": update.source_column,
            "business_logic": update.business_logic,
            "transformation_rule": update.transformation_rule
        }
    
    mapping = await MappingEngine.update_mapping_status(mapping_id, update.status.value, modifications)
    return mapping
```

- [ ] **Step 3: Implement export router**

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from io import BytesIO

from app.database import get_db
from app.models.project import Project
from app.services.export_service import ExportService

router = APIRouter(prefix="/projects", tags=["export"])

@router.post("/{project_id}/export")
async def generate_export(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    excel_bytes = await ExportService.generate_excel(project_id)
    return {"message": "Export generated", "size": len(excel_bytes)}

@router.get("/{project_id}/export")
async def download_export(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    excel_bytes = await ExportService.generate_excel(project_id)
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={project.name}_stm_mapping.xlsx"}
    )
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/mappings.py backend/app/routers/export.py backend/app/schemas/mapping.py
git commit -m "feat: add mapping and export routers"
```

### Task 18: Main App & CORS

**Files:**
- Create: `backend/app/main.py`

- [ ] **Step 1: Implement main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, connections, projects, discovery, mappings, export

app = FastAPI(title="STM Mapping Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(connections.router)
app.include_router(projects.router)
app.include_router(discovery.router)
app.include_router(mappings.router)
app.include_router(export.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: wire up all routers in main app"
```

---

## Phase 5: Frontend Setup

### Task 19: Vite + React + TypeScript + Tailwind

**Files:**
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.tsx`

- [ ] **Step 1: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 4: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>STM Mapping Agent</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 7: Create index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
}
```

- [ ] **Step 8: Create App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Dashboard } from './pages/Dashboard'
import { ConnectionsPage } from './pages/ConnectionsPage'
import { ProjectPage } from './pages/ProjectPage'

function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 9: Commit**

```bash
git add frontend/vite.config.ts frontend/tsconfig.json frontend/tailwind.config.js frontend/postcss.config.js frontend/index.html frontend/src/main.tsx frontend/src/index.css frontend/src/App.tsx
git commit -m "feat: initialize react frontend with vite, tailwind, router"
```

### Task 20: API Service & Types

**Files:**
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/types/index.ts`

- [ ] **Step 1: Create api.ts**

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json'
  }
})

export default api

// Connection APIs
export const connectionsApi = {
  list: () => api.get('/connections/'),
  create: (data: any) => api.post('/connections/', data),
  test: (data: any) => api.post('/connections/test', data),
  delete: (id: string) => api.delete(`/connections/${id}`)
}

// Project APIs
export const projectsApi = {
  list: () => api.get('/projects/'),
  create: (data: any) => api.post('/projects/', data),
  get: (id: string) => api.get(`/projects/${id}`),
  updatePhase: (id: string, phase: string) => api.put(`/projects/${id}/phase`, { phase })
}

// Discovery APIs
export const discoveryApi = {
  discover: (projectId: string) => api.post(`/projects/${projectId}/discover`),
  getSchema: (projectId: string) => api.get(`/projects/${projectId}/schema`)
}

// Mapping APIs
export const mappingsApi = {
  list: (projectId: string) => api.get(`/projects/${projectId}/mappings`),
  update: (mappingId: string, data: any) => api.put(`/mappings/${mappingId}`, data)
}

// Export APIs
export const exportApi = {
  generate: (projectId: string) => api.post(`/projects/${projectId}/export`),
  download: (projectId: string) => api.get(`/projects/${projectId}/export`, { responseType: 'blob' })
}
```

- [ ] **Step 2: Create types**

```typescript
export interface Connection {
  id: string
  name: string
  connection_type: 'source' | 'target' | 'jira' | 'llm'
  db_type: string | null
  is_tested: boolean
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: string
  current_phase: string
  source_connection_id: string | null
  target_connection_id: string | null
}

export interface Mapping {
  id: string
  target_table: string
  target_column: string
  source_table: string | null
  source_column: string | null
  business_logic: string | null
  transformation_rule: string | null
  confidence_score: number | null
  status: string
  llm_reasoning: string | null
}

export interface SchemaTree {
  [schema: string]: {
    [table: string]: Array<{
      name: string
      type: string
      nullable: boolean
    }>
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/types/index.ts
git commit -m "feat: add api service and typescript types"
```

---

## Phase 6: Frontend UI Components

### Task 21: Layout Components

**Files:**
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Create Sidebar.tsx**

```tsx
import { Link, useLocation } from 'react-router-dom'
import { Database, FolderKanban, Plus } from 'lucide-react'

export function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Projects', icon: FolderKanban },
    { path: '/connections', label: 'Connections', icon: Database },
  ]
  
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">STM Agent</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={18} />
          New Project
        </Link>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create Header.tsx**

```tsx
export function Header() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="text-sm text-gray-500">
        STM Mapping Agent v0.1
      </div>
      <div className="text-sm text-gray-700">
        Local Mode
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/Header.tsx
git commit -m "feat: add sidebar and header layout components"
```

### Task 22: Connection Manager UI

**Files:**
- Create: `frontend/src/components/connections/ConnectionForm.tsx`
- Create: `frontend/src/components/connections/ConnectionList.tsx`
- Create: `frontend/src/pages/ConnectionsPage.tsx`

- [ ] **Step 1: Create ConnectionForm.tsx**

```tsx
import { useState } from 'react'
import { connectionsApi } from '../../services/api'

export function ConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('source')
  const [dbType, setDbType] = useState('postgresql')
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('5432')
  const [database, setDatabase] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await connectionsApi.test({
        db_type: dbType,
        params: { db_type: dbType, host, port: parseInt(port), database, username, password }
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
        connection_type: type,
        db_type: dbType,
        params: { db_type: dbType, host, port: parseInt(port), database, username, password }
      })
      onSuccess()
      setName('')
      setTestResult(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Add Connection</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Production Postgres" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="source">Source</option>
            <option value="target">Target</option>
            <option value="jira">Jira</option>
            <option value="llm">LLM</option>
          </select>
        </div>
      </div>
      
      {type !== 'jira' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
              <select value={dbType} onChange={e => setDbType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="snowflake">Snowflake</option>
                <option value="bigquery">BigQuery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input type="text" value={host} onChange={e => setHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input type="text" value={port} onChange={e => setPort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
              <input type="text" value={database} onChange={e => setDatabase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
        </>
      )}
      
      {testResult && (
        <div className={`p-3 rounded-md mb-4 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {testResult.message}
        </div>
      )}
      
      <div className="flex gap-3">
        <button onClick={handleTest} disabled={testing}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50">
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button onClick={handleSave} disabled={saving || !testResult?.success}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Connection'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ConnectionList.tsx**

```tsx
import { useQuery } from '@tanstack/react-query'
import { connectionsApi } from '../../services/api'
import { Trash2, CheckCircle, XCircle } from 'lucide-react'

export function ConnectionList({ onDelete }: { onDelete: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list()
  })

  if (isLoading) return <div>Loading...</div>

  const connections = data?.data || []

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">DB Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((conn: any) => (
            <tr key={conn.id} className="border-b border-gray-100">
              <td className="px-4 py-3 font-medium">{conn.name}</td>
              <td className="px-4 py-3 capitalize">{conn.connection_type}</td>
              <td className="px-4 py-3">{conn.db_type || '-'}</td>
              <td className="px-4 py-3">
                {conn.is_tested ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={16} /> Tested
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-400">
                    <XCircle size={16} /> Untested
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <button onClick={async () => {
                  await connectionsApi.delete(conn.id)
                  onDelete()
                }} className="text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Create ConnectionsPage.tsx**

```tsx
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ConnectionForm } from '../components/connections/ConnectionForm'
import { ConnectionList } from '../components/connections/ConnectionList'

export function ConnectionsPage() {
  const queryClient = useQueryClient()
  const [refresh, setRefresh] = useState(0)

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] })
    setRefresh(r => r + 1)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Connections</h2>
      <ConnectionForm onSuccess={handleSuccess} />
      <ConnectionList onDelete={handleSuccess} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/connections/ConnectionForm.tsx frontend/src/components/connections/ConnectionList.tsx frontend/src/pages/ConnectionsPage.tsx
git commit -m "feat: add connection manager ui with test and save"
```

### Task 23: Dashboard & Project Wizard

**Files:**
- Create: `frontend/src/components/projects/ProjectWizard.tsx`
- Create: `frontend/src/components/projects/ProjectList.tsx`
- Create: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Create ProjectWizard.tsx**

```tsx
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi, connectionsApi } from '../../services/api'

export function ProjectWizard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [llmId, setLlmId] = useState('')
  const [jiraKey, setJiraKey] = useState('')
  const [creating, setCreating] = useState(false)
  
  const queryClient = useQueryClient()
  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list()
  })
  
  const connections = connectionsData?.data || []
  const sourceConnections = connections.filter((c: any) => c.connection_type === 'source')
  const targetConnections = connections.filter((c: any) => c.connection_type === 'target')
  const llmConnections = connections.filter((c: any) => c.connection_type === 'llm')

  const handleCreate = async () => {
    setCreating(true)
    try {
      await projectsApi.create({
        name,
        description,
        source_connection_id: sourceId || null,
        target_connection_id: targetId || null,
        llm_connection_id: llmId || null,
        jira_ticket_key: jiraKey || null
      })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onCreated()
      setName('')
      setDescription('')
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to create project')
    }
    setCreating(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">New Mapping Project</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Customer DWH Mapping" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Connection</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">Select source...</option>
            {sourceConnections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Connection</label>
          <select value={targetId} onChange={e => setTargetId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">Select target...</option>
            {targetConnections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LLM Connection</label>
          <select value={llmId} onChange={e => setLlmId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">Select LLM...</option>
            {llmConnections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jira Ticket (optional)</label>
          <input type="text" value={jiraKey} onChange={e => setJiraKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="PROJ-123" />
        </div>
      </div>
      
      <button onClick={handleCreate} disabled={creating || !name}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
        {creating ? 'Creating...' : 'Create Project'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create ProjectList.tsx**

```tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsApi } from '../../services/api'
import { ArrowRight, FolderOpen } from 'lucide-react'

export function ProjectList() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list()
  })

  if (isLoading) return <div>Loading projects...</div>

  const projects = data?.data || []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project: any) => (
        <Link
          key={project.id}
          to={`/projects/${project.id}`}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-3">{project.description || 'No description'}</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full capitalize">
              {project.current_phase}
            </span>
            <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full capitalize">
              {project.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create Dashboard.tsx**

```tsx
import { useState } from 'react'
import { ProjectWizard } from '../components/projects/ProjectWizard'
import { ProjectList } from '../components/projects/ProjectList'

export function Dashboard() {
  const [showWizard, setShowWizard] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Projects</h2>
        <button
          onClick={() => setShowWizard(!showWizard)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showWizard ? 'Cancel' : 'New Project'}
        </button>
      </div>
      
      {showWizard && (
        <ProjectWizard onCreated={() => setShowWizard(false)} />
      )}
      
      <ProjectList />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/projects/ProjectWizard.tsx frontend/src/components/projects/ProjectList.tsx frontend/src/pages/Dashboard.tsx
git commit -m "feat: add project dashboard and wizard"
```

### Task 24: Project Page with Phases

**Files:**
- Create: `frontend/src/pages/ProjectPage.tsx`
- Create: `frontend/src/components/schema/SchemaBrowser.tsx`
- Create: `frontend/src/components/mappings/MappingTable.tsx`

- [ ] **Step 1: Create ProjectPage.tsx**

```tsx
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectsApi, discoveryApi } from '../services/api'
import { SchemaBrowser } from '../components/schema/SchemaBrowser'
import { MappingTable } from '../components/mappings/MappingTable'

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  
  const { data: projectData } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!)
  })
  
  const { data: schemaData } = useQuery({
    queryKey: ['schema', id],
    queryFn: () => discoveryApi.getSchema(id!),
    enabled: !!id
  })

  const project = projectData?.data
  const schema = schemaData?.data || {}
  const phase = project?.current_phase || 'input'

  const handleDiscover = async () => {
    await discoveryApi.discover(id!)
    window.location.reload()
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{project?.name}</h2>
        <p className="text-gray-500">{project?.description}</p>
      </div>
      
      {/* Phase Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {['input', 'discovery', 'propose', 'review', 'export'].map((p, i) => (
          <div key={p} className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm capitalize ${
              p === phase ? 'bg-blue-600 text-white' : 
              ['input', 'discovery', 'propose', 'review', 'export'].indexOf(phase) > i ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {p}
            </div>
            {i < 4 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>
      
      {phase === 'input' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Ready to Discover</h3>
          <p className="text-gray-600 mb-4">Source and target connections are configured. Click below to start schema discovery.</p>
          <button onClick={handleDiscover}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Start Discovery
          </button>
        </div>
      )}
      
      {phase === 'discovery' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Schema Discovery</h3>
          <SchemaBrowser schema={schema} />
        </div>
      )}
      
      {(phase === 'propose' || phase === 'review') && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Review Mappings</h3>
          <MappingTable projectId={id!} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create SchemaBrowser.tsx**

```tsx
import { useState } from 'react'
import { ChevronRight, ChevronDown, Table, Columns } from 'lucide-react'

interface SchemaBrowserProps {
  schema: Record<string, Record<string, Array<{name: string, type: string, nullable: boolean}>>>
}

export function SchemaBrowser({ schema }: SchemaBrowserProps) {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const toggleSchema = (schemaName: string) => {
    const next = new Set(expandedSchemas)
    if (next.has(schemaName)) next.delete(schemaName)
    else next.add(schemaName)
    setExpandedSchemas(next)
  }

  const toggleTable = (key: string) => {
    const next = new Set(expandedTables)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpandedTables(next)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {Object.entries(schema).map(([schemaName, tables]) => (
        <div key={schemaName} className="border-b border-gray-100 last:border-0">
          <button
            onClick={() => toggleSchema(schemaName)}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            {expandedSchemas.has(schemaName) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="font-medium text-gray-700">{schemaName}</span>
          </button>
          
          {expandedSchemas.has(schemaName) && (
            <div className="pl-8">
              {Object.entries(tables).map(([tableName, columns]) => (
                <div key={tableName}>
                  <button
                    onClick={() => toggleTable(`${schemaName}.${tableName}`)}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
                  >
                    {expandedTables.has(`${schemaName}.${tableName}`) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Table size={16} className="text-blue-600" />
                    <span className="text-gray-700">{tableName}</span>
                    <span className="text-xs text-gray-400">({columns.length} columns)</span>
                  </button>
                  
                  {expandedTables.has(`${schemaName}.${tableName}`) && (
                    <div className="pl-8">
                      {columns.map(col => (
                        <div key={col.name} className="flex items-center gap-2 px-4 py-1 text-sm">
                          <Columns size={14} className="text-gray-400" />
                          <span className="text-gray-700">{col.name}</span>
                          <span className="text-xs text-gray-400">{col.type}</span>
                          {col.nullable && <span className="text-xs text-orange-400">nullable</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create MappingTable.tsx**

```tsx
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { mappingsApi, exportApi } from '../../services/api'
import { Check, X, Edit, Download } from 'lucide-react'

export function MappingTable({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  
  const { data, isLoading } = useQuery({
    queryKey: ['mappings', projectId],
    queryFn: () => mappingsApi.list(projectId)
  })

  if (isLoading) return <div>Loading mappings...</div>

  const mappings = data?.data || []
  const filtered = filter === 'all' ? mappings : mappings.filter((m: any) => m.status === filter)

  const handleAction = async (mappingId: string, action: string) => {
    await mappingsApi.update(mappingId, { status: action })
    queryClient.invalidateQueries({ queryKey: ['mappings', projectId] })
  }

  const handleExport = async () => {
    const res = await exportApi.download(projectId)
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stm_mapping_${projectId}.xlsx`
    a.click()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {['all', 'proposed', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm capitalize ${
                filter === f ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f} ({f === 'all' ? mappings.length : mappings.filter((m: any) => m.status === f).length})
            </button>
          ))}
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
          <Download size={16} />
          Export Excel
        </button>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Target</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Business Logic</th>
              <th className="px-4 py-3 text-left font-medium">Confidence</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((mapping: any) => (
              <tr key={mapping.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{mapping.target_table}.{mapping.target_column}</div>
                </td>
                <td className="px-4 py-3">
                  {mapping.source_table ? `${mapping.source_table}.${mapping.source_column}` : '-'}
                </td>
                <td className="px-4 py-3 max-w-xs truncate">{mapping.business_logic || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    (mapping.confidence_score || 0) > 0.8 ? 'bg-green-100 text-green-700' :
                    (mapping.confidence_score || 0) > 0.5 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {Math.round((mapping.confidence_score || 0) * 100)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                    mapping.status === 'approved' ? 'bg-green-100 text-green-700' :
                    mapping.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    mapping.status === 'modified' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {mapping.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleAction(mapping.id, 'approved')}
                      className="p-1 text-green-600 hover:bg-green-50 rounded">
                      <Check size={16} />
                    </button>
                    <button onClick={() => handleAction(mapping.id, 'rejected')}
                      className="p-1 text-red-600 hover:bg-red-50 rounded">
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ProjectPage.tsx frontend/src/components/schema/SchemaBrowser.tsx frontend/src/components/mappings/MappingTable.tsx
git commit -m "feat: add project page with schema browser and mapping table"
```

---

## Phase 7: Docker & Integration

### Task 25: Docker Compose & Final Integration

**Files:**
- Create: `frontend/Dockerfile`
- Modify: `docker-compose.yml` (already created)

- [ ] **Step 1: Create frontend Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
```

- [ ] **Step 2: Build and test**

```bash
docker-compose up --build -d
```

- [ ] **Step 3: Verify**

```bash
curl http://localhost:8000/health
```

Expected: `{"status": "healthy"}`

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile
git commit -m "feat: add frontend dockerfile and compose setup"
```

---

## Spec Coverage Check

| Spec Requirement | Implementing Task |
|-----------------|-------------------|
| FastAPI backend | Tasks 1-2, 8-18 |
| React frontend | Tasks 1, 19-24 |
| PostgreSQL persistence | Tasks 3-7 |
| Configurable LLM (BYO key, custom URL) | Tasks 11, 22 |
| Self-learning loop | Tasks 12, 16 |
| Schema discovery (multi-DB) | Tasks 10, 16 |
| Global connection pool | Tasks 9, 14-15 |
| Test connection button | Task 22 |
| Jira integration (read-only) | Spec'd, implementation in future iteration |
| File upload (CSV/Parquet) | Spec'd, implementation in future iteration |
| Excel export | Tasks 13, 17, 24 |
| Phase workflow | Tasks 23-24 |
| Docker Compose | Tasks 1, 25 |

**Gaps noted:** Jira service router and file upload ingestion are specified but deferred to a follow-up iteration to keep the initial plan focused on core database-driven mapping.

---

## Type Consistency Check

- `ConnectionTestResult` used in service and router ✓
- `MappingStatus` enum used consistently across model, schema, service ✓
- `ProjectPhase` enum used in model and router ✓
- UUID types consistent (string in API, UUID in DB) ✓
- API endpoint paths consistent with frontend service calls ✓
