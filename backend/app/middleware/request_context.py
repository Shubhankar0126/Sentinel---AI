import logging
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import get_settings
from app.core.logging import request_id_context

logger = logging.getLogger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        settings = get_settings()
        request_id = request.headers.get(settings.request_id_header) or str(uuid.uuid4())
        token = request_id_context.set(request_id)
        request.state.request_id = request_id
        logger.info("Request started: %s %s", request.method, request.url.path)
        try:
            response = await call_next(request)
        finally:
            request_id_context.reset(token)
        response.headers[settings.request_id_header] = request_id
        logger.info("Request completed: %s %s", request.method, request.url.path)
        return response
