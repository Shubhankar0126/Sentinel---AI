import json
import math
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import pandas as pd
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.models.entities import Equipment, Incident, Maintenance, Permit, Plant, Sensor, SensorReading, User, Worker, Zone
from app.models.enums import (
    EquipmentStatus,
    IncidentStatus,
    IncidentType,
    LifecycleStatus,
    MaintenanceStatus,
    MaintenanceType,
    PermitStatus,
    PermitType,
    SensorStatus,
    SeverityLevel,
    UserRole,
)

TE_MEASUREMENTS = [
    ("A Feed (stream 1)", "kscmh"),
    ("D Feed (stream 2)", "kg/hr"),
    ("E Feed (stream 3)", "kg/hr"),
    ("A and C Feed (stream 4)", "kscmh"),
    ("Recycle Flow (stream 8)", "kscmh"),
    ("Reactor Feed Rate (stream 6)", "kscmh"),
    ("Reactor Pressure", "kPa gauge"),
    ("Reactor Level", "%"),
    ("Reactor Temperature", "Deg C"),
    ("Purge Rate (stream 9)", "kscmh"),
    ("Product Separator Temperature", "Deg C"),
    ("Product Separator Level", "%"),
    ("Product Separator Pressure", "kPa gauge"),
    ("Product Separator Underflow (stream 10)", "m3/hr"),
    ("Stripper Level", "%"),
    ("Stripper Pressure", "kPa gauge"),
    ("Stripper Underflow (stream 11)", "m3/hr"),
    ("Stripper Temperature", "Deg C"),
    ("Stripper Steam Flow", "kg/hr"),
    ("Compressor Work", "kW"),
    ("Reactor Cooling Water Outlet Temperature", "Deg C"),
    ("Separator Cooling Water Outlet Temperature", "Deg C"),
    ("Reactor Feed Component A", "mol%"),
    ("Reactor Feed Component B", "mol%"),
    ("Reactor Feed Component C", "mol%"),
    ("Reactor Feed Component D", "mol%"),
    ("Reactor Feed Component E", "mol%"),
    ("Reactor Feed Component F", "mol%"),
    ("Purge Gas Component A", "mol%"),
    ("Purge Gas Component B", "mol%"),
    ("Purge Gas Component C", "mol%"),
    ("Purge Gas Component D", "mol%"),
    ("Purge Gas Component E", "mol%"),
    ("Purge Gas Component F", "mol%"),
    ("Purge Gas Component G", "mol%"),
    ("Purge Gas Component H", "mol%"),
    ("Product Component D", "mol%"),
    ("Product Component E", "mol%"),
    ("Product Component F", "mol%"),
    ("Product Component G", "mol%"),
    ("Product Component H", "mol%"),
]

TE_MANIPULATED = [
    ("D Feed Flow", "control"),
    ("E Feed Flow", "control"),
    ("A Feed Flow", "control"),
    ("A and C Feed Flow", "control"),
    ("Compressor Recycle Valve", "control"),
    ("Purge Valve", "control"),
    ("Separator Pot Liquid Flow", "control"),
    ("Stripper Liquid Product Flow", "control"),
    ("Stripper Steam Valve", "control"),
    ("Reactor Cooling Water Flow", "control"),
    ("Condenser Cooling Water Flow", "control"),
]


def te_feature_names() -> list[tuple[str, str]]:
    return TE_MEASUREMENTS + TE_MANIPULATED


def inspect_te_file(path: Path) -> dict[str, int | bool]:
    line_count = 0
    first_width: int | None = None
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        for raw_line in handle:
            stripped = raw_line.strip()
            if not stripped:
                continue
            width = len(stripped.split())
            if first_width is None:
                first_width = width
            line_count += 1
    if first_width is None:
        raise ValueError(f"Tennessee Eastman file {path.name} is empty.")

    is_transposed = line_count == 52 and first_width != 52
    total_rows = first_width if is_transposed else line_count
    return {
        "line_count": line_count,
        "row_width": first_width,
        "is_transposed": is_transposed,
        "total_rows": total_rows,
    }


