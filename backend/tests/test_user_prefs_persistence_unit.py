"""
Tests offline de `POST /user-states/save` — la ruta donde viven los AJUSTES.

Esta tabla empezó siendo la memoria de las calculadoras y ahora guarda además
todo lo que el usuario ajusta: tema, idioma, preferencias, favoritos, progreso
de la Academia y su sistema de trading con los setups escritos a mano. Eso
cambia lo que puede permitirse la ruta:

- **Nada caduca.** El documento llevaba `expires_at` a 90 días con el comentario
  «TTL: state is auto-deleted 90 days after last update» y ninguna tarea lo
  aplicaba jamás. La promesa era falsa, y hacerla verdad ahora sería borrarle al
  usuario los setups por no abrir la pestaña un trimestre.
- **Un 4xx suyo tiene que salir como 4xx.** Todo el cuerpo estaba dentro de un
  `try` con `except Exception` que devolvía 500, así que la ruta convertía sus
  propias validaciones en errores de servidor: el cliente no podía distinguir
  «me has mandado basura» de «se me ha caído la base de datos».

No tocan red ni BD: un doble en memoria que aplica los operadores con el MISMO
`_apply_update_operators` del shim, porque el orden real de `$set`/`$unset` es
justo lo que se está comprobando.
"""
import asyncio
import os

import pytest
from fastapi import HTTPException

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402


USER = {"id": "user-1"}


class _StatesColl:
    """Lo justo de `Collection` para esta ruta, con los operadores de verdad."""

    def __init__(self, rows=None):
        self.rows = list(rows or [])

    def _find(self, flt):
        for row in self.rows:
            if all(row.get(k) == v for k, v in flt.items()):
                return row
        return None

    async def update_one(self, flt, update, upsert=False):
        row = self._find(flt)
        if row is None:
            if not upsert:
                return None
            row = dict(flt)
            self.rows.append(row)
        merged = server._apply_update_operators(row, update)
        row.clear()
        row.update(merged)
        return None


@pytest.fixture
def states(monkeypatch):
    coll = _StatesColl()
    monkeypatch.setattr(server.db, "user_states", coll, raising=False)
    return coll


def _save(body, user=USER):
    return asyncio.run(server.save_user_state(body, user=user))


# ── Nada caduca ─────────────────────────────────────────────────────────────

def test_saved_state_has_no_expiry(states):
    _save({"state_id": "preferences_v1", "state": {"slices": {"theme": {"at": 1, "value": "gold"}}}})

    row = states.rows[0]
    assert row["state"]["slices"]["theme"]["value"] == "gold"
    assert "expires_at" not in row, "un ajuste con fecha de caducidad es un ajuste que se va a perder"


def test_legacy_expiry_is_removed_on_the_next_save(states):
    """El `$unset` corre DESPUÉS del `$set` en el shim: es lo que limpia la
    caducidad que dejaron escrita las versiones anteriores. Sin esto, un ajuste
    guardado hoy seguiría arrastrando una fecha de borrado de hace meses."""
    states.rows.append({
        "user_id": USER["id"],
        "state_id": "preferences_v1",
        "state": {"viejo": True},
        "expires_at": "2026-01-01T00:00:00+00:00",
    })

    _save({"state_id": "preferences_v1", "state": {"nuevo": True}})

    row = states.rows[0]
    assert row["state"] == {"nuevo": True}
    assert "expires_at" not in row


def test_the_saved_state_is_the_one_that_arrived(states):
    """Se guarda tal cual: la conciliación del cliente depende de que las fechas
    por ajuste vuelvan intactas."""
    doc = {"v": 1, "slices": {"tradingSystem": {"at": 1738000000000, "value": {"setups": [{"name": "Ruptura NY"}]}}}}
    _save({"state_id": "preferences_v1", "state": doc})

    assert states.rows[0]["state"] == doc


# ── Un 4xx suyo sale como 4xx ───────────────────────────────────────────────

@pytest.mark.parametrize("bad_id", ["", None, "con espacio", "x" * 65, "../../etc/passwd"])
def test_a_bad_state_id_is_a_client_error(states, bad_id):
    with pytest.raises(HTTPException) as exc:
        _save({"state_id": bad_id, "state": {}})
    assert exc.value.status_code == 400
    assert not states.rows


def test_an_oversized_state_is_rejected_and_not_stored(states):
    big = {"blob": "x" * (server.MAX_USER_STATE_BYTES + 1)}

    with pytest.raises(HTTPException) as exc:
        _save({"state_id": "preferences_v1", "state": big})

    assert exc.value.status_code == 413
    assert not states.rows, "un documento rechazado no puede haberse escrito a medias"


def test_a_state_that_is_not_json_is_a_client_error(states):
    class NotSerialisable:
        pass

    with pytest.raises(HTTPException) as exc:
        _save({"state_id": "preferences_v1", "state": {"x": NotSerialisable()}})

    assert exc.value.status_code == 400
    assert not states.rows


def test_a_state_just_under_the_cap_still_goes_in(states):
    # El tope tiene que dejar pasar un sistema de trading grande de verdad; si
    # cortara antes, el usuario perdería setups sin que nadie se lo dijera.
    payload = {"blob": "x" * (server.MAX_USER_STATE_BYTES - 100)}
    _save({"state_id": "preferences_v1", "state": payload})

    assert states.rows[0]["state"] == payload


# ── Cada usuario, su documento ──────────────────────────────────────────────

def test_two_users_do_not_share_a_document(states):
    _save({"state_id": "preferences_v1", "state": {"de": "uno"}})
    _save({"state_id": "preferences_v1", "state": {"de": "otro"}}, user={"id": "user-2"})

    assert len(states.rows) == 2
    by_user = {row["user_id"]: row["state"]["de"] for row in states.rows}
    assert by_user == {"user-1": "uno", "user-2": "otro"}
