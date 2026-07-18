# Sentinel AI API Summary

Generated on: Thursday, July 16, 2026

Base API prefix: `/api/v1`

Total discovered endpoints: `82`

## Health

- `GET /api/v1/health`
- `GET /api/v1/version`

## Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

## Graph

- `GET /api/v1/graph`
- `GET /api/v1/graph/node`
- `GET /api/v1/graph/neighbors`
- `GET /api/v1/graph/path`

## Dashboard

- `GET /api/v1/dashboard`

## Plants

- `GET /api/v1/plants`
- `GET /api/v1/plants/{plant_id}`
- `POST /api/v1/plants`
- `PUT /api/v1/plants/{plant_id}`
- `DELETE /api/v1/plants/{plant_id}`

## Zones

- `GET /api/v1/zones`
- `GET /api/v1/zones/{zone_id}`
- `GET /api/v1/zones/{zone_id}/summary`
- `POST /api/v1/zones`
- `PUT /api/v1/zones/{zone_id}`
- `DELETE /api/v1/zones/{zone_id}`

## Equipment

- `GET /api/v1/equipment`
- `GET /api/v1/equipment/{equipment_id}`
- `GET /api/v1/equipment/{equipment_id}/health`
- `POST /api/v1/equipment`
- `PUT /api/v1/equipment/{equipment_id}`
- `DELETE /api/v1/equipment/{equipment_id}`

## Sensors

- `GET /api/v1/sensors`
- `GET /api/v1/sensors/{sensor_id}`
- `POST /api/v1/sensors`
- `PUT /api/v1/sensors/{sensor_id}`
- `DELETE /api/v1/sensors/{sensor_id}`
- `GET /api/v1/sensors/{sensor_id}/readings`
- `POST /api/v1/sensors/readings`
- `PUT /api/v1/sensors/readings/{reading_id}`

## Workers

- `GET /api/v1/workers`
- `GET /api/v1/workers/{worker_id}`
- `GET /api/v1/workers/{worker_id}/safety`
- `POST /api/v1/workers`
- `PUT /api/v1/workers/{worker_id}`
- `DELETE /api/v1/workers/{worker_id}`
- `POST /api/v1/workers/locations`
- `PUT /api/v1/workers/locations/{location_id}`

## Permits

- `GET /api/v1/permits`
- `GET /api/v1/permits/{permit_id}`
- `GET /api/v1/permits/{permit_id}/conflicts`
- `POST /api/v1/permits`
- `PUT /api/v1/permits/{permit_id}`
- `DELETE /api/v1/permits/{permit_id}`

## Maintenance

- `GET /api/v1/maintenance`
- `GET /api/v1/maintenance/overdue`
- `GET /api/v1/maintenance/{maintenance_id}`
- `POST /api/v1/maintenance`
- `PUT /api/v1/maintenance/{maintenance_id}`
- `DELETE /api/v1/maintenance/{maintenance_id}`

## Incidents

- `GET /api/v1/incidents`
- `GET /api/v1/incidents/{incident_id}`
- `GET /api/v1/incidents/{incident_id}/report`
- `POST /api/v1/incidents`
- `PUT /api/v1/incidents/{incident_id}`
- `DELETE /api/v1/incidents/{incident_id}`

## Risk

- `POST /api/v1/risk/analyze`
- `GET /api/v1/risk/history`
- `GET /api/v1/risk/live`

## Action Center

- `GET /api/v1/actions`
- `GET /api/v1/actions/pending`
- `POST /api/v1/actions`
- `PUT /api/v1/actions/{action_id}`

## Analytics

- `GET /api/v1/analytics/overview`

## Copilot

- `POST /api/v1/copilot/chat`
- `GET /api/v1/copilot/history`
- `DELETE /api/v1/copilot/history`

## Notifications

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread`
- `POST /api/v1/notifications`
- `PUT /api/v1/notifications/{notification_id}`
- `DELETE /api/v1/notifications/{notification_id}`

## Compliance

- `GET /api/v1/compliance`
- `POST /api/v1/compliance/generate`

## Simulation

- `GET /api/v1/simulation/scenarios`
- `POST /api/v1/simulation/start`
