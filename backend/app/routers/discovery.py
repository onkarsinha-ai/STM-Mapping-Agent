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
