import json
from typing import List, Dict, Any, Optional
import litellm
from app.database import AsyncSessionLocal
from app.models.mapping import Mapping, MappingStatus


class LLMOrchestrator:
    @staticmethod
    def build_prompt(target_schema: Dict, source_schema: Dict,
                     jira_context: Optional[str], user_text: str,
                     historical_feedback: List[Dict]) -> str:
        prompt = f"""You are a data mapping expert. Given a target schema and one or more source schemas, propose column mappings.

## Target Schema
{json.dumps(target_schema, indent=2)}

## Source Schemas
Top-level keys in the source schema are source names (e.g., filenames or database schemas).
{json.dumps(source_schema, indent=2)}

## Context
"""
        if jira_context:
            prompt += f"- Jira Ticket: {jira_context}\n"
        if user_text:
            prompt += f"- User Description: {user_text}\n"

        if historical_feedback:
            prompt += "\n## Past Successful Mappings\n"
            for fb in historical_feedback[:5]:
                prompt += f"- {json.dumps(fb)}\n"

        prompt += """
## Instructions
For each target column, propose the best source column. Include:
- source_table, source_column (use the source name as prefix if needed, e.g., "customers.csv.users.first_name")
- business_logic: why this maps
- transformation_rule: any SQL/transform needed
- confidence_score: 0.0-1.0

Output as JSON array with this structure:
[
  {
    "target_table": "...",
    "target_column": "...",
    "source_table": "...",
    "source_column": "...",
    "business_logic": "...",
    "transformation_rule": "...",
    "confidence_score": 0.95,
    "reasoning": "..."
  }
]
"""
        return prompt

    @staticmethod
    def _build_litellm_model(provider: Optional[str], model: str, base_url: Optional[str]) -> str:
        """Build LiteLLM model string with provider prefix."""
        if provider == "azure":
            return f"azure/{model}"
        elif provider == "ollama":
            return f"ollama/{model}"
        elif provider == "groq":
            return f"groq/{model}"
        elif provider == "cohere":
            return f"cohere/{model}"
        elif provider == "gemini":
            return f"gemini/{model}"
        elif provider == "kimi":
            if base_url:
                return f"openai/{model}"
            return f"moonshot/{model}"
        return model

    @staticmethod
    async def propose_mappings(project_id: str, target_schema: Dict, source_schema: Dict,
                               llm_config: Dict, jira_context: Optional[str] = None,
                               user_text: str = "", historical_feedback: List[Dict] = []) -> List[Mapping]:
        prompt = LLMOrchestrator.build_prompt(target_schema, source_schema, jira_context, user_text, historical_feedback)

        api_key = llm_config.get("api_key")
        model = llm_config.get("model", "gpt-4")
        base_url = llm_config.get("base_url")
        provider = llm_config.get("provider")

        litellm_model = LLMOrchestrator._build_litellm_model(provider, model, base_url)

        response = await litellm.acompletion(
            model=litellm_model,
            messages=[{"role": "user", "content": prompt}],
            api_key=api_key,
            api_base=base_url,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        proposals = json.loads(content)
        if isinstance(proposals, dict):
            proposals = proposals.get("mappings", [])

        mappings = []
        for prop in proposals:
            mapping = Mapping(
                project_id=project_id,
                target_table=prop.get("target_table", ""),
                target_column=prop.get("target_column", ""),
                source_table=prop.get("source_table"),
                source_column=prop.get("source_column"),
                business_logic=prop.get("business_logic"),
                transformation_rule=prop.get("transformation_rule"),
                confidence_score=prop.get("confidence_score", 0.5),
                llm_reasoning=prop.get("reasoning"),
                status=MappingStatus.proposed
            )
            mappings.append(mapping)

        async with AsyncSessionLocal() as session:
            for mapping in mappings:
                session.add(mapping)
            await session.commit()

        return mappings
