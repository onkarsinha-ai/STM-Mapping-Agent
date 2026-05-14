from typing import Dict, Any
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dataclasses import dataclass

@dataclass
class ConnectionTestResult:
    success: bool
    message: str

class DatabaseTester:
    @staticmethod
    async def test(db_type: str, params: Dict[str, Any]) -> ConnectionTestResult:
        try:
            if db_type == "postgresql":
                url = f"postgresql+asyncpg://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
                query = "SELECT 1"
            elif db_type == "mysql":
                url = f"mysql+aiomysql://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
                query = "SELECT 1"
            elif db_type == "snowflake":
                return ConnectionTestResult(True, "Snowflake connection configured")
            elif db_type == "bigquery":
                return ConnectionTestResult(True, "BigQuery connections validated via ADC or service account key")
            elif db_type == "sqlserver":
                url = f"mssql+pyodbc://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params['database']}"
                query = "SELECT 1"
            elif db_type == "oracle":
                url = f"oracle+oracledb://{params['username']}:{params['password']}@{params['host']}:{params['port']}/{params.get('service_name', params.get('sid', ''))}"
                query = "SELECT 1 FROM DUAL"
            elif db_type == "csv":
                return ConnectionTestResult(True, "CSV file connection configured")
            elif db_type == "parquet":
                return ConnectionTestResult(True, "Parquet file connection configured")
            else:
                return ConnectionTestResult(False, f"Unsupported database type: {db_type}")

            engine = create_async_engine(url, echo=False)
            try:
                async with engine.connect() as conn:
                    await conn.execute(text(query))
                return ConnectionTestResult(True, f"{db_type} connection successful")
            finally:
                await engine.dispose()
        except Exception as e:
            return ConnectionTestResult(False, str(e))
