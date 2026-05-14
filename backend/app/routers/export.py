from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from io import BytesIO

from app.database import get_db
from app.models.project import Project
from app.services.export_service import ExportService

router = APIRouter(prefix="/projects", tags=["export"])


@router.post("/{project_id}/export")
async def generate_export(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    excel_bytes = await ExportService.generate_excel(project_id)
    return {"message": "Export generated", "size": len(excel_bytes)}


@router.get("/{project_id}/export")
async def download_export(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    excel_bytes = await ExportService.generate_excel(project_id)
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={project.name}_stm_mapping.xlsx"}
    )
