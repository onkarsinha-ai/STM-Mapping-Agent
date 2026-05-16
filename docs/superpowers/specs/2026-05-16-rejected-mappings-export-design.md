---
name: rejected-mappings-export
description: Include rejected mappings in export with "USER INPUT NEEDED" marker so users know which columns need manual handling.
metadata:
  type: project
---

# Rejected Mappings Export — Design Spec

## Problem
When a user rejects a mapping during review and proceeds to export, the rejected target column is silently excluded from the Excel export. The user has no record that this column needs manual mapping work.

## Goal
Rejected mappings should appear in the export with a clear "USER INPUT NEEDED" marker so the user knows which columns require manual intervention.

## Approach
**Approach A: Include rejected mappings with placeholder marker**

## Backend Changes

### ExportService (`backend/app/services/export_service.py`)
- Expand query to include `MappingStatus.rejected` alongside `approved` and `modified`
- For rejected mappings, populate these columns with `"USER INPUT NEEDED"`:
  - Source Table
  - Source Column
  - Business Logic
  - Transformation Rule
- Set Confidence Score to `0.00` for rejected mappings
- Proposed mappings (never reviewed) remain excluded from export

## Frontend Changes
None. Export flow stays unchanged.

## Data Preservation
Original rejected proposal data remains in `mapping_feedback` audit table.

## Testing
- Backend test: verify rejected mapping appears with "USER INPUT NEEDED" marker
- Backend test: verify proposed mappings are still excluded
