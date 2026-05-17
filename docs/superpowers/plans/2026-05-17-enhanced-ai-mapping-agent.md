# Enhanced AI Mapping Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix table selection filtering, clear stale mappings, enhance LLM prompt for complex data engineering scenarios, and filter schema browser to show only selected tables.

**Architecture:** Backend filtering in `mappings.py` becomes connection-agnostic (applies whenever selections exist). LLM prompt in `llm_orchestrator.py` gains hard constraints, scenario examples, and output validation. Frontend `ProjectPage.tsx` computes a filtered schema view.

**Tech Stack:** FastAPI, SQLAlchemy (async), PostgreSQL, React + Vite, TanStack Query, LiteLLM

---

## File Structure

| File | Responsibility |
|------|---------------|
| `backend/app/routers/mappings.py` | API endpoint for proposing mappings; handles schema filtering, stale mapping deletion, debug logging |
| `backend/app/services/llm_orchestrator.py` | Builds enhanced LLM prompt; validates LLM output against filtered schemas |
| `frontend/src/pages/ProjectPage.tsx` | Computes filtered schema for SchemaBrowser based on saved table selections |

---

## Task 1: Fix Table Selection Filtering in `mappings.py`

**Files:**
- Modify: `backend/app/routers/mappings.py:118`

- [ ] **Step 1: Change `has_selections` to be connection-agnostic**

Replace line 118:

```python
# Before
has_selections = same_db_connection and (project.selected_source_tables or project.selected_target_tables)
```

```python
# After
has_selections = bool(
    project.selected_source_tables or project.selected_target_tables
)
```

- [ ] **Step 2: Verify the `filter_tree` call block (lines 119-137) stays unchanged**

The existing block should remain:

```python
if has_selections:
    selected_sources = set(project.selected_source_tables or [])
    selected_targets = set(project.selected_target_tables or [])

    def filter_tree(tree: Dict[str, Any], allowed_tables: set) -> Dict[str, Any]:
        filtered: Dict[str, Any] = {}
        for schema, tables in tree.items():
            for table, columns in tables.items():
                key = f"{schema}.{table}"
                if key in allowed_tables or table in allowed_tables:
                    if schema not in filtered:
                        filtered[schema] = {}
                    filtered[schema][table] = columns
        return filtered

    if selected_sources:
        source_schema = filter_tree(source_schema, selected_sources)
    if selected_targets:
        target_schema = filter_tree(target_schema, selected_targets)
```

- [ ] **Step 3: Update fallback comments for clarity**

Replace lines 139-144:

```python
# Before
# Fallback: if target/source couldn't be separated, pass everything as both.
# Skip fallback when user has made explicit table selections for same-connection projects.
if not target_schema and not has_selections:
    target_schema = build_tree(entries)
if not source_schema and not has_selections:
    source_schema = build_tree(entries)
```

```python
# After
# Fallback: if target/source couldn't be separated, pass everything as both.
# Skip fallback when user has made explicit table selections.
if not target_schema and not has_selections:
    target_schema = build_tree(entries)
if not source_schema and not has_selections:
    source_schema = build_tree(entries)
```

---

## Task 2: Clear Stale Proposed Mappings

**Files:**
- Modify: `backend/app/routers/mappings.py`

- [ ] **Step 1: Add import for `delete` and `MappingStatus`**

At the top of the file, ensure these imports exist:

```python
from sqlalchemy import select, delete
```

Add `MappingStatus` to the existing Mapping import:

```python
from app.models.mapping import Mapping, MappingStatus
```

- [ ] **Step 2: Delete stale proposed mappings before generating**

Insert this block immediately before the `# Build Jira context if available` comment (around line 146):

```python
    # Clear stale proposed mappings before generating new ones
    await db.execute(
        delete(Mapping).where(
            Mapping.project_id == project_id,
            Mapping.status == MappingStatus.proposed
        )
    )
```

- [ ] **Step 3: Add debug logging**

Add import at the top:

```python
import logging

logger = logging.getLogger(__name__)
```

Insert logging before the LLM call (before `try:` on line 152):

```python
    logger.info(
        "Proposing mappings for project=%s: source_schemas=%s target_schemas=%s "
        "source_tables=%d target_tables=%d target_columns=%d",
        project_id,
        list(source_schema.keys()),
        list(target_schema.keys()),
        sum(len(t) for t in source_schema.values()),
        len(target_schema),
        sum(len(cols) for cols in target_schema.values())
    )
```

---

## Task 3: Enhanced LLM Prompt with Complex Scenarios

**Files:**
- Modify: `backend/app/services/llm_orchestrator.py`

- [ ] **Step 1: Rewrite `build_prompt` method**

Replace the entire `build_prompt` method (lines 10-55):

