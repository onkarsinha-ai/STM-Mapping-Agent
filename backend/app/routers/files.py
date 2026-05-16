import io

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.schema_extractor import SchemaExtractor, SchemaExtractionError
from app.schemas.file import ExtractSchemaResponse

router = APIRouter(prefix="/files", tags=["files"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/extract-schema", response_model=ExtractSchemaResponse)
async def extract_schema(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10MB limit")

    extractor = SchemaExtractor()
    try:
        result = extractor.extract(io.BytesIO(content), file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except SchemaExtractionError as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {str(e)}")

    if not result.get("columns"):
        raise HTTPException(status_code=422, detail="No columns found in file")

    return result
