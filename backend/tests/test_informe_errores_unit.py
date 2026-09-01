"""Que el Monitor de Errores del panel de admin reciba algo que mirar.

`admin_routes.py` lleva desde siempre `GET /admin/errors` leyendo `error_logs`,
y la tarjeta del panel la pinta. Lo que no existía era nadie que ESCRIBIERA en
esa tabla: el `componentDidCatch` del `ErrorBoundary` hacía `console.error` y
nada más. Resultado: la tarjeta decía «✓ Sin errores pendientes» con la misma
cara tanto si no había errores como si la web se caía cada dos minutos.

Lo que fija este fichero:

  1. El endpoint público existe, está acotado (rate limit + tamaños) y no puede
     romper a quien informa.
  2. La redacción del texto libre funciona de verdad (correo, token, dígitos):
     el mensaje de un error arrastra lo que el usuario escribió.
  3. La huella agrupa las repeticiones y NO parte el mismo bug en veinte grupos
     por un número que cambia.
  4. Un error resuelto que vuelve a ocurrir se reabre.
  5. `error_logs` no guarda `user_id`: si lo guardara, tendría que estar dado de
     alta en las listas del RGPD, y no lo está.

Las funciones puras se ejecutan de verdad (se extraen con `ast` y se compilan);
el resto se lee sobre la fuente, como el resto de comprobaciones offline, para
no necesitar fastapi ni base de datos.
"""
import ast
import hashlib
import re
from pathlib import Path

_SERVER = Path(__file__).resolve().parent.parent / "server.py"
_SRC = _SERVER.read_text(encoding="utf-8")
_ARBOL = ast.parse(_SRC)


def _fuente(nombre):
    for node in ast.walk(_ARBOL):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == nombre:
            return ast.get_source_segment(_SRC, node)
    return None


def _decoradores(nombre):
    for node in ast.walk(_ARBOL):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == nombre:
            return [ast.get_source_segment(_SRC, d) for d in node.decorator_list]
    return []


def _cargar_funciones_puras():
    """Extrae `_redactar` y `_huella_error` del server y las ejecuta de verdad.

    Importar `server.py` entero exigiría fastapi, asyncpg y una BD. Estas dos
    son puras: se compilan solas con `re` y `hashlib` en el espacio de nombres,
    así que se prueban con datos reales en vez de a base de leer el texto.
    """
    ns = {"_re_module": re, "hashlib": hashlib}
    trozos = []
    for node in _ARBOL.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id.startswith("_RE_") for t in node.targets
        ):
            trozos.append(ast.get_source_segment(_SRC, node))
    for nombre in ("_redactar", "_huella_error"):
        fuente = _fuente(nombre)
        assert fuente, f"{nombre} no existe en server.py"
        trozos.append(fuente)
    exec(compile("\n".join(trozos), "<server-extracto>", "exec"), ns)  # noqa: S102
    return ns["_redactar"], ns["_huella_error"]


_redactar, _huella_error = _cargar_funciones_puras()


# ── 1. El endpoint existe y está acotado ────────────────────────────────────

def test_existe_el_endpoint_que_llena_la_tabla():
    """Sin esto la tarjeta del admin es un adorno: lee una tabla vacía siempre."""
    decos = " ".join(_decoradores("report_client_error"))
    assert 'post("/errors/report")' in decos, "el endpoint público no está registrado"


def test_el_endpoint_publico_tiene_rate_limit():
    """Es público y sin autenticar: sin cubo, cualquiera llena la tabla."""
    decos = " ".join(_decoradores("report_client_error"))
    assert "limiter.limit(" in decos, "un endpoint público de escritura sin rate limit"


def test_hay_tope_de_errores_abiertos_distintos():
    """El rate limit es POR IP. El tope de filas es lo que para a mil IPs."""
    fuente = _fuente("report_client_error")
    assert "_ERRORES_MAX_ABIERTOS" in fuente, "falta el techo de huellas abiertas"
    assert "count_documents" in fuente, "el techo no se comprueba contra nada"


def test_todos_los_campos_del_modelo_tienen_tope_de_tamaño():
    """Un `message` sin `max_length` es una tabla llena con una sola petición."""
    for node in ast.walk(_ARBOL):
        if isinstance(node, ast.ClassDef) and node.name == "ClientErrorIn":
            fuente = ast.get_source_segment(_SRC, node)
            break
    else:
        raise AssertionError("ClientErrorIn no existe")
    campos_texto = [l for l in fuente.splitlines()
                    if ": str" in l or ": Optional[str]" in l]
    assert campos_texto, "el modelo no declara ningún campo de texto"
    for linea in campos_texto:
        assert "max_length" in linea, f"campo de texto sin tope: {linea.strip()}"


def test_informar_nunca_propaga():
    """Lo llama un `componentDidCatch`: un error aquí es un error dentro del error."""
    fuente = _fuente("report_client_error")
    assert "except Exception" in fuente, "guardar puede fallar y no está capturado"
    # Y el fallo tiene que devolver, no relanzar.
    assert "raise" not in fuente, "el endpoint puede propagar hacia quien informa"


