# STM Mapping Agent — Project Guide

## Tech Stack
- **Backend:** FastAPI, SQLAlchemy (async), Alembic, PostgreSQL (via Docker)
- **Frontend:** React + Vite
- **Infra:** Docker Compose (backend, frontend, postgres)
- **LLM:** LiteLLM with multiple provider support (OpenAI, Gemini, etc.)

## Docker Workflow

### Installing New Python Packages
**NEVER** run `pip install` inside a running container. Changes are lost on restart.

Instead:
1. Add the package to `backend/requirements.txt` with a pinned version
2. Rebuild the backend image:
   ```bash
   docker-compose down
   docker-compose up --build -d
   ```

### Ensuring Packages Are Available After Restart
Docker Compose **does not auto-rebuild** on `up` unless you use `--build`.

**Always use this command after any requirements.txt change or computer restart:**
```bash
docker-compose up --build -d
```

To make this the default, create a startup script or alias.

### Checking If Backend Is Running Correctly
```bash
docker-compose logs -f backend
```

## Common Commands

```bash
# Start everything (rebuilds if needed)
docker-compose up --build -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Run backend tests
docker-compose exec backend pytest

# Database migrations
docker-compose exec backend alembic revision --autogenerate -m "message"
docker-compose exec backend alembic upgrade head

# Stop everything
docker-compose down
```

## Project Structure
- `backend/app/` — FastAPI app (routers, models, services, schemas)
- `backend/tests/` — Pytest test suite
- `frontend/src/` — React frontend
- `docker-compose.yml` — Orchestrates postgres + backend + frontend

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
