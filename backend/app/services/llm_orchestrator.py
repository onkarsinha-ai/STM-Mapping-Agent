import json
import logging
from typing import List, Dict, Any, Optional
import litellm
from app.database import AsyncSessionLocal
from app.models.mapping import Mapping, MappingStatus

logger = logging.getLogger(__name__)


class LLMOrchestrator:
    @staticmethod
    def build_prompt(target_schema: Dict, source_schema: Dict,
                     jira_context: Optional[str], user_text: str,
                     historical_feedback: List[Dict]) -> str:
        prompt = f"""You are a senior data engineer specializing in schema mapping. Your task is to propose precise column-level mappings from source schemas to a target schema.

## Target Schema (ONLY map to these tables/columns)
{json.dumps(target_schema, indent=2)}

## Source Schemas (ONLY use these tables/columns as sources)
Top-level keys are database schema names.
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
## CRITICAL RULES — YOU MUST FOLLOW THESE
1. ONLY generate mappings for target tables and columns explicitly listed in the Target Schema above.
2. ONLY use source tables and columns explicitly listed in the Source Schema above.
3. If a target column has no logical source, set source_table=null and source_column=null.
4. Do NOT invent tables, columns, or data types that are not present in the schemas.
5. Every target column MUST appear in the output exactly once.

## Mapping Scenario Examples

### Direct Column Mapping
Target: customers.email
Source: users.email_address
Logic: Email addresses were renamed in the target system.
Transformation: None
Confidence: 0.95

### Multi-Source / Join Mapping
Target: users.full_name
Source: users.first_name, users.last_name
Logic: Target stores full name; source stores first and last separately.
Transformation: CONCAT(first_name, ' ', last_name)
Confidence: 0.90

### Aggregation Mapping
Target: orders.monthly_total
Source: order_lines.amount
Logic: Target aggregates order lines to monthly totals.
Transformation: SUM(amount) GROUP BY order_id, DATE_TRUNC('month', created_at)
Confidence: 0.80

### Derived Column / CASE Mapping
Target: orders.status
Source: orders.deleted_at
Logic: Target uses enum status; source uses soft-delete timestamp.
Transformation: CASE WHEN deleted_at IS NULL THEN 'active' ELSE 'cancelled' END
Confidence: 0.75

### No Mapping (Generated / Surrogate Key)
Target: orders.id
Source: null
Logic: Target uses auto-increment primary key not present in source.
Transformation: null
Confidence: 1.00

## Confidence Scoring Rubric
- 0.90–1.00: Exact name match + same data type
- 0.70–0.89: Fuzzy name match or compatible type (e.g., VARCHAR → TEXT)
- 0.50–0.69: Inferred semantic match or requires transformation
- < 0.50: Uncertain; only use if no better option exists

## Output Format
Return a JSON array with one object per TARGET COLUMN. Structure:
[
  {
    "target_table": "schema.table",
    "target_column": "column_name",
    "source_table": "schema.table or null",
    "source_column": "column_name or null",
    "business_logic": "Why this mapping makes sense",
    "transformation_rule": "SQL expression or null",
    "confidence_score": 0.95,
    "reasoning": "Brief explanation of the match logic"
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
    def _is_valid_target(target_table: str, target_column: str, target_schema: Dict) -> bool:
        """Check if target table/column exists in the filtered target schema."""
        for schema_name, tables in target_schema.items():
            for table_name, columns in tables.items():
                full_name = f"{schema_name}.{table_name}"
                if target_table in (full_name, table_name):
                    for col in columns:
                        if col.get("name") == target_column:
                            return True
        return False

    @staticmethod
    def _is_valid_source(source_table: str, source_column: str, source_schema: Dict) -> bool:
        """Check if source table/column exists in the filtered source schema."""
        if not source_table or not source_column:
            return False
        for schema_name, tables in source_schema.items():
            for table_name, columns in tables.items():
                full_name = f"{schema_name}.{table_name}"
                if source_table in (full_name, table_name):
                    for col in columns:
                        if col.get("name") == source_column:
                            return True
        return False

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

        valid_proposals = []
        for prop in proposals:
            target_table = prop.get("target_table", "")
            target_column = prop.get("target_column", "")
            source_table = prop.get("source_table")
            source_column = prop.get("source_column")

            # Validate target exists in filtered schema
            if not LLMOrchestrator._is_valid_target(target_table, target_column, target_schema):
                logger.warning("Dropping invalid target mapping: %s.%s", target_table, target_column)
                continue

            # Validate source exists in filtered schema (unless null for no-mapping case)
            if source_table is not None and not LLMOrchestrator._is_valid_source(source_table, source_column, source_schema):
                logger.warning("Dropping invalid source mapping: %s.%s → %s.%s",
                               source_table, source_column, target_table, target_column)
                continue

            # Cap confidence at 1.0
            confidence = min(prop.get("confidence_score", 0.5), 1.0)

            valid_proposals.append({
                "target_table": target_table,
                "target_column": target_column,
                "source_table": source_table,
                "source_column": source_column,
                "business_logic": prop.get("business_logic"),
                "transformation_rule": prop.get("transformation_rule"),
                "confidence_score": confidence,
                "reasoning": prop.get("reasoning"),
            })

        logger.info("Validated %d proposals out of %d LLM outputs",
                    len(valid_proposals), len(proposals))

        mappings = []
        for prop in valid_proposals:
            mapping = Mapping(
                project_id=project_id,
                target_table=prop["target_table"],
                target_column=prop["target_column"],
                source_table=prop["source_table"],
                source_column=prop["source_column"],
                business_logic=prop["business_logic"],
                transformation_rule=prop["transformation_rule"],
                confidence_score=prop["confidence_score"],
                llm_reasoning=prop["reasoning"],
                status=MappingStatus.proposed
            )
            mappings.append(mapping)

        async with AsyncSessionLocal() as session:
            for mapping in mappings:
                session.add(mapping)
            await session.commit()

        return mappings
