# ETL Report

Generated: 2026-07-16
Execution mode: Development sample mode
Environment variable: `TE_SAMPLE_MODE=true`

## Datasets Detected

- AI4I: `datasets/ai4i/ai4i2020.csv` (`.csv`)
- OSHA: `datasets/osha/data.xlsx` (`.xlsx`)
- Tennessee Eastman benchmark: `datasets/TEdata/TEdata/*.dat` (`.dat`)
- Synthetic-only operational datasets: `datasets/generated/*.json` (`.json`)
- Tennessee Eastman support/reference files detected on disk: `readme.txt`, `.f`, `.ini`

## Sample Size Used

- Tennessee Eastman sample mode: enabled
- Sample fraction: `0.1`
- Source rows available: `31700`
- Source rows processed: `3170`
- Files processed: `44`
- Chunk size: `64` rows
- Insert batch size: `2000`

## Rows Processed And Inserted

- Generated foundation:
  - Plants created: `1`
  - Zones created: `4`
  - Workers created: `10`
- AI4I:
  - Equipment created: `10000`
- Tennessee Eastman:
  - Sensors prepared: `52`
  - Derived sensor readings inserted: `164840`
  - Batch flushes: `110`
  - Raw benchmark dataset stored in PostgreSQL: `false`
- OSHA:
  - Incidents created: `15417`
- Generated operations:
  - Permits created: `5`
  - Maintenance records created: `5`

## Tables Populated

- Seed-populated tables:
  - `plants`
  - `zones`
  - `workers`
  - `equipment`
  - `sensors`
  - `sensor_readings`
  - `incidents`
  - `permits`
  - `maintenance`
- CRUD validation also exercised:
  - `users`
  - `worker_locations`
  - `risk_events`
  - `recommendations`
  - `notifications`
  - `audit_logs`
  - `compliance_reports`
  - `documents`
  - `chat_history`

## Validation Results

- Database connectivity: passed
- Alembic migrations: passed
- CRUD operations: passed
- Sample ETL: passed
- Seed scripts: passed
- Backend startup: passed
- Health endpoint: passed
- Swagger UI: passed
- OpenAPI document: passed
- Authentication: passed

## Performance Metrics

- Generated foundation ETL: `0.072s`
- AI4I ETL: `3.055s`
- Tennessee Eastman ETL: `9.298s`
- OSHA ETL: `7.750s`
- Generated operations ETL: `0.207s`
- Total seed and ETL runtime: `20.835s`

## Development Notes

- Tennessee Eastman now uses streaming reads and chunked processing.
- The full Tennessee benchmark dataset is never held entirely in memory during normal sample-mode execution.
- Only processed features and derived sensor readings are stored in PostgreSQL.
- The raw Tennessee Eastman benchmark files remain on disk for on-demand processing.
- Full mode remains available for production by setting `TE_SAMPLE_MODE=false`.

## Remaining Production-Only Tasks

- Provision sufficient PostgreSQL disk capacity for full Tennessee Eastman loading.
- Run a full-mode Tennessee Eastman validation with `TE_SAMPLE_MODE=false`.
- Tune PostgreSQL storage, WAL, and batch-size settings for production-scale ingestion.
- Add operational scheduling and monitoring for production benchmark processing.
