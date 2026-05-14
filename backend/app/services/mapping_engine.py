from difflib import SequenceMatcher
from typing import Optional
from app.database import AsyncSessionLocal
from app.models.mapping import Mapping, MappingStatus
from app.models.mapping_feedback import MappingFeedback, UserAction


class MappingEngine:
    @staticmethod
    def calculate_confidence(target_col: str, source_col: str,
                            target_type: str, source_type: str,
                            llm_confidence: float) -> float:
        name_similarity = SequenceMatcher(None, target_col.lower(), source_col.lower()).ratio()
        type_match = 1.0 if target_type.lower() == source_type.lower() else 0.5

        score = (llm_confidence * 0.5 + name_similarity * 0.3 + type_match * 0.2)
        return round(min(score, 1.0), 2)

    @staticmethod
    async def update_mapping_status(mapping_id: str, action: str,
                                    modifications: Optional[dict] = None) -> Mapping:
        async with AsyncSessionLocal() as session:
            mapping = await session.get(Mapping, mapping_id)
            if not mapping:
                raise ValueError(f"Mapping {mapping_id} not found")

            original = {
                "source_table": mapping.source_table,
                "source_column": mapping.source_column,
                "business_logic": mapping.business_logic,
                "transformation_rule": mapping.transformation_rule
            }

            if action == "approve":
                mapping.status = MappingStatus.approved
                user_action = UserAction.approved
            elif action == "reject":
                mapping.status = MappingStatus.rejected
                user_action = UserAction.rejected
            elif action == "modify" and modifications:
                mapping.status = MappingStatus.modified
                user_action = UserAction.modified
                for key, value in modifications.items():
                    if hasattr(mapping, key):
                        setattr(mapping, key, value)
            else:
                user_action = UserAction(action) if action in ["approved", "rejected", "modified"] else UserAction.approved

            feedback = MappingFeedback(
                mapping_id=mapping_id,
                user_action=user_action,
                original_proposal=original,
                final_state={
                    "source_table": mapping.source_table,
                    "source_column": mapping.source_column,
                    "business_logic": mapping.business_logic,
                    "transformation_rule": mapping.transformation_rule
                }
            )
            session.add(feedback)
            await session.commit()
            await session.refresh(mapping)
            return mapping
