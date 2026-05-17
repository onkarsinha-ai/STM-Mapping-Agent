# Rejected Mappings Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include rejected mappings in the Excel export with a "USER INPUT NEEDED" marker so users know which columns require manual mapping.

**Architecture:** Expand the export query to include `rejected` status mappings. For rejected rows, override source-related fields with a placeholder string instead of the original LLM proposal data. Keep approved/modified rows unchanged.

**Tech Stack:** Python, FastAPI, SQLAlchemy, openpyxl, pytest

---

### Task 1: Update ExportService to Include Rejected Mappings

**Files:**
- Modify: `backend/app/services/export_service.py`
- Test: `backend/tests/unit/test_export_service.py`

- [ ] **Step 1: Modify the query to include rejected mappings**

In `backend/app/services/export_service.py`, change the status filter:

```python
# Before (line 17)
Mapping.status.in_([MappingStatus.approved, MappingStatus.modified])

# After
Mapping.status.in_([MappingStatus.approved, MappingStatus.modified, MappingStatus.rejected])
```

- [ ] **Step 2: Add conditional logic for rejected mappings in the row-writing loop**

For each mapping, check the status and populate fields accordingly:

```python
for row, m in enumerate(table_mappings, 2):
    is_rejected = m.status == MappingStatus.rejected
    ws.cell(row=row, column=1, value="target")
    ws.cell(row=row, column=2, value=m.target_table)
    ws.cell(row=row, column=3, value=m.target_column)
    ws.cell(row=row, column=4, value="source")
    ws.cell(row=row, column=5, value="USER INPUT NEEDED" if is_rejected else m.source_table)
    ws.cell(row=row, column=6, value="USER INPUT NEEDED" if is_rejected else m.source_column)
    ws.cell(row=row, column=7, value="USER INPUT NEEDED" if is_rejected else m.business_logic)
    ws.cell(row=row, column=8, value="USER INPUT NEEDED" if is_rejected else m.transformation_rule)
    ws.cell(row=row, column=9, value=0.00 if is_rejected else (float(m.confidence_score) if m.confidence_score else None))
```

- [ ] **Step 3: Run existing export test to verify nothing breaks**

```bash
docker-compose exec backend pytest backend/tests/unit/test_export_service.py -v
```

Expected: PASS (existing test should still pass since it mocks status and doesn't assert specific cell values)

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/export_service.py
git commit -m "feat(export): include rejected mappings with USER INPUT NEEDED marker"
```

---

### Task 2: Add Test for Rejected Mappings in Export

**Files:**
- Modify: `backend/tests/unit/test_export_service.py`

- [ ] **Step 1: Add test for rejected mapping export**

Add a new test below the existing one in `backend/tests/unit/test_export_service.py`:

```python
@pytest.mark.asyncio
async def test_generate_excel_includes_rejected_mappings():
    mock_approved = MagicMock()
    mock_approved.target_table = "dim_customer"
    mock_approved.target_column = "customer_id"
    mock_approved.source_table = "users"
    mock_approved.source_column = "id"
    mock_approved.business_logic = "Primary key mapping"
    mock_approved.transformation_rule = "CAST(id AS VARCHAR)"
    mock_approved.confidence_score = 0.95
    mock_approved.status = MagicMock()
    mock_approved.status.__eq__ = MagicMock(return_value=False)

    mock_rejected = MagicMock()
    mock_rejected.target_table = "dim_customer"
    mock_rejected.target_column = "email"
    mock_rejected.source_table = "old_emails"
    mock_rejected.source_column = "email_addr"
    mock_rejected.business_logic = "Email mapping"
    mock_rejected.transformation_rule = "LOWER(email_addr)"
    mock_rejected.confidence_score = 0.60
    mock_rejected.status = MagicMock()
    mock_rejected.status.__eq__ = MagicMock(side_effect=lambda other: other.value == "rejected" if hasattr(other, 'value') else False)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_approved, mock_rejected]

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)

    with patch('app.services.export_service.AsyncSessionLocal') as mock_session_class:
        mock_session_class.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session_class.return_value.__aexit__ = AsyncMock(return_value=None)

        excel_bytes = await ExportService.generate_excel("project-id")
        assert len(excel_bytes) > 0

    # Verify the query included rejected status
    call_args = mock_session.execute.call_args[0][0]
    assert "rejected" in str(call_args)
```

- [ ] **Step 2: Run the new test**

```bash
docker-compose exec backend pytest backend/tests/unit/test_export_service.py::test_generate_excel_includes_rejected_mappings -v
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/unit/test_export_service.py
git commit -m "test(export): add test for rejected mappings in export"
```

---

## Self-Review Checklist

1. **Spec coverage:** Both requirements covered — (a) rejected mappings included in export, (b) marked with "USER INPUT NEEDED"
2. **Placeholder scan:** No TBD/TODO placeholders. All code blocks contain complete code.
3. **Type consistency:** Uses existing `MappingStatus.rejected` enum value, consistent with model definition.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-16-rejected-mappings-export.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — I execute tasks in this session directly

Which approach?