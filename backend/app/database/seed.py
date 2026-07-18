from time import perf_counter

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.services.ingestion import (
    ensure_default_admin,
    load_ai4i_dataset,
    load_generated_foundation,
    load_generated_operations,
    load_osha_dataset,
    load_tennessee_dataset,
)


async def seed_database(
    session: AsyncSession,
    *,
    ai4i_limit: int | None = None,
    osha_limit: int | None = None,
    te_rows_per_file: int | None = None,
) -> dict:
    settings = get_settings()
    summary: dict[str, dict] = {}
    total_started = perf_counter()
    step_started = perf_counter()
    admin_user = await ensure_default_admin(session)
    await session.commit()
    summary["default_admin"] = {
        "email": admin_user.email,
        "role": admin_user.role.value,
        "elapsed_seconds": round(perf_counter() - step_started, 3),
    }

    step_started = perf_counter()
    summary["generated_foundation"] = await load_generated_foundation(session, settings.dataset_root)
    summary["generated_foundation"]["elapsed_seconds"] = round(perf_counter() - step_started, 3)
    await session.commit()

    step_started = perf_counter()
    summary["ai4i"] = await load_ai4i_dataset(session, settings.dataset_root, limit=ai4i_limit)
    summary["ai4i"]["elapsed_seconds"] = round(perf_counter() - step_started, 3)
    await session.commit()

    step_started = perf_counter()
    summary["tennessee"] = await load_tennessee_dataset(
        session,
        settings.dataset_root,
        row_limit_per_file=te_rows_per_file,
    )
    summary["tennessee"]["elapsed_seconds"] = round(perf_counter() - step_started, 3)
    await session.commit()

    step_started = perf_counter()
    summary["osha"] = await load_osha_dataset(session, settings.dataset_root, limit=osha_limit)
    summary["osha"]["elapsed_seconds"] = round(perf_counter() - step_started, 3)
    await session.commit()

    step_started = perf_counter()
    summary["generated_operations"] = await load_generated_operations(session, settings.dataset_root)
    summary["generated_operations"]["elapsed_seconds"] = round(perf_counter() - step_started, 3)
    await session.commit()
    summary["meta"] = {
        "te_sample_mode": settings.te_sample_mode,
        "te_sample_fraction": settings.te_sample_fraction if settings.te_sample_mode else 1.0,
        "te_chunk_rows": settings.te_row_chunk_size,
        "te_insert_batch_size": settings.te_insert_batch_size,
        "total_elapsed_seconds": round(perf_counter() - total_started, 3),
    }
    return summary
