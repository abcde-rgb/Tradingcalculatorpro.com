"""Los cuatro arreglos de la auditoría de exposición del 2026-08-31.

Se comprueban sobre el TEXTO de `server.py` y `admin_routes.py`, no importando
los módulos: `server.py` arrastra fastapi, asyncpg y stripe, y estas
propiedades tienen que poder comprobarse también donde no están instalados
(el sandbox remoto, el job de «Doc» de CI). Es el mismo criterio que sigue
`frontend/scripts/engine-check.js` con el frontend.

Cada prueba de aquí protege un fallo que EXISTÍA, no una hipótesis:

* `/docs`, `/redoc` y `/openapi.json` servían el esquema de las 141 rutas,
  `/admin/*` incluidas, a quien pasara.
* `_encrypt_setting` se caía a texto plano sin decirlo, y `SECRET_ENCRYPTION_KEY`
  no está en ningún workflow ni en ninguna guía de despliegue: el estado por
  defecto era guardar la clave secreta de Stripe sin cifrar.
* El panel enseñaba la misma máscara en los dos casos, así que no había forma
  de notarlo desde dentro.
* `POST /admin/settings` de `admin_routes.py` —montado y alcanzable— no cifraba
  NUNCA, y su guarda de máscara comparaba contra `"***"` cuando la máscara real
  son bolitas: reenviar el formulario guardaba `••••1234` como credencial.
* `_FREE_ACCESS_EMAILS` daba premium a un correo escrito en el código, el mismo
  que M-14 ya había sacado de `cloudbuild.yaml` por estar expuesto.
"""

import ast
import pathlib
import re

BACKEND = pathlib.Path(__file__).resolve().parent.parent
SERVER = (BACKEND / "server.py").read_text(encoding="utf-8")
ADMIN = (BACKEND / "admin_routes.py").read_text(encoding="utf-8")


# ── F-2: la documentación de la API no se publica fuera de desarrollo ───────

def test_fastapi_no_publica_su_documentacion_por_defecto():
    llamada = re.search(r"app = FastAPI\((.*?)\n\)", SERVER, re.S)
    assert llamada, "no se encontró la construcción de FastAPI"
    args = llamada.group(1)
    for clave in ("docs_url", "redoc_url", "openapi_url"):
        assert clave in args, (
            f"FastAPI() no fija {clave}: con el valor por defecto publica el "
            f"esquema completo de la API a cualquiera"
        )
    assert "_DOCS_ABIERTOS" in args, (
        "las tres URLs deben depender del entorno, no estar fijas"
    )


def test_los_entornos_con_docs_abiertos_no_incluyen_produccion():
    # `_DOCS_ABIERTOS` incluye "test" a propósito: `tests/e2e/api/autorizacion.py`
    # lee `/openapi.json` para distinguir una ruta retirada de una bien
    # protegida, y un 404 no las distingue. Lo que no puede entrar es production.
    lista = re.search(r"_DOCS_ABIERTOS = .*?\bin \((.*?)\)", SERVER, re.S).group(1)
    assert '"production"' not in lista, (
        "'production' no puede estar entre los entornos que publican /docs"
    )
    for entorno in ("development", "dev", "local"):
        assert f'"{entorno}"' in lista, f"falta {entorno}"


# ── F-1: el cifrado de secretos deja de fallar en silencio ─────────────────

def test_guardar_sin_clave_de_cifrado_deja_rastro():
    cuerpo = re.search(
        r"def _encrypt_setting\(value: str\) -> str:(.*?)\ndef ", SERVER, re.S
    ).group(1)
    assert "logging.error" in cuerpo, (
        "la caída a texto plano tiene que dejar un error en el log; era muda, "
        "y con SECRET_ENCRYPTION_KEY ausente nada en el sistema lo decía"
    )
    assert "SECRET_ENCRYPTION_KEY" in cuerpo, (
        "el mensaje debe nombrar la variable que falta, o no sirve para arreglarlo"
    )


def test_el_estado_del_cifrado_se_puede_consultar():
    assert re.search(r"def cifrado_activo\(\) -> bool:", SERVER), (
        "falta el predicado que dice si hay clave de cifrado utilizable"
    )
    cuerpo = re.search(
        r"async def admin_get_settings\((.*?)\n\n\n", SERVER, re.S
    ).group(1)
    assert 'out["encryption_active"] = cifrado_activo()' in cuerpo, (
        "GET /admin/settings debe publicar encryption_active: la máscara se "
        "pinta igual esté cifrado o no, así que sin esto el panel no puede "
        "distinguir los dos casos"
    )


def test_el_panel_avisa_cuando_no_hay_cifrado():
    panel = (BACKEND.parent / "frontend/src/pages/AdminPage.jsx").read_text(encoding="utf-8")
    assert "encryption_active === false" in panel, (
        "el panel tiene que pintar el aviso; una bandera que nadie enseña deja "
        "el problema tan invisible como estaba"
    )
    assert 'data-testid="encryption-inactive-warning"' in panel


