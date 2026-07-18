import asyncio
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_DIR / "backend"
PG_BIN = Path(
    r"C:\Users\Shubhankar\OneDrive\Desktop\SENTIN~2\backend\.postgresql\pgsql16\pgsql\bin"
)
VENV_PYTHON = REPO_DIR / ".venv" / "Scripts" / "python.exe"
ALEMBIC_EXE = REPO_DIR / ".venv" / "Scripts" / "alembic.exe"
PSQL_EXE = PG_BIN / "psql.exe"
INITDB_EXE = PG_BIN / "initdb.exe"
POSTGRES_EXE = PG_BIN / "postgres.exe"
CREATEDB_EXE = PG_BIN / "createdb.exe"
PORT = 55432
DEFAULT_PGDATA_DIR = Path(tempfile.gettempdir()) / "sentinel_ai_pgdata_dev"
PGDATA_DIR = Path(os.environ.get("SENTINEL_PGDATA", str(DEFAULT_PGDATA_DIR)))

sys.path.insert(0, str(BACKEND_DIR))


def run_command(args, *, cwd, env, check=True, label=None):
    print(f"RUN {label or args[0]}")
    completed = subprocess.run(
        [str(arg) for arg in args],
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
    )
    if completed.stdout.strip():
        print(completed.stdout.strip())
    if completed.stderr.strip():
        print(completed.stderr.strip())
    if check and completed.returncode != 0:
        raise RuntimeError(f"Command failed ({label or args[0]}): exit {completed.returncode}")
    return completed


def wait_for_tcp(host, port, process, *, timeout=90):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Process exited early with code {process.returncode}")
        try:
            with socket.create_connection((host, port), timeout=1):
                return
        except OSError:
            time.sleep(1)
    raise TimeoutError(f"Timed out waiting for {host}:{port}")


def wait_for_postgres_ready(process, env, *, timeout=120):
    wait_for_tcp("127.0.0.1", PORT, process, timeout=timeout)
    deadline = time.time() + timeout
    last_error = ""
    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Process exited early with code {process.returncode}")
        completed = subprocess.run(
            [
                str(PSQL_EXE),
                "-h",
                "127.0.0.1",
                "-p",
                str(PORT),
                "-U",
                "postgres",
                "-d",
                "postgres",
                "-c",
                "SELECT 1;",
            ],
            cwd=str(BACKEND_DIR),
            env=env,
            capture_output=True,
            text=True,
        )
        if completed.returncode == 0:
            return
        last_error = (completed.stderr or completed.stdout).strip()
        time.sleep(1)
    raise TimeoutError(f"Timed out waiting for PostgreSQL readiness. Last error: {last_error}")


def tail_text(path: Path, max_chars: int = 4000) -> str:
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8", errors="replace")
    return text[-max_chars:]


