import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "backend"))

from app.core.config import get_settings  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services.ingestion import (  # noqa: E402
    ensure_default_admin,
    ensure_generated_dataset_files,
    load_generated_foundation,
    load_generated_operations,
)


async def main(write_only: bool) -> None:
    settings = get_settings()
    files = ensure_generated_dataset_files(settings.dataset_root)
    print({key: str(value) for key, value in files.items()})
    if write_only:
        return
    async with SessionLocal() as session:
        admin = await ensure_default_admin(session)
        await session.commit()
        foundation = await load_generated_foundation(session, settings.dataset_root)
        await session.commit()
        operations = await load_generated_operations(session, settings.dataset_root)
        await session.commit()
        print(
            {
                "default_admin": {"email": admin.email, "role": admin.role.value},
                "foundation": foundation,
                "operations": operations,
            }
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-only", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.write_only))
