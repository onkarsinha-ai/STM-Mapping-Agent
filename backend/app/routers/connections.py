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


@router.delete("/{connection_id}")
async def delete_connection(connection_id: str, db: AsyncSession = Depends(get_db)):
    conn = await db.get(Connection, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)
    await db.commit()
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