```python
    @staticmethod
    def build_prompt(target_schema: Dict, source_schema: Dict,
                     jira_context: Optional[str], user_text: str,
                     historical_feedback: List[Dict]) -> str:
        prompt = f"""You are a senior data engineer specializing in schema mapping. Your task is to propose precise column-level mappings from source schemas to a target schema.

## Target Schema (ONLY map to these tables/columns)
{json.dumps(target_schema, indent=2)}

## Source Schemas (ONLY use these tables/columns as sources)
Top-level keys are database schema names.
{json.dumps(source_schema, indent=2)}

## Context
"""
        if jira_context:
            prompt += f"- Jira Ticket: {jira_context}\n"
        if user_text:
            prompt += f"- User Description: {user_text}\n"

        if historical_feedback:
            prompt += "\n## Past Successful Mappings\n"
            for fb in historical_feedback[:5]:
                prompt += f"- {json.dumps(fb)}\n"

        prompt += """
## CRITICAL RULES — YOU MUST FOLLOW THESE
1. ONLY generate mappings for target tables and columns explicitly listed in the Target Schema above.
2. ONLY use source tables and columns explicitly listed in the Source Schema above.
3. If a target column has no logical source, set source_table=null and source_column=null.
4. Do NOT invent tables, columns, or data types that are not present in the schemas.
5. Every target column MUST appear in the output exactly once.

## Mapping Scenario Examples

### Direct Column Mapping
Target: customers.email
Source: users.email_address
Logic: Email addresses were renamed in the target system.
Transformation: None
Confidence: 0.95

### Multi-Source / Join Mapping
Target: users.full_name
Source: users.first_name, users.last_name
Logic: Target stores full name; source stores first and last separately.
Transformation: CONCAT(first_name, ' ', last_name)
Confidence: 0.90

### Aggregation Mapping
Target: orders.monthly_total
Source: order_lines.amount
Logic: Target aggregates order lines to monthly totals.
Transformation: SUM(amount) GROUP BY order_id, DATE_TRUNC('month', created_at)
Confidence: 0.80

### Derived Column / CASE Mapping
Target: orders.status
Source: orders.deleted_at
Logic: Target uses enum status; source uses soft-delete timestamp.
Transformation: CASE WHEN deleted_at IS NULL THEN 'active' ELSE 'cancelled' END
Confidence: 0.75

### No Mapping (Generated / Surrogate Key)
Target: orders.id
Source: null
Logic: Target uses auto-increment primary key not present in source.
Transformation: null
Confidence: 1.00

## Confidence Scoring Rubric
- 0.90–1.00: Exact name match + same data type
- 0.70–0.89: Fuzzy name match or compatible type (e.g., VARCHAR → TEXT)
- 0.50–0.69: Inferred semantic match or requires transformation
- < 0.50: Uncertain; only use if no better option exists

## Output Format
Return a JSON array with one object per TARGET COLUMN. Structure:
[
  {
    "target_table": "schema.table",
    "target_column": "column_name",
    "source_table": "schema.table or null",
    "source_column": "column_name or null",
    "business_logic": "Why this mapping makes sense",
    "transformation_rule": "SQL expression or null",
    "confidence_score": 0.95,
    "reasoning": "Brief explanation of the match logic"
  }
]
"""
        return prompt
```

---

## Task 4: Add Output Validation in LLMOrchestrator

**Files:**
- Modify: `backend/app/services/llm_orchestrator.py`

- [ ] **Step 1: Add helper functions for validation**

Insert these helper methods into the `LLMOrchestrator` class (before `propose_mappings`):

```python
    @staticmethod
    def _is_valid_target(target_table: str, target_column: str, target_schema: Dict) -> bool:
        """Check if target table/column exists in the filtered target schema."""
        for schema_name, tables in target_schema.items():
            for table_name, columns in tables.items():
                full_name = f"{schema_name}.{table_name}"
                if target_table in (full_name, table_name):
                    for col in columns:
                        if col.get("name") == target_column:
                            return True
        return False

    @staticmethod
    def _is_valid_source(source_table: str, source_column: str, source_schema: Dict) -> bool:
        """Check if source table/column exists in the filtered source schema."""
        if not source_table or not source_column:
            return False
        for schema_name, tables in source_schema.items():
            for table_name, columns in tables.items():
                full_name = f"{schema_name}.{table_name}"
                if source_table in (full_name, table_name):
                    for col in columns:
                        if col.get("name") == source_column:
                            return True
        return False
```

- [ ] **Step 2: Update `propose_mappings` to validate and filter proposals**

Replace the proposal processing loop (lines 103-118):

```python
        # Before
        mappings = []
        for prop in proposals:
            mapping = Mapping(
                project_id=project_id,
                target_table=prop.get("target_table", ""),
                target_column=prop.get("target_column", ""),
                source_table=prop.get("source_table"),
                source_column=prop.get("source_column"),
                business_logic=prop.get("business_logic"),
                transformation_rule=prop.get("transformation_rule"),
                confidence_score=prop.get("confidence_score", 0.5),
                llm_reasoning=prop.get("reasoning"),
                status=MappingStatus.proposed
            )
            mappings.append(mapping)
```

