import logging
import logging.config
from contextvars import ContextVar

from app.core.config import get_settings

request_id_context: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_context.get()
        return True


def configure_logging() -> None:
    settings = get_settings()
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {"request_id": {"()": RequestIdFilter}},
            "formatters": {
                "standard": {
                    "format": "%(asctime)s | %(levelname)s | %(name)s | "
                    "request_id=%(request_id)s | %(message)s"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": settings.log_level,
                    "formatter": "standard",
                    "filters": ["request_id"],
                }
            },
            "root": {"level": settings.log_level, "handlers": ["console"]},
        }
    )