# ── 2. La redacción funciona de verdad ──────────────────────────────────────

def test_la_redaccion_quita_correos():
    salida = _redactar("Invalid email juan.perez+x@ejemplo.com en el alta")
    assert "juan.perez" not in salida and "ejemplo.com" not in salida
    assert "[correo]" in salida


def test_la_redaccion_quita_tokens_jwt():
    jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcDEF-123"
    salida = _redactar(f"401 al llamar con {jwt} desde la pantalla")
    assert jwt not in salida and "eyJ" not in salida
    assert "[token]" in salida


def test_la_redaccion_quita_numeros_largos():
    """Un número de 9+ dígitos puede ser una tarjeta, un teléfono o un DNI."""
    salida = _redactar("pago rechazado 4242424242424242")
    assert "4242424242424242" not in salida
    assert "[num]" in salida


def test_la_redaccion_no_destroza_un_mensaje_normal():
    """Redactar de más deja el monitor lleno de mensajes ilegibles."""
    original = "Cannot read properties of undefined (reading 'map')"
    assert _redactar(original) == original


def test_la_redaccion_aguanta_el_vacio():
    assert _redactar("") == ""
    assert _redactar(None) == ""


def test_el_endpoint_redacta_antes_de_guardar():
    """La redacción del navegador no vale: el servidor es quien manda."""
    fuente = _fuente("report_client_error")
    assert "_redactar(" in fuente, "el endpoint guarda el texto crudo"


# ── 3. La huella agrupa ─────────────────────────────────────────────────────

def test_el_mismo_error_dos_veces_da_la_misma_huella():
    a = _huella_error("TypeError", "x is not a function", "/dashboard")
    b = _huella_error("TypeError", "x is not a function", "/dashboard")
    assert a == b


def test_errores_distintos_dan_huellas_distintas():
    a = _huella_error("TypeError", "x is not a function", "/dashboard")
    assert a != _huella_error("RangeError", "x is not a function", "/dashboard")
    assert a != _huella_error("TypeError", "y is not a function", "/dashboard")
    assert a != _huella_error("TypeError", "x is not a function", "/diario")


def test_un_numero_que_cambia_no_parte_el_mismo_bug_en_veinte_grupos():
    """«Loading chunk 4821 failed» y «Loading chunk 77 failed» son EL MISMO bug.

    Sin normalizar, cada caída estrena grupo, la tabla se llena de filas de una
    sola vez y `limit=50` deja de enseñar nada. Agrupar es el motivo de existir
    de la huella.
    """
    a = _huella_error("ChunkLoadError", "Loading chunk 4821 failed", "/dashboard")
    b = _huella_error("ChunkLoadError", "Loading chunk 77 failed", "/dashboard")
    assert a == b


def test_la_huella_cabe_en_la_columna():
    h = _huella_error("TypeError", "algo", "/x")
    assert len(h) == 32 and all(c in "0123456789abcdef" for c in h)


# ── 4. Reapertura y contadores ──────────────────────────────────────────────

def test_un_error_resuelto_que_vuelve_a_ocurrir_se_reabre():
    """Si no, marcar «resuelto» un bug vivo lo esconde para siempre.

    Y el monitor deja de avisar para pasar a mentir, que es peor que no tenerlo.
    """
    fuente = _fuente("report_client_error")
    assert 'existente.get("resolved")' in fuente, "no se mira si estaba resuelto"
    assert '"resolved"' in fuente and "False" in fuente, "no se reabre"
    assert "reopened_at" in fuente, "se reabre sin dejar rastro de que pasó"


def test_la_repeticion_incrementa_el_contador_en_vez_de_insertar():
    fuente = _fuente("report_client_error")
    assert '"$inc": {"veces": 1}' in fuente, "cada caída inserta una fila nueva"


def test_la_fecha_que_ordena_es_la_ultima_vez():
    """`GET /admin/errors` ordena por `created_at` desc.

    Si al AGRUPAR no se toca `created_at`, un bug que empezó hace tres meses y
    está cayendo AHORA sale el último de la lista.

    Mirar si la cadena aparece en la función no vale, y este test empezó así:
    el `insert_one` de la rama nueva también pone `created_at`, así que la
    comprobación pasaba con la rama de agrupar rota. Hay que mirar DENTRO del
    diccionario de cambios, que es el que corre cuando el error se repite.
    """
    for node in ast.walk(_ARBOL):
        if (isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                and node.name == "report_client_error"):
            objetivo = node
            break
    else:
        raise AssertionError("report_client_error no existe")

    for hijo in ast.walk(objetivo):
        if (isinstance(hijo, ast.Assign)
                and any(isinstance(t, ast.Name) and t.id == "cambios" for t in hijo.targets)
                and isinstance(hijo.value, ast.Dict)):
            claves = {k.value for k in hijo.value.keys if isinstance(k, ast.Constant)}
            break
    else:
        raise AssertionError("no hay un diccionario `cambios` en la rama de agrupar")

    assert "created_at" in claves, (
        "agrupar no refresca `created_at`: lo que está cayendo hoy sale el último"
    )
    assert "last_seen" in claves, "agrupar no anota la última vez"


