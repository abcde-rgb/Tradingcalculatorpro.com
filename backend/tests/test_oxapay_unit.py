"""Unit tests for the OxaPay crypto-payment helper (no network, no DB).

These prove the webhook HMAC-SHA512 verification is correct (genuine signatures
pass, tampered/forged ones fail) and that the payload parsers handle OxaPay's
shapes. They run with plain `pytest` (the `_unit.py` suffix exempts them from
the integration skip in conftest).
"""

import hashlib
import hmac
import json

import pytest

import oxapay

API_KEY = "ABCDEF-123456-GHIJKL-789012"


def _sign(raw: bytes, key: str = API_KEY) -> str:
    return hmac.new(key.encode(), raw, hashlib.sha512).hexdigest()


def test_verify_webhook_genuine_signature():
    raw = json.dumps({"status": "paid", "order_id": "o-1", "track_id": "t-1"}).encode()
    assert oxapay.verify_webhook(raw, _sign(raw), API_KEY) is True


def test_verify_webhook_rejects_tampered_body():
    raw = json.dumps({"status": "paid", "order_id": "o-1"}).encode()
    sig = _sign(raw)
    tampered = json.dumps({"status": "paid", "order_id": "o-EVIL"}).encode()
    assert oxapay.verify_webhook(tampered, sig, API_KEY) is False


def test_verify_webhook_rejects_wrong_key():
    raw = json.dumps({"status": "paid"}).encode()
    assert oxapay.verify_webhook(raw, _sign(raw, "WRONG-KEY"), API_KEY) is False


def test_verify_webhook_rejects_missing_inputs():
    raw = b"{}"
    assert oxapay.verify_webhook(raw, None, API_KEY) is False
    assert oxapay.verify_webhook(raw, _sign(raw), "") is False
    assert oxapay.verify_webhook(raw, "", API_KEY) is False


def test_parse_webhook_plain_json():
    raw = json.dumps({"order_id": "o-9", "status": "paid", "track_id": "t-9"}).encode()
    data = oxapay.parse_webhook(raw)
    assert data["order_id"] == "o-9"
    assert oxapay.webhook_order_id(data) == "o-9"
    assert oxapay.webhook_is_paid(data) is True


def test_parse_webhook_garbage_returns_empty():
    assert oxapay.parse_webhook(b"not json") == {}
    assert oxapay.parse_webhook(b"") == {}


@pytest.mark.parametrize("status,paid", [
    ("paid", True), ("PAID", True), ("Paid", True),
    ("waiting", False), ("confirming", False), ("expired", False),
    ("failed", False), ("new", False), ("", False),
])
def test_webhook_is_paid_statuses(status, paid):
    assert oxapay.webhook_is_paid({"status": status}) is paid


@pytest.mark.parametrize("key", ["order_id", "orderId", "orderID"])
def test_webhook_order_id_spellings(key):
    assert oxapay.webhook_order_id({key: "X1"}) == "X1"


def test_webhook_order_id_missing():
    assert oxapay.webhook_order_id({"status": "paid"}) is None


def test_create_invoice_requires_api_key():
    # Self-contained (no pytest-asyncio): missing key must raise before any
    # network call is attempted.
    import asyncio

    with pytest.raises(oxapay.OxaPayError):
        asyncio.run(oxapay.create_invoice(
            api_key="", amount=17.0, currency="EUR", order_id="o", description="d",
            callback_url="https://x/cb", return_url="https://x/ok",
        ))
