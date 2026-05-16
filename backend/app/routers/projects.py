from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from app.database import get_db
from app.models.project import Project, ProjectPhase
from app.models.mapping import Mapping
from app.models.schema_cache import SchemaCache
from app.models.jira_context import JiraContext
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


@router.put("/{project_id}/phase")
async def update_phase(project_id: str, phase: ProjectPhase, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.current_phase = phase
    await db.commit()
    return {"message": f"Phase updated to {phase}"}


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
