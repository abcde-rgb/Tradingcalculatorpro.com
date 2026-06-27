"""MaxelPay — crypto payment gateway integration (checkout + webhook helpers).

MaxelPay (https://www.maxelpay.com) is a no-KYC crypto payment gateway. This
module is a *pure* helper (no DB access): it builds the encrypted checkout
request, talks to MaxelPay over httpx, and parses the webhook callback. The
checkout route and the webhook route that activate the subscription live in
``server.py`` (they need DB + ``_activate_paid_subscription``), mirroring how
the PayPal helpers are wired.

──────────────────────────────────────────────────────────────────────────────
MaxelPay integration contract (per their Starter Guide)
──────────────────────────────────────────────────────────────────────────────
Endpoint:   POST https://api.maxelpay.com/v1/{env}/merchant/order/checkout
            env = "stg" (sandbox) | "prod" (production)
Headers:    Content-Type: application/json
            api-key: <API_KEY>
Body:       {"data": "<base64(AES-256-CBC(json(payload)))>"}
Encryption: AES-256-CBC, key = SECRET_KEY (32 bytes), IV = SECRET_KEY[:16],
            PKCS7 padding, output base64.
Payload:    orderID, amount, currency, timestamp (unix seconds, str),
            userName, siteName, userEmail, redirectUrl, websiteUrl,
            cancelUrl, webhookUrl
Response:   200 OK → {"result": "<hosted checkout url>"}  (field name may vary
            by API version — we fall back across a few common names)
Webhook:    MaxelPay POSTs the order outcome to ``webhookUrl``. Body is JSON,
            either plain or wrapped as {"data": "<encrypted>"}. We extract the
            order id + status and activate the subscription when paid.

⚠️  VERIFY IN SANDBOX (mode="stg"): this environment cannot reach maxelpay.com
    to byte-verify the scheme. If MaxelPay rejects the request with a
    decryption error, only ``_encrypt`` below needs adjusting (e.g. hex vs
    base64, or a random-IV-prepended variant). The round-trip is covered by a
    unit test so the crypto is internally consistent regardless.
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Status strings MaxelPay may report for a successful payment. Compared
# case-insensitively, so keep them lowercase.
PAID_STATUSES = {"completed", "complete", "paid", "success", "successful", "confirmed"}


class MaxelPayError(Exception):
    """Raised when a MaxelPay request fails or returns an unexpected response."""


def _base_url(mode: Optional[str]) -> str:
    """Return the MaxelPay API base for the given mode ("stg" default)."""
    env = "prod" if str(mode or "").strip().lower() in ("prod", "production", "live") else "stg"
    return f"https://api.maxelpay.com/v1/{env}"


def _key_iv(secret_key: str) -> tuple[bytes, bytes]:
    """Derive the AES key + IV from the MaxelPay secret key.

    MaxelPay uses the 32-byte secret key directly as the AES-256 key and its
    first 16 bytes as the IV. We surface a clear error if the key length is
    wrong rather than letting the cipher raise a cryptic one.
    """
    key = secret_key.encode("utf-8")
    if len(key) != 32:
        raise MaxelPayError(
            f"MaxelPay secret key must be 32 bytes for AES-256 (got {len(key)}). "
            "Copy the Secret Key exactly from your MaxelPay dashboard."
        )
    return key, key[:16]


def _encrypt(plaintext: str, secret_key: str) -> str:
    """AES-256-CBC encrypt → base64. Isolated so it's the single point to tweak
    if MaxelPay's encoding differs from the documented scheme."""
    from cryptography.hazmat.primitives import padding as sym_padding
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

    key, iv = _key_iv(secret_key)
    padder = sym_padding.PKCS7(128).padder()
    padded = padder.update(plaintext.encode("utf-8")) + padder.finalize()
    encryptor = Cipher(algorithms.AES(key), modes.CBC(iv)).encryptor()
    ct = encryptor.update(padded) + encryptor.finalize()
    return base64.b64encode(ct).decode("utf-8")


def _decrypt(data_b64: str, secret_key: str) -> str:
    """Inverse of :func:`_encrypt` — used to read encrypted webhook envelopes."""
    from cryptography.hazmat.primitives import padding as sym_padding
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

    key, iv = _key_iv(secret_key)
    ct = base64.b64decode(data_b64)
    decryptor = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
    padded = decryptor.update(ct) + decryptor.finalize()
    unpadder = sym_padding.PKCS7(128).unpadder()
    return (unpadder.update(padded) + unpadder.finalize()).decode("utf-8")


