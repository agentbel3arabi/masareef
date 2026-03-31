"""Shared slowapi limiter instance with per-user key function."""

import logging

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

logger = logging.getLogger(__name__)


def _user_or_ip_key(request: Request) -> str:
    """Rate limit key: verified JWT sub claim when present, else client IP.

    Verifies the HS256 signature using SUPABASE_JWT_SECRET before trusting
    the sub claim. Falls back to IP if token is absent, invalid, or unverified.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer ") :]
        try:
            import base64
            import hashlib
            import hmac
            import json as _json

            parts = token.split(".")
            if len(parts) != 3:
                raise ValueError("Not a JWT")

            header_b64, payload_b64, sig_b64 = parts

            # Verify signature using SUPABASE_JWT_SECRET
            from app.config import Settings

            try:
                secret = Settings().SUPABASE_JWT_SECRET  # type: ignore[call-arg]
            except Exception:
                # If settings unavailable, fall back to IP
                raise ValueError("Settings unavailable")

            signing_input = f"{header_b64}.{payload_b64}".encode()
            expected_sig = base64.urlsafe_b64encode(
                hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
            ).rstrip(b"=")
            actual_sig = sig_b64.encode().rstrip(b"=")

            if not hmac.compare_digest(expected_sig, actual_sig):
                raise ValueError("Invalid signature")

            # Signature verified — safe to trust the payload
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding
            payload = _json.loads(base64.urlsafe_b64decode(payload_b64))
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception as exc:
            logger.debug("JWT verification failed for rate limiting, using IP: %s", exc)

    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=_user_or_ip_key)
