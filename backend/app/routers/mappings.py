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
