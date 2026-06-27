"""Unit tests for the MaxelPay crypto-payment helper (no network, no DB).

These prove the encryption is internally consistent (encrypt → decrypt round
trip), the payload uses the exact field names MaxelPay expects, and the
response/webhook parsers tolerate the shapes MaxelPay may send. They run with
plain `pytest` (the `_unit.py` suffix exempts them from the integration skip in
conftest).
"""

import base64
import json

import pytest

import maxelpay

# AES-256 needs a 32-byte key. MaxelPay secret keys are 32 chars.
SECRET = "0123456789abcdef0123456789abcdef"


def test_encrypt_decrypt_roundtrip():
    plaintext = json.dumps({"orderID": "abc-123", "amount": "17.00", "currency": "EUR"})
    enc = maxelpay._encrypt(plaintext, SECRET)
    # Output must be valid base64 (what MaxelPay expects in {"data": ...}).
    base64.b64decode(enc)
    assert maxelpay._decrypt(enc, SECRET) == plaintext


def test_encrypt_is_deterministic_with_fixed_iv():
    # MaxelPay derives the IV from the secret (not random), so the same input
    # encrypts to the same ciphertext — a property the gateway relies on.
    a = maxelpay._encrypt("hello", SECRET)
    b = maxelpay._encrypt("hello", SECRET)
    assert a == b


def test_key_must_be_32_bytes():
    with pytest.raises(maxelpay.MaxelPayError):
        maxelpay._encrypt("x", "too-short")


def test_base_url_modes():
    assert maxelpay._base_url("prod").endswith("/v1/prod")
    assert maxelpay._base_url("production").endswith("/v1/prod")
    assert maxelpay._base_url("live").endswith("/v1/prod")
    assert maxelpay._base_url("stg").endswith("/v1/stg")
    assert maxelpay._base_url("").endswith("/v1/stg")
    assert maxelpay._base_url(None).endswith("/v1/stg")


def test_build_payload_field_names():
    p = maxelpay.build_payload(
        order_id="o1", amount="17.00", currency="EUR", timestamp="1700000000",
        user_name="Jane", user_email="jane@example.com", site_name="TC.Pro",
        website_url="https://x.com", redirect_url="https://x.com/ok",
        cancel_url="https://x.com/no", webhook_url="https://api.x.com/wh",
    )
    # Exact camelCase keys MaxelPay documents.
    assert set(p) == {
        "orderID", "amount", "currency", "timestamp", "userName", "siteName",
        "userEmail", "redirectUrl", "websiteUrl", "cancelUrl", "webhookUrl",
    }
    assert p["orderID"] == "o1"
    assert p["userEmail"] == "jane@example.com"


@pytest.mark.parametrize("body,expected", [
    ({"result": "https://pay.maxelpay.com/abc"}, "https://pay.maxelpay.com/abc"),
    ({"url": "https://pay.maxelpay.com/xyz"}, "https://pay.maxelpay.com/xyz"),
    ({"data": {"checkout_url": "https://pay.maxelpay.com/n"}}, "https://pay.maxelpay.com/n"),
    ("https://pay.maxelpay.com/raw", "https://pay.maxelpay.com/raw"),
    ({"status": "ok"}, None),
])
def test_extract_checkout_url(body, expected):
    assert maxelpay._extract_checkout_url(body) == expected


def test_parse_webhook_plain_json():
    raw = json.dumps({"orderID": "o-9", "status": "Completed"}).encode()
    data = maxelpay.parse_webhook(raw, SECRET)
    assert data["orderID"] == "o-9"
    assert maxelpay.webhook_order_id(data) == "o-9"
    assert maxelpay.webhook_is_paid(data) is True


def test_parse_webhook_encrypted_envelope():
    inner = {"orderID": "o-enc", "status": "PAID"}
    enc = maxelpay._encrypt(json.dumps(inner), SECRET)
    raw = json.dumps({"data": enc}).encode()
    data = maxelpay.parse_webhook(raw, SECRET)
    assert maxelpay.webhook_order_id(data) == "o-enc"
    assert maxelpay.webhook_is_paid(data) is True


def test_parse_webhook_garbage_returns_empty():
    assert maxelpay.parse_webhook(b"not json", SECRET) == {}
    assert maxelpay.parse_webhook(b"", SECRET) == {}


@pytest.mark.parametrize("status,paid", [
    ("completed", True), ("Completed", True), ("PAID", True), ("success", True),
    ("pending", False), ("failed", False), ("expired", False), ("", False),
])
def test_webhook_is_paid_statuses(status, paid):
    assert maxelpay.webhook_is_paid({"status": status}) is paid


@pytest.mark.parametrize("key", ["orderID", "orderId", "order_id", "order"])
def test_webhook_order_id_spellings(key):
    assert maxelpay.webhook_order_id({key: "X1"}) == "X1"


def test_create_checkout_url_requires_credentials():
    # Self-contained (no pytest-asyncio dependency): missing creds must raise
    # before any network call is attempted.
    import asyncio

    with pytest.raises(maxelpay.MaxelPayError):
        asyncio.run(
            maxelpay.create_checkout_url(api_key="", secret_key="", mode="stg", payload={})
        )
