from typing import List, Dict, Any
from pydantic import BaseModel


class ExtractSchemaResponse(BaseModel):
    source_name: str
    columns: List[Dict[str, Any]]
