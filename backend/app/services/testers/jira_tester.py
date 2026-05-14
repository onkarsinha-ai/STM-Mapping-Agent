from typing import Dict, Any
import httpx
from dataclasses import dataclass


@dataclass
class ConnectionTestResult:
    success: bool
    message: str


class JiraTester:
    @staticmethod
    async def test(instance_type: str, params: Dict[str, Any]) -> ConnectionTestResult:
        try:
            base_url = params.get("base_url", "").rstrip("/")
            auth_method = params.get("auth_method", "basic")

            if not base_url:
                return ConnectionTestResult(False, "Base URL is required")

            headers = {"Accept": "application/json"}
            auth = None

            if auth_method == "basic":
                if instance_type == "jira_cloud":
                    email = params.get("email", "")
                    api_token = params.get("api_token", "")
                    auth = (email, api_token)
                else:
                    username = params.get("username", "")
                    password = params.get("password", "")
                    auth = (username, password)
            elif auth_method == "pat":
                token = params.get("token", "")
                headers["Authorization"] = f"Bearer {token}"
            elif auth_method == "oauth2":
                access_token = params.get("access_token", "")
                headers["Authorization"] = f"Bearer {access_token}"
            elif auth_method == "oauth1":
                return ConnectionTestResult(True, "OAuth 1.0a configuration accepted (test on use)")

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{base_url}/rest/api/2/myself",
                    headers=headers,
                    auth=auth,
                    timeout=30.0
                )

                if response.status_code == 200:
                    data = response.json()
                    name = data.get("displayName", "Unknown")
                    return ConnectionTestResult(True, f"Jira connection successful. Logged in as: {name}")
                elif response.status_code == 401:
                    return ConnectionTestResult(False, "Authentication failed. Check your credentials.")
                elif response.status_code == 403:
                    return ConnectionTestResult(False, "Permission denied. Ensure you have read access.")
                else:
                    return ConnectionTestResult(False, f"Jira returned status {response.status_code}")

        except httpx.ConnectError:
            return ConnectionTestResult(False, "Cannot reach Jira instance. Check the base URL.")
        except Exception as e:
            return ConnectionTestResult(False, f"Jira test failed: {str(e)}")
