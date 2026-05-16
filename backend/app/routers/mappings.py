from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any

from app.database import get_db
from app.models.mapping import Mapping
from app.models.project import Project, ProjectPhase
from app.models.schema_cache import SchemaCache
from app.services.mapping_engine import MappingEngine
from app.services.llm_orchestrator import LLMOrchestrator
from app.services.connection_service import ConnectionService
from app.schemas.mapping import MappingUpdate, MappingResponse

router = APIRouter(prefix="/projects", tags=["mappings"])


@router.get("/{project_id}/mappings", response_model=List[MappingResponse])
async def list_mappings(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mapping).where(Mapping.project_id == project_id))
    return result.scalars().all()


@router.post("/{project_id}/propose")
async def propose_mappings(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate LLM connection is configured
    if not project.llm_connection_id:
        raise HTTPException(status_code=400, detail="LLM connection not configured")

    # Get LLM config
    try:
        llm_params = await ConnectionService.get_connection_string(str(project.llm_connection_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    llm_config = {
        "api_key": llm_params.get("api_key"),
        "model": llm_params.get("model", "gpt-4"),
        "base_url": llm_params.get("base_url"),
    }

    # Fetch cached schema entries for this project
    result = await db.execute(
        select(SchemaCache).where(SchemaCache.project_id == project_id)
    )
    entries = result.scalars().all()

    if not entries:
        raise HTTPException(status_code=400, detail="No schemas discovered yet")

    # Separate target vs source entries
    target_entries: List[SchemaCache] = []
    source_entries: List[SchemaCache] = []

    for entry in entries:
        is_target = False
        # Inline target: connection_id=None and schema_name="target"
        if entry.connection_id is None and entry.schema_name == "target":
            is_target = True
        # DB target: matches target_connection_id
        elif project.target_connection_id and str(entry.connection_id) == str(project.target_connection_id):
            is_target = True

        if is_target:
            target_entries.append(entry)
        else:
            source_entries.append(entry)

    def build_tree(schema_entries: List[SchemaCache]) -> Dict[str, Any]:
        tree: Dict[str, Any] = {}
        for entry in schema_entries:
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

    target_schema = build_tree(target_entries)
    source_schema = build_tree(source_entries)

    # Fallback: if target couldn't be separated, pass everything as both
    if not target_schema:
        target_schema = build_tree(entries)
    if not source_schema:
        source_schema = build_tree(entries)

    # Build Jira context if available
    jira_context = None
    if project.jira_ticket_key:
        jira_context = project.jira_ticket_key

    # Generate proposals via LLM
    try:
        await LLMOrchestrator.propose_mappings(
            project_id=str(project_id),
            target_schema=target_schema,
            source_schema=source_schema,
            llm_config=llm_config,
            jira_context=jira_context,
            user_text=project.user_text_input or ""
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM proposal failed: {str(e)}")

    # Advance phase
    project.current_phase = ProjectPhase.propose
    await db.commit()

    return {"message": "Mappings proposed successfully"}


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
