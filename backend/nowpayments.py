"""NOWPayments — crypto payment gateway integration (invoice + IPN helpers).

NOWPayments (https://nowpayments.io) is a non-custodial crypto gateway: funds
settle to your own wallet. This module is a *pure* helper (no DB access): it
creates a hosted invoice over httpx and verifies/parses the IPN callback. The
checkout route and the webhook route that activate the subscription live in
``server.py`` (they need DB + ``_activate_paid_subscription``), mirroring the
OxaPay/Revolut/PayPal/Stripe helpers.

Payments are one-time invoices that grant plan["days"] of access — the same
model as the OxaPay crypto flow (crypto has no card-style auto-charge, so a
"subscription" plan simply grants its period again when the user re-pays).

──────────────────────────────────────────────────────────────────────────────
NOWPayments integration contract (API v1)
──────────────────────────────────────────────────────────────────────────────
Create invoice:
    POST {base}/invoice
    Headers:  x-api-key: <API_KEY>
              Content-Type: application/json
    Body (JSON):
        price_amount (float), price_currency ("eur"),
        order_id (= our payment_transactions.id), order_description,
        ipn_callback_url, success_url, cancel_url
    Response: {"id": "...", "invoice_url": "https://nowpayments.io/payment/?iid=..."}
    base = https://api.nowpayments.io/v1 (live)
         | https://api-sandbox.nowpayments.io/v1 (sandbox)

IPN webhook (signature-verified — the whole point of security here):
    NOWPayments POSTs the payment status to ``ipn_callback_url``. The signature
    is in the ``x-nowpayments-sig`` header, computed as HMAC-SHA512 of the JSON
    body **with keys sorted (recursively) and serialised compactly** (no spaces),
    using the **IPN secret** as the key. Verify by recomputing over the sorted
    body and comparing (constant-time).
    Body fields: payment_status (waiting|confirming|confirmed|sending|
    partially_paid|finished|failed|refunded|expired), payment_id,
    order_id (= our id), price_amount, price_currency, pay_amount, ...
    We grant access only on ``finished`` (fully settled).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

API_BASE_LIVE = "https://api.nowpayments.io/v1"
API_BASE_SANDBOX = "https://api-sandbox.nowpayments.io/v1"
INVOICE_ENDPOINT = "/invoice"

# IPN payment_status that means the payment fully settled.
PAID_STATUS = "finished"


class NowPaymentsError(Exception):
    """Raised when a NOWPayments request fails or returns an unexpected response."""


def _base_url(sandbox: bool) -> str:
    return API_BASE_SANDBOX if sandbox else API_BASE_LIVE


async def create_invoice(
    *,
    api_key: str,
    amount: float,
    currency: str,
    order_id: str,
    description: str,
    ipn_callback_url: str,
    success_url: str,
    cancel_url: str,
    sandbox: bool = False,
) -> Dict[str, str]:
    """Create a hosted NOWPayments invoice. Returns ``{"invoice_url", "invoice_id"}``.

    Raises :class:`NowPaymentsError` on any failure so callers can map it to a
    user-facing 502/503.
    """
    if not api_key:
        raise NowPaymentsError("NOWPayments no está configurado (falta la API Key).")

    import httpx as _httpx

    payload: Dict[str, Any] = {
        "price_amount": round(float(amount), 2),
        "price_currency": str(currency or "eur").lower(),
        "order_id": order_id,
        "order_description": description,
        "ipn_callback_url": ipn_callback_url,
        "success_url": success_url,
        "cancel_url": cancel_url,
    }
    headers = {"x-api-key": api_key, "Content-Type": "application/json"}

    try:
        async with _httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{_base_url(sandbox)}{INVOICE_ENDPOINT}", json=payload, headers=headers,
            )
    except Exception as exc:  # network / DNS / timeout
        raise NowPaymentsError(f"No se pudo contactar con NOWPayments: {exc}") from exc

    if resp.status_code >= 400:
        raise NowPaymentsError(f"NOWPayments HTTP {resp.status_code}: {resp.text[:300]}")

    try:
        body = resp.json()
    except Exception as exc:
        raise NowPaymentsError(f"Respuesta NOWPayments no es JSON: {resp.text[:200]}") from exc

    invoice_url = body.get("invoice_url") if isinstance(body, dict) else None
    invoice_id = body.get("id") if isinstance(body, dict) else None
    if not invoice_url:
        msg = ""
        if isinstance(body, dict):
            msg = str(body.get("message") or body.get("error") or body)
        raise NowPaymentsError(f"NOWPayments no devolvió invoice_url: {msg[:300]}")

    return {"invoice_url": invoice_url, "invoice_id": str(invoice_id or "")}


def _sorted_compact_json(data: Any) -> str:
    """Serialise like NOWPayments does before signing: keys sorted (recursively),
    compact separators (no spaces) — matches JS ``JSON.stringify(sortObject(x))``.
    """
    return json.dumps(data, sort_keys=True, separators=(",", ":"))


def verify_ipn(raw_body: bytes, sig_header: Optional[str], ipn_secret: str) -> bool:
    """Verify the NOWPayments IPN signature (HMAC-SHA512 over sorted JSON, constant-time).

    Returns False on any missing/mismatched input — the caller must reject
    unverified callbacks.
    """
    if not ipn_secret or not sig_header or raw_body is None:
        return False
    try:
        data = json.loads(raw_body.decode("utf-8"))
    except Exception:
        return False
    try:
        signed = _sorted_compact_json(data).encode("utf-8")
        expected = hmac.new(ipn_secret.encode("utf-8"), signed, hashlib.sha512).hexdigest()
    except Exception:
        return False
    try:
        return hmac.compare_digest(expected, sig_header.strip())
    except Exception:
        return False


def parse_ipn(raw_body: bytes) -> Dict[str, Any]:
    """Decode the (plain JSON) NOWPayments IPN body. Never raises → {} on garbage."""
    text = (raw_body or b"").decode("utf-8", "replace").strip()
    if not text:
        return {}
    try:
        obj = json.loads(text)
    except Exception:
        return {}
    return obj if isinstance(obj, dict) else {}


def ipn_order_id(data: Dict[str, Any]) -> Optional[str]:
    """Extract our order id (= payment_transactions.id) from an IPN payload."""
    for key in ("order_id", "orderId", "orderID"):
        val = data.get(key)
        if val:
            return str(val)
    return None


def ipn_is_paid(data: Dict[str, Any]) -> bool:
    """True if the IPN reports a settled payment (payment_status == 'finished')."""
    status = data.get("payment_status")
    return isinstance(status, str) and status.strip().lower() == PAID_STATUS
