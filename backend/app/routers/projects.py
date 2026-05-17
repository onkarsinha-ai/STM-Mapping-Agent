from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from app.database import get_db
from app.models.project import Project, ProjectPhase
from app.models.mapping import Mapping
from app.models.schema_cache import SchemaCache
from app.models.jira_context import JiraContext
from app.schemas.project import ProjectCreate, ProjectResponse, TableSelectionUpdate

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
        jira_ticket_key=data.jira_ticket_key,
        source_schemas=data.source_schemas,
        target_schema=data.target_schema
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


from pydantic import BaseModel

class PhaseUpdate(BaseModel):
    phase: ProjectPhase

@router.put("/{project_id}/phase")
async def update_phase(project_id: str, data: PhaseUpdate, db: AsyncSession = Depends(get_db)):
    phase = data.phase
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.current_phase = phase
    await db.commit()
    return {"message": f"Phase updated to {phase.value}"}


@router.put("/{project_id}/table-selections")
async def update_table_selections(
    project_id: str,
    data: TableSelectionUpdate,
    db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate that source and target use the same connection
    same_db = (
        project.source_connection_id is not None
        and project.target_connection_id is not None
        and str(project.source_connection_id) == str(project.target_connection_id)
    )
    if not same_db:
        raise HTTPException(status_code=400, detail="Table selections only allowed when source and target share the same connection")

    # Validate at least one source and exactly one target
    if len(data.selected_target_tables) != 1:
        raise HTTPException(status_code=400, detail="Exactly one target table must be selected")
    if len(data.selected_source_tables) == 0:
        raise HTTPException(status_code=400, detail="At least one source table must be selected")

    project.selected_source_tables = data.selected_source_tables
    project.selected_target_tables = data.selected_target_tables
    await db.commit()
    return {"message": "Table selections updated"}


@router.get("/{project_id}/table-selections")
async def get_table_selections(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "selected_source_tables": project.selected_source_tables or [],
        "selected_target_tables": project.selected_target_tables or []
    }


@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.execute(delete(Mapping).where(Mapping.project_id == project_id))
    await db.execute(delete(SchemaCache).where(SchemaCache.project_id == project_id))
    await db.execute(delete(JiraContext).where(JiraContext.project_id == project_id))
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted"}
