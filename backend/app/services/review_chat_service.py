import json
import logging
import re
from typing import List, Dict, Any, Optional, Tuple

import litellm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.encryption import decrypt
from app.models.review_chat import ReviewChatMessage, ChatRole
from app.models.mapping import Mapping
from app.models.project import Project
from app.models.connection import Connection
from app.services.llm_orchestrator import LLMOrchestrator
from app.services.mapping_engine import MappingEngine


class ReviewChatService:
    @staticmethod
    def _build_system_prompt(mappings: List[Dict[str, Any]]) -> str:
        if not mappings:
            mapping_text = "No mappings have been proposed yet."
        else:
            lines = []
            for m in mappings:
                lines.append(
                    f"- ID: {m['id']} | {m['target_table']}.{m['target_column']} <- "
                    f"{m.get('source_table', 'N/A')}.{m.get('source_column', 'N/A')} | "
                    f"logic: {m.get('business_logic', 'N/A')} | "
                    f"confidence: {m.get('confidence_score', 'N/A')} | "
                    f"status: {m.get('status', 'N/A')}"
                )
            mapping_text = "\n".join(lines)

        return f"""You are a mapping review assistant. You help users review and improve their data column mappings.

Here are all current mappings for this project:
{mapping_text}

You can:
1. Answer questions about why a mapping was proposed
2. Suggest better source columns or transformation logic
3. Directly update mappings when the user asks you to
4. Approve or reject mappings when the user asks you to

When making changes, respond naturally AND include a JSON action block at the end of your response.

To update mapping fields (source_table, source_column, business_logic, transformation_rule):
```json
{{"actions": [{{"mapping_id": "<uuid>", "updates": {{"source_column": "new_value", "business_logic": "new logic"}}}}]}}
```

To approve or reject a mapping:
```json
{{"actions": [{{"mapping_id": "<uuid>", "action": "approve"}}, {{"mapping_id": "<uuid>", "action": "reject"}}]}}
```

You can mix both types in the same actions array. Do not include the JSON block unless you actually made changes.
"""

    @staticmethod
    def _parse_actions_from_response(response: str) -> List[Dict[str, Any]]:
        # Look for JSON block in markdown code fences
        pattern = r'```json\s*\n?(.*?)\n?```'
        matches = re.findall(pattern, response, re.DOTALL)

        for match in matches:
            try:
                data = json.loads(match.strip())
                if isinstance(data, dict) and "actions" in data:
                    return data["actions"]
            except json.JSONDecodeError:
                continue

        # Fallback: look for raw JSON object with actions key
        pattern2 = r'\{\s*"actions"\s*:.*\}'
        match2 = re.search(pattern2, response, re.DOTALL)
        if match2:
            try:
                data = json.loads(match2.group())
                return data.get("actions", [])
            except json.JSONDecodeError:
                pass

        return []

    @staticmethod
    async def _apply_mapping_actions(actions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        applied = []
        for action in actions:
            mapping_id = action.get("mapping_id")
            if not mapping_id:
                continue

            # Handle status changes (approve / reject)
            status_action = action.get("action")
            if status_action in ("approve", "approved", "reject", "rejected"):
                normalized = "approved" if status_action in ("approve", "approved") else "rejected"
                try:
                    await MappingEngine.update_mapping_status(mapping_id, normalized)
                    applied.append({"mapping_id": mapping_id, "action": normalized})
                except Exception as e:
                    logging.warning(f"Failed to apply mapping status change for {mapping_id}: {e}")
                continue

            # Handle field updates
            updates = action.get("updates", {})
            if not updates:
                continue

            allowed = {"source_table", "source_column", "business_logic", "transformation_rule"}
            modifications = {k: v for k, v in updates.items() if k in allowed}
            if not modifications:
                continue

            try:
                await MappingEngine.update_mapping_fields(
                    mapping_id,
                    modifications
                )
                applied.append({"mapping_id": mapping_id, "updates": modifications})
            except Exception as e:
                logging.warning(f"Failed to apply mapping update for {mapping_id}: {e}")

        return applied

    @staticmethod
    async def send_message(
        project_id: str,
        user_message: str,
        db: AsyncSession
    ) -> Tuple[str, List[Dict[str, Any]]]:
        # Save user message
        user_msg = ReviewChatMessage(
            project_id=project_id,
            role=ChatRole.user,
            content=user_message
        )
        db.add(user_msg)
        await db.commit()

        # Fetch project for LLM config
        project = await db.get(Project, project_id)
        if not project:
            raise ValueError("Project not found")
        if not project.llm_connection_id:
            raise ValueError("LLM connection not configured")

        # Fetch LLM config
        conn = await db.get(Connection, str(project.llm_connection_id))
        if not conn:
            raise ValueError("LLM connection not found")

        params = json.loads(decrypt(conn.encrypted_connection_string))
        llm_config = {
            "api_key": params.get("api_key"),
            "model": params.get("model", "gpt-4"),
            "base_url": params.get("base_url"),
            "provider": conn.provider,
        }

        # Fetch all mappings for this project
        result = await db.execute(select(Mapping).where(Mapping.project_id == project_id))
        mappings = result.scalars().all()
        mapping_dicts = [
            {
                "id": str(m.id),
                "target_table": m.target_table,
                "target_column": m.target_column,
                "source_table": m.source_table,
                "source_column": m.source_column,
                "business_logic": m.business_logic,
                "confidence_score": float(m.confidence_score) if m.confidence_score else None,
                "status": m.status.value
            }
            for m in mappings
        ]

        # Build messages for LLM
        system_prompt = ReviewChatService._build_system_prompt(mapping_dicts)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]

        # Call LLM
        litellm_model = LLMOrchestrator._build_litellm_model(
            llm_config.get("provider"),
            llm_config.get("model"),
            llm_config.get("base_url")
        )

        response = await litellm.acompletion(
            model=litellm_model,
            messages=messages,
            api_key=llm_config.get("api_key"),
            api_base=llm_config.get("base_url"),
            max_tokens=2048
        )
        ai_text = response.choices[0].message.content

        # Parse and apply actions
        actions = ReviewChatService._parse_actions_from_response(ai_text)
        applied = await ReviewChatService._apply_mapping_actions(actions)

        # Save assistant message
        assistant_msg = ReviewChatMessage(
            project_id=project_id,
            role=ChatRole.assistant,
            content=ai_text,
            mapping_changes=applied if applied else None
        )
        db.add(assistant_msg)
        await db.commit()

        return ai_text, applied

    @staticmethod
    async def get_history(project_id: str, db: AsyncSession) -> List[ReviewChatMessage]:
        result = await db.execute(
            select(ReviewChatMessage)
            .where(ReviewChatMessage.project_id == project_id)
            .order_by(ReviewChatMessage.created_at)
        )
        return result.scalars().all()

    @staticmethod
    async def finish_review(project_id: str, db: AsyncSession) -> Project:
        project = await db.get(Project, project_id)
        if not project:
            raise ValueError("Project not found")
        project.review_chat_completed = "true"
        await db.commit()
        await db.refresh(project)
        return project
