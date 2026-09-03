"""Tests de las RUTAS del foro contra una base de datos en memoria.

Por qué no basta con los tests puros de `test_forum_unit.py`: las funciones
puras pueden ser perfectas y el endpoint filtrar igualmente el correo de
alguien, aceptar el contador que mande el cliente o dejar que una cuenta borre
el hilo de otra. Eso vive en el cableado, y el cableado sólo se prueba
llamando.

La base de datos es un doble en memoria y no PostgreSQL a propósito: lo que se
comprueba aquí es la LÓGICA de los endpoints, no la traducción a SQL —eso ya lo
cubre `test_shim_collection_unit.py` contra un Postgres de verdad—. El doble
implementa exactamente el subconjunto del shim que usa `forum.py`, y si el
módulo empieza a usar un operador que el doble no tiene, el test peta en vez de
pasar en silencio.
"""
import copy
import os
import re

import pytest

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

from fastapi import Depends, FastAPI, Header, HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import forum  # noqa: E402


# ═══════════════════════════════════════════════════════════════════════════
# Doble de la base de datos
# ═══════════════════════════════════════════════════════════════════════════

class _Resultado:
    def __init__(self, matched=0, modified=0, deleted=0):
        self.matched_count = matched
        self.modified_count = modified
        self.deleted_count = deleted


def _casa(doc, filtro):
    for clave, esperado in (filtro or {}).items():
        actual = doc.get(clave)
        if isinstance(esperado, dict):
            if "$in" in esperado:
                valores = esperado["$in"]
                if isinstance(actual, list):
                    if not any(v in valores for v in actual):
                        return False
                elif actual not in valores:
                    return False
            elif "$regex" in esperado:
                banderas = re.I if "i" in (esperado.get("$options") or "") else 0
                if not re.search(esperado["$regex"], str(actual or ""), banderas):
                    return False
            elif "$ne" in esperado:
                if actual == esperado["$ne"]:
                    return False
            else:
                raise AssertionError(f"operador no soportado por el doble: {esperado}")
        elif actual != esperado:
            return False
    return True


def _aplicar(doc, update):
    for clave, valor in (update.get("$set") or {}).items():
        doc[clave] = valor
    for clave, valor in (update.get("$inc") or {}).items():
        doc[clave] = (doc.get(clave) or 0) + valor
    for clave in (update.get("$unset") or {}):
        doc.pop(clave, None)
    return doc


class _Cursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, campo, direccion=1):
        self._docs = sorted(self._docs, key=lambda d: str(d.get(campo) or ""),
                            reverse=direccion == -1)
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    async def to_list(self, length=None):
        return [copy.deepcopy(d) for d in self._docs[:length]]


class _Coleccion:
    def __init__(self):
        self.docs = []

    async def find_one(self, filtro, projection=None):
        for d in self.docs:
            if _casa(d, filtro):
                return copy.deepcopy(d)
        return None

    def find(self, filtro=None, projection=None):
        return _Cursor([d for d in self.docs if _casa(d, filtro or {})])

    async def insert_one(self, doc):
        self.docs.append(copy.deepcopy(doc))
        return _Resultado(matched=1, modified=1)

    async def update_one(self, filtro, update, upsert=False):
        for d in self.docs:
            if _casa(d, filtro):
                _aplicar(d, update)
                return _Resultado(matched=1, modified=1)
        if upsert:
            nuevo = {k: v for k, v in filtro.items() if not k.startswith("$")}
            self.docs.append(_aplicar(nuevo, update))
        return _Resultado()

    async def find_one_and_update(self, filtro, update, upsert=False, return_document=True):
        for d in self.docs:
            if _casa(d, filtro):
                _aplicar(d, update)
                return copy.deepcopy(d)
        return None

    async def delete_one(self, filtro):
        for i, d in enumerate(self.docs):
            if _casa(d, filtro):
                self.docs.pop(i)
                return _Resultado(deleted=1)
        return _Resultado()