```python
        # After
        valid_proposals = []
        for prop in proposals:
            target_table = prop.get("target_table", "")
            target_column = prop.get("target_column", "")
            source_table = prop.get("source_table")
            source_column = prop.get("source_column")

            # Validate target exists in filtered schema
            if not LLMOrchestrator._is_valid_target(target_table, target_column, target_schema):
                logger.warning("Dropping invalid target mapping: %s.%s", target_table, target_column)
                continue

            # Validate source exists in filtered schema (unless null for no-mapping case)
            if source_table is not None and not LLMOrchestrator._is_valid_source(source_table, source_column, source_schema):
                logger.warning("Dropping invalid source mapping: %s.%s → %s.%s",
                               source_table, source_column, target_table, target_column)
                continue

            # Cap confidence at 1.0
            confidence = min(prop.get("confidence_score", 0.5), 1.0)

            valid_proposals.append({
                "target_table": target_table,
                "target_column": target_column,
                "source_table": source_table,
                "source_column": source_column,
                "business_logic": prop.get("business_logic"),
                "transformation_rule": prop.get("transformation_rule"),
                "confidence_score": confidence,
                "reasoning": prop.get("reasoning"),
            })

        logger.info("Validated %d proposals out of %d LLM outputs",
                    len(valid_proposals), len(proposals))

        mappings = []
        for prop in valid_proposals:
            mapping = Mapping(
                project_id=project_id,
                target_table=prop["target_table"],
                target_column=prop["target_column"],
                source_table=prop["source_table"],
                source_column=prop["source_column"],
                business_logic=prop["business_logic"],
                transformation_rule=prop["transformation_rule"],
                confidence_score=prop["confidence_score"],
                llm_reasoning=prop["reasoning"],
                status=MappingStatus.proposed
            )
            mappings.append(mapping)
```

- [ ] **Step 3: Add logger import at top of file**

At the top of `llm_orchestrator.py`, add:

```python
import logging

logger = logging.getLogger(__name__)
```

---

## Task 5: Filter SchemaBrowser to Show Only Selected Tables

**Files:**
- Modify: `frontend/src/pages/ProjectPage.tsx`

- [ ] **Step 1: Add `useMemo` import**

At the top of the file, ensure `useMemo` is imported:

```typescript
import { useState, useMemo } from 'react'
```

- [ ] **Step 2: Compute filtered schema**

Insert this block after the `hasSelections` declaration (around line 58):

```typescript
  const filteredSchema = useMemo(() => {
    if (!sameDbConnection || !hasSelections) return schema

    const allowed = new Set([
      ...selectedSourceTables,
      selectedTargetTable
    ].filter(Boolean))

    const filtered: Record<string, Record<string, any>> = {}
    for (const [schemaName, tables] of Object.entries(schema)) {
      for (const [tableName, columns] of Object.entries(tables)) {
        const key = `${schemaName}.${tableName}`
        if (allowed.has(key)) {
          if (!filtered[schemaName]) filtered[schemaName] = {}
          filtered[schemaName][tableName] = columns
        }
      }
    }
    return filtered
  }, [schema, sameDbConnection, hasSelections, selectedSourceTables, selectedTargetTable])
```

- [ ] **Step 3: Pass filtered schema to SchemaBrowser**

Replace line 254:

```typescript
// Before
<SchemaBrowser schema={schema} />

// After
<SchemaBrowser schema={filteredSchema} />
```

---

## Task 6: Test the Changes

**Files:**
- Test: Run manually via UI and backend logs

- [ ] **Step 1: Start the application**

```bash
docker-compose up --build -d
```

- [ ] **Step 2: Create a project with same source and target connection**

Use the UI to create a project pointing to the project's own PostgreSQL database.

- [ ] **Step 3: Run discovery**

Click "Start Discovery" in the UI.

- [ ] **Step 4: Select tables and save**

- Source: `public.mappings`, `public.projects`
- Target: `public.review_chat_messages`
- Click "Save Selections"

- [ ] **Step 5: Verify filtered schema browser**

Confirm the schema browser below only shows 3 tables: `mappings`, `projects`, `review_chat_messages`.

- [ ] **Step 6: Generate proposals**

Click "Generate Proposals".

- [ ] **Step 7: Check backend logs**

```bash
docker-compose logs -f backend
```

Expected log line:
```
Proposing mappings for project=<id>: source_schemas=['public'] target_schemas=['public'] source_tables=3 target_tables=1 target_columns=6
```

- [ ] **Step 8: Verify mappings in review table**

Confirm the MappingTable shows exactly 6 mappings (one per column in `review_chat_messages`), not 95+.

- [ ] **Step 9: Re-generate and verify no accumulation**

Click "Generate Proposals" again. Confirm the proposal count stays at 6, not 12.

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Universal filtering (not just same-connection) | Task 1 |
| Clear stale proposed mappings | Task 2 |
| Enhanced LLM prompt with constraints | Task 3 |
| Scenario examples in prompt | Task 3 |
| Confidence scoring rubric | Task 3 |
| Output validation against filtered schemas | Task 4 |
| Debug logging | Task 2 |
| Frontend schema browser filtering | Task 5 |

---

## Placeholder Scan

- No TBD/TODO placeholders
- All code blocks contain complete, runnable code
- All file paths are exact
- All function signatures match existing codebase
