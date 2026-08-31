"""
El shim `Collection` — la capa de la que depende TODO el backend — contra
PostgreSQL de verdad.

## Por qué existe (hueco G-17)

`server.py` expone una API estilo Motor/MongoDB sobre asyncpg + JSONB. Cada
consulta del proyecto pasa por aquí: auth, pagos, diario, admin, RGPD. Son unas
750 líneas de traducción Mongo→SQL escritas a mano, y **no tenían ni una sola
prueba**. Eso bloqueaba además partir `server.py` (BUG-008): repartir 9.400
líneas sin red debajo es cambiar deuda por riesgo.

## Por qué contra Postgres real y no con un doble

Lo que puede fallar aquí es precisamente la traducción a SQL: cómo compara
JSONB, qué pasa con un `None`, si el `~*` del regex distingue mayúsculas, si el
`$in` con enteros casa contra `data->>'campo'` (que es TEXTO). Un doble en
memoria daría verde sobre todo eso porque no traduce nada. Estas pruebas se
saltan si no hay base de datos, pero no se simulan.

## El invariante que ya costó un fallo

`$unset` se aplica DESPUÉS de `$set` (`_apply_update_operators`). Por eso los dos
`PUT` del diario derivan las claves a borrar de `legacy_keys_to_unset(existing)`
y no de la lista cruda: sobre un documento canónico, la lista a secas habría
borrado `leverage` **en la misma escritura que lo guardaba**. Aquí se fija.
"""
import asyncio
import os
import pathlib
import sys
import uuid

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-only-secret")

import server  # noqa: E402


def _url() -> str | None:
    """URL de una base desechable. El socket Unix evita el SSL de `init_pool`."""
    for env in ("SHIM_TEST_DATABASE_URL", "DATABASE_URL"):
        if os.environ.get(env):
            return os.environ[env]
    socket = pathlib.Path("/var/run/postgresql")
    if socket.exists():
        usuario = os.environ.get("USER") or "postgres"
        return f"postgresql://{usuario}@/shim_test?host=/var/run/postgresql"
    return None


URL = _url()
pytestmark = pytest.mark.skipif(
    URL is None,
    reason="sin PostgreSQL alcanzable: el shim NO se simula, se prueba o se salta",
)


# ---------------------------------------------------------------------------
# Arranque: una base por sesión, una tabla por prueba
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def bucle():
    b = asyncio.new_event_loop()
    yield b
    b.close()


@pytest.fixture(scope="session")
def db(bucle):
    base = server.Database() if hasattr(server, "Database") else server.db

    async def arranca():
        if base._pool is None:
            await base.init_pool(URL)

    try:
        bucle.run_until_complete(arranca())
    except Exception as e:  # pragma: no cover - entorno sin BD
        pytest.skip(f"no se pudo conectar a PostgreSQL: {e}")
    yield base


@pytest.fixture
def col(db, bucle):
    """Una colección con nombre único por prueba: sin residuo entre casos."""
    nombre = "zz_shim_" + uuid.uuid4().hex[:12]
    c = db[nombre]

    async def crea():
        await c._ensure_table()

    bucle.run_until_complete(crea())
    yield c

    async def borra():
        async with c._pool.acquire() as conn:
            await conn.execute(f"DROP TABLE IF EXISTS {nombre}")

    bucle.run_until_complete(borra())


def corre(bucle, corrutina):
    return bucle.run_until_complete(corrutina)


# ---------------------------------------------------------------------------
# 1 · Ida y vuelta
# ---------------------------------------------------------------------------

def test_lo_insertado_se_lee_igual(col, bucle):
    doc = {
        "id": "u1", "email": "a@b.c", "n": 42, "f": 1.5, "b": True,
        "nada": None, "lista": [1, 2, 3], "anidado": {"x": {"y": "z"}},
    }
    corre(bucle, col.insert_one(dict(doc)))
    leido = corre(bucle, col.find_one({"id": "u1"}))
    for k, v in doc.items():
        assert leido[k] == v, f"{k} no sobrevivió al viaje por JSONB"


def test_find_one_sin_coincidencia_es_none(col, bucle):
    assert corre(bucle, col.find_one({"id": "no-existe"})) is None