class _BD:
    def __init__(self):
        self._colecciones = {}

    def __getattr__(self, nombre):
        if nombre.startswith("_"):
            raise AttributeError(nombre)
        return self._colecciones.setdefault(nombre, _Coleccion())


class _LimitadorInerte:
    """El limitador real es por IP y en un test todo viene de la misma."""
    def limit(self, *_a, **_k):
        return lambda fn: fn


# ═══════════════════════════════════════════════════════════════════════════
# Aplicación de prueba
# ═══════════════════════════════════════════════════════════════════════════

USUARIOS = {
    "marta": {"id": "u-marta", "email": "marta@correo.com", "name": "Marta Iglesias",
              "preferred_locale": "es"},
    "kenji": {"id": "u-kenji", "email": "kenji@correo.com", "name": "Kenji Tanaka",
              "preferred_locale": "ja"},
    "jefa": {"id": "u-jefa", "email": "jefa@correo.com", "name": "Jefa",
             "is_admin": True, "preferred_locale": "es"},
}


async def _require_user(x_test_user: str = Header(None)):
    if not x_test_user or x_test_user not in USUARIOS:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    return USUARIOS[x_test_user]


async def _optional_user(x_test_user: str = Header(None)):
    return USUARIOS.get(x_test_user or "")


async def _require_admin(x_test_user: str = Header(None)):
    u = USUARIOS.get(x_test_user or "")
    if not u:
        raise HTTPException(status_code=401, detail="Se requiere autenticación")
    if not u.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acceso restringido")
    return u


class _Traductor:
    """Cuenta las llamadas para poder afirmar que la caché evita la segunda."""
    def __init__(self):
        self.llamadas = []

    async def __call__(self, *, titulo, cuerpo, origen, destino):
        self.llamadas.append((titulo, origen, destino))
        return {"titulo": f"[{destino}] {titulo}", "cuerpo": f"[{destino}] {cuerpo}",
                "motor": "doble"}


@pytest.fixture
def entorno():
    bd = _BD()
    traductor = _Traductor()
    app = FastAPI()
    app.include_router(
        forum.build_forum_router(
            db=bd, require_user_dep=_require_user, optional_user_dep=_optional_user,
            require_admin_dep=_require_admin, limiter=_LimitadorInerte(),
            view_salt="sal-de-prueba", traducir_fn=traductor,
        ),
        prefix="/forum",
    )
    cliente = TestClient(app)
    return {"cliente": cliente, "bd": bd, "traductor": traductor}


def _cabecera(quien):
    return {"X-Test-User": quien}


def _con_seudonimo(cliente, quien, handle):
    r = cliente.put("/forum/profile", json={"handle": handle}, headers=_cabecera(quien))
    assert r.status_code == 200, r.text
    return r.json()["profile"]


def _publica(cliente, quien, **kw):
    cuerpo = {"title": kw.pop("title", "Un título que pasa del mínimo exigido"),
              "body": kw.pop("body", "Un cuerpo de mensaje con longitud más que suficiente."),
              **kw}
    return cliente.post("/forum/threads", json=cuerpo, headers=_cabecera(quien))


# ═══════════════════════════════════════════════════════════════════════════
# Seudónimo
# ═══════════════════════════════════════════════════════════════════════════

