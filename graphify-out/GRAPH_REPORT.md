# Graph Report - .  (2026-05-15)

## Corpus Check
- Corpus is ~40,630 words - fits in a single context window. You may not need a graph.

## Summary
- 267 nodes · 294 edges · 66 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Core Data Models & STM Architecture|Core Data Models & STM Architecture]]
- [[_COMMUNITY_Connection Service & Testing|Connection Service & Testing]]
- [[_COMMUNITY_Mapping Engine & Business Logic|Mapping Engine & Business Logic]]
- [[_COMMUNITY_API Schemas & DTOs|API Schemas & DTOs]]
- [[_COMMUNITY_Connection Form Redesign Specs|Connection Form Redesign Specs]]
- [[_COMMUNITY_Schema Discovery Service|Schema Discovery Service]]
- [[_COMMUNITY_Connections HTTP Router|Connections HTTP Router]]
- [[_COMMUNITY_Jira Tester Unit Tests|Jira Tester Unit Tests]]
- [[_COMMUNITY_Jira Connection Form UI|Jira Connection Form UI]]
- [[_COMMUNITY_LLM Connection Form UI|LLM Connection Form UI]]
- [[_COMMUNITY_Alembic Migration Engine|Alembic Migration Engine]]
- [[_COMMUNITY_Projects HTTP Router|Projects HTTP Router]]
- [[_COMMUNITY_Connection Service Tests|Connection Service Tests]]
- [[_COMMUNITY_LLM Tester Unit Tests|LLM Tester Unit Tests]]
- [[_COMMUNITY_Initial DB Migration|Initial DB Migration]]
- [[_COMMUNITY_Provider Column Migration|Provider Column Migration]]
- [[_COMMUNITY_FastAPI Application Core|FastAPI Application Core]]
- [[_COMMUNITY_Security & Auth Utilities|Security & Auth Utilities]]
- [[_COMMUNITY_Database Connection Tester|Database Connection Tester]]
- [[_COMMUNITY_LLM Orchestrator Service|LLM Orchestrator Service]]
- [[_COMMUNITY_Jira Connection Tester|Jira Connection Tester]]
- [[_COMMUNITY_Database Connection Form UI|Database Connection Form UI]]
- [[_COMMUNITY_Mapping Table Component|Mapping Table Component]]
- [[_COMMUNITY_Schema Browser Component|Schema Browser Component]]
- [[_COMMUNITY_Database Engine Setup|Database Engine Setup]]
- [[_COMMUNITY_Encryption Utilities|Encryption Utilities]]
- [[_COMMUNITY_Auth HTTP Router|Auth HTTP Router]]
- [[_COMMUNITY_Discovery HTTP Router|Discovery HTTP Router]]
- [[_COMMUNITY_Export HTTP Router|Export HTTP Router]]
- [[_COMMUNITY_Mappings HTTP Router|Mappings HTTP Router]]
- [[_COMMUNITY_Database Tester Tests|Database Tester Tests]]
- [[_COMMUNITY_LLM Orchestrator Tests|LLM Orchestrator Tests]]
- [[_COMMUNITY_Mapping Engine Tests|Mapping Engine Tests]]
- [[_COMMUNITY_Frontend Routing & Query|Frontend Routing & Query]]
- [[_COMMUNITY_Encryption Unit Tests|Encryption Unit Tests]]
- [[_COMMUNITY_Export Service Tests|Export Service Tests]]
- [[_COMMUNITY_Schema Discovery Tests|Schema Discovery Tests]]
- [[_COMMUNITY_App Root Component|App Root Component]]
- [[_COMMUNITY_Advanced Form Section|Advanced Form Section]]
- [[_COMMUNITY_Authentication Form Section|Authentication Form Section]]
- [[_COMMUNITY_Connection Form Section|Connection Form Section]]
- [[_COMMUNITY_Sidebar Layout|Sidebar Layout]]
- [[_COMMUNITY_Project Wizard Component|Project Wizard Component]]
- [[_COMMUNITY_Connections Page|Connections Page]]
- [[_COMMUNITY_Project Detail Page|Project Detail Page]]
- [[_COMMUNITY_Backend Package Init|Backend Package Init]]
- [[_COMMUNITY_Core Package Init|Core Package Init]]
- [[_COMMUNITY_Models Package Init|Models Package Init]]
- [[_COMMUNITY_Routers Package Init|Routers Package Init]]
- [[_COMMUNITY_Schemas Package Init|Schemas Package Init]]
- [[_COMMUNITY_Services Package Init|Services Package Init]]
- [[_COMMUNITY_Testers Package Init|Testers Package Init]]
- [[_COMMUNITY_Tests Package Init|Tests Package Init]]
- [[_COMMUNITY_Unit Tests Package Init|Unit Tests Package Init]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Frontend Entry Point|Frontend Entry Point]]
- [[_COMMUNITY_Connection Form Wrapper|Connection Form Wrapper]]
- [[_COMMUNITY_Connection List Component|Connection List Component]]
- [[_COMMUNITY_Basic Form Section|Basic Form Section]]
- [[_COMMUNITY_Header Layout|Header Layout]]
- [[_COMMUNITY_Project List Component|Project List Component]]
- [[_COMMUNITY_Dashboard Page|Dashboard Page]]
- [[_COMMUNITY_API Client Service|API Client Service]]
- [[_COMMUNITY_Frontend Types|Frontend Types]]

