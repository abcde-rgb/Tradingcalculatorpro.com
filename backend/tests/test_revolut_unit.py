"""Unit tests for the Revolut Merchant payment helper (no network, no DB).

These prove the webhook HMAC-SHA256 signature verification is correct (genuine
signatures pass, tampered/forged ones fail) and that the payload parsers handle
Revolut's shapes. They run with plain `pytest` (the `_unit.py` suffix exempts
them from the integration skip in conftest).
"""

import hashlib
import hmac
import json

import revolut

SECRET = "wsk_test_signing_secret_ABCDEF"
TS = "1700000000000"


def _sign(raw: bytes, ts: str = TS, secret: str = SECRET) -> str:
    payload = b"v1." + ts.encode() + b"." + raw
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


def test_verify_webhook_genuine_signature():
    raw = json.dumps({"event": "ORDER_COMPLETED", "order_id": "6a", "merchant_order_ext_ref": "tx-1"}).encode()
    assert revolut.verify_webhook(raw, f"v1={_sign(raw)}", TS, SECRET) is True


def test_verify_webhook_accepts_bare_hex_without_prefix():
    raw = json.dumps({"event": "ORDER_COMPLETED"}).encode()
    assert revolut.verify_webhook(raw, _sign(raw), TS, SECRET) is True


def test_verify_webhook_accepts_multiple_space_separated_signatures():
    raw = json.dumps({"event": "ORDER_COMPLETED"}).encode()
    header = f"v1=deadbeef v1={_sign(raw)}"
    assert revolut.verify_webhook(raw, header, TS, SECRET) is True


def test_verify_webhook_rejects_tampered_body():
    raw = json.dumps({"event": "ORDER_COMPLETED", "merchant_order_ext_ref": "tx-1"}).encode()
    sig = f"v1={_sign(raw)}"
    tampered = json.dumps({"event": "ORDER_COMPLETED", "merchant_order_ext_ref": "tx-EVIL"}).encode()
    assert revolut.verify_webhook(tampered, sig, TS, SECRET) is False


def test_verify_webhook_rejects_wrong_secret():
    raw = json.dumps({"event": "ORDER_COMPLETED"}).encode()
    assert revolut.verify_webhook(raw, f"v1={_sign(raw)}", TS, "wsk_wrong") is False


def test_verify_webhook_rejects_wrong_timestamp():
    raw = json.dumps({"event": "ORDER_COMPLETED"}).encode()
    # signature was computed with TS but a different timestamp is presented
    assert revolut.verify_webhook(raw, f"v1={_sign(raw)}", "1700000009999", SECRET) is False


def test_verify_webhook_rejects_missing_inputs():
    raw = json.dumps({"event": "ORDER_COMPLETED"}).encode()
    sig = f"v1={_sign(raw)}"
    assert revolut.verify_webhook(raw, None, TS, SECRET) is False
    assert revolut.verify_webhook(raw, sig, None, SECRET) is False
    assert revolut.verify_webhook(raw, sig, TS, "") is False


def test_webhook_is_paid():
    assert revolut.webhook_is_paid({"event": "ORDER_COMPLETED"}) is True
    assert revolut.webhook_is_paid({"state": "completed"}) is True
    assert revolut.webhook_is_paid({"event": "ORDER_AUTHORISED"}) is False
    assert revolut.webhook_is_paid({"event": "ORDER_CANCELLED"}) is False
    assert revolut.webhook_is_paid({}) is False


def test_webhook_order_ref_and_revolut_id():
    data = {"event": "ORDER_COMPLETED", "order_id": "rev-99", "merchant_order_ext_ref": "tx-42"}
    assert revolut.webhook_order_ref(data) == "tx-42"
    assert revolut.webhook_revolut_order_id(data) == "rev-99"
    assert revolut.webhook_order_ref({}) is None


def test_parse_webhook_handles_garbage():
    assert revolut.parse_webhook(b"") == {}
    assert revolut.parse_webhook(b"not json") == {}
    assert revolut.parse_webhook(b'{"event":"ORDER_COMPLETED"}') == {"event": "ORDER_COMPLETED"}
