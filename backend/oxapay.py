"""OxaPay — crypto payment gateway integration (invoice + webhook helpers).

OxaPay (https://oxapay.com) is a no-KYC crypto payment gateway. This module is a
*pure* helper (no DB access): it creates a hosted payment invoice over httpx and
verifies/parses the webhook callback. The checkout route and the webhook route
that activate the subscription live in ``server.py`` (they need DB +
``_activate_paid_subscription``), mirroring the PayPal/Stripe helpers.

──────────────────────────────────────────────────────────────────────────────
OxaPay integration contract (official SDK v0.3.0 / API v1)
──────────────────────────────────────────────────────────────────────────────
Create invoice:
    POST https://api.oxapay.com/v1/payment/invoice
    Headers:  Content-Type: application/json
              merchant_api_key: <API_KEY>
    Body (JSON, snake_case):
        amount (float, required), currency (invoice currency e.g. "EUR"),
        order_id, description, callback_url, return_url,
        life_time (minutes, min 15), email,
        fee_paid_by_payer (1=payer covers OxaPay fee, 0=merchant),
        under_paid_cover (acceptable underpayment %, 0-60),
        sandbox (bool — true for the test sandbox; no separate base URL)
    Response: {"data": {"track_id": "...", "payment_url": "https://pay.oxapay.com/...",
                         "expired_at": ..., "date": ...}, ...}

Webhook (HMAC-verified — far stronger than a shared secret in the URL):
    OxaPay POSTs the order outcome to ``callback_url``. The raw JSON body is
    signed with HMAC-SHA512 using the **merchant API key** as the secret; the
    hex digest is sent in the ``HMAC`` request header. Verify by recomputing
    over the raw body and comparing (constant-time).
    Body fields: status (new|waiting|confirming|PAID|expired|failed|rejected,
    lowercase), track_id, type, order_id (= our payment_transactions.id),
    amount, currency, value (USD), txs[...], date.

This is verbatim from the official SDK, so unlike a custom AES scheme there is
no encoding guesswork — the request is a documented JSON POST and the webhook
uses standard hmac-sha512.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

API_BASE = "https://api.oxapay.com/v1"
INVOICE_ENDPOINT = "/payment/invoice"

# Webhook status that means the payment settled. OxaPay sends lowercase.
PAID_STATUS = "paid"


class OxaPayError(Exception):
    """Raised when an OxaPay request fails or returns an unexpected response."""


async def create_invoice(
    *,
    api_key: str,
    amount: float,
    currency: str,
    order_id: str,
    description: str,
    callback_url: str,
    return_url: str,
    sandbox: bool = False,
    life_time: int = 60,
    email: Optional[str] = None,
    fee_paid_by_payer: int = 1,
    under_paid_cover: float = 2.0,
) -> Dict[str, str]:
    """Create a hosted OxaPay invoice. Returns ``{"payment_url", "track_id"}``.

    Raises :class:`OxaPayError` on any failure so callers can map it to a
    user-facing 502/503.
    """
    if not api_key:
        raise OxaPayError("OxaPay no está configurado (falta la Merchant API Key).")

    import httpx as _httpx

    payload: Dict[str, Any] = {
        "amount": round(float(amount), 2),
        "currency": currency,
        "order_id": order_id,
        "description": description,
        "callback_url": callback_url,
        "return_url": return_url,
        "life_time": max(15, int(life_time)),
        "fee_paid_by_payer": fee_paid_by_payer,
        "under_paid_cover": under_paid_cover,
        "sandbox": bool(sandbox),
    }
    if email:
        payload["email"] = email

    try:
        async with _httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{API_BASE}{INVOICE_ENDPOINT}",
                json=payload,
                headers={"merchant_api_key": api_key, "Content-Type": "application/json"},
            )
    except Exception as exc:  # network / DNS / timeout
        raise OxaPayError(f"No se pudo contactar con OxaPay: {exc}") from exc

    if resp.status_code >= 400:
        raise OxaPayError(f"OxaPay HTTP {resp.status_code}: {resp.text[:300]}")

    try:
        body = resp.json()
    except Exception as exc:
        raise OxaPayError(f"Respuesta OxaPay no es JSON: {resp.text[:200]}") from exc

    data = body.get("data") if isinstance(body, dict) else None
    payment_url = (data or {}).get("payment_url") if isinstance(data, dict) else None
    track_id = (data or {}).get("track_id") if isinstance(data, dict) else None
    if not payment_url:
        # Surface OxaPay's own error message when present.
        msg = ""
        if isinstance(body, dict):
            msg = str(body.get("message") or body.get("error") or body)
        raise OxaPayError(f"OxaPay no devolvió payment_url: {msg[:300]}")

    return {"payment_url": payment_url, "track_id": str(track_id or "")}


def verify_webhook(raw_body: bytes, hmac_header: Optional[str], api_key: str) -> bool:
    """Verify the OxaPay webhook HMAC-SHA512 signature (constant-time).

    The signature is computed over the *raw* request body using the merchant
    API key as the secret. Returns False on any missing/mismatched input — the
    caller must reject unverified callbacks.
    """
    if not api_key or not hmac_header or raw_body is None:
        return False
    calculated = hmac.new(api_key.encode("utf-8"), raw_body, hashlib.sha512).hexdigest()
    try:
        return hmac.compare_digest(calculated, hmac_header.strip())
    except Exception:
        return False


def parse_webhook(raw_body: bytes) -> Dict[str, Any]:
    """Decode the (plain JSON) OxaPay webhook body. Never raises → {} on garbage."""
    text = (raw_body or b"").decode("utf-8", "replace").strip()
    if not text:
        return {}
    try:
        obj = json.loads(text)
    except Exception:
        return {}
    return obj if isinstance(obj, dict) else {}


def webhook_order_id(data: Dict[str, Any]) -> Optional[str]:
    """Extract our order id (= payment_transactions.id) from a webhook payload."""
    for key in ("order_id", "orderId", "orderID"):
        val = data.get(key)
        if val:
            return str(val)
    return None


def webhook_is_paid(data: Dict[str, Any]) -> bool:
    """True if the webhook reports a settled payment (status == 'paid')."""
    status = data.get("status")
    return isinstance(status, str) and status.strip().lower() == PAID_STATUS
