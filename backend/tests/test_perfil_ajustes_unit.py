"""Que Ajustes pueda guardar lo que su formulario enseña.

El botón «Guardar» de Ajustes mandaba `PUT /api/auth/profile` con `{name,
picture}`. El backend sólo tenía `POST`, y su modelo sólo aceptaba `country` y
`preferred_locale`: **405, siempre**. Nunca guardó nada. Las dos mitades se
escribieron por separado y no se encontraron nunca — el docstring del endpoint
decía «lo que sigue faltando es la pantalla» cuando la pantalla ya existía.

Se lee con `ast` y sobre el texto, como el resto de comprobaciones offline, para
no necesitar fastapi ni una base de datos.
"""
import ast
from pathlib import Path

_SERVER = Path(__file__).resolve().parent.parent / "server.py"
_SRC = _SERVER.read_text(encoding="utf-8")
_RAIZ = Path(__file__).resolve().parents[2]


def _fuente(nombre):
    tree = ast.parse(_SRC)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == nombre:
            return ast.get_source_segment(_SRC, node)
    return None


def _decoradores(nombre):
    tree = ast.parse(_SRC)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == nombre:
            return [ast.get_source_segment(_SRC, d) for d in node.decorator_list]
    return []


def test_el_perfil_responde_a_los_dos_metodos():
    """El store llama con POST y la pantalla de Ajustes con PUT.

    Registrar sólo uno deja al otro en 405 — que es el fallo que hubo. No es
    indecisión: son dos llamadores reales que ya existen.
    """
    decos = " ".join(_decoradores("update_own_profile"))
    assert 'post("/auth/profile")' in decos, "falta el POST (lo usa el store)"
    assert 'put("/auth/profile")' in decos, "falta el PUT (lo usa la pantalla de Ajustes)"


def test_el_modelo_acepta_lo_que_la_pantalla_envia():
    """Un campo no declarado lo descarta Pydantic EN SILENCIO."""
    tree = ast.parse(_SRC)
    campos = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == "ProfileUpdateRequest":
            for sub in node.body:
                if isinstance(sub, ast.AnnAssign) and isinstance(sub.target, ast.Name):
                    campos.add(sub.target.id)
    assert {"name", "picture", "country", "preferred_locale"} <= campos, (
        f"`ProfileUpdateRequest` no acepta lo que Ajustes manda: tiene {sorted(campos)}"
    )


def test_el_alta_acepta_el_pais_y_el_idioma():
    """El `<select>` de país es `required` en el formulario de registro.

    Obligar a rellenar algo que el backend tira es peor que no preguntarlo.
    """
    tree = ast.parse(_SRC)
    campos = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == "UserCreate":
            for sub in node.body:
                if isinstance(sub, ast.AnnAssign) and isinstance(sub.target, ast.Name):
                    campos.add(sub.target.id)
    assert {"country", "preferred_locale"} <= campos, (
        f"`UserCreate` vuelve a descartar el país y el idioma: tiene {sorted(campos)}"
    )
    src = _fuente("register")
    assert "_norm_country(" in src and "_norm_locale(" in src, (
        "el alta tiene que normalizarlos con las mismas funciones que /auth/profile, "
        "o guardará un país que no es ISO o un idioma que ninguna pantalla sabe pintar"
    )


def test_una_foto_de_perfil_no_puede_ser_javascript():
    """Acaba en el `src` de un <img> de la cabecera."""
    src = _fuente("update_own_profile")
    assert 'startswith(("https://", "http://"))' in src, (
        "la URL de la foto tiene que comprobarse: un `javascript:` aquí es XSS"
    )


def test_un_nombre_vacio_no_borra_el_que_habia():
    """Dejaría la cuenta sin cómo llamarla en los correos y en la cabecera."""
    src = _fuente("update_own_profile")
    idx = src.find("payload.name is not None")
    assert idx > -1
    assert "if nombre:" in src[idx:idx + 400], "un nombre en blanco no puede guardarse"


def test_ajustes_resincroniza_el_formulario_con_el_usuario():
    """`useState(user?.name)` sólo corre en el primer render.

    Al recargar, el token no se persiste: `SessionBoot` dispara el refresco y el
    `user` llega DESPUÉS de montar la pantalla. Sin un efecto que resincronice,
    los campos se quedan con lo que hubiera y el usuario ve sus datos «saltar».
    """
    pagina = (_RAIZ / "frontend/src/pages/SettingsPage.jsx").read_text(encoding="utf-8")
    assert "useEffect" in pagina, "Ajustes no tiene ningún efecto: el formulario no se resincroniza"
    assert "setProfileName(" in pagina.split("useEffect")[1][:600] or \
           any("setProfileName(" in tramo[:300] for tramo in pagina.split("useEffect")[1:]), (
        "ningún efecto repone el nombre cuando cambia `user`"
    )
