"""add prompt indexes

Revision ID: 6f2f8b0b1c7d
Revises: 2705b51e295d
Create Date: 2026-07-16 18:40:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "6f2f8b0b1c7d"
down_revision: Union[str, Sequence[str], None] = "2705b51e295d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f("ix_users_status"), "users", ["status"], unique=False)
    op.create_index(op.f("ix_plants_status"), "plants", ["status"], unique=False)
    op.create_index(op.f("ix_equipment_status"), "equipment", ["status"], unique=False)
    op.create_index(op.f("ix_sensors_status"), "sensors", ["status"], unique=False)
    op.create_index(op.f("ix_sensor_readings_status"), "sensor_readings", ["status"], unique=False)
    op.create_index(op.f("ix_workers_status"), "workers", ["status"], unique=False)
    op.create_index(op.f("ix_permits_status"), "permits", ["status"], unique=False)
    op.create_index(op.f("ix_maintenance_status"), "maintenance", ["status"], unique=False)
    op.create_index(op.f("ix_incidents_incident_type"), "incidents", ["incident_type"], unique=False)
    op.create_index(op.f("ix_incidents_status"), "incidents", ["status"], unique=False)
    op.create_index(op.f("ix_risk_events_status"), "risk_events", ["status"], unique=False)
    op.create_index(op.f("ix_recommendations_status"), "recommendations", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_recommendations_status"), table_name="recommendations")
    op.drop_index(op.f("ix_risk_events_status"), table_name="risk_events")
    op.drop_index(op.f("ix_incidents_status"), table_name="incidents")
    op.drop_index(op.f("ix_incidents_incident_type"), table_name="incidents")
    op.drop_index(op.f("ix_maintenance_status"), table_name="maintenance")
    op.drop_index(op.f("ix_permits_status"), table_name="permits")
    op.drop_index(op.f("ix_workers_status"), table_name="workers")
    op.drop_index(op.f("ix_sensor_readings_status"), table_name="sensor_readings")
    op.drop_index(op.f("ix_sensors_status"), table_name="sensors")
    op.drop_index(op.f("ix_equipment_status"), table_name="equipment")
    op.drop_index(op.f("ix_plants_status"), table_name="plants")
    op.drop_index(op.f("ix_users_status"), table_name="users")
