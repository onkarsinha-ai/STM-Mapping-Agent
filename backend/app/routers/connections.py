import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.connection import Connection
from app.services.connection_service import ConnectionService
from app.schemas.connection import ConnectionCreate, ConnectionResponse, ConnectionTestRequest, ConnectionTestResponse
from app.core.encryption import decrypt
from pydantic import BaseModel

router = APIRouter(prefix="/connections", tags=["connections"])


@router.get("/", response_model=List[ConnectionResponse])
async def list_connections(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max number of items to return"),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Connection).offset(skip).limit(limit))
    connections = result.scalars().all()
    return connections


@router.post("/test", response_model=ConnectionTestResponse)
async def test_connection(request: ConnectionTestRequest):
    result = await ConnectionService.test_connection(
        request.connection_type,
        request.provider,
        request.params
    )
    return ConnectionTestResponse(success=result.success, message=result.message)


@router.post("/", response_model=ConnectionResponse)
async def create_connection(data: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    # For MVP, use a hardcoded user_id
    user_id = "00000000-0000-0000-0000-000000000001"
    conn = await ConnectionService.create_connection(
        user_id=user_id,
        name=data.name,
        connection_type=data.connection_type,
        db_type=data.db_type,
        provider=data.provider,
        params=data.params
    )
    return conn


@router.post("/{connection_id}/test", response_model=ConnectionTestResponse)
async def test_saved_connection(connection_id: str, db: AsyncSession = Depends(get_db)):
    conn = await db.get(Connection, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    params = json.loads(decrypt(conn.encrypted_connection_string))
    result = await ConnectionService.test_connection(
        conn.connection_type.value,
        conn.provider,
        params
    )
    return ConnectionTestResponse(success=result.success, message=result.message)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


@router.post("/{connection_id}/chat", response_model=ChatResponse)
async def chat_with_connection(connection_id: str, request: ChatRequest, db: AsyncSession = Depends(get_db)):
    conn = await db.get(Connection, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    if conn.connection_type.value != "llm":
        raise HTTPException(status_code=400, detail="Connection is not an LLM")

    params = json.loads(decrypt(conn.encrypted_connection_string))
    api_key = params.get("api_key")
    model = params.get("model", "gpt-4")
    base_url = params.get("base_url")
    provider = conn.provider

    from app.services.llm_orchestrator import LLMOrchestrator
    litellm_model = LLMOrchestrator._build_litellm_model(provider, model, base_url)

    import litellm
    try:
        response = await litellm.acompletion(
            model=litellm_model,
            messages=[{"role": "user", "content": request.message}],
            api_key=api_key,
            api_base=base_url,
            max_tokens=1024
        )
        content = response.choices[0].message.content
        return ChatResponse(response=content)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM chat failed: {str(e)}")


@router.put("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(connection_id: str, data: ConnectionCreate, db: AsyncSession = Depends(get_db)):
    from app.core.encryption import encrypt, decrypt
    from datetime import datetime

    conn = await db.get(Connection, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Merge new params with existing ones, preserving sensitive fields if not provided
    existing_params = json.loads(decrypt(conn.encrypted_connection_string))
    merged_params = {**existing_params, **data.params}
    for key in ['password', 'api_key', 'token']:
        if key in data.params and not data.params[key] and key in existing_params:
            merged_params[key] = existing_params[key]

    encrypted = encrypt(json.dumps(merged_params))
    metadata = {k: v for k, v in merged_params.items() if k not in ['password', 'api_key', 'token']}

    conn.name = data.name
    conn.connection_type = data.connection_type
    conn.db_type = data.db_type
    conn.provider = data.provider
    conn.encrypted_connection_string = encrypted
    conn.connection_metadata = metadata
    conn.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(conn)
    return conn


@router.delete("/{connection_id}")
async def delete_connection(connection_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError

    conn = await db.get(Connection, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Cannot delete connection: it is still in use by one or more projects"
        )
    return {"message": "Connection deleted"}


def _oauth_response_html(message: dict) -> str:
    """Build HTML that safely postMessages a JSON object to the parent window."""
    payload = json.dumps(message)
    return f"""<!DOCTYPE html>
<html>
<body>
<script>
    window.opener.postMessage({payload}, '*');
    window.close();
</script>
</body>
</html>"""


@router.get("/jira/callback")
async def jira_oauth_callback(code: str, state: str):
    """Handle Jira Cloud OAuth 2.0 callback."""
    import httpx

    try:
        import base64
        state_data = json.loads(base64.b64decode(state).decode())
        client_id = state_data.get("client_id")
        client_secret = state_data.get("client_secret")
        redirect_uri = state_data.get("redirect_uri", "http://localhost:8000/connections/jira/callback")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://auth.atlassian.com/oauth/token",
                json={
                    "grant_type": "authorization_code",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri
                }
            )

            if response.status_code == 200:
                token_data = response.json()
                return HTMLResponse(content=_oauth_response_html({
                    "type": "jira_oauth_success",
                    "access_token": token_data.get("access_token"),
                    "refresh_token": token_data.get("refresh_token")
                }))
            else:
                return HTMLResponse(content=_oauth_response_html({
                    "type": "jira_oauth_error",
                    "error": f"Token exchange failed: {response.text}"
                }))
    except Exception as e:
        return HTMLResponse(content=_oauth_response_html({
            "type": "jira_oauth_error",
            "error": f"Callback error: {str(e)}"
        }))
