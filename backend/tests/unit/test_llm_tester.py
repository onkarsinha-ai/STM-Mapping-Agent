import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.testers.llm_tester import LLMTester


@pytest.mark.asyncio
async def test_test_openai():
    with patch('app.services.testers.llm_tester.litellm') as mock_litellm:
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "ok"
        mock_litellm.acompletion = AsyncMock(return_value=mock_response)

        result = await LLMTester.test("openai", {
            "api_key": "sk-test",
            "model": "gpt-4o",
            "base_url": "https://api.openai.com/v1"
        })
        assert result.success is True

        mock_litellm.acompletion.assert_awaited_once()
        call_kwargs = mock_litellm.acompletion.await_args.kwargs
        assert call_kwargs["model"] == "gpt-4o"
        assert call_kwargs["api_key"] == "sk-test"
        assert call_kwargs["api_base"] == "https://api.openai.com/v1"


@pytest.mark.asyncio
async def test_test_ollama():
    with patch('app.services.testers.llm_tester.litellm') as mock_litellm:
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "ok"
        mock_litellm.acompletion = AsyncMock(return_value=mock_response)

        result = await LLMTester.test("ollama", {
            "base_url": "http://localhost:11434",
            "model": "llama3"
        })
        assert result.success is True

        mock_litellm.acompletion.assert_awaited_once()
        call_kwargs = mock_litellm.acompletion.await_args.kwargs
        assert call_kwargs["model"] == "ollama/llama3"
        assert call_kwargs["api_base"] == "http://localhost:11434"
        assert "api_key" not in call_kwargs


@pytest.mark.asyncio
async def test_test_kimi_prefix():
    with patch('app.services.testers.llm_tester.litellm') as mock_litellm:
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "ok"
        mock_litellm.acompletion = AsyncMock(return_value=mock_response)

        result = await LLMTester.test("kimi", {
            "api_key": "sk-test",
            "model": "kimi-k2",
        })
        assert result.success is True

        call_kwargs = mock_litellm.acompletion.await_args.kwargs
        assert call_kwargs["model"] == "openai/kimi-k2"


@pytest.mark.asyncio
async def test_test_failure():
    with patch('app.services.testers.llm_tester.litellm') as mock_litellm:
        mock_litellm.acompletion = AsyncMock(side_effect=Exception("Auth failed"))

        result = await LLMTester.test("openai", {
            "api_key": "bad-key",
            "model": "gpt-4o",
        })
        assert result.success is False
        assert "Auth failed" in result.message
