from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import auth, connections, projects, discovery, mappings, export
from app.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def init_default_user():
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email == "admin@local.dev"))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                id="00000000-0000-0000-0000-000000000001",
                email="admin@local.dev",
                hashed_password=get_password_hash("admin")
            )
            session.add(user)
            await session.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_default_user()
    yield

app = FastAPI(title="STM Mapping Agent", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
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