def test_el_tipo_sobrevive_no_solo_el_valor(col, bucle):
    """JSONB guarda tipos; si algo devolviera todo como texto, esto lo caza."""
    corre(bucle, col.insert_one({"id": "t", "n": 7, "f": 2.5, "b": False}))
    d = corre(bucle, col.find_one({"id": "t"}))
    assert isinstance(d["n"], int) and not isinstance(d["n"], bool)
    assert isinstance(d["f"], float)
    assert d["b"] is False


# ---------------------------------------------------------------------------
# 2 · Los operadores de consulta
# ---------------------------------------------------------------------------

@pytest.fixture
def poblada(col, bucle):
    for i, (uid, edad, rol, mail) in enumerate([
        ("a", 20, "admin", "Ana@Example.com"),
        ("b", 30, "user", "bea@example.com"),
        ("c", 40, "user", "CARLA@example.com"),
        ("d", 50, None, "dan@example.com"),
    ]):
        corre(bucle, col.insert_one(
            {"id": uid, "edad": edad, "rol": rol, "email": mail, "orden": i}))
    return col


def test_igualdad_simple(poblada, bucle):
    r = corre(bucle, poblada.find({"rol": "user"}).to_list(10))
    assert {d["id"] for d in r} == {"b", "c"}


def test_in_con_valores(poblada, bucle):
    r = corre(bucle, poblada.find({"id": {"$in": ["a", "c"]}}).to_list(10))
    assert {d["id"] for d in r} == {"a", "c"}


def test_in_vacio_no_devuelve_todo(poblada, bucle):
    """El caso peligroso: un `$in` vacío que degenerara en «sin filtro»
    devolvería la colección entera. En una consulta de permisos eso es una fuga."""
    r = corre(bucle, poblada.find({"id": {"$in": []}}).to_list(10))
    assert r == []


def test_in_con_enteros(poblada, bucle):
    """`data->>'campo'` es TEXTO: un $in de enteros tiene que convertirse."""
    r = corre(bucle, poblada.find({"edad": {"$in": [20, 40]}}).to_list(10))
    assert {d["id"] for d in r} == {"a", "c"}


def test_ne(poblada, bucle):
    r = corre(bucle, poblada.find({"rol": {"$ne": "user"}}).to_list(10))
    assert "b" not in {d["id"] for d in r}


def test_comparadores_numericos(poblada, bucle):
    r = corre(bucle, poblada.find({"edad": {"$gte": 40}}).to_list(10))
    assert {d["id"] for d in r} == {"c", "d"}
    r = corre(bucle, poblada.find({"edad": {"$lt": 30}}).to_list(10))
    assert {d["id"] for d in r} == {"a"}


def test_regex_sensible_a_mayusculas(poblada, bucle):
    r = corre(bucle, poblada.find({"email": {"$regex": "^Ana"}}).to_list(10))
    assert {d["id"] for d in r} == {"a"}


def test_regex_insensible_con_options_i(poblada, bucle):
    r = corre(bucle, poblada.find(
        {"email": {"$regex": "carla", "$options": "i"}}).to_list(10))
    assert {d["id"] for d in r} == {"c"}


def test_or(poblada, bucle):
    r = corre(bucle, poblada.find(
        {"$or": [{"id": "a"}, {"edad": {"$gte": 50}}]}).to_list(10))
    assert {d["id"] for d in r} == {"a", "d"}


def test_null_no_casa_con_ausente_ni_con_cadena(poblada, bucle):
    """`rol: None` es «sin rol», no «rol vacío» ni «cualquier rol»."""
    r = corre(bucle, poblada.find({"rol": None}).to_list(10))
    assert {d["id"] for d in r} == {"d"}


def test_un_nombre_de_campo_invalido_no_se_interpola(col, bucle):
    """Los nombres de campo van a la cadena SQL, no a un parámetro. Un nombre
    con comillas tiene que descartarse, no acabar dentro de la consulta."""
    corre(bucle, col.insert_one({"id": "x", "ok": 1}))
    r = corre(bucle, col.find({"a' OR '1'='1": "loquesea"}).to_list(10))
    # El filtro inválido se ignora → devuelve todo, pero SIN romper ni inyectar.
    assert isinstance(r, list)


def test_el_valor_del_filtro_va_parametrizado(col, bucle):
    """Comilla simple en el VALOR: si no fuera parámetro, reventaría el SQL."""
    corre(bucle, col.insert_one({"id": "y", "nombre": "O'Brien"}))
    r = corre(bucle, col.find({"nombre": "O'Brien"}).to_list(10))
    assert len(r) == 1 and r[0]["id"] == "y"


