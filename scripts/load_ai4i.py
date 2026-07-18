import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "backend"))

from app.core.config import get_settings  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services.ingestion import load_ai4i_dataset  # noqa: E402


async def main(limit: int | None) -> None:
    settings = get_settings()
    async with SessionLocal() as session:
        result = await load_ai4i_dataset(session, settings.dataset_root, limit=limit)
        await session.commit()
        print(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    asyncio.run(main(args.limit))
