# Sentinel AI Project Tree

Generated on: Thursday, July 16, 2026

## Backend Packages

- `app`
- `app.ai`
- `app.api`
- `app.api.routes`
- `app.core`
- `app.database`
- `app.knowledge_graph`
- `app.middleware`
- `app.models`
- `app.rag`
- `app.repositories`
- `app.risk_engine`
- `app.schemas`
- `app.services`
- `app.tests`
- `app.utils`
- `app.vector_store`

## API Route Modules

- `backend/app/api/routes/actions.py`
  - `GET /api/v1/actions`
  - `GET /api/v1/actions/pending`
  - `POST /api/v1/actions`
  - `PUT /api/v1/actions/{action_id}`
- `backend/app/api/routes/analytics.py`
  - `GET /api/v1/analytics/overview`
- `backend/app/api/routes/auth.py`
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `GET /api/v1/auth/me`
- `backend/app/api/routes/compliance.py`
  - `GET /api/v1/compliance`
  - `POST /api/v1/compliance/generate`
- `backend/app/api/routes/copilot.py`
  - `POST /api/v1/copilot/chat`
  - `GET /api/v1/copilot/history`
  - `DELETE /api/v1/copilot/history`
- `backend/app/api/routes/dashboard.py`
  - `GET /api/v1/dashboard`
- `backend/app/api/routes/equipment.py`
  - `GET /api/v1/equipment`
  - `GET /api/v1/equipment/{equipment_id}`
  - `GET /api/v1/equipment/{equipment_id}/health`
  - `POST /api/v1/equipment`
  - `PUT /api/v1/equipment/{equipment_id}`
  - `DELETE /api/v1/equipment/{equipment_id}`
- `backend/app/api/routes/graph.py`
  - `GET /api/v1/graph`
  - `GET /api/v1/graph/node`
  - `GET /api/v1/graph/neighbors`
  - `GET /api/v1/graph/path`
- `backend/app/api/routes/health.py`
  - `GET /api/v1/health`
  - `GET /api/v1/version`
- `backend/app/api/routes/incidents.py`
  - `GET /api/v1/incidents`
  - `GET /api/v1/incidents/{incident_id}`
  - `GET /api/v1/incidents/{incident_id}/report`
  - `POST /api/v1/incidents`
  - `PUT /api/v1/incidents/{incident_id}`
  - `DELETE /api/v1/incidents/{incident_id}`
- `backend/app/api/routes/maintenance.py`
  - `GET /api/v1/maintenance`
  - `GET /api/v1/maintenance/overdue`
  - `GET /api/v1/maintenance/{maintenance_id}`
  - `POST /api/v1/maintenance`
  - `PUT /api/v1/maintenance/{maintenance_id}`
  - `DELETE /api/v1/maintenance/{maintenance_id}`
- `backend/app/api/routes/notifications.py`
  - `GET /api/v1/notifications`
  - `GET /api/v1/notifications/unread`
  - `POST /api/v1/notifications`
  - `PUT /api/v1/notifications/{notification_id}`
  - `DELETE /api/v1/notifications/{notification_id}`
- `backend/app/api/routes/permits.py`
  - `GET /api/v1/permits`
  - `GET /api/v1/permits/{permit_id}`
  - `GET /api/v1/permits/{permit_id}/conflicts`
  - `POST /api/v1/permits`
  - `PUT /api/v1/permits/{permit_id}`
  - `DELETE /api/v1/permits/{permit_id}`
- `backend/app/api/routes/plants.py`
  - `GET /api/v1/plants`
  - `GET /api/v1/plants/{plant_id}`
  - `POST /api/v1/plants`
  - `PUT /api/v1/plants/{plant_id}`
  - `DELETE /api/v1/plants/{plant_id}`
- `backend/app/api/routes/risk.py`
  - `POST /api/v1/risk/analyze`
  - `GET /api/v1/risk/history`
  - `GET /api/v1/risk/live`
- `backend/app/api/routes/sensors.py`
  - `GET /api/v1/sensors`
  - `GET /api/v1/sensors/{sensor_id}`
  - `POST /api/v1/sensors`
  - `PUT /api/v1/sensors/{sensor_id}`
  - `DELETE /api/v1/sensors/{sensor_id}`
  - `GET /api/v1/sensors/{sensor_id}/readings`
  - `POST /api/v1/sensors/readings`
  - `PUT /api/v1/sensors/readings/{reading_id}`