async def validate_database_layer():
    from sqlalchemy import func, inspect, select
    from sqlalchemy.exc import IntegrityError

    from app.database.seed import seed_database
    from app.database.session import SessionLocal, dispose_engine, engine, ping_database
    from app.core.config import get_settings
    from app.models.entities import (
        AuditLog,
        ChatHistory,
        ComplianceReport,
        Document,
        Equipment,
        Incident,
        Maintenance,
        Notification,
        Permit,
        Plant,
        Recommendation,
        RiskEvent,
        Sensor,
        SensorReading,
        User,
        Worker,
        WorkerLocation,
        Zone,
    )
    from app.models.enums import (
        ComplianceFramework,
        EquipmentStatus,
        IncidentStatus,
        IncidentType,
        LifecycleStatus,
        MaintenanceStatus,
        MaintenanceType,
        NotificationType,
        PermitStatus,
        PermitType,
        PriorityLevel,
        RecommendationStatus,
        RiskStatus,
        SensorStatus,
        SeverityLevel,
        UserRole,
    )
    from app.repositories.base import BaseRepository
    from app.repositories.entities import (
        ChatHistoryRepository,
        ComplianceReportRepository,
        EquipmentRepository,
        IncidentRepository,
        MaintenanceRepository,
        NotificationRepository,
        PermitRepository,
        PlantRepository,
        RecommendationRepository,
        RiskEventRepository,
        SensorReadingRepository,
        SensorRepository,
        UserRepository,
        WorkerLocationRepository,
        WorkerRepository,
        ZoneRepository,
    )

    print("PING database")
    await ping_database()
    settings = get_settings()
    if not settings.te_sample_mode:
        raise AssertionError("Development validation requires TE_SAMPLE_MODE=true.")

    print("SEED database")
    async with SessionLocal() as session:
        seed_summary = await seed_database(session)
    te_summary = seed_summary["tennessee"]
    if not te_summary.get("sample_mode"):
        raise AssertionError("Tennessee ETL sample mode was expected but not enabled.")
    if te_summary.get("raw_dataset_stored") is not False:
        raise AssertionError("Tennessee ETL should not store the raw benchmark dataset.")

    print("INSPECT schema")
    expected_tables = {
        "users",
        "plants",
        "zones",
        "equipment",
        "sensors",
        "sensor_readings",
        "workers",
        "worker_locations",
        "permits",
        "maintenance",
        "incidents",
        "risk_events",
        "recommendations",
        "notifications",
        "audit_logs",
        "compliance_reports",
        "documents",
        "chat_history",
    }
    expected_indexes = {
        "sensor_readings": {
            "ix_sensor_readings_sensor_id",
            "ix_sensor_readings_timestamp",
            "ix_sensor_readings_status",
        },
        "worker_locations": {
            "ix_worker_locations_worker_id",
            "ix_worker_locations_zone_id",
            "ix_worker_locations_timestamp",
        },
        "incidents": {
            "ix_incidents_zone_id",
            "ix_incidents_equipment_id",
            "ix_incidents_worker_id",
            "ix_incidents_reported_at",
            "ix_incidents_incident_type",
            "ix_incidents_status",
        },
        "risk_events": {
            "ix_risk_events_zone_id",
            "ix_risk_events_risk_score",
            "ix_risk_events_status",
        },
        "sensors": {
            "ix_sensors_zone_id",
            "ix_sensors_equipment_id",
            "ix_sensors_sensor_type",
            "ix_sensors_status",
        },
        "equipment": {"ix_equipment_plant_id", "ix_equipment_zone_id", "ix_equipment_status"},
        "permits": {
            "ix_permits_zone_id",
            "ix_permits_worker_id",
            "ix_permits_equipment_id",
            "ix_permits_status",
        },
        "maintenance": {
            "ix_maintenance_equipment_id",
            "ix_maintenance_scheduled_date",
            "ix_maintenance_status",
        },
        "plants": {"ix_plants_name", "ix_plants_status"},
        "users": {"ix_users_email", "ix_users_plant_id", "ix_users_status"},
        "workers": {"ix_workers_worker_code", "ix_workers_status"},
        "recommendations": {"ix_recommendations_risk_event_id", "ix_recommendations_status"},
    }
    expected_fk_columns = {
        "users": {"plant_id"},
        "zones": {"plant_id"},
        "equipment": {"plant_id", "zone_id"},
        "sensors": {"equipment_id", "zone_id"},
        "sensor_readings": {"sensor_id"},
        "worker_locations": {"worker_id", "zone_id"},
        "permits": {"worker_id", "zone_id", "equipment_id"},
        "maintenance": {"equipment_id"},
        "incidents": {"zone_id", "equipment_id", "worker_id"},
        "risk_events": {"zone_id"},
        "recommendations": {"risk_event_id"},
        "notifications": {"user_id"},
        "audit_logs": {"user_id"},
        "compliance_reports": {"plant_id"},
        "documents": {"plant_id"},
        "chat_history": {"user_id"},
    }
    soft_delete_tables = {
        "users",
        "plants",
        "zones",
        "equipment",
        "sensors",
        "workers",
        "permits",
        "maintenance",
        "incidents",
        "risk_events",
        "recommendations",
        "notifications",
        "documents",
    }

    async with engine.begin() as connection:
        def inspect_schema(sync_conn):
            inspector = inspect(sync_conn)
            tables = set(inspector.get_table_names())
            indexes = {table: {idx["name"] for idx in inspector.get_indexes(table)} for table in tables}
            foreign_keys = {
                table: {
                    fk["constrained_columns"][0]
                    for fk in inspector.get_foreign_keys(table)
                    if fk["constrained_columns"]
                }
                for table in tables
            }
            columns = {
                table: {column["name"]: str(column["type"]) for column in inspector.get_columns(table)}
                for table in tables
            }
            pk_columns = {
                table: inspector.get_pk_constraint(table).get("constrained_columns", [])
                for table in tables
            }
            return tables, indexes, foreign_keys, columns, pk_columns

        tables, indexes, foreign_keys, columns, pk_columns = await connection.run_sync(
            inspect_schema
        )

    missing_tables = sorted(expected_tables - tables)
    if missing_tables:
        raise AssertionError(f"Missing tables: {missing_tables}")

    for table, required_indexes in expected_indexes.items():
        missing = required_indexes - indexes.get(table, set())
        if missing:
            raise AssertionError(f"Missing indexes on {table}: {sorted(missing)}")

    for table, required_fks in expected_fk_columns.items():
        missing = required_fks - foreign_keys.get(table, set())
        if missing:
            raise AssertionError(f"Missing foreign keys on {table}: {sorted(missing)}")

    for table in expected_tables:
        table_columns = columns[table]
        required_base = {"id", "created_at", "updated_at"}
        missing = required_base - set(table_columns)
        if missing:
            raise AssertionError(f"Missing base columns on {table}: {sorted(missing)}")
        if table in soft_delete_tables and "deleted_at" not in table_columns:
            raise AssertionError(f"Missing deleted_at on soft-delete table {table}")
        if pk_columns[table] != ["id"]:
            raise AssertionError(f"Unexpected primary key definition on {table}: {pk_columns[table]}")
        if "UUID" not in table_columns["id"].upper():
            raise AssertionError(
                f"Primary key on {table} is not UUID: {table_columns['id']}"
            )

    print("VALIDATE repository CRUD")
    now = datetime.now(UTC)
    suffix = int(time.time())
    crud_validated = []

    async with SessionLocal() as session:
        user_repo = UserRepository(session)
        plant_repo = PlantRepository(session)
        zone_repo = ZoneRepository(session)
        equipment_repo = EquipmentRepository(session)
        sensor_repo = SensorRepository(session)
        sensor_reading_repo = SensorReadingRepository(session)
        worker_repo = WorkerRepository(session)
        worker_location_repo = WorkerLocationRepository(session)
        permit_repo = PermitRepository(session)
        maintenance_repo = MaintenanceRepository(session)
        incident_repo = IncidentRepository(session)
        risk_repo = RiskEventRepository(session)
        recommendation_repo = RecommendationRepository(session)
        notification_repo = NotificationRepository(session)
        compliance_repo = ComplianceReportRepository(session)
        chat_repo = ChatHistoryRepository(session)
        document_repo = BaseRepository(session, Document)
        audit_repo = BaseRepository(session, AuditLog)

        async def verify_soft_deleted(model, item_id):
            instance = await session.scalar(select(model).where(model.id == item_id))
            if instance is None or getattr(instance, "deleted_at", None) is None:
                raise AssertionError(
                    f"Soft delete verification failed for {model.__tablename__}:{item_id}"
                )

        async def verify_hard_deleted(model, item_id):
            count = await session.scalar(
                select(func.count()).select_from(model).where(model.id == item_id)
            )
            if int(count or 0) != 0:
                raise AssertionError(
                    f"Hard delete verification failed for {model.__tablename__}:{item_id}"
                )

        user = await user_repo.create(
            {
                "name": "DB Validation User",
                "email": f"db-validation-{suffix}@sentinelai.com",
                "password_hash": "hashed-password",
                "role": UserRole.VIEWER,
                "status": LifecycleStatus.ACTIVE,
            }
        )
        await session.commit()
        await user_repo.update(user, {"status": LifecycleStatus.INACTIVE})
        await session.commit()
        crud_validated.append("users")
        user_id = user.id
        user_email = user.email
        try:
            await user_repo.create(
                {
                    "name": "Duplicate Email User",
                    "email": user_email,
                    "password_hash": "hashed-password",
                    "role": UserRole.VIEWER,
                    "status": LifecycleStatus.ACTIVE,
                }
            )
            await session.commit()
            raise AssertionError("Expected unique constraint failure for users.email")
        except IntegrityError:
            await session.rollback()
        user = await user_repo.get(user_id)

        plant = await plant_repo.create(
            {
                "name": f"DB Validation Plant {suffix}",
                "location": "Validation Site",
                "industry": "Chemical",
                "status": LifecycleStatus.ACTIVE,
                "latitude": 19.1,
                "longitude": 72.9,
            }
        )
        await session.commit()
        await plant_repo.update(plant, {"location": "Updated Validation Site"})
        await session.commit()
        crud_validated.append("plants")
        plant_id = plant.id

        zone = await zone_repo.create(
            {
                "plant_id": plant_id,
                "zone_name": f"Validation Zone {suffix}",
                "risk_level": SeverityLevel.MODERATE,
                "latitude": 19.11,
                "longitude": 72.91,
                "description": "Validation zone",
            }
        )
        await session.commit()
        await zone_repo.update(zone, {"description": "Updated validation zone"})
        await session.commit()
        crud_validated.append("zones")
        zone_id = zone.id

        equipment = await equipment_repo.create(
            {
                "plant_id": plant_id,
                "zone_id": zone_id,
                "equipment_name": f"Validation Pump {suffix}",
                "equipment_type": "Pump",
                "manufacturer": "Sentinel QA",
                "health_score": 91.2,
                "status": EquipmentStatus.HEALTHY,
                "external_id": f"DB-EQ-{suffix}",
                "source_dataset": "validation",
            }
        )
        await session.commit()
        await equipment_repo.update(
            equipment, {"status": EquipmentStatus.WARNING, "health_score": 74.5}
        )
        await session.commit()
        crud_validated.append("equipment")
        equipment_id = equipment.id
        equipment_external_id = equipment.external_id
        try:
            await equipment_repo.create(
                {
                    "plant_id": plant_id,
                    "zone_id": zone_id,
                    "equipment_name": "Duplicate Equipment",
                    "equipment_type": "Pump",
                    "manufacturer": "Sentinel QA",
                    "health_score": 50.0,
                    "status": EquipmentStatus.HEALTHY,
                    "external_id": equipment_external_id,
                    "source_dataset": "validation",
                }
            )
            await session.commit()
            raise AssertionError("Expected unique constraint failure for equipment.external_id")
        except IntegrityError:
            await session.rollback()
        equipment = await equipment_repo.get(equipment_id)

        sensor = await sensor_repo.create(
            {
                "equipment_id": equipment_id,
                "zone_id": zone_id,
                "sensor_name": f"Validation Sensor {suffix}",
                "sensor_type": "temperature",
                "unit": "C",
                "min_value": 0.0,
                "max_value": 200.0,
                "status": SensorStatus.ACTIVE,
                "external_id": f"DB-SENSOR-{suffix}",
            }
        )
        await session.commit()
        await sensor_repo.update(sensor, {"status": SensorStatus.MAINTENANCE, "unit": "degC"})
        await session.commit()
        crud_validated.append("sensors")
        sensor_id = sensor.id
        sensor_external_id = sensor.external_id
        try:
            await sensor_repo.create(
                {
                    "equipment_id": equipment_id,
                    "zone_id": zone_id,
                    "sensor_name": "Duplicate Sensor",
                    "sensor_type": "temperature",
                    "unit": "C",
                    "min_value": 0.0,
                    "max_value": 100.0,
                    "status": SensorStatus.ACTIVE,
                    "external_id": sensor_external_id,
                }
            )
            await session.commit()
            raise AssertionError("Expected unique constraint failure for sensors.external_id")
        except IntegrityError:
            await session.rollback()
        sensor = await sensor_repo.get(sensor_id)

        sensor_reading = await sensor_reading_repo.create(
            {
                "sensor_id": sensor_id,
                "timestamp": now,
                "value": 63.5,
                "quality": "validation",
                "status": "ok",
                "scenario": "validation",
            }
        )
        await session.commit()
        await sensor_reading_repo.update(sensor_reading, {"value": 64.2, "status": "reviewed"})
        await session.commit()
        crud_validated.append("sensor_readings")
        sensor_reading_id = sensor_reading.id

        worker = await worker_repo.create(
            {
                "worker_code": f"DB-W-{suffix}",
                "name": "Validation Worker",
                "department": "Safety",
                "designation": "Inspector",
                "phone": "+91-9000000000",
                "status": LifecycleStatus.ACTIVE,
            }
        )
        await session.commit()
        await worker_repo.update(
            worker, {"status": LifecycleStatus.INACTIVE, "phone": "+91-9000000001"}
        )
        await session.commit()
        crud_validated.append("workers")
        worker_id = worker.id
        worker_code = worker.worker_code
        try:
            await worker_repo.create(
                {
                    "worker_code": worker_code,
                    "name": "Duplicate Worker",
                    "department": "Ops",
                    "designation": "Operator",
                    "phone": None,
                    "status": LifecycleStatus.ACTIVE,
                }
            )
            await session.commit()
            raise AssertionError("Expected unique constraint failure for workers.worker_code")
        except IntegrityError:
            await session.rollback()
        worker = await worker_repo.get(worker_id)

        worker_location = await worker_location_repo.create(
            {
                "worker_id": worker_id,
                "zone_id": zone_id,
                "timestamp": now,
                "latitude": 19.12,
                "longitude": 72.92,
            }
        )
        await session.commit()
        await worker_location_repo.update(worker_location, {"latitude": 19.13, "longitude": 72.93})
        await session.commit()
        crud_validated.append("worker_locations")
        worker_location_id = worker_location.id

        permit = await permit_repo.create(
            {
                "permit_number": f"DB-PTW-{suffix}",
                "permit_type": PermitType.HOT_WORK,
                "worker_id": worker_id,
                "zone_id": zone_id,
                "equipment_id": equipment_id,
                "start_time": now,
                "end_time": now + timedelta(hours=2),
                "status": PermitStatus.OPEN,
                "approved_by": "Validation Admin",
            }
        )
        await session.commit()
        await permit_repo.update(permit, {"status": PermitStatus.APPROVED})
        await session.commit()
        crud_validated.append("permits")
        permit_id = permit.id
        permit_number = permit.permit_number
        try:
            await permit_repo.create(
                {
                    "permit_number": permit_number,
                    "permit_type": PermitType.COLD_WORK,
                    "worker_id": worker_id,
                    "zone_id": zone_id,
                    "equipment_id": equipment_id,
                    "start_time": now,
                    "end_time": now + timedelta(hours=1),
                    "status": PermitStatus.DRAFT,
                    "approved_by": None,
                }
            )
            await session.commit()
            raise AssertionError("Expected unique constraint failure for permits.permit_number")
        except IntegrityError:
            await session.rollback()
        permit = await permit_repo.get(permit_id)

        maintenance = await maintenance_repo.create(
            {
                "equipment_id": equipment_id,
                "maintenance_type": MaintenanceType.INSPECTION,
                "status": MaintenanceStatus.SCHEDULED,
                "assigned_to": "Validation Team",
                "scheduled_date": now + timedelta(days=1),
                "completed_date": None,
                "remarks": "Validation maintenance record",
            }
        )
        await session.commit()
        await maintenance_repo.update(maintenance, {"status": MaintenanceStatus.RUNNING})
        await session.commit()
        crud_validated.append("maintenance")
        maintenance_id = maintenance.id

        incident = await incident_repo.create(
            {
                "title": f"Validation Incident {suffix}",
                "description": "Validation incident for CRUD checks.",
                "severity": SeverityLevel.HIGH,
                "zone_id": zone_id,
                "equipment_id": equipment_id,
                "worker_id": worker_id,
                "incident_type": IncidentType.NEAR_MISS,
                "root_cause": "Validation",
                "status": IncidentStatus.OPEN,
                "reported_at": now,
                "closed_at": None,
                "evidence": [{"source": "validation"}],
                "ai_summary": "Validation summary",
                "source_dataset": "validation",
            }
        )
        await session.commit()
        await incident_repo.update(
            incident,
            {"status": IncidentStatus.INVESTIGATING, "root_cause": "Updated validation"},
        )
        await session.commit()
        crud_validated.append("incidents")
        incident_id = incident.id

        risk_event = await risk_repo.create(
            {
                "zone_id": zone_id,
                "risk_score": 82.5,
                "severity": SeverityLevel.HIGH,
                "confidence": 0.91,
                "risk_category": "gas_leak",
                "reason": "Validation trigger",
                "recommendation": "Inspect equipment and isolate area.",
                "expected_consequence": "Operational disruption",
                "status": RiskStatus.OPEN,
                "evidence": [{"signal": "validation"}],
                "affected_assets": [],
                "affected_workers": [],
            }
        )
        await session.commit()
        await risk_repo.update(risk_event, {"status": RiskStatus.ACKNOWLEDGED})
        await session.commit()
        crud_validated.append("risk_events")
        risk_event_id = risk_event.id

        recommendation = await recommendation_repo.create(
            {
                "risk_event_id": risk_event_id,
                "action": "Perform validation mitigation.",
                "priority": PriorityLevel.HIGH,
                "assigned_to": "Validation Team",
                "status": RecommendationStatus.OPEN,
                "completed_at": None,
            }
        )
        await session.commit()
        await recommendation_repo.update(recommendation, {"status": RecommendationStatus.IN_PROGRESS})
        await session.commit()
        crud_validated.append("recommendations")
        recommendation_id = recommendation.id

        notification = await notification_repo.create(
            {
                "user_id": user_id,
                "title": "Validation notification",
                "message": "Validation message",
                "type": NotificationType.INFO,
                "priority": PriorityLevel.LOW,
                "read": False,
            }
        )
        await session.commit()
        await notification_repo.update(notification, {"read": True})
        await session.commit()
        crud_validated.append("notifications")
        notification_id = notification.id

        audit_log = await audit_repo.create(
            {
                "user_id": user_id,
                "action": "validation_create",
                "resource": "database_layer",
                "old_value": None,
                "new_value": {"status": "created"},
                "timestamp": now,
            }
        )
        await session.commit()
        await audit_repo.update(audit_log, {"resource": "database_layer_updated"})
        await session.commit()
        crud_validated.append("audit_logs")
        audit_log_id = audit_log.id

        compliance_report = await compliance_repo.create(
            {
                "plant_id": plant_id,
                "framework": ComplianceFramework.OSHA,
                "score": 94.5,
                "violations": [],
                "recommendations": [],
                "generated_at": now,
            }
        )
        await session.commit()
        await compliance_repo.update(compliance_report, {"score": 96.0})
        await session.commit()
        crud_validated.append("compliance_reports")
        compliance_report_id = compliance_report.id

        document = await document_repo.create(
            {
                "plant_id": plant_id,
                "title": "Validation SOP",
                "document_type": "sop",
                "storage_path": "/validation/sop.pdf",
                "metadata_json": {"version": 1},
            }
        )
        await session.commit()
        await document_repo.update(
            document, {"title": "Validation SOP Updated", "metadata_json": {"version": 2}}
        )
        await session.commit()
        crud_validated.append("documents")
        document_id = document.id

        chat = await chat_repo.create(
            {
                "user_id": user_id,
                "question": "Validation question?",
                "response": "Validation response.",
                "citations": [{"source": "validation"}],
                "timestamp": now,
            }
        )
        await session.commit()
        await chat_repo.update(chat, {"response": "Validation response updated."})
        await session.commit()
        crud_validated.append("chat_history")
        chat_id = chat.id

        user = await user_repo.get(user_id)
        plant = await plant_repo.get(plant_id)
        zone = await zone_repo.get(zone_id)
        equipment = await equipment_repo.get(equipment_id)
        sensor = await sensor_repo.get(sensor_id)
        worker = await worker_repo.get(worker_id)
        permit = await permit_repo.get(permit_id)
        worker_location = await worker_location_repo.get(worker_location_id)
        sensor_reading = await sensor_reading_repo.get(sensor_reading_id)

        await chat_repo.delete(chat)
        await session.commit()
        await verify_hard_deleted(ChatHistory, chat_id)

        await document_repo.delete(document)
        await session.commit()
        await verify_soft_deleted(Document, document_id)

        await compliance_repo.delete(compliance_report)
        await session.commit()
        await verify_hard_deleted(ComplianceReport, compliance_report_id)

        await audit_repo.delete(audit_log)
        await session.commit()
        await verify_hard_deleted(AuditLog, audit_log_id)

        await notification_repo.delete(notification)
        await session.commit()
        await verify_soft_deleted(Notification, notification_id)

        await recommendation_repo.delete(recommendation)
        await session.commit()
        await verify_soft_deleted(Recommendation, recommendation_id)

        await risk_repo.delete(risk_event)
        await session.commit()
        await verify_soft_deleted(RiskEvent, risk_event_id)

        await incident_repo.delete(incident)
        await session.commit()
        await verify_soft_deleted(Incident, incident_id)

        await maintenance_repo.delete(maintenance)
        await session.commit()
        await verify_soft_deleted(Maintenance, maintenance_id)

        await permit_repo.delete(permit)
        await session.commit()
        await verify_soft_deleted(Permit, permit_id)

        await worker_location_repo.delete(worker_location)
        await session.commit()
        await verify_hard_deleted(WorkerLocation, worker_location_id)

        await sensor_reading_repo.delete(sensor_reading)
        await session.commit()
        await verify_hard_deleted(SensorReading, sensor_reading_id)

        await sensor_repo.delete(sensor)
        await session.commit()
        await verify_soft_deleted(Sensor, sensor_id)

        await equipment_repo.delete(equipment)
        await session.commit()
        await verify_soft_deleted(Equipment, equipment_id)

        await zone_repo.delete(zone)
        await session.commit()
        await verify_soft_deleted(Zone, zone_id)

        await worker_repo.delete(worker)
        await session.commit()
        await verify_soft_deleted(Worker, worker_id)

        await plant_repo.delete(plant)
        await session.commit()
        await verify_soft_deleted(Plant, plant_id)

        await user_repo.delete(user)
        await session.commit()
        await verify_soft_deleted(User, user_id)

        table_counts = {}
        for table_name, model in {
            "plants": Plant,
            "workers": Worker,
            "equipment": Equipment,
            "sensors": Sensor,
            "sensor_readings": SensorReading,
            "incidents": Incident,
            "permits": Permit,
            "maintenance": Maintenance,
            "risk_events": RiskEvent,
            "recommendations": Recommendation,
            "notifications": Notification,
            "compliance_reports": ComplianceReport,
            "documents": Document,
            "chat_history": ChatHistory,
            "audit_logs": AuditLog,
        }.items():
            count = await session.scalar(select(func.count()).select_from(model))
            table_counts[table_name] = int(count or 0)

    await dispose_engine()
    return {
        "seed_summary": seed_summary,
        "table_counts": table_counts,
        "crud_tables_validated": crud_validated,
        "schema_tables_verified": sorted(expected_tables),
    }


