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
