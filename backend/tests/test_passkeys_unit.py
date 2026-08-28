"""Passkeys (WebAuthn): reglas que no se pueden relajar.

La ceremonia criptográfica la valida `py_webauthn` y está probada de extremo a
extremo con el autenticador virtual de Chrome. Lo que se fija aquí es lo que
**nosotros** decidimos y podríamos romper sin enterarnos: el ciclo de vida del
reto, el contador anti-replay y de dónde sale el origen.
"""
import json
import os
from datetime import datetime, timedelta, timezone

import pytest

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import passkeys  # noqa: E402


# ── Origen y RP ID ────────────────────────────────────────────────────────────

def test_rp_id_is_the_frontend_host_without_scheme(monkeypatch):
    """El `rp_id` es el HOST del frontend, sin esquema ni ruta. Con esquema, el
    navegador aborta la ceremonia con un SecurityError poco explicativo."""
    monkeypatch.setenv("PASSKEY_ORIGIN", "https://tradingcalculator.pro/alguna/ruta")
    monkeypatch.delenv("PASSKEY_RP_ID", raising=False)
    rp = passkeys.relying_party()
    assert rp["rp_id"] == "tradingcalculator.pro"
    assert "://" not in rp["rp_id"] and "/" not in rp["rp_id"]


def test_rp_id_can_be_overridden(monkeypatch):
    """Necesario para el cutover de dominio y para las pruebas en localhost."""
    monkeypatch.setenv("PASSKEY_ORIGIN", "http://localhost:3100")
    monkeypatch.setenv("PASSKEY_RP_ID", "localhost")
    assert passkeys.relying_party()["rp_id"] == "localhost"


def test_port_is_stripped_from_rp_id(monkeypatch):
    monkeypatch.setenv("PASSKEY_ORIGIN", "http://localhost:3100")
    monkeypatch.delenv("PASSKEY_RP_ID", raising=False)
    assert passkeys.relying_party()["rp_id"] == "localhost"


# ── Ciclo de vida del reto ────────────────────────────────────────────────────

def _challenge(*, used=False, delta_seconds=60):
    return {
        "used": used,
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=delta_seconds)).isoformat(),
    }


def test_fresh_challenge_is_valid():
    assert passkeys.challenge_is_valid(_challenge()) is True


def test_used_challenge_is_rejected():
    """De un solo uso: si se pudiera repetir, capturar una respuesta válida
    bastaría para repetir el acceso indefinidamente."""
    assert passkeys.challenge_is_valid(_challenge(used=True)) is False


def test_expired_challenge_is_rejected():
    assert passkeys.challenge_is_valid(_challenge(delta_seconds=-1)) is False


def test_missing_or_malformed_challenge_is_rejected():
    assert passkeys.challenge_is_valid(None) is False
    assert passkeys.challenge_is_valid({}) is False
    assert passkeys.challenge_is_valid({"expires_at": "no es una fecha"}) is False


def test_naive_timestamp_is_treated_as_utc():
    """Una fecha sin zona no puede compararse con una consciente: sin el ajuste
    esto lanzaría TypeError y el acceso fallaría con un 500 en vez de un 401."""
    naive = (datetime.now(timezone.utc) + timedelta(seconds=60)).replace(tzinfo=None).isoformat()
    assert passkeys.challenge_is_valid({"used": False, "expires_at": naive}) is True


def test_challenge_ttl_is_short():
    """Cinco minutos: holgado para poner el dedo, corto para que una captura
    sirva de algo."""
    assert 60 <= passkeys.CHALLENGE_TTL_SECONDS <= 600


# ── Opciones de la ceremonia ──────────────────────────────────────────────────

def test_registration_options_carry_rp_and_challenge(monkeypatch):
    monkeypatch.setenv("PASSKEY_ORIGIN", "https://example.com")
    monkeypatch.delenv("PASSKEY_RP_ID", raising=False)
    out = passkeys.registration_options(user_id="u1", user_name="a@b.com")
    opts = json.loads(out["options"])
    assert opts["rp"]["id"] == "example.com"
    assert opts["user"]["name"] == "a@b.com"
    assert out["challenge"]


def test_registration_excludes_already_registered_credentials(monkeypatch):
    """Sin `excludeCredentials` el mismo dispositivo registra passkeys duplicadas
    que el usuario no sabe distinguir al borrarlas."""
    monkeypatch.setenv("PASSKEY_ORIGIN", "https://example.com")
    out = passkeys.registration_options(
        user_id="u1", user_name="a@b.com", existing_credential_ids=["AAAA", "BBBB"],
    )
    assert len(json.loads(out["options"])["excludeCredentials"]) == 2


def test_authentication_options_are_usernameless(monkeypatch):
    """Sin lista de credenciales la ceremonia no revela si una cuenta existe."""
    monkeypatch.setenv("PASSKEY_ORIGIN", "https://example.com")
    opts = json.loads(passkeys.authentication_options()["options"])
    assert not opts.get("allowCredentials")


# ── Contador anti-replay ──────────────────────────────────────────────────────

class _Verified:
    def __init__(self, n):
        self.new_sign_count = n


def _verify_with(monkeypatch, *, new_count, stored):
    monkeypatch.setattr(passkeys, "verify_authentication_response",
                        lambda **kw: _Verified(new_count))
    return passkeys.verify_authentication(
        credential={}, expected_challenge="AAAA", public_key="AAAA",
        stored_sign_count=stored,
    )


def test_sign_count_must_advance(monkeypatch):
    assert _verify_with(monkeypatch, new_count=6, stored=5)["sign_count"] == 6


@pytest.mark.parametrize("new_count", [5, 4, 1])
def test_sign_count_that_does_not_advance_is_rejected(monkeypatch, new_count):
    """Un contador que no sube es replay o autenticador clonado. Los dos casos
    se rechazan."""
    with pytest.raises(passkeys.SignCountError):
        _verify_with(monkeypatch, new_count=new_count, stored=5)


def test_authenticators_that_always_report_zero_are_accepted(monkeypatch):
    """Muchas passkeys sincronizadas de plataforma no incrementan nunca: exigir
    avance ahí rompería el acceso legítimo, y el contador no aporta señal."""
    assert _verify_with(monkeypatch, new_count=0, stored=0)["sign_count"] == 0


# ── Vista pública ─────────────────────────────────────────────────────────────

def test_describe_never_leaks_key_material():
    doc = {
        "id": "x", "name": "Mi portátil", "created_at": "2026-01-01",
        "last_used_at": None, "public_key": "SECRETO", "credential_id": "SECRETO",
        "sign_count": 3, "user_id": "u1",
    }
    out = passkeys.describe(doc)
    assert set(out) == {"id", "name", "created_at", "last_used_at"}
    assert "SECRETO" not in json.dumps(out)