def wait_for_http(url, process, *, timeout=90):
    import httpx

    deadline = time.time() + timeout
    last_error = None
    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"API process exited early with code {process.returncode}")
        try:
            response = httpx.get(url, timeout=5.0)
            if response.status_code < 500:
                return response
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        time.sleep(1)
    raise TimeoutError(f"Timed out waiting for {url}. Last error: {last_error}")


def validate_api():
    import httpx

    api_logs = {
        "health": None,
        "swagger": None,
        "openapi": None,
        "login": None,
        "plants": None,
        "zones": None,
        "equipment": None,
        "workers": None,
        "sensors": None,
        "permits": None,
        "maintenance": None,
        "incidents": None,
        "risk": None,
        "graph": None,
        "dashboard": None,
        "analytics": None,
    }

    def expect(response, expected_status=200, label="request"):
        if response.status_code != expected_status:
            raise AssertionError(f"{label} returned {response.status_code}: {response.text}")
        body = response.json()
        if not body.get("success", False):
            raise AssertionError(f"{label} did not succeed: {body}")
        return body["data"]

    suffix = int(time.time())
    with httpx.Client(
        base_url="http://127.0.0.1:8000", timeout=30.0, follow_redirects=True
    ) as client:
        api_logs["health"] = expect(client.get("/api/v1/health"), label="health")
        docs_response = client.get("/docs")
        if docs_response.status_code != 200 or "Swagger UI" not in docs_response.text:
            raise AssertionError(f"swagger docs returned {docs_response.status_code}")
        api_logs["swagger"] = {"status_code": docs_response.status_code}
        openapi_response = client.get("/openapi.json")
        if openapi_response.status_code != 200:
            raise AssertionError(f"openapi returned {openapi_response.status_code}")
        api_logs["openapi"] = {"status_code": openapi_response.status_code}
        login_data = expect(
            client.post(
                "/api/v1/auth/login",
                json={"email": "admin@sentinelai.com", "password": "Admin123!"},
            ),
            label="login",
        )
        api_logs["login"] = {"user_id": login_data["user"]["id"]}
        headers = {"Authorization": f"Bearer {login_data['tokens']['access_token']}"}

        expect(client.get("/api/v1/auth/me", headers=headers), label="auth/me")

        plant = expect(
            client.post(
                "/api/v1/plants",
                headers=headers,
                json={
                    "name": f"API Validation Plant {suffix}",
                    "location": "API Site",
                    "industry": "Manufacturing",
                    "status": "active",
                    "latitude": 19.2,
                    "longitude": 72.8,
                },
            ),
            label="create plant",
        )
        api_logs["plants"] = {"created_id": plant["id"]}
        expect(client.get("/api/v1/plants", headers=headers), label="list plants")
        plant = expect(
            client.put(
                f"/api/v1/plants/{plant['id']}",
                headers=headers,
                json={"location": "API Site Updated"},
            ),
            label="update plant",
        )

        zone = expect(
            client.post(
                "/api/v1/zones",
                headers=headers,
                json={
                    "plant_id": plant["id"],
                    "zone_name": f"API Zone {suffix}",
                    "risk_level": "moderate",
                    "latitude": 19.21,
                    "longitude": 72.81,
                    "description": "API validation zone",
                },
            ),
            label="create zone",
        )
        api_logs["zones"] = {"created_id": zone["id"]}
        expect(client.get(f"/api/v1/zones/{zone['id']}/summary", headers=headers), label="zone summary")

        equipment = expect(
            client.post(
                "/api/v1/equipment",
                headers=headers,
                json={
                    "plant_id": plant["id"],
                    "zone_id": zone["id"],
                    "equipment_name": f"API Equipment {suffix}",
                    "equipment_type": "Compressor",
                    "manufacturer": "Sentinel QA",
                    "health_score": 88.8,
                    "status": "healthy",
                    "external_id": f"API-EQ-{suffix}",
                    "source_dataset": "validation",
                },
            ),
            label="create equipment",
        )
        api_logs["equipment"] = {"created_id": equipment["id"]}
        expect(client.get(f"/api/v1/equipment/{equipment['id']}/health", headers=headers), label="equipment health")
        expect(
            client.put(
                f"/api/v1/equipment/{equipment['id']}",
                headers=headers,
                json={"status": "warning"},
            ),
            label="update equipment",
        )

        worker = expect(
            client.post(
                "/api/v1/workers",
                headers=headers,
                json={
                    "worker_code": f"API-W-{suffix}",
                    "name": "API Worker",
                    "department": "Operations",
                    "designation": "Operator",
                    "phone": "+91-9888888888",
                    "status": "active",
                },
            ),
            label="create worker",
        )
        api_logs["workers"] = {"created_id": worker["id"]}
        expect(
            client.put(
                f"/api/v1/workers/{worker['id']}",
                headers=headers,
                json={"phone": "+91-9777777777"},
            ),
            label="update worker",
        )
        sensor_timestamp = datetime.now(UTC).isoformat()
        expect(
            client.post(
                "/api/v1/workers/locations",
                headers=headers,
                json={
                    "worker_id": worker["id"],
                    "zone_id": zone["id"],
                    "timestamp": sensor_timestamp,
                    "latitude": 19.22,
                    "longitude": 72.82,
                },
            ),
            label="create worker location",
        )
        expect(client.get(f"/api/v1/workers/{worker['id']}/safety", headers=headers), label="worker safety")

        sensor = expect(
            client.post(
                "/api/v1/sensors",
                headers=headers,
                json={
                    "equipment_id": equipment["id"],
                    "zone_id": zone["id"],
                    "sensor_name": f"API Sensor {suffix}",
                    "sensor_type": "pressure",
                    "unit": "bar",
                    "min_value": 0.0,
                    "max_value": 100.0,
                    "status": "active",
                    "external_id": f"API-SENSOR-{suffix}",
                },
            ),
            label="create sensor",
        )
        api_logs["sensors"] = {"created_id": sensor["id"]}
        expect(
            client.put(
                f"/api/v1/sensors/{sensor['id']}",
                headers=headers,
                json={"status": "maintenance"},
            ),
            label="update sensor",
        )
        sensor_reading = expect(
            client.post(
                "/api/v1/sensors/readings",
                headers=headers,
                json={
                    "sensor_id": sensor["id"],
                    "timestamp": datetime.now(UTC).isoformat(),
                    "value": 42.1,
                    "quality": "api",
                    "status": "ok",
                    "scenario": "api_validation",
                },
            ),
            label="create sensor reading",
        )
        expect(
            client.put(
                f"/api/v1/sensors/readings/{sensor_reading['id']}",
                headers=headers,
                json={"status": "verified"},
            ),
            label="update sensor reading",
        )
        expect(client.get(f"/api/v1/sensors/{sensor['id']}/readings", headers=headers), label="list sensor readings")

        permit = expect(
            client.post(
                "/api/v1/permits",
                headers=headers,
                json={
                    "permit_number": f"API-PTW-{suffix}",
                    "permit_type": "hot_work",
                    "worker_id": worker["id"],
                    "zone_id": zone["id"],
                    "equipment_id": equipment["id"],
                    "start_time": datetime.now(UTC).isoformat(),
                    "end_time": (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
                    "status": "open",
                    "approved_by": "Sentinel Admin",
                },
            ),
            label="create permit",
        )
        api_logs["permits"] = {"created_id": permit["id"]}
        expect(
            client.put(
                f"/api/v1/permits/{permit['id']}",
                headers=headers,
                json={"status": "approved"},
            ),
            label="update permit",
        )
        expect(client.get(f"/api/v1/permits/{permit['id']}/conflicts", headers=headers), label="permit conflicts")

        maintenance = expect(
            client.post(
                "/api/v1/maintenance",
                headers=headers,
                json={
                    "equipment_id": equipment["id"],
                    "maintenance_type": "inspection",
                    "status": "scheduled",
                    "assigned_to": "API Team",
                    "scheduled_date": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
                    "completed_date": None,
                    "remarks": "API validation maintenance",
                },
            ),
            label="create maintenance",
        )
        api_logs["maintenance"] = {"created_id": maintenance["id"]}
        expect(
            client.put(
                f"/api/v1/maintenance/{maintenance['id']}",
                headers=headers,
                json={"status": "running"},
            ),
            label="update maintenance",
        )
        expect(client.get("/api/v1/maintenance/overdue", headers=headers), label="maintenance overdue")

        incident = expect(
            client.post(
                "/api/v1/incidents",
                headers=headers,
                json={
                    "title": f"API Incident {suffix}",
                    "description": "API validation incident",
                    "severity": "high",
                    "zone_id": zone["id"],
                    "equipment_id": equipment["id"],
                    "worker_id": worker["id"],
                    "incident_type": "near_miss",
                    "root_cause": "Validation",
                    "status": "open",
                    "reported_at": datetime.now(UTC).isoformat(),
                    "closed_at": None,
                    "evidence": [{"source": "api"}],
                    "ai_summary": "API summary",
                    "source_dataset": "validation",
                },
            ),
            label="create incident",
        )
        api_logs["incidents"] = {"created_id": incident["id"]}
        expect(
            client.put(
                f"/api/v1/incidents/{incident['id']}",
                headers=headers,
                json={"status": "investigating"},
            ),
            label="update incident",
        )
        expect(client.get(f"/api/v1/incidents/{incident['id']}/report", headers=headers), label="incident report")

        risk_result = expect(
            client.post(
                "/api/v1/risk/analyze",
                headers=headers,
                json={
                    "zone_id": zone["id"],
                    "gas_level": 82.0,
                    "temperature": 71.0,
                    "pressure": 88.0,
                    "humidity": 68.0,
                    "vibration": 56.0,
                    "equipment_health": 62.0,
                    "permit_type": "hot_work",
                    "worker_count": 3,
                    "worker_present": True,
                    "maintenance_running": True,
                    "maintenance_overdue": False,
                    "weather_condition": "storm",
                    "historical_similarity": 0.84,
                    "shift": "night",
                    "time_of_day": "02:00",
                    "persist_result": True,
                },
            ),
            label="risk analyze",
        )
        if not risk_result.get("applicable_rules"):
            raise AssertionError("risk analyze did not return applicable rules")
        if not risk_result.get("recommended_actions"):
            raise AssertionError("risk analyze did not return recommended actions")
        if not risk_result.get("historical_similarity"):
            raise AssertionError("risk analyze did not return historical similarity")
        if not risk_result.get("explainability"):
            raise AssertionError("risk analyze did not return explainability details")
        api_logs["risk"] = {
            "risk_score": risk_result["risk_score"],
            "severity": risk_result["severity"],
            "rule_count": len(risk_result["applicable_rules"]),
        }
        expect(client.get("/api/v1/risk/live", headers=headers), label="risk live")
        expect(client.get("/api/v1/risk/history", headers=headers), label="risk history")

        graph_overview = expect(client.get("/api/v1/graph", headers=headers), label="graph overview")
        graph_node = expect(
            client.get(
                f"/api/v1/graph/node?node_id={zone['id']}&depth=2&plant_id={plant['id']}",
                headers=headers,
            ),
            label="graph node",
        )
        graph_neighbors = expect(
            client.get(
                f"/api/v1/graph/neighbors?node_id={zone['id']}&depth=2&plant_id={plant['id']}",
                headers=headers,
            ),
            label="graph neighbors",
        )
        graph_path = expect(
            client.get(
                f"/api/v1/graph/path?source_id={plant['id']}&target_id={equipment['id']}&plant_id={plant['id']}",
                headers=headers,
            ),
            label="graph path",
        )
        if not graph_path.get("path_found"):
            raise AssertionError("graph path did not find a relationship between plant and equipment")
        api_logs["graph"] = {
            "node_count": graph_overview["statistics"]["node_count"],
            "edge_count": graph_overview["statistics"]["edge_count"],
            "neighbor_count": len(graph_neighbors["nodes"]),
            "impact_reachable": graph_node["impact_analysis"]["reachable_node_count"],
        }

        copilot = expect(
            client.post(
                "/api/v1/copilot/chat",
                headers=headers,
                json={
                    "question": "Which OSHA regulation applies to hot work near a gas leak in this reactor zone?",
                    "plant_id": plant["id"],
                    "conversation_history": [
                        {
                            "role": "user",
                            "content": "We are reviewing a hot work permit and recent gas alarm.",
                        }
                    ],
                },
            ),
            label="copilot chat",
        )
        required_copilot_fields = {
            "summary",
            "current_situation",
            "evidence",
            "applicable_regulations",
            "recommendations",
            "citations",
            "confidence",
            "provider",
            "retrieved_documents",
        }
        missing_copilot_fields = sorted(required_copilot_fields - set(copilot))
        if missing_copilot_fields:
            raise AssertionError(f"copilot chat missing fields: {missing_copilot_fields}")
        if not copilot["citations"]:
            raise AssertionError("copilot chat did not return citations")
        if not copilot["evidence"]:
            raise AssertionError("copilot chat did not return evidence")
        if not copilot["recommendations"]:
            raise AssertionError("copilot chat did not return recommendations")
        copilot_history = expect(client.get("/api/v1/copilot/history", headers=headers), label="copilot history")
        if not copilot_history:
            raise AssertionError("copilot history did not return the saved conversation")
        cleared_history = expect(
            client.delete("/api/v1/copilot/history", headers=headers),
            label="copilot clear history",
        )
        if int(cleared_history["deleted_count"]) < 1:
            raise AssertionError("copilot history clear did not delete any conversations")
        history_after_clear = expect(
            client.get("/api/v1/copilot/history", headers=headers),
            label="copilot history after clear",
        )
        if history_after_clear:
            raise AssertionError("copilot history was not cleared")
        api_logs["copilot"] = {
            "provider": copilot["provider"],
            "citation_count": len(copilot["citations"]),
            "retrieved_documents": len(copilot["retrieved_documents"]),
            "history_deleted": cleared_history["deleted_count"],
        }

        expect(client.get("/api/v1/dashboard", headers=headers), label="dashboard")
        expect(client.get("/api/v1/analytics/overview", headers=headers), label="analytics overview")

        expect(client.delete(f"/api/v1/incidents/{incident['id']}", headers=headers), label="delete incident")
        deleted_incident = client.get(f"/api/v1/incidents/{incident['id']}", headers=headers)
        if deleted_incident.status_code != 404:
            raise AssertionError(
                f"Expected deleted incident to return 404, got {deleted_incident.status_code}"
            )

        expect(client.delete(f"/api/v1/maintenance/{maintenance['id']}", headers=headers), label="delete maintenance")
        expect(client.delete(f"/api/v1/permits/{permit['id']}", headers=headers), label="delete permit")
        expect(client.delete(f"/api/v1/sensors/{sensor['id']}", headers=headers), label="delete sensor")
        expect(client.delete(f"/api/v1/equipment/{equipment['id']}", headers=headers), label="delete equipment")
        expect(client.delete(f"/api/v1/workers/{worker['id']}", headers=headers), label="delete worker")
        expect(client.delete(f"/api/v1/zones/{zone['id']}", headers=headers), label="delete zone")
        expect(client.delete(f"/api/v1/plants/{plant['id']}", headers=headers), label="delete plant")

    return api_logs


def main():
    repo_env = os.environ.copy()
    repo_env["PATH"] = str(PG_BIN) + os.pathsep + repo_env.get("PATH", "")
    repo_env["PG_RESTRICT_EXEC"] = "1"
    if "SENTINEL_PGDATA" not in os.environ and PGDATA_DIR.exists():
        shutil.rmtree(PGDATA_DIR, ignore_errors=True)
    PGDATA_DIR.parent.mkdir(parents=True, exist_ok=True)
    pgdata_arg = PGDATA_DIR.name
    pgdata_cwd = PGDATA_DIR.parent
    cluster_version_file = PGDATA_DIR / "PG_VERSION"

    if not cluster_version_file.exists():
        run_command(
            [INITDB_EXE, "-D", pgdata_arg, "-U", "postgres", "-A", "trust", "-E", "UTF8"],
            cwd=pgdata_cwd,
            env=repo_env,
            label="initdb",
        )
    else:
        pid_file = PGDATA_DIR / "postmaster.pid"
        if pid_file.exists():
            pid_file.unlink()

    pg_stdout_path = BACKEND_DIR / "postgres-runtime.stdout.log"
    pg_stderr_path = BACKEND_DIR / "postgres-runtime.stderr.log"
    pg_stdout = pg_stdout_path.open("w", encoding="utf-8")
    pg_stderr = pg_stderr_path.open("w", encoding="utf-8")
    postgres = subprocess.Popen(
        [
            str(POSTGRES_EXE),
            "-D",
            pgdata_arg,
            "-p",
            str(PORT),
            "-c",
            "listen_addresses=127.0.0.1",
        ],
        cwd=str(pgdata_cwd),
        env=repo_env,
        stdout=pg_stdout,
        stderr=pg_stderr,
        text=True,
    )

    uvicorn = None
    uvicorn_stdout = None
    uvicorn_stderr = None
    try:
        print("WAIT postgres")
        wait_for_postgres_ready(postgres, repo_env, timeout=120)
        run_command(
            [
                PSQL_EXE,
                "-h",
                "127.0.0.1",
                "-p",
                str(PORT),
                "-U",
                "postgres",
                "-d",
                "postgres",
                "-c",
                "DROP DATABASE IF EXISTS sentinel_ai WITH (FORCE);",
            ],
            cwd=BACKEND_DIR,
            env=repo_env,
            label="dropdb",
        )
        run_command(
            [CREATEDB_EXE, "-h", "127.0.0.1", "-p", str(PORT), "-U", "postgres", "sentinel_ai"],
            cwd=BACKEND_DIR,
            env=repo_env,
            label="createdb",
        )
        run_command(
            [ALEMBIC_EXE, "-c", "alembic.ini", "upgrade", "head"],
            cwd=BACKEND_DIR,
            env=repo_env,
            label="alembic upgrade",
        )

        db_summary = asyncio.run(validate_database_layer())

        uvicorn_stdout_path = BACKEND_DIR / "uvicorn-runtime.stdout.log"
        uvicorn_stderr_path = BACKEND_DIR / "uvicorn-runtime.stderr.log"
        uvicorn_stdout = uvicorn_stdout_path.open("w", encoding="utf-8")
        uvicorn_stderr = uvicorn_stderr_path.open("w", encoding="utf-8")
        uvicorn = subprocess.Popen(
            [str(VENV_PYTHON), "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=str(BACKEND_DIR),
            env=repo_env,
            stdout=uvicorn_stdout,
            stderr=uvicorn_stderr,
            text=True,
        )

        print("WAIT api")
        wait_for_http("http://127.0.0.1:8000/api/v1/health", uvicorn, timeout=90)
        api_summary = validate_api()

        result = {
            "database": db_summary,
            "api": api_summary,
            "postgres_port": PORT,
            "validated_at": datetime.now(UTC).isoformat(),
        }
        print("VALIDATION_SUMMARY_START")
        print(json.dumps(result, indent=2, default=str))
        print("VALIDATION_SUMMARY_END")
    except Exception as exc:  # noqa: BLE001
        print(f"VALIDATION_FAILED: {exc}")
        print("POSTGRES_STDERR_TAIL_START")
        print(tail_text(pg_stderr_path))
        print("POSTGRES_STDERR_TAIL_END")
        print("POSTGRES_STDOUT_TAIL_START")
        print(tail_text(pg_stdout_path))
        print("POSTGRES_STDOUT_TAIL_END")
        print("UVICORN_STDERR_TAIL_START")
        print(tail_text(BACKEND_DIR / "uvicorn-runtime.stderr.log"))
        print("UVICORN_STDERR_TAIL_END")
        print("UVICORN_STDOUT_TAIL_START")
        print(tail_text(BACKEND_DIR / "uvicorn-runtime.stdout.log"))
        print("UVICORN_STDOUT_TAIL_END")
        raise
    finally:
        if uvicorn is not None and uvicorn.poll() is None:
            uvicorn.terminate()
            try:
                uvicorn.wait(timeout=10)
            except subprocess.TimeoutExpired:
                uvicorn.kill()
        if postgres.poll() is None:
            postgres.terminate()
            try:
                postgres.wait(timeout=10)
            except subprocess.TimeoutExpired:
                postgres.kill()
        if uvicorn_stdout is not None:
            uvicorn_stdout.close()
        if uvicorn_stderr is not None:
            uvicorn_stderr.close()
        pg_stdout.close()
        pg_stderr.close()


if __name__ == "__main__":
    main()
