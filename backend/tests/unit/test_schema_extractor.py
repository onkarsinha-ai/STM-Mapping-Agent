import io
import json
import pytest
import fastavro
import pandas as pd
from app.services.schema_extractor import (
    SchemaExtractor,
    CSVParser,
    JSONParser,
    ParquetParser,
    ExcelParser,
    AvroParser,
    DataFrameMixin,
)


class TestCSVParser:
    def test_parse_csv(self):
        csv_content = "id,name,age\n1,Alice,30\n2,Bob,25\n"
        file_obj = io.BytesIO(csv_content.encode("utf-8"))
        result = SchemaExtractor.extract(file_obj, "test.csv")
        assert result["source_name"] == "test.csv"
        assert result["columns"] == [
            {"name": "id", "type": "integer"},
            {"name": "name", "type": "string"},
            {"name": "age", "type": "integer"},
        ]

    def test_csv_parser_parse_directly(self):
        csv_content = "a,b\n1,hello\n2,world\n"
        file_obj = io.BytesIO(csv_content.encode("utf-8"))
        result = CSVParser().parse(file_obj, "direct.csv")
        assert result["source_name"] == "direct.csv"
        assert result["columns"] == [
            {"name": "a", "type": "integer"},
            {"name": "b", "type": "string"},
        ]


class TestJSONParser:
    def test_parse_json_array(self):
        data = [{"id": 1, "name": "Alice", "active": True}]
        file_obj = io.BytesIO(json.dumps(data).encode("utf-8"))
        result = SchemaExtractor.extract(file_obj, "test.json")
        assert result["source_name"] == "test.json"
        assert result["columns"] == [
            {"name": "id", "type": "integer"},
            {"name": "name", "type": "string"},
            {"name": "active", "type": "boolean"},
        ]

    def test_parse_json_lines(self):
        lines = '{"id": 1, "score": 3.14}\n{"id": 2, "score": 2.71}\n'
        file_obj = io.BytesIO(lines.encode("utf-8"))
        result = SchemaExtractor.extract(file_obj, "test.json")
        assert result["source_name"] == "test.json"
        assert result["columns"] == [
            {"name": "id", "type": "integer"},
            {"name": "score", "type": "float"},
        ]

    def test_json_parser_no_seek_needed(self):
        """JSONParser should work on non-seekable streams since it reads raw once."""
        data = [{"x": 1}]
        file_obj = io.BytesIO(json.dumps(data).encode("utf-8"))
        result = JSONParser().parse(file_obj, "no_seek.json")
        assert result["columns"] == [{"name": "x", "type": "integer"}]


class TestDataFrameMixin:
    def test_df_to_schema_directly(self):
        df = pd.DataFrame({
            "id": [1, 2],
            "price": [1.1, 2.2],
            "flag": [True, False],
            "created": pd.to_datetime(["2024-01-01", "2024-01-02"]),
            "label": ["a", "b"],
        })
        mixin = DataFrameMixin()
        result = mixin._df_to_schema(df, "mixed.csv")
        assert result["source_name"] == "mixed.csv"
        assert result["columns"] == [
            {"name": "id", "type": "integer"},
            {"name": "price", "type": "float"},
            {"name": "flag", "type": "boolean"},
            {"name": "created", "type": "datetime"},
            {"name": "label", "type": "string"},
        ]


class TestParquetParser:
    def test_parse_parquet(self):
        df = pd.DataFrame({"a": [1, 2], "b": ["x", "y"]})
        buf = io.BytesIO()
        df.to_parquet(buf, index=False)
        buf.seek(0)
        result = ParquetParser().parse(buf, "test.parquet")
        assert result["source_name"] == "test.parquet"
        assert result["columns"] == [
            {"name": "a", "type": "integer"},
            {"name": "b", "type": "string"},
        ]


class TestExcelParser:
    def test_parse_excel(self):
        df = pd.DataFrame({"col1": [1.0, 2.0], "col2": ["a", "b"]})
        buf = io.BytesIO()
        df.to_excel(buf, index=False)
        buf.seek(0)
        result = ExcelParser().parse(buf, "test.xlsx")
        assert result["source_name"] == "test.xlsx"
        # Excel round-trips floats as int64 when they are whole numbers
        assert result["columns"] == [
            {"name": "col1", "type": "integer"},
            {"name": "col2", "type": "string"},
        ]


class TestAvroParser:
    def test_parse_avro(self):
        schema = {
            "type": "record",
            "name": "TestRecord",
            "fields": [
                {"name": "id", "type": "long"},
                {"name": "name", "type": "string"},
                {"name": "score", "type": ["null", "double"]},
                {"name": "active", "type": "boolean"},
            ],
        }
        records = [
            {"id": 1, "name": "Alice", "score": 1.1, "active": True},
            {"id": 2, "name": "Bob", "score": None, "active": False},
        ]
        buf = io.BytesIO()
        fastavro.writer(buf, schema, records)
        buf.seek(0)
        result = SchemaExtractor.extract(buf, "test.avro")
        assert result["source_name"] == "test.avro"
        assert result["columns"] == [
            {"name": "id", "type": "integer"},
            {"name": "name", "type": "string"},
            {"name": "score", "type": "float"},
            {"name": "active", "type": "boolean"},
        ]

    def test_map_avro_type_directly(self):
        parser = AvroParser()
        assert parser._map_avro_type("string") == "string"
        assert parser._map_avro_type("bytes") == "string"
        assert parser._map_avro_type("int") == "integer"
        assert parser._map_avro_type("long") == "integer"
        assert parser._map_avro_type("float") == "float"
        assert parser._map_avro_type("double") == "float"
        assert parser._map_avro_type("boolean") == "boolean"
        assert parser._map_avro_type("null") == "string"
        assert parser._map_avro_type("unknown") == "string"
        assert parser._map_avro_type(["null", "double"]) == "float"
        assert parser._map_avro_type(["null"]) == "string"


class TestUnsupportedFormat:
    def test_unsupported_extension(self):
        file_obj = io.BytesIO(b"some data")
        with pytest.raises(ValueError, match="Unsupported file format"):
            SchemaExtractor.extract(file_obj, "test.xyz")


class TestEdgeCases:
    def test_empty_csv_headers_only(self):
        csv_content = "id,name,age\n"
        file_obj = io.BytesIO(csv_content.encode("utf-8"))
        result = CSVParser().parse(file_obj, "empty.csv")
        assert result["source_name"] == "empty.csv"
        # With no data rows pandas infers all columns as object/string
        assert result["columns"] == [
            {"name": "id", "type": "string"},
            {"name": "name", "type": "string"},
            {"name": "age", "type": "string"},
        ]

    def test_case_insensitive_extension_csv(self):
        csv_content = "a,b\n1,hello\n"
        file_obj = io.BytesIO(csv_content.encode("utf-8"))
        result = SchemaExtractor.extract(file_obj, "test.CSV")
        assert result["source_name"] == "test.CSV"
        assert result["columns"] == [
            {"name": "a", "type": "integer"},
            {"name": "b", "type": "string"},
        ]

    def test_case_insensitive_extension_json(self):
        data = [{"x": 1}]
        file_obj = io.BytesIO(json.dumps(data).encode("utf-8"))
        result = SchemaExtractor.extract(file_obj, "test.JSON")
        assert result["source_name"] == "test.JSON"
        assert result["columns"] == [{"name": "x", "type": "integer"}]

    def test_unsupported_extension_raises(self):
        file_obj = io.BytesIO(b"data")
        with pytest.raises(ValueError, match="Unsupported file format: .unsupported"):
            SchemaExtractor.extract(file_obj, "file.unsupported")
