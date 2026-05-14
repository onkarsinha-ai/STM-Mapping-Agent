# STM Mapping Agent

A full-stack data mapping agent with FastAPI backend, React frontend, configurable LLM integration, self-learning loop, and Excel export.

## Architecture

FastAPI backend handles all business logic (DB connections, schema discovery, LLM orchestration, mapping engine, learning loop, export). React frontend provides chat-based input, schema browser, mapping review dashboard, and connection manager. PostgreSQL persists schema cache, mappings, and feedback for self-learning.

## Tech Stack

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0 async, Alembic, PostgreSQL, LiteLLM, Pandas, openpyxl
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, TanStack Table, TanStack Query, shadcn/ui

## Quick Start

```bash
docker-compose up --build -d
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs
