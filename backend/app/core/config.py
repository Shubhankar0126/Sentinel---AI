from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[3]


def _resolve_sqlite_url(url: str) -> str:
    prefixes = ("sqlite+aiosqlite:///", "sqlite:///")
    for prefix in prefixes:
        if url.startswith(prefix):
            raw_path = url[len(prefix) :]
            if raw_path.startswith("./") or raw_path.startswith(".\\"):
                resolved = (BASE_DIR / raw_path[2:]).resolve().as_posix()
                return f"{prefix}{resolved}"
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Sentinel AI Backend"
    app_version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173", 
        "https://sentinel-ai-jrxg.vercel.app"]
    )

    database_url: str | None = None
    sqlite_fallback_url: str = "sqlite+aiosqlite:///./backend/sentinel_ai.db"
    use_sqlite_fallback: bool = True
    auto_create_schema: bool = False

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    dataset_root: Path = BASE_DIR / "datasets"
    enable_dataset_health_checks: bool = True
    te_sample_mode: bool = True
    te_sample_fraction: float = 0.1
    te_row_chunk_size: int = 64
    te_insert_batch_size: int = 2000
    risk_rules_path: Path = BASE_DIR / "backend" / "app" / "risk_engine" / "rules.json"
    graph_default_depth: int = 2
    graph_sample_limit: int = 25
    similarity_match_limit: int = 5
    rag_index_dir: Path = BASE_DIR / "backend" / ".vector_store"
    embedding_model_name: str = "all-MiniLM-L6-v2"
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 100
    rag_top_k: int = 5
    rag_structured_rows_per_section: int = 20
    rag_te_preview_rows: int = 6

    default_admin_name: str = "Sentinel Admin"
    default_admin_email: str = "admin@sentinelai.com"
    default_admin_password: str = "Admin123!"

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_request_timeout_seconds: int = 20

    request_id_header: str = "X-Request-ID"
    page_size_default: int = 25
    page_size_max: int = 100

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("dataset_root", "risk_rules_path", "rag_index_dir", mode="before")
    @classmethod
    def resolve_path_value(cls, value: str | Path) -> Path:
        path = Path(value)
        return path if path.is_absolute() else (BASE_DIR / path).resolve()

    @field_validator("te_sample_fraction")
    @classmethod
    def validate_te_sample_fraction(cls, value: float) -> float:
        if not 0 < value <= 1:
            raise ValueError("TE sample fraction must be between 0 and 1.")
        return value

    @field_validator("te_row_chunk_size", "te_insert_batch_size")
    @classmethod
    def validate_positive_etl_sizes(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("ETL chunk and batch sizes must be positive integers.")
        return value

    @field_validator(
        "graph_default_depth",
        "graph_sample_limit",
        "similarity_match_limit",
        "rag_chunk_size",
        "rag_chunk_overlap",
        "rag_top_k",
        "rag_structured_rows_per_section",
        "rag_te_preview_rows",
        "gemini_request_timeout_seconds",
    )
    @classmethod
    def validate_positive_ai_settings(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("AI engine limits must be positive integers.")
        return value

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return _resolve_sqlite_url(self.database_url)
        if self.use_sqlite_fallback and self.environment != "production":
            return _resolve_sqlite_url(self.sqlite_fallback_url)
        raise ValueError(
            "DATABASE_URL must be configured when SQLite fallback is disabled or in production."
        )

    @property
    def sqlalchemy_echo(self) -> bool:
        return self.debug

    @property
    def is_sqlite(self) -> bool:
        return self.effective_database_url.startswith("sqlite")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