## God Nodes (most connected - your core abstractions)
1. `ConnectionType` - 9 edges
2. `DBType` - 9 edges
3. `ConnectionService` - 9 edges
4. `Connection Form Redesign Design Spec` - 9 edges
5. `MappingStatus` - 8 edges
6. `ConnectionTestResult` - 8 edges
7. `Async Database Engine` - 8 edges
8. `Project Model` - 8 edges
9. `Build HTML that safely postMessages a JSON object to the parent window.` - 7 edges
10. `Handle Jira Cloud OAuth 2.0 callback.` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Project Model` --semantically_similar_to--> `Phase Workflow`  [INFERRED] [semantically similar]
  backend/app/models/project.py → docs/superpowers/specs/2026-05-14-stm-mapping-agent-design.md
- `Mapping Model` --semantically_similar_to--> `Self-Learning Loop`  [INFERRED] [semantically similar]
  backend/app/models/mapping.py → docs/superpowers/specs/2026-05-14-stm-mapping-agent-design.md
- `MappingFeedback Model` --semantically_similar_to--> `Self-Learning Loop`  [INFERRED] [semantically similar]
  backend/app/models/mapping_feedback.py → docs/superpowers/specs/2026-05-14-stm-mapping-agent-design.md
- `ConnectionList Component` --semantically_similar_to--> `Tabbed Connection Form`  [INFERRED] [semantically similar]
  frontend/src/components/connections/ConnectionList.tsx → docs/superpowers/specs/2026-05-14-connection-form-redesign-design.md
- `STM Mapping Agent README` --semantically_similar_to--> `STM Mapping Agent Design Spec`  [INFERRED] [semantically similar]
  README.md → docs/superpowers/specs/2026-05-14-stm-mapping-agent-design.md

## Hyperedges (group relationships)
- **Core SQLAlchemy Models** — model_user, model_project, model_mapping, model_schemacache, model_mappingfeedback, model_jiracontext, database_engine [INFERRED 0.85]
- **Connection Form Redesign System** — spec_connectionform, plan_connectionform, concept_tabbedform, concept_dispatcher, concept_oauthcallback, concept_smartdefaults, spec_connectionparams, spec_jiraparams, spec_llmparams [INFERRED 0.85]
- **STM Mapping Agent Architecture** — spec_stm, plan_stm, readme_stm, concept_selflearning, concept_phaseworkflow, rationale_litellm, rationale_postgres_over_sqlite [INFERRED 0.85]

## Communities

### Community 0 - "Core Data Models & STM Architecture"
Cohesion: 0.12
Nodes (23): BaseSettings, Phase Workflow, Self-Learning Loop, Config, Settings, Async Database Engine, MappingStatus Enum, ObjectType Enum (+15 more)

### Community 1 - "Connection Service & Testing"
Cohesion: 0.21
Nodes (16): Config, Connection, ConnectionCreate, ConnectionResponse, ConnectionTestRequest, ConnectionTestResponse, ConnectionType, DBType (+8 more)

### Community 2 - "Mapping Engine & Business Logic"
Cohesion: 0.12
Nodes (10): Base, ExportService, JiraContext, LearningService, MappingEngine, MappingFeedback, UserAction, Mapping (+2 more)

### Community 3 - "API Schemas & DTOs"
Cohesion: 0.17
Nodes (15): BaseModel, Config, MappingResponse, MappingStatus, MappingUpdate, Config, ProjectCreate, ProjectPhase (+7 more)

### Community 4 - "Connection Form Redesign Specs"
Cohesion: 0.16
Nodes (14): Connection Tester Dispatcher, Jira OAuth Callback, Smart Defaults, Tabbed Connection Form, Connections API Service, ConnectionList Component, Connection Form Redesign Plan, Rationale: LiteLLM for Unified LLM Access (+6 more)

### Community 5 - "Schema Discovery Service"
Cohesion: 0.33
Nodes (3): ObjectType, SchemaCache, SchemaDiscoveryService

### Community 6 - "Connections HTTP Router"
Cohesion: 0.33
Nodes (2): jira_oauth_callback(), _oauth_response_html()

### Community 7 - "Jira Tester Unit Tests"
Cohesion: 0.29
Nodes (0): 

### Community 8 - "Jira Connection Form UI"
Cohesion: 0.43
Nodes (5): getErrorMessage(), handleMessage(), handleSave(), handleTest(), updateParam()

### Community 9 - "LLM Connection Form UI"
Cohesion: 0.6
Nodes (4): buildApiParams(), getErrorMessage(), handleSave(), handleTest()

### Community 10 - "Alembic Migration Engine"
Cohesion: 0.5
Nodes (2): run_async_migrations(), run_migrations_online()

### Community 11 - "Projects HTTP Router"
Cohesion: 0.4
Nodes (0): 

### Community 12 - "Connection Service Tests"
Cohesion: 0.4
Nodes (0): 

### Community 13 - "LLM Tester Unit Tests"
Cohesion: 0.4
Nodes (0): 

### Community 14 - "Initial DB Migration"
Cohesion: 0.5
Nodes (1): initial migration  Revision ID: 20260514 Revises: Create Date: 2026-05-14 00:00:

### Community 15 - "Provider Column Migration"
Cohesion: 0.5
Nodes (1): add provider to connections  Revision ID: d9b91de58d7a Revises: 20260514 Cre

### Community 16 - "FastAPI Application Core"
Cohesion: 0.67
Nodes (2): init_default_user(), lifespan()

### Community 17 - "Security & Auth Utilities"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "Database Connection Tester"
Cohesion: 0.67
Nodes (3): ConnectionTestResult, DatabaseTester, test()

### Community 19 - "LLM Orchestrator Service"
Cohesion: 0.67
Nodes (3): build_prompt(), LLMOrchestrator, propose_mappings()

### Community 20 - "Jira Connection Tester"
Cohesion: 0.67
Nodes (3): ConnectionTestResult, JiraTester, test()

### Community 21 - "Database Connection Form UI"
Cohesion: 0.83
Nodes (3): getErrorMessage(), handleSave(), handleTest()

### Community 22 - "Mapping Table Component"
Cohesion: 0.5
Nodes (0): 

### Community 23 - "Schema Browser Component"
Cohesion: 0.5
Nodes (0): 

### Community 24 - "Database Engine Setup"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Encryption Utilities"
Cohesion: 0.67
Nodes (0): 

### Community 26 - "Auth HTTP Router"
Cohesion: 0.67
Nodes (0): 

### Community 27 - "Discovery HTTP Router"
Cohesion: 0.67
Nodes (0): 

### Community 28 - "Export HTTP Router"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "Mappings HTTP Router"
Cohesion: 0.67
Nodes (0): 

### Community 30 - "Database Tester Tests"
Cohesion: 0.67
Nodes (0): 

### Community 31 - "LLM Orchestrator Tests"
Cohesion: 0.67
Nodes (0): 

### Community 32 - "Mapping Engine Tests"
Cohesion: 0.67
Nodes (0): 

### Community 33 - "Frontend Routing & Query"
Cohesion: 0.67
Nodes (3): React Main Entry, BrowserRouter, TanStack Query Client

### Community 34 - "Encryption Unit Tests"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Export Service Tests"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Schema Discovery Tests"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "App Root Component"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Advanced Form Section"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Authentication Form Section"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Connection Form Section"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Sidebar Layout"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Project Wizard Component"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Connections Page"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Project Detail Page"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Backend Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Core Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Models Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Routers Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Schemas Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Services Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Testers Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Tests Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Unit Tests Package Init"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Frontend Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Connection Form Wrapper"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Connection List Component"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Basic Form Section"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Header Layout"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Project List Component"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Dashboard Page"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "API Client Service"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Frontend Types"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **20 isolated node(s):** `initial migration  Revision ID: 20260514 Revises: Create Date: 2026-05-14 00:00:`, `add provider to connections  Revision ID: d9b91de58d7a Revises: 20260514 Cre`, `Config`, `Config`, `Backend Requirements` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Encryption Unit Tests`** (2 nodes): `test_encryption.py`, `test_encrypt_decrypt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Export Service Tests`** (2 nodes): `test_export_service.py`, `test_generate_excel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Schema Discovery Tests`** (2 nodes): `test_schema_discovery.py`, `test_discover_postgresql_schema()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Root Component`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Advanced Form Section`** (2 nodes): `updateParam()`, `AdvancedSection.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Authentication Form Section`** (2 nodes): `AuthenticationSection()`, `AuthenticationSection.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Form Section`** (2 nodes): `updateParam()`, `ConnectionSection.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sidebar Layout`** (2 nodes): `Sidebar.tsx`, `isActive()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Wizard Component`** (2 nodes): `ProjectWizard.tsx`, `handleCreate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connections Page`** (2 nodes): `handleSuccess()`, `ConnectionsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Detail Page`** (2 nodes): `ProjectPage.tsx`, `handleDiscover()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Backend Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Core Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Models Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Routers Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Schemas Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Services Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Testers Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tests Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unit Tests Package Init`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Entry Point`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection Form Wrapper`** (1 nodes): `ConnectionForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Connection List Component`** (1 nodes): `ConnectionList.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Basic Form Section`** (1 nodes): `BasicSection.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Header Layout`** (1 nodes): `Header.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project List Component`** (1 nodes): `ProjectList.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Page`** (1 nodes): `Dashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Client Service`** (1 nodes): `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Types`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Connection` connect `Connection Service & Testing` to `Mapping Engine & Business Logic`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `ConnectionService` connect `Connection Service & Testing` to `Database Connection Tester`, `Jira Connection Tester`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `MappingStatus` connect `API Schemas & DTOs` to `Mapping Engine & Business Logic`, `LLM Orchestrator Service`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `ConnectionType` (e.g. with `ConnectionCreate` and `ConnectionResponse`) actually correct?**
  _`ConnectionType` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `DBType` (e.g. with `ConnectionCreate` and `ConnectionResponse`) actually correct?**
  _`DBType` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `ConnectionService` (e.g. with `Build HTML that safely postMessages a JSON object to the parent window.` and `Handle Jira Cloud OAuth 2.0 callback.`) actually correct?**
  _`ConnectionService` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Connection Form Redesign Design Spec` (e.g. with `Rationale: Provider Column Addition` and `Connection Parameters Research`) actually correct?**
  _`Connection Form Redesign Design Spec` has 4 INFERRED edges - model-reasoned connections that need verification._