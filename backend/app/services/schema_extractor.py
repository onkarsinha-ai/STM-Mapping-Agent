from abc import ABC, abstractmethod
from typing import Dict, List, Any, BinaryIO
import io

import pandas as pd
import fastavro


class SchemaExtractionError(Exception):
    """Raised when schema extraction fails due to parse errors."""


class FileParser(ABC):
    @abstractmethod
    def parse(self, file_obj: BinaryIO, source_name: str) -> Dict[str, Any]:
        ...


class DataFrameMixin:
    def _df_to_schema(self, df: pd.DataFrame, source_name: str) -> Dict[str, Any]:
        columns: List[Dict[str, str]] = []
        for col_name, dtype in df.dtypes.items():
            dtype_str = str(dtype).lower()
            if "int" in dtype_str:
                mapped = "integer"
            elif "float" in dtype_str:
                mapped = "float"
            elif "bool" in dtype_str:
                mapped = "boolean"
            elif "datetime" in dtype_str:
                mapped = "datetime"
            else:
                mapped = "string"
            columns.append({"name": str(col_name), "type": mapped})
        return {"source_name": source_name, "columns": columns}


class CSVParser(FileParser, DataFrameMixin):
    def parse(self, file_obj: BinaryIO, source_name: str) -> Dict[str, Any]:
        try:
            df = pd.read_csv(file_obj)
        except Exception as e:
            raise SchemaExtractionError(f"Failed to parse CSV: {e}") from e
        return self._df_to_schema(df, source_name)


class JSONParser(FileParser, DataFrameMixin):
    def parse(self, file_obj: BinaryIO, source_name: str) -> Dict[str, Any]:
        try:
            raw = file_obj.read()
            text = raw.decode("utf-8").strip()
            if text.startswith("["):
                df = pd.read_json(io.BytesIO(raw))
            else:
                df = pd.read_json(io.BytesIO(raw), lines=True)
        except Exception as e:
            raise SchemaExtractionError(f"Failed to parse JSON: {e}") from e
        return self._df_to_schema(df, source_name)


class ParquetParser(FileParser, DataFrameMixin):
    def parse(self, file_obj: BinaryIO, source_name: str) -> Dict[str, Any]:
        try:
            df = pd.read_parquet(file_obj)
        except Exception as e:
            raise SchemaExtractionError(f"Failed to parse Parquet: {e}") from e
        return self._df_to_schema(df, source_name)


class ExcelParser(FileParser, DataFrameMixin):
    def parse(self, file_obj: BinaryIO, source_name: str) -> Dict[str, Any]:
        try:
            df = pd.read_excel(file_obj)
        except Exception as e:
            raise SchemaExtractionError(f"Failed to parse Excel: {e}") from e
        return self._df_to_schema(df, source_name)


class AvroParser(FileParser):
    def parse(self, file_obj: BinaryIO, source_name: str) -> Dict[str, Any]:
        try:
            reader = fastavro.reader(file_obj)
            schema = reader.writer_schema
            fields = schema.get("fields", [])
            columns: List[Dict[str, str]] = []
            for field in fields:
                name = field["name"]
                avro_type = field["type"]
                mapped = self._map_avro_type(avro_type)
                columns.append({"name": name, "type": mapped})
            return {"source_name": source_name, "columns": columns}
        except Exception as e:
            raise SchemaExtractionError(f"Failed to parse Avro: {e}") from e

    def _map_avro_type(self, avro_type: Any) -> str:
        if isinstance(avro_type, list):
            non_null = [t for t in avro_type if t != "null"]
            if non_null:
                avro_type = non_null[0]
            else:
                avro_type = "null"
        type_str = str(avro_type).lower()
        if type_str in ("string", "bytes"):
            return "string"
        if type_str in ("int", "long"):
            return "integer"
        if type_str in ("float", "double"):
            return "float"
        if type_str == "boolean":
            return "boolean"
        if type_str == "null":
            return "string"
        return "string"


class SchemaExtractor:
    _parsers: Dict[str, FileParser] = {
        ".csv": CSVParser(),
        ".json": JSONParser(),
        ".parquet": ParquetParser(),
        ".xlsx": ExcelParser(),
        ".avro": AvroParser(),
    }

    @classmethod
    def extract(cls, file_obj: BinaryIO, source_name: str) -> Dict[str, Any]:
        ext = "." + source_name.rsplit(".", 1)[-1].lower()
        parser = cls._parsers.get(ext)
        if parser is None:
            raise ValueError(f"Unsupported file format: {ext}")
        return parser.parse(file_obj, source_name)
