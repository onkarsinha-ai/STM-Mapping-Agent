from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text, delete
from app.database import AsyncSessionLocal
from app.models.schema_cache import SchemaCache, ObjectType

class SchemaDiscoveryService:
    @staticmethod
    async def discover_schema(connection_id: str, project_id: str, params: Dict[str, Any], is_target: bool = False) -> List[SchemaCache]:
        db_type = params.get("db_type")

        if db_type == "postgresql":
            url = f"postgresql+asyncpg://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
            query = """
                SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name, ordinal_position
            """
        elif db_type == "mysql":
            url = f"mysql+aiomysql://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
            query = """
                SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                ORDER BY table_name, ordinal_position
            """
        else:
            raise ValueError(f"Unsupported database type: {db_type}")

        engine = create_async_engine(url, echo=False)
        entries = []

        try:
            async with engine.connect() as conn:
                result = await conn.execute(text(query))
                rows = result.mappings().all()

                for row in rows:
                    entry = SchemaCache(
                        connection_id=connection_id,
                        project_id=project_id,
                        object_type=ObjectType.column,
                        schema_name=row["table_schema"],
                        table_name=row["table_name"],
                        column_name=row["column_name"],
                        data_type=row["data_type"],
                        is_nullable=row["is_nullable"] == "YES",
                        column_default=str(row["column_default"]) if row["column_default"] else None,
                        is_target=is_target
                    )
                    entries.append(entry)

            async with AsyncSessionLocal() as session:
                for entry in entries:
                    session.add(entry)
                await session.commit()
        finally:
            await engine.dispose()

        return entries

    @staticmethod
    async def get_cached_schema(project_id: str) -> Dict[str, Any]:
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            result = await session.execute(
                select(SchemaCache).where(SchemaCache.project_id == project_id)
            )
            entries = result.scalars().all()

            tree = {}
            seen = set()
            for entry in entries:
                schema = entry.schema_name or "default"
                table = entry.table_name or "unknown"
                col_name = entry.column_name or "unknown"
                key = (schema, table, col_name)

                if schema not in tree:
                    tree[schema] = {}
                if table not in tree[schema]:
                    tree[schema][table] = []

                if key not in seen:
                    seen.add(key)
                    tree[schema][table].append({
                        "name": entry.column_name,
                        "type": entry.data_type,
                        "nullable": entry.is_nullable,
                        "is_target": entry.is_target
                    })
                else:
                    # If duplicate from same connection discovered as both source and target,
                    # merge is_target info (None -> False/True, False -> True if also True)
                    existing = next(
                        (c for c in tree[schema][table] if c["name"] == col_name),
                        None
                    )
                    if existing and entry.is_target is not None:
                        if existing.get("is_target") is None:
                            existing["is_target"] = entry.is_target
                        elif existing.get("is_target") != entry.is_target:
                            existing["is_target"] = "both"
            return tree

    @staticmethod
    async def insert_inline_schema(project_id: str, schema_data: Dict[str, Any], is_target: bool = False) -> List[SchemaCache]:
        source_name = schema_data.get("source_name", "inline")
        schema_name = "target" if is_target else source_name
        table_name = source_name.rsplit(".", 1)[0] if "." in source_name else source_name

        entries = []
        for col in schema_data.get("columns", []):
            entry = SchemaCache(
                connection_id=None,
                project_id=project_id,
                object_type=ObjectType.column,
                schema_name=schema_name,
                table_name=table_name,
                column_name=col["name"],
                data_type=col.get("type", "string"),
                is_nullable=col.get("nullable", True),
                is_target=is_target
            )
            entries.append(entry)

        async with AsyncSessionLocal() as session:
            session.add_all(entries)
            await session.commit()

        return entries

    @staticmethod
    async def clear_project_cache(project_id: str) -> None:
        async with AsyncSessionLocal() as session:
            await session.execute(
                delete(SchemaCache).where(SchemaCache.project_id == project_id)
            )
            await session.commit()