def select_te_sample_indices(total_rows: int, selected_rows: int) -> set[int]:
    if selected_rows >= total_rows:
        return set(range(total_rows))
    if selected_rows <= 1:
        return {0}
    return {
        round((total_rows - 1) * position / (selected_rows - 1))
        for position in range(selected_rows)
    }


def resolve_te_row_target(
    total_rows: int,
    *,
    sample_mode: bool,
    sample_fraction: float,
    explicit_limit: int | None,
) -> int:
    if explicit_limit is not None:
        return max(1, min(total_rows, explicit_limit))
    if sample_mode:
        return max(1, math.ceil(total_rows * sample_fraction))
    return total_rows


def parse_te_numeric_line(path: Path, row_index: int, raw_line: str) -> list[float]:
    values = [float(token) for token in raw_line.split()]
    if len(values) != 52:
        raise ValueError(
            f"Unexpected Tennessee Eastman row width for {path.name} at row {row_index}: {len(values)}"
        )
    return values


def iter_te_row_chunks(
    path: Path,
    *,
    selected_indices: set[int] | None,
    chunk_size: int,
):
    metadata = inspect_te_file(path)
    if metadata["is_transposed"]:
        matrix: list[list[float]] = []
        with path.open("r", encoding="utf-8", errors="ignore") as handle:
            for raw_line in handle:
                stripped = raw_line.strip()
                if not stripped:
                    continue
                matrix.append([float(token) for token in stripped.split()])
        if len(matrix) != 52:
            raise ValueError(f"Unexpected Tennessee Eastman transposed line count for {path.name}: {len(matrix)}")
        total_rows = int(metadata["total_rows"])
        if any(len(row) != total_rows for row in matrix):
            raise ValueError(f"Inconsistent Tennessee Eastman transposed row widths in {path.name}.")
        chunk: list[tuple[int, list[float]]] = []
        for row_index in range(total_rows):
            if selected_indices is not None and row_index not in selected_indices:
                continue
            chunk.append((row_index, [matrix[column_index][row_index] for column_index in range(52)]))
            if len(chunk) >= chunk_size:
                yield chunk
                chunk = []
        if chunk:
            yield chunk
        return

    chunk: list[tuple[int, list[float]]] = []
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        row_index = 0
        for raw_line in handle:
            stripped = raw_line.strip()
            if not stripped:
                continue
            if selected_indices is None or row_index in selected_indices:
                chunk.append((row_index, parse_te_numeric_line(path, row_index, stripped)))
                if len(chunk) >= chunk_size:
                    yield chunk
                    chunk = []
            row_index += 1
    if chunk:
        yield chunk


def build_te_reading_record(
    *,
    sensor_id: str,
    timestamp: datetime,
    value: float,
    scenario: str,
    sample_mode: bool,
) -> dict:
    now = datetime.now(UTC)
    return {
        "id": str(uuid4()),
        "sensor_id": sensor_id,
        "timestamp": timestamp,
        "value": round(float(value), 6),
        "quality": "sampled_processed" if sample_mode else "processed",
        "status": "ok",
        "scenario": scenario,
        "created_at": now,
        "updated_at": now,
    }


