"""Fija que un ajuste guardado por el panel se pueda volver a leer.

`app_settings` tenía **dos esquemas incompatibles a la vez**: se escribía como
campo del documento único `{_id: "global"}` y tres lectores lo buscaban como un
documento por clave (`find_one({"key": ...})`). El shim traduce ese filtro a
`data->>'key' = $1`, y el documento global no tiene campo `key`, así que la
consulta no encontraba nunca nada.

El fallo era **silencioso y total**: el editor de planes, el gestor de i18n y
`/public/settings` devolvían vacío para siempre mientras la escritura aterrizaba
correctamente un campo más allá, y el administrador recibía `{"success": true}`
por un cambio que no era legible. Nada lo detectaba porque las siete
comprobaciones automáticas del proyecto no tocan el shim (G-17).

Lo que se fija aquí no es "que el lector de hoy use el filtro correcto" —eso se
arregla una vez y se vuelve a romper en el siguiente endpoint— sino **que
escritura y lectura vayan por la misma puerta**, con un doble falso que se
comporta como el shim: acepta el documento por `_id` y no inventa un campo
`key` que nadie escribe.
"""
import json
import os

import pytest

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

from admin_routes import (  # noqa: E402
    PUBLIC_SETTING_KEYS,
    _get_all_settings,
    _get_setting_raw,
    _upsert_setting,
)


class _FakeCollection:
    """Colección al estilo del shim: un documento, direccionable por `_id`.

    Reproduce la propiedad que hizo invisible el bug: un filtro por un campo que
    el documento no tiene (`{"key": ...}`) no encuentra nada, en vez de fallar.
    """

    def __init__(self):
        self.docs = {}

    async def find_one(self, filt, projection=None):
        if "_id" in filt:
            doc = self.docs.get(filt["_id"])
            return dict(doc) if doc else None
        # Cualquier otro filtro se resuelve contra los campos del documento,
        # que es exactamente lo que hace `data->>'campo' = $1` en el shim.
        for key, doc in self.docs.items():
            if all(doc.get(k) == v for k, v in filt.items()):
                return dict(doc)
        return None

    async def update_one(self, filt, update, upsert=False):
        _id = filt["_id"]
        doc = self.docs.setdefault(_id, {"_id": _id}) if upsert else self.docs.get(_id)
        if doc is None:
            return
        for field, value in (update.get("$set") or {}).items():
            doc[field] = value
        for field in (update.get("$unset") or {}):
            doc.pop(field, None)


class _FakeDB:
    def __init__(self):
        self.app_settings = _FakeCollection()


@pytest.fixture
def db():
    return _FakeDB()


@pytest.mark.asyncio
async def test_setting_escrito_se_lee(db):
    """Lo mínimo que tiene que cumplir un ajuste: sobrevivir a un ida y vuelta."""
    await _upsert_setting(db, "ga4_measurement_id", "G-ABC123")
    assert await _get_setting_raw(db, "ga4_measurement_id") == "G-ABC123"


@pytest.mark.asyncio
async def test_setting_ausente_es_none_no_cadena_vacia(db):
    """Distinguir "no configurado" de "configurado a vacío" (regla nº2)."""
    assert await _get_setting_raw(db, "no_configurado") is None


@pytest.mark.asyncio
async def test_override_de_plan_se_lee_de_vuelta(db):
    """El editor de precios: escribía, respondía OK y no cambiaba nada."""
    payload = json.dumps({"price": 29.0, "stripe_price_id": "price_NUEVO"})
    await _upsert_setting(db, "plan_monthly", payload)

    raw = await _get_setting_raw(db, "plan_monthly")
    assert raw is not None, "el override del plan volvió a perderse"
    assert json.loads(raw)["price"] == 29.0


@pytest.mark.asyncio
async def test_claves_publicas_llegan_al_frontend(db):
    """`/public/settings` devolvía `{}` siempre: GA4/GTM/Clarity no se podían activar."""
    await _upsert_setting(db, "ga4_measurement_id", "G-ABC123")
    settings = await _get_all_settings(db)
    publicas = {k: settings[k] for k in PUBLIC_SETTING_KEYS if settings.get(k)}
    assert publicas.get("ga4_measurement_id") == "G-ABC123"


@pytest.mark.asyncio
async def test_prefijo_i18n_se_recupera_del_documento_global(db):
    """El gestor de traducciones mostraba la lista vacía hiciera lo que hiciera."""
    await _upsert_setting(db, "i18n_heroTitle", json.dumps({"es": "Hola", "en": "Hi"}))
    await _upsert_setting(db, "site_name", "TradingCalculator.Pro")

    settings = await _get_all_settings(db)
    i18n_keys = {k for k in settings if k.startswith("i18n_")}
    assert i18n_keys == {"i18n_heroTitle"}, "el prefijo i18n_ no se recupera"
    assert json.loads(settings["i18n_heroTitle"])["es"] == "Hola"


@pytest.mark.asyncio
async def test_ningun_lector_busca_por_campo_key(db):
    """La forma exacta del bug: buscar un documento por un campo `key`.

    Nada en el proyecto escribe documentos con esa forma, así que cualquier
    lector que la use devuelve vacío para siempre y en silencio.
    """
    await _upsert_setting(db, "plan_monthly", json.dumps({"price": 29.0}))

    por_campo_key = await db.app_settings.find_one({"key": "plan_monthly"})
    assert por_campo_key is None, (
        "si esto encuentra algo, alguien ha empezado a escribir el esquema "
        "por-clave y hay que decidir cuál de los dos vive"
    )
    assert await _get_setting_raw(db, "plan_monthly") is not None


@pytest.mark.asyncio
async def test_borrar_un_ajuste_no_se_lleva_los_demas(db):
    """El `$unset` corre sobre el documento compartido: tiene que ser quirúrgico."""
    from admin_routes import _delete_setting

    await _upsert_setting(db, "ga4_measurement_id", "G-ABC123")
    await _upsert_setting(db, "gtm_id", "GTM-XYZ")
    await _delete_setting(db, "ga4_measurement_id")

    assert await _get_setting_raw(db, "ga4_measurement_id") is None
    assert await _get_setting_raw(db, "gtm_id") == "GTM-XYZ"
