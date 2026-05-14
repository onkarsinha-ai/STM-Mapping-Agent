# LLM Provider Connection Parameters Research

This document catalogs the connection parameters required for LLM providers when using LiteLLM for unified API access.

---

## OpenAI

### Required Fields
- **API Key** — OpenAI API key from https://platform.openai.com/api-keys
- **Model** — Model identifier, e.g. `gpt-4o`, `gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo`

### Optional Fields
- **Base URL** — Custom base URL for OpenAI-compatible proxies or reverse proxies (default: `https://api.openai.com/v1`)
- **Organization ID** — OpenAI organization ID for multi-org accounts

### Notes
- Most common setup. The `api_key` is the only real requirement.
- LiteLLM uses the `openai/` prefix for model names, but this is optional in the call.

---

## Anthropic (Claude)

### Required Fields
- **API Key** — Anthropic API key from https://console.anthropic.com/
- **Model** — Model identifier, e.g. `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`

### Optional Fields
- **Base URL** — Custom base URL (default: `https://api.anthropic.com`)

### Notes
- Anthropic models support long context windows (200K tokens).
- LiteLLM handles the `anthropic/` prefix automatically.

---

## Azure OpenAI

### Required Fields
- **API Key** — Azure OpenAI API key
- **API Base** — Azure endpoint, e.g. `https://<your-resource>.openai.azure.com/`
- **API Version** — Azure API version, e.g. `2024-02-01`
- **Deployment Name** — The deployment name you gave your model in Azure (this is the `model` parameter in LiteLLM)

### Optional Fields
- None significant for basic usage

### Notes
- In LiteLLM, the `model` parameter for Azure is the deployment name, not the OpenAI model name.
- LiteLLM uses `azure/` prefix to route to Azure.

---

## Local / Self-Hosted (OpenAI-Compatible Server)

### Required Fields
- **Base URL** — URL of the local server, e.g. `http://localhost:8000/v1` (vLLM) or `http://localhost:8080/v1` (TGI)
- **Model** — Model name as exposed by the local server

### Optional Fields
- **API Key** — Often optional for local servers (can be a dummy value like `not-needed`)

### Common Local Servers
- **vLLM** — `http://localhost:8000/v1`
- **Text Generation Inference (TGI)** — `http://localhost:8080/v1`
- **llama.cpp server** — `http://localhost:8080/v1`

---

## Ollama

### Required Fields
- **Base URL** — Ollama server URL (default: `http://localhost:11434`)
- **Model** — Model name as known to Ollama, e.g. `llama3`, `mistral`, `codellama`

### Optional Fields
- None significant

### Notes
- LiteLLM uses `ollama/` prefix for routing.
- Ollama runs models locally; no API key needed.

---

## Groq

### Required Fields
- **API Key** — Groq API key from https://console.groq.com/
- **Model** — Model identifier, e.g. `llama3-70b-8192`, `mixtral-8x7b-32768`

### Optional Fields
- None significant

### Notes
- Very fast inference, good for high-throughput use cases.
- LiteLLM uses `groq/` prefix.

---

## Cohere

### Required Fields
- **API Key** — Cohere API key
- **Model** — Model identifier, e.g. `command-r`, `command-r-plus`

### Optional Fields
- None significant

---

## Summary Table: Required Fields by Provider

| Provider         | API Key | Base URL | Model | Extra Fields                  |
|------------------|---------|----------|-------|-------------------------------|
| OpenAI           | Yes     | Optional | Yes   | Organization ID (optional)    |
| Anthropic        | Yes     | Optional | Yes   | —                             |
| Azure OpenAI     | Yes     | Yes      | Yes*  | API Version (yes)             |
| Local / vLLM     | Optional| Yes      | Yes   | —                             |
| Ollama           | No      | Yes      | Yes   | —                             |
| Groq             | Yes     | No       | Yes   | —                             |
| Cohere           | Yes     | No       | Yes   | —                             |

*For Azure, the "model" is actually the deployment name.

---

## Notes for UI Design

1. **Provider Selector First**: The user should pick a provider first, then the form adapts to show only relevant fields.
2. **Model Dropdown**: Each provider should have a curated list of common models in a dropdown, with an "Other / Custom" option.
3. **Base URL Defaults**: Pre-fill base URL with the provider's default; only show the field if "Custom endpoint" is enabled.
4. **API Key Security**: API keys must be encrypted at rest. Never log them.
5. **Test Connection**: A "Test" button that sends a minimal completion request (e.g., "Say 'ok'") to validate the config.
6. **LiteLLM Routing**: The backend stores `provider`, `model`, `api_key`, `base_url`, and `api_version` and passes them to `litellm.acompletion()`.
