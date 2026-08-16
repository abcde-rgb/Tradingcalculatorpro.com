#!/usr/bin/env python3
"""Genera docs/MAPA.md — el mapa del repositorio, derivado del código.

Por qué existe
--------------
La documentación escrita a mano se desvía del código y nadie se entera. La
auditoría del 2026-08-13 lo midió: `ESTADO_PROYECTO.md` decía 24 módulos cuando
había 28, 8232 líneas de `server.py` cuando eran 9097 y 5995 claves i18n cuando
eran 6110. Ninguna de esas cifras estaba mal cuando se escribió; simplemente
nadie las volvió a mirar.

Un mapa generado no puede envejecer. `--check` en CI hace que el build falle el
día que alguien añade un módulo y no lo regenera, que es exactamente el momento
en que la deriva empieza.

Además detecta **rutas sin consumidor**: endpoints del backend que ningún
fichero del frontend menciona. Ese es el hueco G-14 (~1770 líneas escritas,
probadas y sin una sola pantalla), y con esto salta el día que se crea en vez de
un mes después.

Uso
---
    python scripts/gen-mapa.py            # escribe docs/MAPA.md
    python scripts/gen-mapa.py --check    # falla (exit 1) si el fichero no está al día

El fichero NO lleva fecha de generación a propósito: si la llevara, `--check`
fallaría cada día por sí solo y el aviso dejaría de significar nada.
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BACKEND = RAIZ / "backend"
FRONT = RAIZ / "frontend" / "src"
SALIDA = RAIZ / "docs" / "MAPA.md"

# Ficheros del frontend que son TEXTO, no código: aparecen en casi cualquier
# búsqueda y darían falsos positivos al comprobar si una ruta se consume.
EXCLUIR_DE_BUSQUEDA = ("/lib/i18n/", "/lib/legalContent/", "tradingEducationContent",
                       "macroCalendar", "/data/")

DECORADOR = re.compile(
    r'@(?:app|api_router|router|admin_router|app_router)\.'
    r'(get|post|put|patch|delete|websocket)\(\s*["\']([^"\']+)["\']'
)


# ─────────────────────────── recolección ────────────────────────────────────

def modulos_backend() -> list[dict]:
    """Cada módulo .py del backend con su tamaño y su primera línea de docstring."""
    out = []
    for py in sorted(BACKEND.glob("*.py")):
        src = py.read_text(errors="ignore")
        try:
            doc = ast.get_docstring(ast.parse(src)) or ""
        except SyntaxError:
            doc = ""
        # Primera frase del docstring, en una línea.
        resumen = " ".join(doc.strip().split("\n")[0].split()) if doc else "—"
        if len(resumen) > 110:
            resumen = resumen[:107] + "…"
        out.append({
            "fichero": py.name,
            "lineas": src.count("\n") + 1,
            "resumen": resumen,
            "rutas": len(DECORADOR.findall(src)),
        })
    return out


def rutas() -> list[dict]:
    """Todas las rutas declaradas, con el fichero y la línea donde viven."""
    out = []
    for py in sorted(BACKEND.glob("*.py")):
        src = py.read_text(errors="ignore")
        for m in DECORADOR.finditer(src):
            out.append({
                "metodo": m.group(1).upper(),
                "path": m.group(2),
                "fichero": py.name,
                "linea": src.count("\n", 0, m.start()) + 1,
            })
    out.sort(key=lambda r: (r["path"], r["metodo"]))
    return out


def blob_frontend() -> str:
    """Todo el código del frontend en una cadena, sin los ficheros de texto."""
    trozos = []
    for p in sorted(FRONT.rglob("*.js*")):
        ruta = str(p)
        if any(x in ruta for x in EXCLUIR_DE_BUSQUEDA):
            continue
        trozos.append(p.read_text(errors="ignore"))
    return "\n".join(trozos)


def se_consume(path: str, blob: str) -> bool:
    """¿Menciona el frontend esta ruta?

    Heurística deliberadamente conservadora: se queda con los segmentos fijos
    (sin `{parametros}`) y exige que aparezcan juntos. Con dos o más segmentos
    la señal es fuerte; con uno solo se exige la barra inicial para no casar con
    una palabra suelta. Puede dar algún falso positivo, nunca un falso negativo:
    si dice que NO se consume, es que no aparece en ninguna parte.
    """
    segs = [s for s in path.split("/") if s and not s.startswith("{")]
    if not segs:
        return True
    aguja = "/".join(segs[:2]) if len(segs) >= 2 else f"/{segs[0]}"
    # El `in` pelado casaba por prefijo: al añadir la página `/backtesting` al
    # frontend, la ruta muerta `/backtest` pasó a contar como consumida y la
    # evidencia de que nadie la llama desapareció del mapa. El siguiente
    # carácter no puede continuar el identificador.
    return re.search(re.escape(aguja) + r"(?![A-Za-z0-9_-])", blob) is not None


def por_que_huerfana(r: dict) -> str:
    """Clasifica una ruta sin consumidor.

    Sin esto la lista es inútil: 45 rutas en un montón indistinto ahogan las que
    de verdad importan. Un webhook lo llama Stripe, no el navegador; un endpoint
    de salud lo llama Cloud Run. Esas están huérfanas **por diseño**. Las que no
    encajan en ninguna categoría son las sospechosas, y van primero.
    """
    if r["path"].startswith("/webhook"):
        return "externo — lo llama la pasarela de pago"
    if r["path"].startswith("/health") or r["path"] == "/":
        return "infra — sonda de salud"
    if r["fichero"] == "admin_routes.py":
        return "panel admin — comprueba si `AdminPage` la construye dinámicamente"
    if r["metodo"] == "WEBSOCKET":
        return "websocket — la URL se compone aparte"
    return ""


def rutas_frontend() -> list[tuple[str, str]]:
    """Las rutas declaradas en App.js: (path, componente)."""
    app = FRONT / "App.js"
    if not app.exists():
        return []
    src = app.read_text(errors="ignore")
    out = []
    for m in re.finditer(r'<Route\s+([^>]*?)/?>', src, re.S):
        attrs = m.group(1)
        p = re.search(r'path=["\']([^"\']+)["\']', attrs)
        e = re.search(r'element=\{\s*<([A-Za-z0-9_]+)', attrs)
        if p:
            out.append((p.group(1), e.group(1) if e else "—"))
    return sorted(set(out))


def carpetas_frontend() -> list[tuple[str, int, int]]:
    """(carpeta, nº de componentes, líneas totales) bajo components/ y pages/."""
    out = []
    for base in ("components", "pages"):
        raiz = FRONT / base
        if not raiz.exists():
            continue
        dirs = {raiz} | {d for d in raiz.rglob("*") if d.is_dir()}
        for d in sorted(dirs):
            ficheros = sorted(d.glob("*.jsx")) + sorted(d.glob("*.js"))
            if not ficheros:
                continue
            lineas = sum(f.read_text(errors="ignore").count("\n") + 1 for f in ficheros)
            out.append((str(d.relative_to(FRONT)), len(ficheros), lineas))
    return out


def mas_grandes(n: int = 12) -> list[tuple[str, int]]:
    """Los ficheros que más cuesta leer enteros."""
    out = []
    for base, patrones in ((BACKEND, ("*.py",)), (FRONT, ("**/*.jsx", "**/*.js"))):
        for pat in patrones:
            for f in sorted(base.glob(pat)):
                if "node_modules" in str(f):
                    continue
                out.append((str(f.relative_to(RAIZ)), f.read_text(errors="ignore").count("\n") + 1))
    # La ruta desempata. Sin ella el orden de dos ficheros con el mismo número
    # de líneas lo decidía el sistema de ficheros, que no es el mismo en un
    # portátil que en el runner de CI: `--check` fallaba en CI con un MAPA.md
    # recién generado, y regenerarlo no arreglaba nada porque el problema era el
    # empate, no el contenido. Con los 10 idiomas creciendo a la par, los
    # empates son la norma aquí, no la excepción.
    out.sort(key=lambda x: (-x[1], x[0]))
    return out[:n]


def tests() -> tuple[int, int]:
    """(ficheros de test, funciones de test) en backend/tests/."""
    d = BACKEND / "tests"
    if not d.exists():
        return (0, 0)
    fs = sorted(d.glob("test_*.py"))
    n = sum(len(re.findall(r"^\s*def test_", f.read_text(errors="ignore"), re.M)) for f in fs)
    return (len(fs), n)


def claves_i18n() -> tuple[int, int]:
    """(idiomas, claves del idioma de referencia)."""
    d = FRONT / "lib" / "i18n"
    if not d.exists():
        return (0, 0)
    idiomas = sorted(f for f in d.glob("*.js") if not f.stem.endswith(".edu"))
    ref = d / "es.js"
    claves = 0
    if ref.exists():
        for f in (ref, d / "es.edu.js"):
            if f.exists():
                claves += len(re.findall(r'^\s*["\']?[\w.-]+["\']?\s*:', f.read_text(errors="ignore"), re.M))
    return (len(idiomas), claves)


# ─────────────────────────── composición ────────────────────────────────────

def construir() -> str:
    mods = modulos_backend()
    rs = rutas()
    blob = blob_frontend()
    for r in rs:
        r["consumida"] = se_consume(r["path"], blob)
    huerfanas = [r for r in rs if not r["consumida"]]
    n_tf, n_tt = tests()
    n_idiomas, n_claves = claves_i18n()
    fr = rutas_frontend()
    lineas_backend = sum(m["lineas"] for m in mods)

    L = []
    a = L.append

    a("# 🗺️ Mapa del repositorio")
    a("")
    a("> **Fichero generado. No lo edites a mano.**")
    a("> Sale de `python scripts/gen-mapa.py`, y `--check` falla en CI si se queda atrás.")
    a(">")
    a("> Existe porque las cifras escritas a mano se desvían sin que nadie se entere: el")
    a("> 2026-08-13 la documentación decía 24 módulos cuando había 28. Aquí no puede pasar:")
    a("> si el código cambia y el mapa no, el build rompe.")
    a(">")
    a("> No lleva fecha de generación a propósito — la llevaría cada día y `--check`")
    a("> fallaría solo, hasta que el aviso dejara de significar nada.")
    a("")
    a("## Resumen")
    a("")
    a("| | |")
    a("|---|---:|")
    a(f"| Módulos del backend | {len(mods)} |")
    a(f"| Líneas de Python (backend) | {lineas_backend:,} |")
    a(f"| Rutas declaradas | {len(rs)} |")
    a(f"| **Rutas sin consumidor en el frontend** | **{len(huerfanas)}** |")
    a(f"| Ficheros de test · funciones de test | {n_tf} · {n_tt} |")
    a(f"| Rutas del frontend (`App.js`) | {len(fr)} |")
    a(f"| Idiomas · claves i18n (referencia `es`) | {n_idiomas} · {n_claves:,} |")
    a("")

    # ── rutas huérfanas: lo primero, porque es lo que cuesta dinero ──────────
    a("## ⚠️ Rutas sin consumidor en el frontend")
    a("")
    if huerfanas:
        for r in huerfanas:
            r["motivo"] = por_que_huerfana(r)
        sospechosas = [r for r in huerfanas if not r["motivo"]]
        esperadas = [r for r in huerfanas if r["motivo"]]

        a("Endpoints que **ningún fichero del frontend menciona**. Algunos lo están por")
        a("diseño (un webhook lo llama la pasarela, no el navegador); el resto es código")
        a("escrito, probado y que ningún usuario puede alcanzar.")
        a("")
        a(f"### Sospechosas ({len(sospechosas)})")
        a("")
        a("**Antes de escribir un módulo nuevo, mira si lo que te piden ya está aquí**")
        a("esperando una pantalla. Esto es el hueco G-14.")
        a("")
        a("| Método | Ruta | Definida en |")
        a("|---|---|---|")
        for r in sospechosas:
            a(f"| `{r['metodo']}` | `/api{r['path']}` | `backend/{r['fichero']}:{r['linea']}` |")
        a("")
        a(f"### Huérfanas por diseño ({len(esperadas)})")
        a("")
        a("| Método | Ruta | Por qué |")
        a("|---|---|---|")
        for r in esperadas:
            a(f"| `{r['metodo']}` | `/api{r['path']}` | {r['motivo']} |")
    else:
        a("Ninguna. Todas las rutas declaradas se mencionan en algún punto del frontend.")
    a("")

    # ── módulos ─────────────────────────────────────────────────────────────
    a("## Módulos del backend")
    a("")
    a("| Módulo | Líneas | Rutas | Responsabilidad |")
    a("|---|---:|---:|---|")
    for m in sorted(mods, key=lambda x: -x["lineas"]):
        a(f"| `{m['fichero']}` | {m['lineas']:,} | {m['rutas'] or ''} | {m['resumen']} |")
    a("")

    # ── rutas por módulo ────────────────────────────────────────────────────
    a("## Rutas de la API")
    a("")
    a("Todas cuelgan de `/api` (`api_router = APIRouter(prefix=\"/api\")`).")
    a("La columna **Front** dice si algún fichero del frontend la menciona.")
    a("")
    por_fichero: dict[str, list[dict]] = {}
    for r in rs:
        por_fichero.setdefault(r["fichero"], []).append(r)
    for fichero in sorted(por_fichero):
        a(f"### `backend/{fichero}` — {len(por_fichero[fichero])} rutas")
        a("")
        a("| Método | Ruta | Línea | Front |")
        a("|---|---|---:|:---:|")
        for r in sorted(por_fichero[fichero], key=lambda x: (x["path"], x["metodo"])):
            a(f"| `{r['metodo']}` | `{r['path']}` | {r['linea']} | {'✅' if r['consumida'] else '❌'} |")
        a("")

    # ── frontend ────────────────────────────────────────────────────────────
    a("## Frontend")
    a("")
    a(f"### Rutas declaradas en `App.js` ({len(fr)})")
    a("")
    a("| Ruta | Componente |")
    a("|---|---|")
    for p, c in fr:
        a(f"| `{p}` | `{c}` |")
    a("")
    a("### Carpetas")
    a("")
    a("| Carpeta | Ficheros | Líneas |")
    a("|---|---:|---:|")
    for d, n, ln in carpetas_frontend():
        a(f"| `{d}/` | {n} | {ln:,} |")
    a("")

    # ── ficheros grandes ────────────────────────────────────────────────────
    a("## Los ficheros que más cuesta abrir")
    a("")
    a("Leer uno entero quema contexto. Ve a la línea concreta (las rutas de arriba la")
    a("dan) en vez de abrirlos de arriba abajo.")
    a("")
    a("| Fichero | Líneas |")
    a("|---|---:|")
    for f, n in mas_grandes():
        a(f"| `{f}` | {n:,} |")
    a("")

    # ── verificadores ───────────────────────────────────────────────────────
    a("## Verificadores del repositorio")
    a("")
    a("| Comando | Comprueba |")
    a("|---|---|")
    a("| `cd backend && python -m py_compile *.py` | Que compilan los módulos |")
    a("| `cd backend && pytest tests/ -q` | Los tests (integración se salta sin `BACKEND_URL`) |")
    a("| `cd frontend && npx eslint src scripts` | Lint (0 errores) |")
    a("| `cd frontend && node scripts/i18n-check.js` | Paridad de los idiomas |")
    a("| `cd frontend && node scripts/engine-check.js` | Motor del simulador e instrumentos |")
    a("| `cd frontend && node scripts/check-fetch-credentials.js` | Que todo fetch lleva credenciales |")
    a("| `python scripts/gen-instruments-js.py --check` | Catálogo backend ↔ frontend |")
    a("| `python scripts/gen-mapa.py --check` | Que este mapa refleja el código |")
    a("| `python scripts/check-doc-links.py` | Que los enlaces de la doc resuelven |")
    a("")

    return "\n".join(L) + "\n"


def main() -> int:
    contenido = construir()
    comprobar = "--check" in sys.argv

    if comprobar:
        if not SALIDA.exists():
            print("✗ docs/MAPA.md no existe. Genéralo: python scripts/gen-mapa.py")
            return 1
        actual = SALIDA.read_text()
        if actual != contenido:
            viejas = actual.split("\n")
            nuevas = contenido.split("\n")
            print("✗ docs/MAPA.md se ha quedado atrás respecto al código.")
            for i, (v, n) in enumerate(zip(viejas, nuevas)):
                if v != n:
                    print(f"  primera diferencia, línea {i + 1}:")
                    print(f"    tiene: {v[:120]}")
                    print(f"    debe : {n[:120]}")
                    break
            else:
                print(f"  distinto número de líneas: {len(viejas)} → {len(nuevas)}")
            print("  Arréglalo con: python scripts/gen-mapa.py")
            return 1
        print("✓ docs/MAPA.md está al día")
        return 0

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(contenido)
    print(f"✓ docs/MAPA.md generado ({contenido.count(chr(10)) + 1} líneas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
