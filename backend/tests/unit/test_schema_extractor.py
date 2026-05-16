import io
import json
import pytest
import fastavro
from app.services.schema_extractor import SchemaExtractor


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


class TestUnsupportedFormat:
    def test_unsupported_extension(self):
        file_obj = io.BytesIO(b"some data")
        with pytest.raises(ValueError, match="Unsupported file format"):
            SchemaExtractor.extract(file_obj, "test.xyz")


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
