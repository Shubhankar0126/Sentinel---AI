# AI Engine Report

Generated: 2026-07-16
Validation date: Thursday, July 16, 2026
Scope: Knowledge graph, compound risk engine, rule engine, recommendation engine, explainability engine, graph APIs, risk APIs, and AI-engine tests

## Architecture

- Graph layer:
  - `backend/app/knowledge_graph/builder.py`
  - `backend/app/knowledge_graph/service.py`
  - NetworkX-backed multi-entity operational graph
- Risk reasoning layer:
  - `backend/app/risk_engine/rules.py`
  - `backend/app/risk_engine/compound.py`
  - `backend/app/risk_engine/recommendations.py`
  - `backend/app/risk_engine/explainability.py`
  - `backend/app/risk_engine/similarity.py`
- Service orchestration:
  - `backend/app/services/risk.py`
  - Combines plant context, graph impact, historical similarity, rules, scoring, recommendations, and persistence
- API surface:
  - `POST /api/v1/risk/analyze`
  - `GET /api/v1/risk/history`
  - `GET /api/v1/risk/live`
  - `GET /api/v1/graph`
  - `GET /api/v1/graph/node`
  - `GET /api/v1/graph/neighbors`
  - `GET /api/v1/graph/path`

## Rules Implemented

- `critical_explosion_hot_work`
- `confined_space_toxic_exposure`
- `pressure_thermal_runaway`
- `maintenance_ignition_cascade`
- `overdue_equipment_failure`
- `storm_hazard_exposure`
- `incident_recurrence_warning`

Rules are stored in `backend/app/risk_engine/rules.json` and are editable without changing the engine code.

## Knowledge Graph Statistics

From the validated development run:

- Node count: `25861`
- Edge count: `35900`
- Neighbor count returned in live graph validation: `20`
- Impact reachability from validated zone node: `19`

Graph entities implemented:

- Plant
- Zone
- Equipment
- Sensor
- Worker
- Permit
- Maintenance
- Incident
- Weather
- Risk Event
- Recommendation

Relationships implemented include:

- `HAS_ZONE`
- `HAS_EQUIPMENT`
- `CONTAINS_EQUIPMENT`
- `HAS_SENSOR`
- `MONITORS_ZONE`
- `PRESENT_IN`
- `HOLDS_PERMIT`
- `ACTIVE_IN`
- `COVERS_EQUIPMENT`
- `MAINTAINS`
- `HAS_INCIDENT`
- `INVOLVED_IN`
- `AFFECTED_BY`
- `HAS_RISK`
- `REQUIRES_ACTION`
- `AFFECTS_PLANT`
- `AFFECTS_ZONE`

## Risk Categories

- Explosion Risk
- Toxic Exposure
- Thermal Runaway
- Ignition Cascade
- Equipment Failure
- Weather Exposure
- Incident Recurrence
- Process Upset
- Operational Safety

## Recommendations

The recommendation engine now generates prioritized actions such as:

- Evacuate Zone
- Suspend Permit
- Shutdown Equipment
- Increase Ventilation
- Dispatch Maintenance
- Notify Safety Officer

Recommendations are derived from matched rules plus deterministic context-based escalation logic.

## Explainability

Every risk analysis now returns:

- Why the score was generated
- Evidence
- Contributing factors
- Applicable rules
- Historical similarity
- Recommended actions
- Graph impact summary

The engine never returns only a raw risk score.

## Historical Similarity

Similarity sources implemented:

- OSHA incidents loaded into PostgreSQL
- Historical incidents already stored in the system
- Tennessee Eastman processed scenario patterns

Returned output includes:

- Top similar events
- Similarity score
- Source classification
- Summary and supporting evidence

## Performance

- AI engine test suite:
  - `5` tests passed
  - latest local run completed in about `2.5s`
- Full PostgreSQL-backed validator:
  - completed successfully after AI engine changes
- Seed and ETL runtime during validated run:
  - `22.2s`
- Tennessee sample ETL runtime during validated run:
  - `10.041s`

## Verification Summary

- Backend startup: passed
- Database connectivity: passed
- Alembic migrations: passed
- Seed scripts: passed
- Risk analyze endpoint: passed
- Risk history endpoint: passed
- Risk live endpoint: passed
- Graph overview endpoint: passed
- Graph node endpoint: passed
- Graph neighbors endpoint: passed
- Graph path endpoint: passed
- Swagger: passed
- OpenAPI: passed
- Authentication: passed
- AI engine unit and integration tests: passed

## Deferred Work

- Gemini integration: deferred by instruction
- RAG integration: deferred by instruction
- Frontend implementation: deferred by instruction
