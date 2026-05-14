from typing import List
from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.mapping_feedback import MappingFeedback, UserAction
from app.models.mapping import Mapping


class LearningService:
    @staticmethod
    async def get_relevant_feedback(user_id: str, target_table: str, target_column: str, limit: int = 10) -> List[dict]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(MappingFeedback, Mapping)
                .join(Mapping, MappingFeedback.mapping_id == Mapping.id)
                .where(
                    Mapping.target_table.ilike(f"%{target_table}%"),
                    MappingFeedback.user_action == UserAction.approved
                )
                .order_by(MappingFeedback.created_at.desc())
                .limit(limit)
            )

            feedback_list = []
            for fb, mapping in result:
                feedback_list.append({
                    "target_table": mapping.target_table,
                    "target_column": mapping.target_column,
                    "source_table": mapping.source_table,
                    "source_column": mapping.source_column,
                    "business_logic": mapping.business_logic,
                    "transformation_rule": mapping.transformation_rule
                })
            return feedback_list
