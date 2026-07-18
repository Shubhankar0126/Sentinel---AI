from contextlib import asynccontextmanager
from datetime import UTC, datetime
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.response import build_response
from app.database.init_db import initialize_schema
from app.database.session import dispose_engine
from app.middleware.request_context import RequestContextMiddleware

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    app.state.started_at = datetime.now(UTC)
    await initialize_schema()
    logger.info("Starting Sentinel AI backend.")
    yield
    logger.info("Stopping Sentinel AI backend.")
    await dispose_engine()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestContextMiddleware)
app.include_router(api_router, prefix=settings.api_prefix)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    body = build_response(data=None, message=exc.detail, errors=[exc.detail])
    return JSONResponse(status_code=exc.status_code, content=body.model_dump(mode="json"))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [error["msg"] for error in exc.errors()]
    body = build_response(data=None, message="Validation error.", errors=errors)
    return JSONResponse(status_code=422, content=body.model_dump(mode="json"))


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled application error: %s", exc)
    body = build_response(
        data=None,
        message="Internal server error.",
        errors=["An unexpected error occurred."],
    )
    return JSONResponse(status_code=500, content=body.model_dump(mode="json"))
