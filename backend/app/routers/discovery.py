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

    has_db_source = project.source_connection_id is not None
    has_inline_source = project.source_schemas is not None and len(project.source_schemas) > 0
    if not has_db_source and not has_inline_source:
        raise HTTPException(status_code=400, detail="Source not set")

    has_db_target = project.target_connection_id is not None
    has_inline_target = project.target_schema is not None
    if not has_db_target and not has_inline_target:
        raise HTTPException(status_code=400, detail="Target not set")

    await SchemaDiscoveryService.clear_project_cache(project_id)

    # Determine if source and target are the same database connection
    same_db_connection = (
        has_db_source and has_db_target
        and str(project.source_connection_id) == str(project.target_connection_id)
    )

    if has_inline_source:
        for schema_data in project.source_schemas:
            await SchemaDiscoveryService.insert_inline_schema(project_id, schema_data, is_target=False)

    if has_db_source:
        params = await ConnectionService.get_connection_string(str(project.source_connection_id))
        if same_db_connection:
            # When source and target share a connection, discover once without tagging.
            # Table selection (source vs target) will be done by the user post-discovery.
            await SchemaDiscoveryService.discover_schema(
                str(project.source_connection_id),
                project_id,
                params,
                is_target=None  # type: ignore[arg-type]
            )
        else:
            await SchemaDiscoveryService.discover_schema(
                str(project.source_connection_id),
                project_id,
                params,
                is_target=False
            )

    if has_inline_target:
        await SchemaDiscoveryService.insert_inline_schema(project_id, project.target_schema, is_target=True)

    if has_db_target and not same_db_connection:
        params = await ConnectionService.get_connection_string(str(project.target_connection_id))
        await SchemaDiscoveryService.discover_schema(
            str(project.target_connection_id),
            project_id,
            params,
            is_target=True
        )

    project.current_phase = "discovery"
    await db.commit()

    return {"message": "Schema discovery completed"}


@router.get("/{project_id}/schema")
async def get_schema(project_id: str):
    schema = await SchemaDiscoveryService.get_cached_schema(project_id)
    return schema
