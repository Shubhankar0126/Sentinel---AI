import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "backend"))

from app.core.config import get_settings  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services.ingestion import load_tennessee_dataset  # noqa: E402


async def main(rows_per_file: int | None) -> None:
    settings = get_settings()
    async with SessionLocal() as session:
        result = await load_tennessee_dataset(session, settings.dataset_root, row_limit_per_file=rows_per_file)
        await session.commit()
        print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--rows-per-file", type=int, default=None)
    args = parser.parse_args()
    asyncio.run(main(args.rows_per_file))