def test_regex_con_parentesis_no_balanceados_no_revienta_la_consulta(col, bucle):
    """Lo que teclea una persona en un buscador es texto, no una expresión
    regular. Un `(` suelto no puede tumbar la ruta."""
    corre(bucle, col.insert_one({"id": "z", "nombre": "Rodríguez (padre)"}))
    try:
        corre(bucle, col.find({"nombre": {"$regex": "("}}).to_list(10))
    except Exception as e:
        pytest.fail(f"un paréntesis suelto tumbó la consulta: {type(e).__name__}")


# ---------------------------------------------------------------------------
# 3 · Orden y límite
# ---------------------------------------------------------------------------

def test_sort_descendente_y_limit(poblada, bucle):
    r = corre(bucle, poblada.find({}).sort("edad", -1).limit(2).to_list(10))
    assert [d["id"] for d in r] == ["d", "c"]


def test_sort_ascendente(poblada, bucle):
    r = corre(bucle, poblada.find({}).sort("edad", 1).to_list(10))
    assert [d["id"] for d in r] == ["a", "b", "c", "d"]


def test_to_list_respeta_su_tope(poblada, bucle):
    assert len(corre(bucle, poblada.find({}).to_list(2))) == 2


# ---------------------------------------------------------------------------
# 4 · Los operadores de escritura
# ---------------------------------------------------------------------------

def test_set_cambia_solo_lo_pedido(col, bucle):
    corre(bucle, col.insert_one({"id": "s", "a": 1, "b": 2}))
    corre(bucle, col.update_one({"id": "s"}, {"$set": {"a": 9}}))
    d = corre(bucle, col.find_one({"id": "s"}))
    assert d["a"] == 9 and d["b"] == 2


def test_inc_desde_cero_y_desde_null(col, bucle):
    corre(bucle, col.insert_one({"id": "i", "n": None}))
    corre(bucle, col.update_one({"id": "i"}, {"$inc": {"n": 3, "nuevo": 5}}))
    d = corre(bucle, col.find_one({"id": "i"}))
    assert d["n"] == 3, "un None tiene que contar como 0, no reventar"
    assert d["nuevo"] == 5, "una clave que no existía arranca en 0"


def test_inc_negativo(col, bucle):
    corre(bucle, col.insert_one({"id": "i2", "n": 10}))
    corre(bucle, col.update_one({"id": "i2"}, {"$inc": {"n": -4}}))
    assert corre(bucle, col.find_one({"id": "i2"}))["n"] == 6


def test_push_crea_la_lista_si_no_existe(col, bucle):
    corre(bucle, col.insert_one({"id": "p"}))
    corre(bucle, col.update_one({"id": "p"}, {"$push": {"l": "a"}}))
    corre(bucle, col.update_one({"id": "p"}, {"$push": {"l": "b"}}))
    assert corre(bucle, col.find_one({"id": "p"}))["l"] == ["a", "b"]


def test_push_sobre_algo_que_no_es_lista_no_arrastra_basura(col, bucle):
    corre(bucle, col.insert_one({"id": "p2", "l": "no-soy-lista"}))
    corre(bucle, col.update_one({"id": "p2"}, {"$push": {"l": "a"}}))
    assert corre(bucle, col.find_one({"id": "p2"}))["l"] == ["a"]


def test_add_to_set_no_duplica(col, bucle):
    corre(bucle, col.insert_one({"id": "as"}))
    for _ in range(3):
        corre(bucle, col.update_one({"id": "as"}, {"$addToSet": {"l": "x"}}))
    corre(bucle, col.update_one({"id": "as"}, {"$addToSet": {"l": "y"}}))
    assert corre(bucle, col.find_one({"id": "as"}))["l"] == ["x", "y"]


def test_unset_borra(col, bucle):
    corre(bucle, col.insert_one({"id": "u", "a": 1, "b": 2}))
    corre(bucle, col.update_one({"id": "u"}, {"$unset": {"a": ""}}))
    d = corre(bucle, col.find_one({"id": "u"}))
    assert "a" not in d and d["b"] == 2


def test_unset_de_algo_que_no_existe_no_falla(col, bucle):
    corre(bucle, col.insert_one({"id": "u2", "a": 1}))
    corre(bucle, col.update_one({"id": "u2"}, {"$unset": {"fantasma": ""}}))
    assert corre(bucle, col.find_one({"id": "u2"}))["a"] == 1