- `backend/app/api/routes/simulation.py`
  - `GET /api/v1/simulation/scenarios`
  - `POST /api/v1/simulation/start`
- `backend/app/api/routes/workers.py`
  - `GET /api/v1/workers`
  - `GET /api/v1/workers/{worker_id}`
  - `GET /api/v1/workers/{worker_id}/safety`
  - `POST /api/v1/workers`
  - `PUT /api/v1/workers/{worker_id}`
  - `DELETE /api/v1/workers/{worker_id}`
  - `POST /api/v1/workers/locations`
  - `PUT /api/v1/workers/locations/{location_id}`
- `backend/app/api/routes/zones.py`
  - `GET /api/v1/zones`
  - `GET /api/v1/zones/{zone_id}`
  - `GET /api/v1/zones/{zone_id}/summary`
  - `POST /api/v1/zones`
  - `PUT /api/v1/zones/{zone_id}`
  - `DELETE /api/v1/zones/{zone_id}`

## Database Models

- `User`
- `Plant`
- `Zone`
- `Equipment`
- `Sensor`
- `SensorReading`
- `Worker`
- `WorkerLocation`
- `Permit`
- `Maintenance`
- `Incident`
- `RiskEvent`
- `Recommendation`
- `Notification`
- `AuditLog`
- `ComplianceReport`
- `Document`
- `ChatHistory`

## Services

- `backend/app/services/analytics.py`
  - `AnalyticsService`
- `backend/app/services/auth.py`
  - `AuthService`
- `backend/app/services/compliance.py`
  - `ComplianceService`
- `backend/app/services/copilot.py`
  - `CopilotService`
- `backend/app/services/dashboard.py`
  - `DashboardService`
- `backend/app/services/entities.py`
  - `BaseEntityService`
  - `UserService`
  - `PlantService`
  - `ZoneService`
  - `EquipmentService`
  - `SensorService`
  - `SensorReadingService`
  - `WorkerService`
  - `WorkerLocationService`
  - `PermitService`
  - `MaintenanceService`
  - `IncidentService`
  - `RiskEventService`
  - `RecommendationService`
  - `NotificationService`
- `backend/app/services/ingestion.py`
  - utility ETL and dataset-loading functions
- `backend/app/services/risk.py`
  - `RiskService`
- `backend/app/services/simulation.py`
  - `SimulationService`

## Repositories

- `backend/app/repositories/base.py`
  - `BaseRepository`
- `backend/app/repositories/entities.py`
  - `UserRepository`
  - `PlantRepository`
  - `ZoneRepository`
  - `EquipmentRepository`
  - `SensorRepository`
  - `SensorReadingRepository`
  - `WorkerRepository`
  - `WorkerLocationRepository`
  - `PermitRepository`
  - `MaintenanceRepository`
  - `IncidentRepository`
  - `RiskEventRepository`
  - `RecommendationRepository`
  - `NotificationRepository`
  - `ComplianceReportRepository`
  - `DocumentRepository`
  - `ChatHistoryRepository`

## AI Modules

- `backend/app/ai/gemini.py`
- `backend/app/knowledge_graph/builder.py`
- `backend/app/knowledge_graph/service.py`
- `backend/app/risk_engine/compound.py`
- `backend/app/risk_engine/explainability.py`
- `backend/app/risk_engine/recommendations.py`
- `backend/app/risk_engine/rules.py`
- `backend/app/risk_engine/similarity.py`
- Support config: `backend/app/risk_engine/rules.json`

## RAG Modules

- `backend/app/rag/citations.py`
- `backend/app/rag/embeddings.py`
- `backend/app/rag/loaders.py`
- `backend/app/rag/retriever.py`
- Vector store support:
  - `backend/app/vector_store/faiss_store.py`

## Tests

- `backend/app/tests/test_ai_engine_integration.py`
- `backend/app/tests/test_copilot_service.py`
- `backend/app/tests/test_gemini_client.py`
- `backend/app/tests/test_knowledge_graph.py`
- `backend/app/tests/test_rag_retriever.py`
- `backend/app/tests/test_rule_engine.py`
