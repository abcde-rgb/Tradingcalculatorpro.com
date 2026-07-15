"""Revolut — Revolut Pay / Merchant API integration (order + webhook helpers).

Revolut Merchant (https://developer.revolut.com/docs/merchant/merchant-api) is a
standalone payment gateway, **independent of Stripe**. Creating an order returns
a hosted **checkout page** that offers *Revolut Pay* plus card, and — on eligible
devices — *Apple Pay* and *Google Pay*. So this single integration also surfaces
Apple Pay without any separate "Apple Pay key" (Apple Pay is a wallet that always
rides on top of a processor; there is no standalone Apple Pay API key).

This module is a *pure* helper (no DB access): it creates the order over httpx
and verifies/parses the webhook. The checkout route and the webhook route that
activate the subscription live in ``server.py`` (they need DB +
``_activate_paid_subscription``), mirroring the OxaPay/PayPal/Stripe helpers.

──────────────────────────────────────────────────────────────────────────────
Revolut Merchant API contract (date-versioned API)
──────────────────────────────────────────────────────────────────────────────
Create order:
    POST {base}/orders
    Headers:  Authorization: Bearer <SECRET_API_KEY>   (sk_... / sandbox key)
              Revolut-Api-Version: 2024-09-01
              Content-Type: application/json
    Body (JSON):
        amount (int, MINOR units e.g. cents), currency ("EUR"),
        merchant_order_ext_ref (= our payment_transactions.id),
        description, redirect_url, customer {email}
    Response: {"id": "<revolut_order_id>", "token": "...",
               "checkout_url": "https://checkout.revolut.com/...", "state": "pending"}
    base = https://merchant.revolut.com/api (live)
         | https://sandbox-merchant.revolut.com/api (sandbox)

Webhook (signature-verified — Revolut's documented scheme):
    Revolut POSTs order events to the webhook URL. Headers:
        Revolut-Signature:         "v1=<hex_hmac_sha256>"  (may be space-separated list)
        Revolut-Request-Timestamp: "<unix_millis>"
    The signed payload is  "v1." + timestamp + "." + raw_body.  Recompute
    HMAC-SHA256 with the **webhook signing secret** (wsk_...) — a *separate*
    secret you get when the webhook is created (NOT the API key) — and compare
    (constant-time) against the v1 signature.
    Body: {"event": "ORDER_COMPLETED"|"ORDER_AUTHORISED"|...,
           "order_id": "<revolut_order_id>",
           "merchant_order_ext_ref": "<our id>"}

Payments are one-time orders that grant plan["days"] of access — exactly the
same model as the OxaPay crypto flow (no auto-renew), which sidesteps Revolut
Pay's limited recurring support.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

API_BASE_LIVE = "https://merchant.revolut.com/api"
API_BASE_SANDBOX = "https://sandbox-merchant.revolut.com/api"
API_VERSION = "2024-09-01"
ORDERS_ENDPOINT = "/orders"

# Webhook events that mean the payment settled.
PAID_EVENTS = frozenset({"ORDER_COMPLETED"})
# Order state (when we confirm via API) that means paid.
PAID_STATES = frozenset({"completed"})


class RevolutError(Exception):
    """Raised when a Revolut request fails or returns an unexpected response."""


def _base_url(sandbox: bool) -> str:
    return API_BASE_SANDBOX if sandbox else API_BASE_LIVE


async def create_order(
    *,
    api_key: str,
    amount: float,
    currency: str,
    order_id: str,
    description: str,
    redirect_url: str,
    sandbox: bool = False,
    email: Optional[str] = None,
) -> Dict[str, str]:
    """Create a Revolut Merchant order. Returns ``{"checkout_url", "order_id"}``.

    ``amount`` is in major units (e.g. euros); it is converted to the minor
    units (cents) the API expects. Raises :class:`RevolutError` on any failure
    so callers can map it to a user-facing 502/503.
    """
    if not api_key:
        raise RevolutError("Revolut no está configurado (falta la Secret API Key).")

    import httpx as _httpx

    minor = int(round(float(amount) * 100))
    payload: Dict[str, Any] = {
        "amount": minor,
        "currency": currency,
        "merchant_order_ext_ref": order_id,
        "description": description,
        "redirect_url": redirect_url,
    }
    if email:
        payload["customer"] = {"email": email}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Revolut-Api-Version": API_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        async with _httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{_base_url(sandbox)}{ORDERS_ENDPOINT}", json=payload, headers=headers,
            )
    except Exception as exc:  # network / DNS / timeout
        raise RevolutError(f"No se pudo contactar con Revolut: {exc}") from exc

    if resp.status_code >= 400:
        raise RevolutError(f"Revolut HTTP {resp.status_code}: {resp.text[:300]}")

    try:
        body = resp.json()
    except Exception as exc:
        raise RevolutError(f"Respuesta Revolut no es JSON: {resp.text[:200]}") from exc

    checkout_url = body.get("checkout_url") if isinstance(body, dict) else None
    rev_order_id = body.get("id") if isinstance(body, dict) else None
    if not checkout_url:
        msg = ""
        if isinstance(body, dict):
            msg = str(body.get("message") or body.get("error") or body)
        raise RevolutError(f"Revolut no devolvió checkout_url: {msg[:300]}")

    return {"checkout_url": checkout_url, "order_id": str(rev_order_id or "")}


def verify_webhook(
    raw_body: bytes,
    signature_header: Optional[str],
    timestamp_header: Optional[str],
    signing_secret: str,
) -> bool:
    """Verify a Revolut webhook signature (HMAC-SHA256, constant-time).

    The signed payload is ``"v1." + timestamp + "." + raw_body``. The
    ``Revolut-Signature`` header carries one or more ``v1=<hex>`` signatures
    (space-separated). Returns False on any missing/mismatched input — the
    caller must reject unverified callbacks.
    """
    if not signing_secret or not signature_header or not timestamp_header or raw_body is None:
        return False
    try:
        payload = b"v1." + timestamp_header.strip().encode("utf-8") + b"." + raw_body
        expected = hmac.new(signing_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    except Exception:
        return False
    # Header may list several signatures (rotation); accept if any matches.
    for token in signature_header.replace(",", " ").split():
        token = token.strip()
        if token.startswith("v1="):
            token = token[3:]
        try:
            if hmac.compare_digest(expected, token):
                return True
        except Exception:
            continue
    return False


def parse_webhook(raw_body: bytes) -> Dict[str, Any]:
    """Decode the (plain JSON) Revolut webhook body. Never raises → {} on garbage."""
    text = (raw_body or b"").decode("utf-8", "replace").strip()
    if not text:
        return {}
    try:
        obj = json.loads(text)
    except Exception:
        return {}
    return obj if isinstance(obj, dict) else {}


def webhook_order_ref(data: Dict[str, Any]) -> Optional[str]:
    """Our order id (= payment_transactions.id) from ``merchant_order_ext_ref``."""
    for key in ("merchant_order_ext_ref", "merchantOrderExtRef", "order_ref"):
        val = data.get(key)
        if val:
            return str(val)
    return None


def webhook_revolut_order_id(data: Dict[str, Any]) -> Optional[str]:
    """Revolut's own order id from the webhook (fallback match)."""
    for key in ("order_id", "orderId", "id"):
        val = data.get(key)
        if val:
            return str(val)
    return None


def webhook_is_paid(data: Dict[str, Any]) -> bool:
    """True if the webhook reports a settled payment (event ORDER_COMPLETED)."""
    event = data.get("event")
    if isinstance(event, str) and event.strip().upper() in PAID_EVENTS:
        return True
    # Some payloads carry the order state directly.
    state = data.get("state")
    return isinstance(state, str) and state.strip().lower() in PAID_STATES