class TestSeudonimo:
    def test_no_se_publica_sin_elegir_seudonimo(self, entorno):
        """Obligar a elegirlo ANTES del primer mensaje es lo que convierte la
        promesa de privacidad en algo que el usuario puede comprobar."""
        r = _publica(entorno["cliente"], "marta")
        assert r.status_code == 409
        assert "seudónimo" in r.json()["detail"].lower()

    def test_reservado_se_rechaza(self, entorno):
        r = entorno["cliente"].put("/forum/profile", json={"handle": "moderador"},
                                   headers=_cabecera("marta"))
        assert r.status_code == 400

    def test_no_se_puede_repetir_el_de_otro(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        r = c.put("/forum/profile", json={"handle": "swing_trader"}, headers=_cabecera("kenji"))
        assert r.status_code == 409

    def test_el_perfil_devuelto_no_lleva_correo_ni_nombre(self, entorno):
        perfil = _con_seudonimo(entorno["cliente"], "marta", "swing_trader")
        plano = repr(perfil)
        assert "marta@correo.com" not in plano
        assert "Marta Iglesias" not in plano
        assert "u-marta" not in plano
        assert perfil["handle"] == "swing_trader"

    def test_sin_sesion_no_se_toca_el_perfil(self, entorno):
        r = entorno["cliente"].put("/forum/profile", json={"handle": "x_y_z"})
        assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════
# Publicar
# ═══════════════════════════════════════════════════════════════════════════

class TestPublicar:
    def test_publica_y_no_filtra_identidad(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        r = _publica(c, "marta")
        assert r.status_code == 200, r.text
        plano = r.text
        assert "marta@correo.com" not in plano
        assert "Marta Iglesias" not in plano
        assert "u-marta" not in plano
        assert r.json()["thread"]["author"]["handle"] == "swing_trader"

    @pytest.mark.parametrize("campo", sorted(forum.CAMPOS_PROHIBIDOS_AL_CLIENTE))
    def test_el_payload_no_admite_contadores_ni_identidad(self, campo):
        """Ni el modelo los declara, ni el endpoint los aceptaría.

        La primera mitad es la que importa: mandar `views` en el cuerpo ya
        fallaba antes porque Pydantic descarta lo no declarado, así que un test
        que sólo comprobara «los contadores salen a 0» pasaba **por accidente**
        y seguiría pasando el día que alguien añadiera `views` al modelo. Lo
        cazó un sabotaje deliberado. Esto mira la estructura, no el efecto."""
        for modelo in (forum.HiloPayload, forum.RespuestaPayload, forum.PerfilPayload):
            assert campo not in modelo.model_fields, (
                f"`{campo}` es del servidor y `{modelo.__name__}` lo declara")

    def test_mandar_un_contador_se_rechaza_con_error_explicito(self, entorno):
        """Con `extra=forbid` el intento no se descarta en silencio: se dice."""
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        assert _publica(c, "marta", views=99999).status_code == 422

    def test_los_contadores_nacen_a_cero(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        h = _publica(c, "marta").json()["thread"]
        assert (h["views"], h["likes"], h["replies"]) == (0, 0, 0)

    def test_el_cuerpo_se_guarda_saneado(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        r = _publica(c, "marta", body="Mira esto <script>alert(1)</script> y dime qué opinas.")
        assert "<script>" not in r.json()["thread"]["body"]
        guardado = entorno["bd"].forum_threads.docs[0]["body"]
        assert "<script>" not in guardado

    def test_titulo_corto_se_rechaza(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        assert _publica(c, "marta", title="corto").status_code == 400

    def test_el_idioma_sale_del_perfil_y_no_del_cliente(self, entorno):
        """Si el idioma lo mandara el cliente, la traducción automática podría
        dirigirse marcando un mensaje español como japonés."""
        c = entorno["cliente"]
        _con_seudonimo(c, "kenji", "kenji_t")
        # Intentarlo se rechaza…
        assert _publica(c, "kenji", lang="es").status_code == 422
        # …y lo que se guarda sale del perfil de quien escribe.
        assert _publica(c, "kenji").status_code == 200
        assert entorno["bd"].forum_threads.docs[0]["lang"] == "ja"

    def test_el_analisis_adjunto_sin_stop_publica_rr_nulo(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        r = _publica(c, "marta", analysis={"symbol": "XAUUSD", "side": "long",
                                           "entry": 2412.30, "target": 2441.00})
        a = r.json()["thread"]["analysis"]
        assert a["rr"] is None and a["rrUndefinedReason"] == "sin_stop"

    def test_sin_sesion_no_se_publica(self, entorno):
        r = entorno["cliente"].post("/forum/threads",
                                    json={"title": "x" * 20, "body": "y" * 40})
        assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════
# Listado, orden y seguidos
# ═══════════════════════════════════════════════════════════════════════════

class TestListado:
    def test_el_orden_por_likes_es_numerico_end_to_end(self, entorno):
        """Mismo fallo que fija el test puro, pero atravesando la ruta: si el
        endpoint delegara el orden en el `.sort()` del shim, 9 iría antes de 10."""
        c, bd = entorno["cliente"], entorno["bd"]
        _con_seudonimo(c, "marta", "swing_trader")
        for i, likes in enumerate([9, 10, 100]):
            _publica(c, "marta", title=f"Hilo número {i} con título suficiente")
            bd.forum_threads.docs[i]["likes"] = likes
        r = c.get("/forum/threads", params={"order": "likes"})
        assert [h["likes"] for h in r.json()["threads"]] == [100, 10, 9]

    def test_filtra_por_producto_del_catalogo(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        _publica(c, "marta", title="Uno sobre divisas con título largo", product="forex")
        _publica(c, "marta", title="Otro sobre futuros con título largo", product="futures")
        r = c.get("/forum/threads", params={"product": "forex"})
        assert len(r.json()["threads"]) == 1
        assert r.json()["threads"][0]["product"] == "forex"

    def test_filtra_por_activo(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        _publica(c, "marta", title="El oro esta semana, título suficiente", symbol="xauusd")
        _publica(c, "marta", title="El euro esta semana, título suficiente", symbol="eurusd")
        r = c.get("/forum/threads", params={"symbol": "XAUUSD"})
        assert [h["symbol"] for h in r.json()["threads"]] == ["XAUUSD"]

    def test_una_busqueda_con_parentesis_no_tumba_la_consulta(self, entorno):
        """El `$regex` del shim va sin anclar: un paréntesis suelto del usuario
        ya tumbó una consulta una vez (G-17). Aquí se escapa antes."""
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        _publica(c, "marta")
        assert c.get("/forum/threads", params={"q": "esto ( no cierra"}).status_code == 200

    def test_seguidos_solo_exige_sesion(self, entorno):
        assert entorno["cliente"].get("/forum/threads",
                                      params={"following": "true"}).status_code == 401

    def test_los_hilos_de_quien_sigues_van_primero(self, entorno):
        c, bd = entorno["cliente"], entorno["bd"]
        _con_seudonimo(c, "marta", "swing_trader")
        _con_seudonimo(c, "kenji", "kenji_t")
        _publica(c, "kenji", title="Hilo de Kenji con título suficiente")
        _publica(c, "marta", title="Hilo de Marta con título suficiente")
        # Sin seguir: manda la actividad, y el de Marta es el último.
        r = c.get("/forum/threads", headers=_cabecera("marta"))
        assert r.json()["threads"][0]["author"]["handle"] == "swing_trader"
        # Marta sigue a Kenji: sus hilos suben.
        assert c.post("/forum/members/kenji_t/follow",
                      headers=_cabecera("marta")).status_code == 200
        r = c.get("/forum/threads", headers=_cabecera("marta"))
        assert r.json()["threads"][0]["author"]["handle"] == "kenji_t"

    def test_un_hilo_borrado_desaparece_del_listado(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        hid = _publica(c, "marta").json()["thread"]["id"]
        assert c.delete(f"/forum/threads/{hid}", headers=_cabecera("marta")).status_code == 200
        assert c.get("/forum/threads").json()["threads"] == []


# ═══════════════════════════════════════════════════════════════════════════
# Permisos entre cuentas
# ═══════════════════════════════════════════════════════════════════════════

class TestPermisos:
    def test_no_se_borra_el_hilo_de_otro(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "marta").json()["thread"]["id"]
        r = c.delete(f"/forum/threads/{hid}", headers=_cabecera("kenji"))
        # 404 y no 403: un 403 confirmaría que el hilo existe.
        assert r.status_code == 404
        assert c.get(f"/forum/threads/{hid}").status_code == 200

    def test_no_se_vota_el_mensaje_propio(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        hid = _publica(c, "marta").json()["thread"]["id"]
        assert c.post(f"/forum/threads/{hid}/like",
                      headers=_cabecera("marta")).status_code == 400

    def test_el_me_gusta_no_se_puede_repetir(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "marta").json()["thread"]["id"]
        for _ in range(3):
            c.post(f"/forum/threads/{hid}/like", headers=_cabecera("kenji"))
        assert c.get(f"/forum/threads/{hid}").json()["thread"]["likes"] == 1
        c.delete(f"/forum/threads/{hid}/like", headers=_cabecera("kenji"))
        assert c.get(f"/forum/threads/{hid}").json()["thread"]["likes"] == 0

    def test_no_puedes_seguirte_a_ti_mismo(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        assert c.post("/forum/members/swing_trader/follow",
                      headers=_cabecera("marta")).status_code == 400

    def test_la_moderacion_exige_admin(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        hid = _publica(c, "marta").json()["thread"]["id"]
        assert c.get("/forum/moderation/reports",
                     headers=_cabecera("marta")).status_code == 403
        assert c.post(f"/forum/moderation/thread/{hid}/hide",
                      headers=_cabecera("marta")).status_code == 403
        assert c.post(f"/forum/moderation/thread/{hid}/hide",
                      headers=_cabecera("jefa")).status_code == 200
        assert c.get(f"/forum/threads/{hid}").status_code == 404

    def test_la_denuncia_no_revela_a_quien_denuncia(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "marta").json()["thread"]["id"]
        assert c.post("/forum/report", json={"targetType": "thread", "targetId": hid,
                                             "reason": "spam"},
                      headers=_cabecera("kenji")).status_code == 200
        r = c.get("/forum/moderation/reports", headers=_cabecera("jefa"))
        assert r.status_code == 200
        assert "u-kenji" not in r.text and "kenji@correo.com" not in r.text

    def test_denunciar_dos_veces_no_duplica(self, entorno):
        c, bd = entorno["cliente"], entorno["bd"]
        _con_seudonimo(c, "marta", "swing_trader")
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "marta").json()["thread"]["id"]
        for _ in range(3):
            c.post("/forum/report", json={"targetType": "thread", "targetId": hid,
                                          "reason": "spam"}, headers=_cabecera("kenji"))
        assert len(bd.forum_reports.docs) == 1


# ═══════════════════════════════════════════════════════════════════════════
# Respuestas y vistas
# ═══════════════════════════════════════════════════════════════════════════

class TestHilo:
    def test_responder_sube_el_contador_y_la_actividad(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "marta").json()["thread"]["id"]
        r = c.post(f"/forum/threads/{hid}/replies", json={"body": "Yo lo veo distinto."},
                   headers=_cabecera("kenji"))
        assert r.status_code == 200
        detalle = c.get(f"/forum/threads/{hid}").json()
        assert detalle["thread"]["replies"] == 1
        assert detalle["replies"][0]["author"]["handle"] == "kenji_t"
        assert "kenji@correo.com" not in c.get(f"/forum/threads/{hid}").text

    def test_la_vista_se_cuenta_una_vez_por_visitante_y_dia(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        hid = _publica(c, "marta").json()["thread"]["id"]
        for _ in range(5):
            c.get(f"/forum/threads/{hid}", headers=_cabecera("kenji"))
        assert c.get(f"/forum/threads/{hid}",
                     headers=_cabecera("kenji")).json()["thread"]["views"] == 1

    def test_no_se_responde_a_un_hilo_oculto(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "marta", "swing_trader")
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "marta").json()["thread"]["id"]
        c.post(f"/forum/moderation/thread/{hid}/hide", headers=_cabecera("jefa"))
        assert c.post(f"/forum/threads/{hid}/replies", json={"body": "hola"},
                      headers=_cabecera("kenji")).status_code == 404


# ═══════════════════════════════════════════════════════════════════════════
# Traducción
# ═══════════════════════════════════════════════════════════════════════════

class TestTraduccion:
    def test_mismo_idioma_no_llama_al_traductor(self, entorno):
        """Traducir del español al español gastaría dinero para no hacer nada."""
        c, t = entorno["cliente"], entorno["traductor"]
        _con_seudonimo(c, "marta", "swing_trader")
        hid = _publica(c, "marta").json()["thread"]["id"]
        r = c.post("/forum/translate", json={"targetType": "thread", "targetId": hid,
                                             "targetLang": "es"},
                   headers=_cabecera("kenji"))
        assert r.json()["translated"] is False
        assert r.json()["reason"] == "mismo_idioma"
        assert t.llamadas == []

    def test_traduce_y_luego_sirve_de_cache(self, entorno):
        c, t = entorno["cliente"], entorno["traductor"]
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "kenji").json()["thread"]["id"]
        cuerpo = {"targetType": "thread", "targetId": hid, "targetLang": "es"}

        primera = c.post("/forum/translate", json=cuerpo, headers=_cabecera("marta")).json()
        assert primera["translated"] is True and primera["cached"] is False
        assert primera["sourceLang"] == "ja" and primera["targetLang"] == "es"
        assert len(t.llamadas) == 1

        segunda = c.post("/forum/translate", json=cuerpo, headers=_cabecera("marta")).json()
        assert segunda["cached"] is True
        assert len(t.llamadas) == 1, "la caché no evitó la segunda llamada"

    def test_la_traduccion_exige_sesion(self, entorno):
        """Sin esto sería un traductor gratis y abierto sobre nuestra factura."""
        c = entorno["cliente"]
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "kenji").json()["thread"]["id"]
        r = c.post("/forum/translate", json={"targetType": "thread", "targetId": hid,
                                             "targetLang": "es"})
        assert r.status_code == 401

    def test_un_idioma_inventado_cae_al_por_defecto(self, entorno):
        c = entorno["cliente"]
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "kenji").json()["thread"]["id"]
        r = c.post("/forum/translate", json={"targetType": "thread", "targetId": hid,
                                             "targetLang": "klingon"},
                   headers=_cabecera("marta"))
        assert r.json()["targetLang"] == forum.IDIOMA_POR_DEFECTO

    def test_la_traduccion_tambien_se_sanea(self, entorno):
        """El texto vuelve de un modelo: es entrada de fuera como cualquier otra."""
        c = entorno["cliente"]

        async def malicioso(*, titulo, cuerpo, origen, destino):
            return {"titulo": "<script>alert(1)</script>", "cuerpo": "<img onerror=x>",
                    "motor": "doble"}

        entorno["traductor"].__class__.__call__ = staticmethod(malicioso)
        _con_seudonimo(c, "kenji", "kenji_t")
        hid = _publica(c, "kenji").json()["thread"]["id"]
        r = c.post("/forum/translate", json={"targetType": "thread", "targetId": hid,
                                             "targetLang": "es"},
                   headers=_cabecera("marta")).json()
        assert "<script>" not in r["title"] and "onerror" not in r["body"]


# ═══════════════════════════════════════════════════════════════════════════
# Taxonomía
# ═══════════════════════════════════════════════════════════════════════════

def test_meta_publica_la_taxonomia_real(entorno):
    """El frontend no escribe la lista de productos a mano: la pide."""
    datos = entorno["cliente"].get("/forum/meta").json()
    import instruments
    assert set(datos["products"]) == set(instruments.PRODUCT_IDS)
    assert "tendencia" in datos["orders"]
    assert len(datos["languages"]) == 10