# ── F-1 bis: el segundo camino de escritura también cifra ──────────────────

def test_el_post_de_settings_cifra_los_secretos():
    cuerpo = re.search(
        r'@router\.post\("/settings"\)(.*?)@router\.', ADMIN, re.S
    ).group(1)
    # Se exige la LLAMADA, no el nombre: `encrypt_setting_fn` aparece también
    # en el `if ... is not None`, así que comprobar el nombre dejaba pasar un
    # cuerpo que nunca cifra. Lo cazó el sabotaje.
    assert "encrypt_setting_fn(valor)" in cuerpo, (
        "POST /admin/settings guardaba en claro SIEMPRE, incluso con "
        "SECRET_ENCRYPTION_KEY puesta: dos puertas al mismo armario y sólo una "
        "con llave"
    )
    assert "_upsert_setting(db, key, valor)" in cuerpo, (
        "lo que se escribe tiene que ser el valor que pasó por el cifrador"
    )
    assert "SECRET_SETTING_KEYS" in cuerpo, (
        "hay que distinguir qué claves son secretas antes de cifrar"
    )


def test_el_post_de_settings_rechaza_la_mascara_real():
    cuerpo = re.search(
        r'@router\.post\("/settings"\)(.*?)@router\.', ADMIN, re.S
    ).group(1)
    # El carácter de verdad, no su secuencia de escape: aceptar `\\u2022`
    # dejaba pasar una guarda con las bolitas cambiadas por asteriscos.
    assert '"\u2022" in valor' in cuerpo or "'\u2022' in valor" in cuerpo, (
        "la guarda comparaba contra '***', que era la máscara de un _mask() que "
        "no llamaba nadie; la real son bolitas, así que reenviar el formulario "
        "sin tocar un campo guardaba la máscara COMO credencial"
    )
    assert '!= "***"' not in cuerpo, (
        "queda la comparación vieja contra la máscara que ya no existe"
    )


def test_no_queda_enmascarado_muerto_en_admin_routes():
    assert not re.search(r"^def _mask\(", ADMIN, re.M), (
        "_mask() no la llamaba nadie y la cabecera del módulo prometía "
        "enmascarado: la siguiente persona la daría por viva"
    )


# ── F-3: quién entra gratis no se decide en el código ──────────────────────

def test_el_acceso_de_cortesia_no_lleva_correos_escritos_a_mano():
    # Hasta el `logging.info` que cierra el bloque, no hasta la primera llave:
    # con `\n\}` un `| {"otro@correo"}` añadido DESPUÉS quedaba fuera de la
    # captura y la prueba lo daba por bueno. Lo cazó el sabotaje.
    bloque = re.search(
        r"_FREE_ACCESS_EMAILS = (.*?)logging\.info", SERVER, re.S
    ).group(1)
    assert not re.search(r"[\"'][^\"'@\s]+@[^\"'\s]+[\"']", bloque), (
        "hay un correo literal en _FREE_ACCESS_EMAILS: publica en el "
        "repositorio la dirección que da el acceso, y M-14 ya sacó ese mismo "
        "correo de cloudbuild.yaml por lo mismo"
    )
    assert 'os.environ.get("FREE_ACCESS_EMAILS"' in bloque


def test_ningun_correo_concede_acceso_desde_una_cadena_del_codigo():
    """Sólo cadenas de código, nunca comentarios.

    La primera versión de esta prueba buscaba `@gmail.com` en el fichero entero
    y marcaba el comentario que main dejó al quitar la dirección — el que avisa
    de que era un muro de pago abierto y de que no vuelva. Prohibir la
    advertencia es lo contrario de lo que hace falta: se comprueba el código.
    """
    # Sólo los conjuntos que CONCEDEN algo. Marcar cualquier dirección del
    # fichero señalaba `alerts@tradingcalculator.pro`, que es el remitente de
    # los correos y no otorga nada: un verificador que grita con todo se acaba
    # desactivando, y entonces deja de cubrir lo que sí importaba.
    for nombre, fuente in (("server.py", SERVER), ("admin_routes.py", ADMIN)):
        for nodo in ast.walk(ast.parse(fuente)):
            if not isinstance(nodo, ast.Assign):
                continue
            destinos = [t.id for t in nodo.targets if isinstance(t, ast.Name)]
            if not any(d in ("_FREE_ACCESS_EMAILS", "_ADMIN_EMAILS") for d in destinos):
                continue
            for hijo in ast.walk(nodo.value):
                if isinstance(hijo, ast.Constant) and isinstance(hijo.value, str):
                    assert "@" not in hijo.value, (
                        f"{nombre}: {destinos[0]} lleva la dirección "
                        f"{hijo.value!r} escrita en el código. Era un muro de "
                        f"pago abierto: cualquiera que registrase ese correo "
                        f"entraba premium. Va en el entorno."
                    )