def build_payload(
    *,
    order_id: str,
    amount: str,
    currency: str,
    timestamp: str,
    user_name: str,
    user_email: str,
    site_name: str,
    website_url: str,
    redirect_url: str,
    cancel_url: str,
    webhook_url: str,
) -> Dict[str, str]:
    """Assemble the MaxelPay checkout payload with the exact field names the API
    expects (camelCase)."""
    return {
        "orderID": order_id,
        "amount": amount,
        "currency": currency,
        "timestamp": timestamp,
        "userName": user_name,
        "siteName": site_name,
        "userEmail": user_email,
        "redirectUrl": redirect_url,
        "websiteUrl": website_url,
        "cancelUrl": cancel_url,
        "webhookUrl": webhook_url,
    }


async def create_checkout_url(
    *, api_key: str, secret_key: str, mode: str, payload: Dict[str, Any]
) -> str:
    """Create a hosted MaxelPay checkout and return its URL.

    Raises :class:`MaxelPayError` on any failure so callers can map it to a
    user-facing 502/503.
    """
    if not api_key or not secret_key:
        raise MaxelPayError("MaxelPay no está configurado (faltan api_key/secret_key).")

    import httpx as _httpx

    encrypted = _encrypt(json.dumps(payload), secret_key)
    url = f"{_base_url(mode)}/merchant/order/checkout"
    try:
        async with _httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                url,
                json={"data": encrypted},
                headers={"api-key": api_key, "Content-Type": "application/json"},
            )
    except Exception as exc:  # network / DNS / timeout
        raise MaxelPayError(f"No se pudo contactar con MaxelPay: {exc}") from exc

    if resp.status_code >= 400:
        raise MaxelPayError(f"MaxelPay HTTP {resp.status_code}: {resp.text[:300]}")

    try:
        body = resp.json()
    except Exception as exc:
        raise MaxelPayError(f"Respuesta MaxelPay no es JSON: {resp.text[:200]}") from exc

    checkout_url = _extract_checkout_url(body)
    if not checkout_url:
        raise MaxelPayError(f"MaxelPay no devolvió URL de checkout: {body}")
    return checkout_url


def _extract_checkout_url(body: Any) -> Optional[str]:
    """Pull the hosted checkout URL out of MaxelPay's response. The documented
    field is ``result``; we fall back across a few names + nested ``data`` for
    resilience to version differences."""
    if isinstance(body, str):
        return body if body.startswith("http") else None
    if not isinstance(body, dict):
        return None
    for key in ("result", "url", "checkout_url", "checkoutUrl", "paymentUrl", "link"):
        val = body.get(key)
        if isinstance(val, str) and val.startswith("http"):
            return val
    data = body.get("data")
    if isinstance(data, dict):
        return _extract_checkout_url(data)
    if isinstance(data, str) and data.startswith("http"):
        return data
    return None


def parse_webhook(raw_body: bytes, secret_key: str = "") -> Dict[str, Any]:
    """Decode a MaxelPay webhook body into a flat dict.

    Handles both plain-JSON and ``{"data": "<encrypted>"}`` envelopes. Never
    raises — returns ``{}`` on anything unparseable so the caller can decide.
    """
    text = (raw_body or b"").decode("utf-8", "replace").strip()
    if not text:
        return {}
    try:
        obj = json.loads(text)
    except Exception:
        return {}
    # Encrypted envelope → decrypt then re-parse.
    if isinstance(obj, dict) and isinstance(obj.get("data"), str) and len(obj) == 1 and secret_key:
        try:
            obj = json.loads(_decrypt(obj["data"], secret_key))
        except Exception as exc:
            logger.warning("[maxelpay] could not decrypt webhook envelope: %s", exc)
            return {}
    return obj if isinstance(obj, dict) else {}


def webhook_order_id(data: Dict[str, Any]) -> Optional[str]:
    """Extract our order id (= payment_transactions.id) from a webhook payload,
    tolerating the various key spellings MaxelPay/users might send."""
    for key in ("orderID", "orderId", "order_id", "order", "merchantOrderId"):
        val = data.get(key)
        if val:
            return str(val)
    return None


def webhook_is_paid(data: Dict[str, Any]) -> bool:
    """True if the webhook payload reports a successful/settled payment."""
    for key in ("status", "orderStatus", "paymentStatus", "state"):
        val = data.get(key)
        if isinstance(val, str) and val.strip().lower() in PAID_STATUSES:
            return True
    return False
