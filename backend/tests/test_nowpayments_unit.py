"""Unit tests for the NOWPayments crypto-payment helper (no network, no DB).

These prove the IPN HMAC-SHA512 verification (over the sorted, compact JSON, as
NOWPayments signs it) is correct — genuine signatures pass, tampered/forged ones
fail — and that the parsers handle NOWPayments' shapes. They run with plain
`pytest` (the `_unit.py` suffix exempts them from the integration skip).
"""

import hashlib
import hmac
import json

import nowpayments

IPN_SECRET = "np_ipn_secret_ABCDEF123456"


def _sign(data: dict, secret: str = IPN_SECRET) -> str:
    signed = json.dumps(data, sort_keys=True, separators=(",", ":")).encode()
    return hmac.new(secret.encode(), signed, hashlib.sha512).hexdigest()


def test_verify_ipn_genuine_signature():
    data = {"payment_status": "finished", "order_id": "tx-1", "payment_id": 99, "price_amount": 200}
    raw = json.dumps(data).encode()  # arbitrary key order from the wire
    assert nowpayments.verify_ipn(raw, _sign(data), IPN_SECRET) is True


def test_verify_ipn_key_order_independent():
    # signature must verify regardless of the key order in the received body
    data = {"b": 2, "a": 1, "order_id": "tx-9", "payment_status": "finished"}
    raw = b'{"order_id":"tx-9","payment_status":"finished","a":1,"b":2}'
    assert nowpayments.verify_ipn(raw, _sign(data), IPN_SECRET) is True


def test_verify_ipn_rejects_tampered_body():
    data = {"payment_status": "finished", "order_id": "tx-1"}
    sig = _sign(data)
    tampered = json.dumps({"payment_status": "finished", "order_id": "tx-EVIL"}).encode()
    assert nowpayments.verify_ipn(tampered, sig, IPN_SECRET) is False


def test_verify_ipn_rejects_wrong_secret():
    data = {"payment_status": "finished", "order_id": "tx-1"}
    assert nowpayments.verify_ipn(json.dumps(data).encode(), _sign(data, "wrong"), IPN_SECRET) is False


def test_verify_ipn_rejects_missing_inputs():
    data = {"payment_status": "finished"}
    sig = _sign(data)
    raw = json.dumps(data).encode()
    assert nowpayments.verify_ipn(raw, None, IPN_SECRET) is False
    assert nowpayments.verify_ipn(raw, sig, "") is False
    assert nowpayments.verify_ipn(b"not json", sig, IPN_SECRET) is False


def test_ipn_is_paid():
    assert nowpayments.ipn_is_paid({"payment_status": "finished"}) is True
    assert nowpayments.ipn_is_paid({"payment_status": "confirming"}) is False
    assert nowpayments.ipn_is_paid({"payment_status": "partially_paid"}) is False
    assert nowpayments.ipn_is_paid({"payment_status": "failed"}) is False
    assert nowpayments.ipn_is_paid({}) is False


def test_ipn_order_id_and_parse():
    data = {"payment_status": "finished", "order_id": "tx-42"}
    assert nowpayments.ipn_order_id(data) == "tx-42"
    assert nowpayments.ipn_order_id({}) is None
    assert nowpayments.parse_ipn(b"") == {}
    assert nowpayments.parse_ipn(b"garbage") == {}
    assert nowpayments.parse_ipn(b'{"order_id":"x"}') == {"order_id": "x"}
