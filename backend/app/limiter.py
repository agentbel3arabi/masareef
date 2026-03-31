"""Shared slowapi limiter instance with per-user key function."""

import base64
import json as _json
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

logger = logging.getLogger(__name__)


def _user_or_ip_key(request: Request) -> str:
    """Rate limit key: JWT sub claim when present, else client IP.

    Extracts the subject from the Bearer token without full verification
    (slowapi key functions run before auth dependencies). The actual
    token verification is enforced by get_current_user in each route.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer ") :]
        try:
            # Decode without verification — we only need the sub for rate limiting.
            # Security is enforced by the auth dependency on each route.
            payload_b64 = token.split(".")[1]
            # Add padding if needed
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding
            payload = _json.loads(base64.urlsafe_b64decode(payload_b64))
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception as exc:
            logger.debug("Could not extract JWT sub for rate limiting: %s", exc)

    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=_user_or_ip_key)
