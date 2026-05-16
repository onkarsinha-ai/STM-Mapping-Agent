import pytest
from uuid import UUID
from app.schemas.project import ProjectCreate


def test_project_create_with_inline_source_only():
    data = ProjectCreate(
        name="Test Project",
        source_schemas=[{"table": "users", "columns": ["id", "name"]}],
        target_schema={"table": "customers", "columns": ["id", "name"]}
    )
    assert data.name == "Test Project"
    assert data.source_schemas is not None
    assert len(data.source_schemas) == 1
    assert data.target_schema is not None


def test_project_create_no_source_fails():
    with pytest.raises(ValueError, match="At least one source required"):
        ProjectCreate(
            name="Test Project",
            target_schema={"table": "customers", "columns": ["id", "name"]}
        )


def test_project_create_both_targets_fails():
    with pytest.raises(ValueError, match="Cannot specify both target connection and target file"):
        ProjectCreate(
            name="Test Project",
            source_schemas=[{"table": "users", "columns": ["id", "name"]}],
            target_connection_id=UUID("00000000-0000-0000-0000-000000000001"),
            target_schema={"table": "customers", "columns": ["id", "name"]}
        )


def test_project_create_with_db_source_and_target():
    data = ProjectCreate(
        name="Test Project",
        source_connection_id=UUID("00000000-0000-0000-0000-000000000001"),
        target_connection_id=UUID("00000000-0000-0000-0000-000000000002")
    )
    assert data.source_connection_id is not None
    assert data.target_connection_id is not None


def test_project_create_no_target_fails():
    with pytest.raises(ValueError, match="Exactly one target required"):
        ProjectCreate(
            name="Test Project",
            source_schemas=[{"table": "users", "columns": ["id", "name"]}]
        )