def test_el_unset_corre_DESPUES_del_set(col, bucle):
    """El invariante que ya costó un fallo (ver el docstring del módulo).

    En la MISMA escritura, `$set` pone la clave y `$unset` la quita: gana el
    `$unset`. Por eso las claves a borrar en los dos PUT del diario se derivan
    del documento existente y no de una lista cruda — con la lista a secas, un
    documento canónico perdía `leverage` justo al guardarlo.
    """
    corre(bucle, col.insert_one({"id": "orden", "x": 0}))
    corre(bucle, col.update_one(
        {"id": "orden"}, {"$set": {"x": 99}, "$unset": {"x": ""}}))
    d = corre(bucle, col.find_one({"id": "orden"}))
    assert "x" not in d, "el $set ganó al $unset: el orden se ha invertido"


def test_upsert_crea_cuando_no_hay_nada(col, bucle):
    corre(bucle, col.update_one(
        {"id": "nuevo"}, {"$set": {"v": 1}}, upsert=True))
    d = corre(bucle, col.find_one({"id": "nuevo"}))
    assert d is not None and d["v"] == 1


def test_upsert_no_duplica_cuando_ya_existe(col, bucle):
    corre(bucle, col.insert_one({"id": "ex", "v": 1}))
    corre(bucle, col.update_one({"id": "ex"}, {"$set": {"v": 2}}, upsert=True))
    assert corre(bucle, col.count_documents({"id": "ex"})) == 1
    assert corre(bucle, col.find_one({"id": "ex"}))["v"] == 2


def test_update_sin_coincidencia_no_crea_sin_upsert(col, bucle):
    corre(bucle, col.update_one({"id": "no"}, {"$set": {"v": 1}}))
    assert corre(bucle, col.find_one({"id": "no"})) is None


# ---------------------------------------------------------------------------
# 5 · find_one_and_update — el reclamo atómico de los pagos
# ---------------------------------------------------------------------------

def test_find_one_and_update_devuelve_el_documento(col, bucle):
    corre(bucle, col.insert_one({"id": "f", "status": "pending"}))
    r = corre(bucle, col.find_one_and_update(
        {"id": "f", "status": "pending"}, {"$set": {"status": "capturing"}}))
    assert r is not None
    assert corre(bucle, col.find_one({"id": "f"}))["status"] == "capturing"


def test_el_segundo_reclamo_no_encuentra_nada(col, bucle):
    """El patrón que impide el doble cobro: el primero se lleva la transacción,
    el segundo se va de vacío porque el filtro exige `pending`."""
    corre(bucle, col.insert_one({"id": "f2", "status": "pending"}))
    primero = corre(bucle, col.find_one_and_update(
        {"id": "f2", "status": "pending"}, {"$set": {"status": "capturing"}}))
    segundo = corre(bucle, col.find_one_and_update(
        {"id": "f2", "status": "pending"}, {"$set": {"status": "capturing"}}))
    assert primero is not None
    assert segundo is None, "dos reclamos ganaron: el doble cobro es posible"


# ---------------------------------------------------------------------------
# 6 · Borrado y recuento
# ---------------------------------------------------------------------------

def test_delete_one_borra_uno_solo(poblada, bucle):
    corre(bucle, poblada.delete_one({"rol": "user"}))
    assert corre(bucle, poblada.count_documents({"rol": "user"})) == 1


def test_delete_many_borra_todos_los_que_casan(poblada, bucle):
    corre(bucle, poblada.delete_many({"rol": "user"}))
    assert corre(bucle, poblada.count_documents({"rol": "user"})) == 0
    assert corre(bucle, poblada.count_documents({})) == 2


def test_delete_many_con_filtro_vacio_vacia_la_coleccion(poblada, bucle):
    corre(bucle, poblada.delete_many({}))
    assert corre(bucle, poblada.count_documents({})) == 0


def test_count_documents_con_filtro(poblada, bucle):
    assert corre(bucle, poblada.count_documents({"edad": {"$gte": 30}})) == 3


def test_estimated_document_count(poblada, bucle):
    assert corre(bucle, poblada.estimated_document_count()) == 4


# ---------------------------------------------------------------------------
# 7 · Agregación y distinct
# ---------------------------------------------------------------------------

