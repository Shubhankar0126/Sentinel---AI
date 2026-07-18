from pathlib import Path


def dataset_health(dataset_root: Path) -> dict[str, dict]:
    entries = {
        "ai4i": dataset_root / "ai4i" / "ai4i2020.csv",
        "osha": dataset_root / "osha" / "data.xlsx",
        "tennessee_root": dataset_root / "TEdata" / "TEdata",
        "generated": dataset_root / "generated",
    }
    health: dict[str, dict] = {}
    for name, path in entries.items():
        health[name] = {
            "exists": path.exists(),
            "path": str(path),
            "is_dir": path.is_dir(),
        }
        if path.exists() and path.is_file():
            health[name]["size_bytes"] = path.stat().st_size
        if path.exists() and path.is_dir():
            health[name]["file_count"] = len([item for item in path.iterdir()])
    return health