def ensure_generated_dataset_files(dataset_root: Path) -> dict[str, Path]:
    generated_root = dataset_root / "generated"
    generated_root.mkdir(parents=True, exist_ok=True)

    ai4i = pd.read_csv(dataset_root / "ai4i" / "ai4i2020.csv")
    sample_products = ai4i["Product ID"].head(8).tolist()

    weather_path = generated_root / "weather.json"
    workers_path = generated_root / "workers.json"
    plant_layout_path = generated_root / "plant_layout.json"
    permits_path = generated_root / "permits.json"
    maintenance_path = generated_root / "maintenance.json"

    if not plant_layout_path.exists():
        plant_layout_path.write_text(
            json.dumps(
                {
                    "plant": {
                        "name": "Sentinel Demo Plant",
                        "location": "Industrial Corridor, Mumbai",
                        "industry": "Chemical",
                        "latitude": 19.076,
                        "longitude": 72.8777,
                    },
                    "zones": [
                        {"zone_name": "Control Room", "risk_level": "low", "latitude": 19.0762, "longitude": 72.8779},
                        {"zone_name": "Reactor Zone", "risk_level": "moderate", "latitude": 19.0763, "longitude": 72.8781},
                        {"zone_name": "Utility Bay", "risk_level": "low", "latitude": 19.0764, "longitude": 72.8783},
                        {"zone_name": "Loading Dock", "risk_level": "moderate", "latitude": 19.0765, "longitude": 72.8785},
                    ],
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    if not workers_path.exists():
        workers_path.write_text(
            json.dumps(
                [
                    {
                        "worker_code": f"W-{index:03d}",
                        "name": f"Worker {index:02d}",
                        "department": department,
                        "designation": designation,
                        "phone": f"+91-900000{index:03d}",
                        "status": "active",
                    }
                    for index, (department, designation) in enumerate(
                        [
                            ("Operations", "Operator"),
                            ("Safety", "Safety Officer"),
                            ("Maintenance", "Technician"),
                            ("Utilities", "Supervisor"),
                            ("Operations", "Field Operator"),
                            ("Maintenance", "Engineer"),
                            ("Safety", "Inspector"),
                            ("Utilities", "Control Engineer"),
                            ("Operations", "Shift Lead"),
                            ("Maintenance", "Planner"),
                        ],
                        start=1,
                    )
                ],
                indent=2,
            ),
            encoding="utf-8",
        )

    if not permits_path.exists():
        permits_path.write_text(
            json.dumps(
                [
                    {
                        "permit_number": f"PTW-2026-{index:03d}",
                        "permit_type": permit_type,
                        "worker_code": f"W-{index:03d}",
                        "zone_name": zone_name,
                        "equipment_external_id": sample_products[(index - 1) % len(sample_products)],
                        "start_time": (datetime(2026, 7, 16, 8, 0, tzinfo=UTC) + timedelta(hours=index)).isoformat(),
                        "end_time": (datetime(2026, 7, 16, 10, 0, tzinfo=UTC) + timedelta(hours=index)).isoformat(),
                        "status": "open",
                        "approved_by": "Sentinel Admin",
                    }
                    for index, (permit_type, zone_name) in enumerate(
                        [
                            ("hot_work", "Reactor Zone"),
                            ("confined_space", "Utility Bay"),
                            ("electrical", "Control Room"),
                            ("working_at_height", "Loading Dock"),
                            ("cold_work", "Utility Bay"),
                        ],
                        start=1,
                    )
                ],
                indent=2,
            ),
            encoding="utf-8",
        )

    if not maintenance_path.exists():
        maintenance_path.write_text(
            json.dumps(
                [
                    {
                        "equipment_external_id": sample_products[index % len(sample_products)],
                        "maintenance_type": maintenance_type,
                        "status": status,
                        "assigned_to": assignee,
                        "scheduled_date": (datetime(2026, 7, 16, 6, 0, tzinfo=UTC) + timedelta(days=index)).isoformat(),
                        "completed_date": None,
                        "remarks": remark,
                    }
                    for index, (maintenance_type, status, assignee, remark) in enumerate(
                        [
                            ("preventive", "scheduled", "Maintenance Team A", "Routine lubrication and inspection."),
                            ("inspection", "scheduled", "Maintenance Team B", "Valve inspection before hot work."),
                            ("corrective", "running", "Maintenance Team C", "Investigate vibration anomaly."),
                            ("preventive", "scheduled", "Maintenance Team D", "Cooling line cleanup."),
                            ("emergency", "overdue", "Maintenance Team E", "Unplanned compressor inspection pending."),
                        ],
                        start=1,
                    )
                ],
                indent=2,
            ),
            encoding="utf-8",
        )

    if not weather_path.exists():
        weather_path.write_text(
            json.dumps(
                [
                    {
                        "date": (datetime(2026, 7, 16, tzinfo=UTC) + timedelta(days=offset)).date().isoformat(),
                        "condition": condition,
                        "temperature_c": temp,
                        "humidity": humidity,
                        "wind_kph": wind,
                    }
                    for offset, (condition, temp, humidity, wind) in enumerate(
                        [
                            ("clear", 31, 68, 12),
                            ("rain", 28, 82, 16),
                            ("storm", 27, 88, 22),
                            ("cloudy", 30, 72, 10),
                            ("clear", 32, 65, 9),
                        ]
                    )
                ],
                indent=2,
            ),
            encoding="utf-8",
        )

    return {
        "weather": weather_path,
        "workers": workers_path,
        "plant_layout": plant_layout_path,
        "permits": permits_path,
        "maintenance": maintenance_path,
    }


def _clean_scalar(value):
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            return value
    return value


async def ensure_default_admin(session: AsyncSession) -> User:
    settings = get_settings()
    existing = await session.scalar(select(User).where(User.email == settings.default_admin_email))
    if existing:
        existing.name = settings.default_admin_name
        existing.password_hash = get_password_hash(settings.default_admin_password)
        existing.role = UserRole.ADMIN
        existing.status = LifecycleStatus.ACTIVE
        await session.flush()
        return existing

    admin = User(
        name=settings.default_admin_name,
        email=settings.default_admin_email,
        password_hash=get_password_hash(settings.default_admin_password),
        role=UserRole.ADMIN,
        status=LifecycleStatus.ACTIVE,
    )
    session.add(admin)
    await session.flush()
    return admin


async def load_generated_foundation(session: AsyncSession, dataset_root: Path) -> dict[str, int]:
    files = ensure_generated_dataset_files(dataset_root)

    plant_layout = json.loads(files["plant_layout"].read_text(encoding="utf-8"))
    plant_data = plant_layout["plant"]
    plant = await session.scalar(select(Plant).where(Plant.name == plant_data["name"]))
    if not plant:
        plant = Plant(
            name=plant_data["name"],
            location=plant_data["location"],
            industry=plant_data["industry"],
            latitude=plant_data["latitude"],
            longitude=plant_data["longitude"],
            status=LifecycleStatus.ACTIVE,
        )
        session.add(plant)
        await session.flush()

    created_zones = 0
    for zone_data in plant_layout["zones"]:
        existing_zone = await session.scalar(
            select(Zone).where(Zone.plant_id == plant.id, Zone.zone_name == zone_data["zone_name"])
        )
        if existing_zone:
            continue
        session.add(
            Zone(
                plant_id=plant.id,
                zone_name=zone_data["zone_name"],
                risk_level=SeverityLevel(zone_data["risk_level"]),
                latitude=zone_data["latitude"],
                longitude=zone_data["longitude"],
                description=f"Generated zone for {zone_data['zone_name']}.",
            )
        )
        created_zones += 1

    workers = json.loads(files["workers"].read_text(encoding="utf-8"))
    created_workers = 0
    for worker_data in workers:
        existing_worker = await session.scalar(select(Worker).where(Worker.worker_code == worker_data["worker_code"]))
        if existing_worker:
            continue
        session.add(
            Worker(
                worker_code=worker_data["worker_code"],
                name=worker_data["name"],
                department=worker_data["department"],
                designation=worker_data["designation"],
                phone=worker_data["phone"],
                status=LifecycleStatus(worker_data["status"]),
            )
        )
        created_workers += 1

    await session.flush()
    return {"plant_created": 1 if plant else 0, "zones_created": created_zones, "workers_created": created_workers}


async def load_ai4i_dataset(session: AsyncSession, dataset_root: Path, limit: int | None = None) -> dict[str, int | str]:
    existing = await session.scalar(select(Equipment.id).where(Equipment.source_dataset == "ai4i"))
    if existing:
        return {"status": "skipped", "reason": "AI4I equipment already loaded."}

    plant = await session.scalar(select(Plant).where(Plant.name == "Sentinel Demo Plant"))
    zones = (await session.execute(select(Zone).where(Zone.plant_id == plant.id))).scalars().all() if plant else []
    if not plant or not zones:
        await load_generated_foundation(session, dataset_root)
        plant = await session.scalar(select(Plant).where(Plant.name == "Sentinel Demo Plant"))
        zones = (await session.execute(select(Zone).where(Zone.plant_id == plant.id))).scalars().all()

    frame = pd.read_csv(dataset_root / "ai4i" / "ai4i2020.csv")
    if limit:
        frame = frame.head(limit)

    created = 0
    for index, row in frame.iterrows():
        failure_flags = int(row["TWF"]) + int(row["HDF"]) + int(row["PWF"]) + int(row["OSF"]) + int(row["RNF"])
        health_score = max(0.0, 100 - (float(row["Tool wear [min]"]) * 0.12) - (failure_flags * 14) - (int(row["Machine failure"]) * 25))
        status = (
            EquipmentStatus.CRITICAL
            if int(row["Machine failure"]) == 1
            else EquipmentStatus.WARNING
            if failure_flags > 0
            else EquipmentStatus.HEALTHY
        )
        equipment = Equipment(
            plant_id=plant.id,
            zone_id=zones[index % len(zones)].id,
            equipment_name=f"{row['Type']}-Series Machine {int(row['UDI'])}",
            equipment_type=f"AI4I-{row['Type']}",
            manufacturer="AI4I",
            health_score=round(health_score, 2),
            status=status,
            external_id=str(row["Product ID"]),
            source_dataset="ai4i",
        )
        session.add(equipment)
        created += 1

        if int(row["Machine failure"]) == 1 or failure_flags > 0:
            session.add(
                Maintenance(
                    equipment=equipment,
                    maintenance_type=MaintenanceType.CORRECTIVE if int(row["Machine failure"]) else MaintenanceType.INSPECTION,
                    status=MaintenanceStatus.COMPLETED if int(row["Machine failure"]) else MaintenanceStatus.SCHEDULED,
                    assigned_to="AI4I-derived maintenance workflow",
                    scheduled_date=datetime(2026, 7, 16, 9, 0, tzinfo=UTC) + timedelta(minutes=int(index)),
                    completed_date=datetime(2026, 7, 16, 12, 0, tzinfo=UTC) + timedelta(minutes=int(index))
                    if int(row["Machine failure"])
                    else None,
                    remarks=(
                        f"Derived from AI4I failure labels: "
                        f"TWF={int(row['TWF'])}, HDF={int(row['HDF'])}, PWF={int(row['PWF'])}, "
                        f"OSF={int(row['OSF'])}, RNF={int(row['RNF'])}"
                    ),
                )
            )

    await session.flush()
    return {"status": "loaded", "equipment_created": created}


async def load_osha_dataset(session: AsyncSession, dataset_root: Path, limit: int | None = None) -> dict[str, int | str]:
    existing = await session.scalar(select(Incident.id).where(Incident.source_dataset == "osha"))
    if existing:
        return {"status": "skipped", "reason": "OSHA incidents already loaded."}

    frame = pd.read_excel(dataset_root / "osha" / "data.xlsx")
    if limit:
        frame = frame.head(limit)

    zones = (await session.execute(select(Zone))).scalars().all()
    created = 0
    for index, row in frame.iterrows():
        event_date = _clean_scalar(row.get("Event Date"))
        establishment = _clean_scalar(row.get("Establishment Name")) or "Unknown Establishment"
        site_city = _clean_scalar(row.get("Site City")) or "Unknown City"
        site_state = _clean_scalar(row.get("Site State")) or "Unknown State"
        victim = _clean_scalar(row.get("Victim Name (Age)")) or "Unknown"
        jurisdiction = _clean_scalar(row.get("Jurisdiction")) or "Unknown"
        title = f"Severe injury at {establishment}"
        description = (
            f"OSHA severe injury report in {site_city}, {site_state} "
            f"for victim {victim}."
        )
        reported_at = (
            event_date.to_pydatetime().replace(tzinfo=UTC)
            if event_date is not None and hasattr(event_date, "to_pydatetime")
            else datetime(2026, 1, 1, tzinfo=UTC)
        )
        incident = Incident(
            title=title,
            description=description,
            severity=SeverityLevel.HIGH,
            zone_id=zones[index % len(zones)].id if zones else None,
            incident_type=IncidentType.SAFETY_INCIDENT,
            root_cause=jurisdiction,
            status=IncidentStatus.CLOSED,
            reported_at=reported_at,
            closed_at=reported_at if event_date is not None else None,
            evidence=[
                {"inspection_number": str(_clean_scalar(row.get("Inspection #")) or "")},
                {"site_naics": str(_clean_scalar(row.get("Site NAICS")) or "")},
                {"site_county": str(_clean_scalar(row.get("Site County")) or "")},
            ],
            ai_summary="Imported from OSHA severe injury workbook.",
            source_dataset="osha",
        )
        session.add(incident)
        created += 1

    await session.flush()
    return {"status": "loaded", "incidents_created": created}


async def load_tennessee_dataset(
    session: AsyncSession,
    dataset_root: Path,
    row_limit_per_file: int | None = None,
) -> dict[str, int | str]:
    settings = get_settings()
    if row_limit_per_file is None and settings.is_sqlite:
        row_limit_per_file = 120

    existing_sensor = await session.scalar(select(Sensor.id).where(Sensor.external_id == "TE:XMEAS:01"))
    existing_reading = await session.scalar(select(SensorReading.id).where(SensorReading.scenario.is_not(None)))
    if existing_sensor and existing_reading:
        return {"status": "skipped", "reason": "Tennessee Eastman sensors and readings already loaded."}

    plant = await session.scalar(select(Plant).where(Plant.name == "Sentinel Demo Plant"))
    reactor_zone = await session.scalar(select(Zone).where(Zone.zone_name == "Reactor Zone"))
    utility_zone = await session.scalar(select(Zone).where(Zone.zone_name == "Utility Bay"))
    zone_id = reactor_zone.id if reactor_zone else utility_zone.id if utility_zone else None

    sensor_map: dict[str, Sensor] = {}
    for index, (name, unit) in enumerate(te_feature_names(), start=1):
        prefix = "XMEAS" if index <= 41 else "XMV"
        code = f"{prefix}:{index:02d}" if index <= 41 else f"{prefix}:{index - 41:02d}"
        external_id = f"TE:{code}"
        sensor = await session.scalar(select(Sensor).where(Sensor.external_id == external_id))
        if not sensor:
            sensor = Sensor(
                equipment_id=None,
                zone_id=zone_id,
                sensor_name=name,
                sensor_type="measurement" if index <= 41 else "manipulated_variable",
                unit=unit,
                min_value=None,
                max_value=None,
                status=SensorStatus.ACTIVE,
                external_id=external_id,
            )
            session.add(sensor)
            await session.flush()
        sensor_map[name] = sensor

    te_root = dataset_root / "TEdata" / "TEdata"
    created_readings = 0
    total_rows_available = 0
    total_rows_selected = 0
    files_processed = 0
    batch_flushes = 0
    base_time = datetime(2026, 1, 1, tzinfo=UTC)
    started_at = time.perf_counter()
    for file_index, path in enumerate(sorted(te_root.glob("*.dat"))):
        scenario = path.stem
        file_metadata = inspect_te_file(path)
        total_rows = int(file_metadata["total_rows"])
        selected_rows = resolve_te_row_target(
            total_rows,
            sample_mode=settings.te_sample_mode,
            sample_fraction=settings.te_sample_fraction,
            explicit_limit=row_limit_per_file,
        )
        selected_indices = (
            None
            if selected_rows >= total_rows
            else select_te_sample_indices(total_rows, selected_rows)
        )
        total_rows_available += total_rows
        total_rows_selected += selected_rows
        files_processed += 1
        buffer: list[dict] = []

        for chunk in iter_te_row_chunks(
            path,
            selected_indices=selected_indices,
            chunk_size=settings.te_row_chunk_size,
        ):
            for row_index, row_values in chunk:
                timestamp = base_time + timedelta(minutes=(file_index * 5000) + row_index * 3)
                for column_index, (column_name, _) in enumerate(te_feature_names()):
                    buffer.append(
                        build_te_reading_record(
                            sensor_id=sensor_map[column_name].id,
                            timestamp=timestamp,
                            value=row_values[column_index],
                            scenario=scenario,
                            sample_mode=settings.te_sample_mode,
                        )
                    )
                if len(buffer) >= settings.te_insert_batch_size:
                    await session.execute(insert(SensorReading), buffer)
                    created_readings += len(buffer)
                    batch_flushes += 1
                    buffer = []

        if buffer:
            await session.execute(insert(SensorReading), buffer)
            created_readings += len(buffer)
            batch_flushes += 1

    elapsed_seconds = round(time.perf_counter() - started_at, 3)
    return {
        "status": "loaded",
        "sample_mode": settings.te_sample_mode,
        "sample_fraction": settings.te_sample_fraction if settings.te_sample_mode else 1.0,
        "raw_dataset_stored": False,
        "storage_strategy": "processed_features_only",
        "files_processed": files_processed,
        "rows_available": total_rows_available,
        "rows_processed": total_rows_selected,
        "rows_inserted": created_readings,
        "sensors_ready": len(sensor_map),
        "sensor_readings_created": created_readings,
        "batch_flushes": batch_flushes,
        "chunk_rows": settings.te_row_chunk_size,
        "insert_batch_size": settings.te_insert_batch_size,
        "elapsed_seconds": elapsed_seconds,
    }


async def load_generated_operations(session: AsyncSession, dataset_root: Path) -> dict[str, int]:
    files = ensure_generated_dataset_files(dataset_root)
    permits_data = json.loads(files["permits"].read_text(encoding="utf-8"))
    maintenance_data = json.loads(files["maintenance"].read_text(encoding="utf-8"))
    workers = {worker.worker_code: worker for worker in (await session.execute(select(Worker))).scalars().all()}
    zones = {zone.zone_name: zone for zone in (await session.execute(select(Zone))).scalars().all()}
    equipment = {item.external_id: item for item in (await session.execute(select(Equipment).where(Equipment.external_id.is_not(None)))).scalars().all()}

    created_permits = 0
    for permit_data in permits_data:
        existing = await session.scalar(select(Permit).where(Permit.permit_number == permit_data["permit_number"]))
        if existing:
            continue
        session.add(
            Permit(
                permit_number=permit_data["permit_number"],
                permit_type=PermitType(permit_data["permit_type"]),
                worker_id=workers.get(permit_data["worker_code"]).id if permit_data["worker_code"] in workers else None,
                zone_id=zones.get(permit_data["zone_name"]).id if permit_data["zone_name"] in zones else None,
                equipment_id=equipment.get(permit_data["equipment_external_id"]).id if permit_data["equipment_external_id"] in equipment else None,
                start_time=datetime.fromisoformat(permit_data["start_time"]),
                end_time=datetime.fromisoformat(permit_data["end_time"]),
                status=PermitStatus(permit_data["status"]),
                approved_by=permit_data["approved_by"],
            )
        )
        created_permits += 1

    created_maintenance = 0
    for maintenance_item in maintenance_data:
        equipment_item = equipment.get(maintenance_item["equipment_external_id"])
        if not equipment_item:
            continue
        duplicate = await session.scalar(
            select(Maintenance).where(
                Maintenance.equipment_id == equipment_item.id,
                Maintenance.remarks == maintenance_item["remarks"],
            )
        )
        if duplicate:
            continue
        session.add(
            Maintenance(
                equipment_id=equipment_item.id,
                maintenance_type=MaintenanceType(maintenance_item["maintenance_type"]),
                status=MaintenanceStatus(maintenance_item["status"]),
                assigned_to=maintenance_item["assigned_to"],
                scheduled_date=datetime.fromisoformat(maintenance_item["scheduled_date"]),
                completed_date=(
                    datetime.fromisoformat(maintenance_item["completed_date"])
                    if maintenance_item["completed_date"]
                    else None
                ),
                remarks=maintenance_item["remarks"],
            )
        )
        created_maintenance += 1

    await session.flush()
    return {"permits_created": created_permits, "maintenance_created": created_maintenance}