def test_aggregate_match_group_sum(col, bucle):
    for uid, grupo, importe in [
        ("1", "a", 10), ("2", "a", 5), ("3", "b", 7), ("4", "b", 3),
    ]:
        corre(bucle, col.insert_one(
            {"id": uid, "grupo": grupo, "importe": importe, "activo": True}))
    r = corre(bucle, col.aggregate([
        {"$match": {"activo": True}},
        {"$group": {"_id": "$grupo", "total": {"$sum": "$importe"}}},
    ]).to_list(10))
    totales = {d["_id"]: d["total"] for d in r}
    assert totales == {"a": 15, "b": 10}


def test_aggregate_sobre_coleccion_vacia_devuelve_lista_vacia(col, bucle):
    r = corre(bucle, col.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$x"}}},
    ]).to_list(10))
    assert r == [] or (len(r) == 1 and (r[0].get("total") in (0, None)))


def test_distinct(poblada, bucle):
    valores = corre(bucle, poblada.distinct("rol"))
    assert set(v for v in valores if v is not None) == {"admin", "user"}


# ---------------------------------------------------------------------------
# 8 · La tabla se crea sola al usarla
# ---------------------------------------------------------------------------

def test_una_coleccion_nueva_se_puede_consultar_antes_de_escribir(db, bucle):
    nombre = "zz_shim_virgen_" + uuid.uuid4().hex[:8]
    c = db[nombre]
    try:
        corre(bucle, c._ensure_table())
        assert corre(bucle, c.find_one({"id": "x"})) is None
        assert corre(bucle, c.count_documents({})) == 0
    finally:
        async def limpia():
            async with c._pool.acquire() as conn:
                await conn.execute(f"DROP TABLE IF EXISTS {nombre}")
        corre(bucle, limpia())


# ---------------------------------------------------------------------------
# 9 · TLS: `ssl=` a secas NO verifica (G-11 y lo que apareció al arreglarlo)
# ---------------------------------------------------------------------------

def test_verify_full_rechaza_un_nombre_que_no_casa(bucle):
    """La prueba que discrimina entre «cifra» y «además autentica».

    `init_pool` pasaba un `SSLContext` a asyncpg sin decir `sslmode`. Eso deja
    el modo en `prefer`, y para prefer/allow/require asyncpg fuerza
    `check_hostname=False` + `verify_mode=CERT_NONE` sobre una copia del
    contexto: la conexión iba cifrada pero SIN autenticar al servidor, abierta a
    un intermediario con cualquier certificado. El comentario del código decía
    «SSL verificado» y llevaba razón en la intención, no en el efecto.

    Conectar y ver que funciona no distingue los dos casos —por eso duró—. Lo
    que sí distingue es un nombre que no casa: el certificado local es
    `CN=localhost`, así que contra `127.0.0.1` verify-full tiene que negarse.
    """
    if URL is None or "/var/run/postgresql" not in (URL or ""):
        pytest.skip("necesita el Postgres local por socket para conocer el certificado")

    async def intenta(dsn):
        base = server.Database()
        try:
            await base.init_pool(dsn)
            await base._pool.close()
            return None
        except Exception as e:  # noqa: BLE001
            return type(e).__name__

    usuario = os.environ.get("USER") or "root"
    clave = os.environ.get("SHIM_TEST_PASSWORD", "testpw")
    dsn = f"postgresql://{usuario}:{clave}@127.0.0.1:5432/shim_test"

    fallo = corre(bucle, intenta(dsn))
    if fallo in ("InvalidPasswordError", "InvalidAuthorizationSpecificationError"):
        pytest.skip("el Postgres local no acepta TCP con contraseña en este entorno")
    assert fallo is not None and "Verification" in fallo, (
        "verify-full aceptó un certificado cuyo nombre no casa: la conexión "
        "cifra pero no autentica"
    )


def test_sslmode_disable_no_se_permite_en_produccion(bucle, monkeypatch):
    """Bajar el cifrado por una cadena mal copiada no puede pasar en silencio."""
    monkeypatch.setenv("ENVIRONMENT", "production")

    async def intenta():
        try:
            await server.Database().init_pool(
                "postgresql://x:y@localhost:5432/nada?sslmode=disable")
            return None
        except RuntimeError as e:
            return str(e)
        except Exception:
            return "otro-error"

    msg = corre(bucle, intenta())
    assert msg and "producción" in msg, "producción aceptó una conexión en claro"
