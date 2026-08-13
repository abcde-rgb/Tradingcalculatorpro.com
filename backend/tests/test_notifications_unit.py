"""El canal de avisos: lo que sale, lo que no, y por qué.

La regla que fijan estos tests es una sola: **un canal que no puede enviar tiene
que decirlo**. Un aviso que falla en silencio es peor que no tener aviso, porque
el usuario cuenta con una llamada que no va a recibir cuando salte su stop.
"""
from __future__ import annotations

import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import notifications as N  # noqa: E402


def run(coro):
    """Un bucle propio por llamada.

    `get_event_loop()` heredaría el que dejen los tests asíncronos del resto de
    la suite, que puede venir ya cerrado: estos tests pasaban en solitario y
    fallaban en la suite completa, que es la peor forma de fallar.
    """
    return asyncio.run(coro)


class TestPhoneNormalisation:
    @pytest.mark.parametrize("raw,expected", [
        ("+34600000000", "+34600000000"),
        ("+34 600 00 00 00", "+34600000000"),
        ("+1 (555) 123-4567", "+15551234567"),
    ])
    def test_valid_numbers_survive_the_formatting(self, raw, expected):
        assert N.normalize_phone(raw) == expected

    @pytest.mark.parametrize("raw", ["600000000", "0034600000000", "", None,
                                     "+0600000000", "+3460", "no-soy-un-telefono"])
    def test_anything_without_a_country_code_is_rejected(self, raw):
        """Adivinar el prefijo manda el aviso al teléfono de otra persona."""
        assert N.normalize_phone(raw) is None


class TestChannelStatus:
    def test_sms_reports_not_configured_without_credentials(self, monkeypatch):
        for key in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"):
            monkeypatch.delenv(key, raising=False)
        status = N.channel_status()
        assert status["sms"]["available"] is False
        assert status["sms"]["reason"] == "not_configured"

    def test_sms_becomes_available_with_all_three_credentials(self, monkeypatch):
        """No hay más pasos de código: falta la cuenta, no el envío."""
        monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC123")
        monkeypatch.setenv("TWILIO_AUTH_TOKEN", "secret")
        monkeypatch.setenv("TWILIO_FROM_NUMBER", "+15550000000")
        assert N.channel_status()["sms"]["available"] is True

    def test_two_of_three_credentials_is_still_not_configured(self, monkeypatch):
        monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC123")
        monkeypatch.setenv("TWILIO_AUTH_TOKEN", "secret")
        monkeypatch.delenv("TWILIO_FROM_NUMBER", raising=False)
        assert N.sms_configured() is False

    def test_the_in_app_channel_is_always_available(self):
        assert N.channel_status()["inapp"]["available"] is True


class TestSendSms:
    def test_it_never_raises_and_always_says_what_happened(self, monkeypatch):
        monkeypatch.delenv("TWILIO_ACCOUNT_SID", raising=False)
        out = run(N.send_sms("+34600000000", "hola"))
        assert out == {"sent": False, "channel": "sms", "reason": "not_configured"}

    def test_a_bad_number_is_caught_before_the_provider(self, monkeypatch):
        monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC1")
        monkeypatch.setenv("TWILIO_AUTH_TOKEN", "t")
        monkeypatch.setenv("TWILIO_FROM_NUMBER", "+15550000000")
        assert run(N.send_sms("600000000", "hola"))["reason"] == "invalid_phone"


class TestDispatch:
    def test_the_message_fits_in_an_sms_and_names_the_level(self):
        text = N.format_alert_message(
            {"symbol": "btcusdt", "kind": "sl", "targetPrice": 99000}, 98950)
        assert "STOP" in text and "BTCUSDT" in text and len(text) <= N.SMS_MAX_LENGTH

    def test_every_requested_channel_reports_back(self):
        alert = {"symbol": "ES", "kind": "tp", "targetPrice": 5000,
                 "channels": ["inapp", "email", "sms"], "user_email": "a@b.c",
                 "phone": None, "user_id": "u1"}

        async def push():
            return 1

        async def mail(*_args):
            return True

        results = run(N.dispatch_alert(alert, 5001, push_inapp=push, send_email=mail))
        by_channel = {r["channel"]: r for r in results}
        assert set(by_channel) == {"inapp", "email", "sms"}
        assert by_channel["inapp"]["sent"] is True
        assert by_channel["email"]["sent"] is True
        # Sin teléfono no sale, y el motivo queda escrito en la alerta.
        assert by_channel["sms"]["sent"] is False

    def test_a_channel_that_was_not_asked_for_does_not_appear(self):
        async def push():
            return 0

        results = run(N.dispatch_alert(
            {"symbol": "ES", "channels": ["inapp"], "targetPrice": 1},
            1, push_inapp=push))
        assert [r["channel"] for r in results] == ["inapp"]
        # Nadie conectado no es un envío correcto: se dice.
        assert results[0]["sent"] is False
        assert results[0]["reason"] == "no_active_connection"

    def test_a_failing_channel_does_not_stop_the_others(self):
        """Un aviso no puede tumbar el poller ni llevarse por delante otro canal."""
        async def push():
            raise RuntimeError("socket muerto")

        async def mail(*_args):
            return True

        results = run(N.dispatch_alert(
            {"symbol": "ES", "channels": ["inapp", "email"], "targetPrice": 1,
             "user_email": "a@b.c"},
            1, push_inapp=push, send_email=mail))
        by_channel = {r["channel"]: r for r in results}
        assert by_channel["inapp"]["sent"] is False
        assert by_channel["email"]["sent"] is True
