"""BUG: los envíos de magic link y verificación de email usaban httpx en crudo
sin comprobar el código de respuesta. httpx no lanza excepción por un 4xx/5xx
—sólo por fallos de red—, así que una clave de SendGrid inválida, un dominio
remitente sin verificar o un 429 fallaban en TOTAL silencio: ni excepción, ni
log, ni forma de saber por qué un usuario no recibía el correo. `_send_email`
(el otro camino, con el SDK oficial) sí lo capturaba; estos dos no.

Reportado por el dueño: "el envío de correos no funciona ni magic link" — con
el código de antes, ese fallo no habría dejado ni una línea en los logs de
Cloud Run para diagnosticarlo.
"""
import logging
import os
import sys

import httpx
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402


class _FakeResponse:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text


def _mock_post(status_code, text):
    async def fake_post(self, url, json=None, headers=None):
        return _FakeResponse(status_code, text)
    return fake_post


@pytest.mark.asyncio
async def test_magic_link_email_logs_a_sendgrid_rejection(monkeypatch, caplog):
    monkeypatch.setattr(server, "SENDGRID_API_KEY", "fake-key-para-el-test")
    monkeypatch.setattr(
        httpx.AsyncClient, "post",
        _mock_post(403, '{"errors":[{"message":"does not match a verified Sender Identity"}]}'),
    )
    with caplog.at_level(logging.WARNING):
        await server._send_magic_link_email(
            "user@example.com", "User", "https://tradingcalculator.pro/magic?token=x",
        )
    assert any("403" in r.message for r in caplog.records), (
        "un 403 de SendGrid tiene que dejar rastro en los logs, no fallar en silencio"
    )


@pytest.mark.asyncio
async def test_verify_email_logs_a_sendgrid_rejection(monkeypatch, caplog):
    monkeypatch.setattr(server, "SENDGRID_API_KEY", "fake-key-para-el-test")
    monkeypatch.setattr(httpx.AsyncClient, "post", _mock_post(401, "Unauthorized"))

    async def fake_update_one(*a, **kw):
        return None
    monkeypatch.setattr(server.db.email_verification_tokens, "update_one", fake_update_one)

    with caplog.at_level(logging.WARNING):
        await server._send_email_verification("user-id-1", "user@example.com", "User")
    assert any("401" in r.message for r in caplog.records)


@pytest.mark.asyncio
async def test_magic_link_email_stays_quiet_on_success(monkeypatch, caplog):
    """Un 202 (éxito real de SendGrid) no debe generar ningún warning."""
    monkeypatch.setattr(server, "SENDGRID_API_KEY", "fake-key-para-el-test")
    monkeypatch.setattr(httpx.AsyncClient, "post", _mock_post(202, ""))
    with caplog.at_level(logging.WARNING):
        await server._send_magic_link_email(
            "user@example.com", "User", "https://tradingcalculator.pro/magic?token=x",
        )
    assert not any("magic-link" in r.message for r in caplog.records)
