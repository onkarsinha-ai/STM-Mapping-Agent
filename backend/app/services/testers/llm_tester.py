from typing import Dict, Any
import litellm
from dataclasses import dataclass


@dataclass
class ConnectionTestResult:
    success: bool
    message: str


class LLMTester:
    @staticmethod
    async def test(provider: str, params: Dict[str, Any]) -> ConnectionTestResult:
        try:
            model = params.get("model", "")
            api_key = params.get("api_key", "")
            base_url = params.get("base_url")
            api_version = params.get("api_version")

            # Build LiteLLM model string
            if provider == "azure":
                litellm_model = f"azure/{model}"
            elif provider == "ollama":
                litellm_model = f"ollama/{model}"
            elif provider == "groq":
                litellm_model = f"groq/{model}"
            elif provider == "cohere":
                litellm_model = f"cohere/{model}"
            elif provider == "kimi":
                litellm_model = f"openai/{model}"
            else:
                litellm_model = model

            completion_params = {
                "model": litellm_model,
                "messages": [{"role": "user", "content": "Say 'ok'"}],
                "max_tokens": 5
            }

            if api_key:
                completion_params["api_key"] = api_key
            if base_url:
                completion_params["api_base"] = base_url
            if api_version:
                completion_params["api_version"] = api_version

            response = await litellm.acompletion(**completion_params)
            content = response.choices[0].message.content

            return ConnectionTestResult(True, f"LLM connection successful. Response: {content.strip()}")
        except Exception as e:
            return ConnectionTestResult(False, f"LLM test failed: {str(e)}")