def test_el_flag_de_autenticado_sube_pero_no_baja():
    """La pregunta que responde el campo es «¿esto rompe a los que pagan?».

    Se puso mirando sólo la PRIMERA vez, y así mentía: un fallo visto antes por
    un anónimo se quedaba en «no le pasa a gente identificada» para siempre,
    aunque después lo sufriera cada usuario con sesión. Verificado en vivo: el
    mismo error repetido desde una sesión de admin dejaba `autenticado: false`.
    """
    fuente = _fuente("report_client_error")
    assert 'if user and not existente.get("autenticado")' in fuente, (
        "agrupar no actualiza `autenticado`, o lo puede bajar de true a false"
    )


def test_se_guarda_tambien_la_primera_vez():
    """«Lleva cayendo desde el martes» sólo se sabe si se guarda el principio."""
    fuente = _fuente("report_client_error")
    assert "first_seen" in fuente


# ── 5. Privacidad y encaje con lo que ya existe ─────────────────────────────

def test_no_se_guarda_el_usuario_en_los_informes_de_error():
    """`error_logs` NO está en las listas del RGPD, y no debe estarlo.

    Guardar `user_id` aquí convertiría la tabla en dato personal: habría que
    exportarla, borrarla con la cuenta y decidir qué pasa con una fila agrupada
    que pertenece a cinco usuarios de los que uno se borra. Para triar basta con
    saber si le pasa a gente identificada, así que se guarda un booleano.
    """
    fuente = _fuente("report_client_error")
    assert '"user_id"' not in fuente, "el informe guarda user_id: eso es dato personal"
    assert '"autenticado"' in fuente, "falta el booleano que sí sirve para triar"


def test_error_logs_sigue_fuera_de_las_listas_del_rgpd():
    """El contrapunto del anterior: si un día se guardara `user_id`, esto avisa."""
    for lista in ("_USER_DATA_COLLECTIONS", "_USER_NON_PURGED_COLLECTIONS",
                  "_SECURITY_ARTEFACT_COLLECTIONS", "_BILLING_COLLECTIONS"):
        for node in _ARBOL.body:
            if isinstance(node, ast.Assign) and any(
                isinstance(t, ast.Name) and t.id == lista for t in node.targets
            ):
                assert '"error_logs"' not in ast.get_source_segment(_SRC, node), (
                    f"error_logs aparece en {lista}: o guarda dato personal (y hay que "
                    "revisar el test de arriba) o sobra ahí"
                )


def test_no_se_guarda_la_query_string_de_la_ruta():
    """En la query viajan los tokens de reseteo y los códigos de OAuth."""
    fuente = _fuente("report_client_error")
    assert 'split("?")' in fuente, "la ruta se guarda con query string"
    assert 'split("#")' in fuente, "la ruta se guarda con fragmento"


def test_error_logs_esta_dada_de_alta_en_el_shim():
    """El shim NO autocrea tablas: sin esto, el primer informe revienta."""
    fuente = _fuente("create_all_tables")
    assert '"error_logs"' in fuente


def test_hay_indice_por_huella():
    """Se busca por huella en CADA caída; sin índice es un recorrido completo."""
    fuente = _fuente("create_all_tables")
    assert "idx_error_logs_fingerprint" in fuente


def test_los_informes_viejos_se_purgan_por_la_ultima_vez():
    """Un bug que nació hace un año y sigue cayendo hoy no es un registro viejo."""
    fuente = _fuente("startup_event")
    assert "error_logs" in fuente and "delete_many" in fuente, "no se purga nada"
    assert '"last_seen"' in fuente, "se purga por la primera vez, no por la última"


def test_las_metricas_del_admin_llevan_el_contador_de_errores_abiertos():
    """La tarjeta vive en Sistema; la fila de métricas se ve desde todas partes."""
    fuente = _fuente("admin_metrics")
    assert '"open_errors"' in fuente


def test_la_forma_guardada_es_la_que_pinta_la_tarjeta_del_admin():
    """El backend y la tarjeta se escribieron por separado. Que no se pierdan.

    Es exactamente el fallo que tuvo Ajustes: dos mitades correctas que nunca
    se encontraron. La tarjeta lee estos campos por nombre.
    """
    fuente = _fuente("report_client_error")
    panel = (Path(__file__).resolve().parents[2] / "frontend" / "src" / "pages"
             / "AdminPage.jsx").read_text(encoding="utf-8")
    for campo in ("status_code", "type", "message", "endpoint", "method",
                  "created_at", "resolved", "veces"):
        assert f'"{campo}"' in fuente, f"el backend no guarda `{campo}`"
        assert f"e.{campo}" in panel, f"la tarjeta del admin no lee `{campo}`"
