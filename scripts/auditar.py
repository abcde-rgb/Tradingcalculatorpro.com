#!/usr/bin/env python3
"""Auditoría del repositorio en un comando.

Por qué existe
--------------
La auditoría del 2026-08-13 costó una sesión entera y ~30 pasos a mano, y casi
todo lo que encontró era mecánico: componentes que nadie importa, comentarios
que citan pasarelas retiradas, un enlace de afiliado sin poner desde hacía 19
días, ramas con trabajo terminado que nadie recordaba. Nada de eso necesita
criterio para *detectarse* — sólo para decidir qué se hace.

Lo que necesita criterio se queda fuera a propósito: esto no dice qué arreglar,
dice qué mirar.

Uso
---
    python scripts/auditar.py              # informe completo
    python scripts/auditar.py --breve      # sólo el resumen
    python scripts/auditar.py --estricto   # sale 1 si hay hallazgos (para CI)

Sale 0 por defecto **a propósito**: es un informe, no una puerta. Un informe que
rompe el build se acaba desactivando, y entonces deja de leerse.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
FRONT = RAIZ / "frontend" / "src"
BACKEND = RAIZ / "backend"

BREVE = "--breve" in sys.argv
ESTRICTO = "--estricto" in sys.argv

hallazgos: list[tuple[str, str]] = []   # (severidad, titular)


def seccion(titulo: str) -> None:
    if not BREVE:
        print(f"\n{'─' * 74}\n{titulo}\n{'─' * 74}")


def linea(txt: str = "") -> None:
    if not BREVE:
        print(txt)


def anota(sev: str, titular: str) -> None:
    hallazgos.append((sev, titular))


def git(*args: str) -> str:
    try:
        return subprocess.run(["git", *args], cwd=RAIZ, capture_output=True,
                              text=True, timeout=30).stdout.strip()
    except Exception:
        return ""


# ══════════════════════════════════════════════════════════════════════════
# A. Trabajo terminado que no está en main
# ══════════════════════════════════════════════════════════════════════════
def trabajo_perdido() -> None:
    seccion("A. Trabajo que NO está en main")
    if not git("rev-parse", "--verify", "origin/main"):
        linea("  (sin origin/main a mano: haz `git fetch origin main`)")
        return

    rama_actual = git("rev-parse", "--abbrev-ref", "HEAD")
    refs = git("for-each-ref", "--sort=-committerdate",
               "--format=%(refname:short)|%(committerdate:short)", "refs/remotes/origin")
    producto, deps = [], 0
    for fila in refs.split("\n"):
        if "|" not in fila:
            continue
        ref, fecha = fila.split("|", 1)
        if ref in ("origin/main", "origin/gh-pages", "origin/HEAD") or ref.endswith("/HEAD"):
            continue
        if ref == f"origin/{rama_actual}":
            continue
        n = git("rev-list", "--count", f"origin/main..{ref}")
        if not n.isdigit() or int(n) == 0:
            continue
        if "dependabot" in ref:
            deps += 1
        else:
            producto.append((ref.replace("origin/", ""), int(n), fecha))

    if producto:
        anota("🔴", f"{len(producto)} rama(s) de producto con trabajo sin fusionar")
        linea(f"  {len(producto)} ramas de producto · {deps} de dependabot\n")
        for ref, n, fecha in producto[:10]:
            linea(f"    · {ref:55} {n:>3} commits  {fecha}")
        if len(producto) > 10:
            linea(f"    … y {len(producto) - 10} más")
        linea("\n  Ver docs/AUDITORIA_REPOSITORIO_2026-08-13.md §2 para el inventario.")
    else:
        linea("  ✅ nada de producto sin fusionar")
    if deps:
        anota("🟡", f"{deps} PR(s) de dependencias sin fusionar")


# ══════════════════════════════════════════════════════════════════════════
# B. Código muerto
# ══════════════════════════════════════════════════════════════════════════
def codigo_muerto() -> None:
    seccion("B. Código que nadie usa")
    ficheros = {p: p.read_text(errors="ignore")
                for p in FRONT.rglob("*.js*") if "node_modules" not in str(p)}
    blob_por_fichero = {p: t for p, t in ficheros.items()}

    huerfanos = []
    for p in sorted(ficheros):
        if p.suffix not in (".jsx",):
            continue
        nombre = p.stem
        patron = re.compile(rf"\b{re.escape(nombre)}\b")
        usado = any(patron.search(t) for q, t in blob_por_fichero.items() if q != p)
        if not usado:
            huerfanos.append((str(p.relative_to(FRONT)), ficheros[p].count("\n") + 1))

    if huerfanos:
        # El andamiaje de shadcn/ui se separa de lo propio: son cosas distintas.
        # 17 ficheros de `ui/` sin usar es plantilla que nunca se tocó; un
        # componente propio sin importar es trabajo que se hizo y se abandonó.
        es_ui = lambda ruta: "/ui/" in f"/{ruta}"
        propios = [h for h in huerfanos if not es_ui(h[0])]
        ui = [h for h in huerfanos if es_ui(h[0])]
        total = sum(n for _, n in huerfanos)
        anota("🟡", f"{len(huerfanos)} componentes que nadie importa ({total:,} líneas)")
        if propios:
            linea(f"  Propios — trabajo hecho y abandonado ({len(propios)}, "
                  f"{sum(n for _, n in propios):,} líneas):")
            for f, n in sorted(propios, key=lambda x: -x[1]):
                linea(f"    · {f:55} {n:>5} líneas")
        if ui:
            linea(f"\n  Andamiaje de shadcn/ui nunca usado ({len(ui)}, "
                  f"{sum(n for _, n in ui):,} líneas):")
            linea("    " + ", ".join(sorted(Path(f).stem for f, _ in ui)))
    else:
        linea("  ✅ todo componente se importa en alguna parte")

    # Paquetes que sólo mantienen vivos a los muertos
    pkg = RAIZ / "frontend" / "package.json"
    if pkg.exists():
        deps = json.loads(pkg.read_text()).get("dependencies", {})
        muertos = {str(FRONT / f) for f, _ in huerfanos}
        solo_muertos = []
        for d in sorted(deps):
            usan = [str(p) for p, t in ficheros.items() if d in t]
            if usan and all(u in muertos for u in usan):
                solo_muertos.append(d)
        if solo_muertos:
            anota("🟡", f"{len(solo_muertos)} paquetes que sólo usan componentes muertos")
            linea(f"\n  Paquetes instalados que sólo sirven a código muerto ({len(solo_muertos)}):")
            for d in solo_muertos:
                linea(f"    · {d}")


# ══════════════════════════════════════════════════════════════════════════
# C. Restos de lo que se retiró
# ══════════════════════════════════════════════════════════════════════════
RETIRADOS = {
    "OxaPay":   "pasarela retirada",
    "MaxelPay": "pasarela retirada",
    "AdSense":  "publicidad retirada el 2026-08-02",
    "MONGO_URL": "MongoDB se descartó; la BD es PostgreSQL",
    "pymongo":  "MongoDB se descartó",
}


def es_comentario(txt: str) -> bool:
    t = txt.strip()
    return t.startswith(("#", "//", "*", "/*", '"""', "'''"))


def restos() -> None:
    seccion("C. Restos de lo que se retiró")
    encontrados: dict[str, list[str]] = {}
    for base, pats in ((BACKEND, ("*.py",)), (FRONT, ("**/*.js", "**/*.jsx")),
                       (RAIZ / "frontend" / "scripts", ("*.js",))):
        for pat in pats:
            for f in base.glob(pat):
                if "node_modules" in str(f):
                    continue
                for i, l in enumerate(f.read_text(errors="ignore").split("\n"), 1):
                    for termino in RETIRADOS:
                        if termino.lower() in l.lower():
                            marca = "coment." if es_comentario(l) else "⚠️ CÓDIGO"
                            encontrados.setdefault(termino, []).append(
                                f"{f.relative_to(RAIZ)}:{i} [{marca}]")
    if not encontrados:
        linea("  ✅ ni rastro")
        return
    vivos = sum(1 for t, ls in encontrados.items() for l in ls if "CÓDIGO" in l)
    anota("🟡" if vivos == 0 else "🔴",
          f"{sum(len(v) for v in encontrados.values())} rastros de tecnología retirada"
          + (f", {vivos} en código vivo" if vivos else " (sólo comentarios)"))
    for termino, sitios in sorted(encontrados.items()):
        linea(f"\n  {termino} — {RETIRADOS[termino]} ({len(sitios)}):")
        for s in sitios[:6]:
            linea(f"    · {s}")
        if len(sitios) > 6:
            linea(f"    … y {len(sitios) - 6} más")


# ══════════════════════════════════════════════════════════════════════════
# D. Provisionales que ve el usuario
# ══════════════════════════════════════════════════════════════════════════
def provisionales() -> None:
    seccion("D. Provisionales que llegan al usuario")
    # Buscar «placeholder» a secas daba 10 falsos positivos de CSS
    # (`placeholder:text-muted-foreground`) y de nombres de prop. Un informe con
    # ruido se deja de leer, así que aquí sólo cuentan dos cosas: una marca
    # explícita de trabajo pendiente, o la palabra en un COMENTARIO, que es
    # donde se admite que algo es temporal.
    # La convención es `TODO:` o `TODO(...)`. Exigir el separador quita el
    # último ruido: en un repo en español «TODO» en mayúsculas es énfasis
    # corriente («calcula TODO el panel»), no una tarea pendiente.
    # `XXX` fuera: aquí es notación de divisas («XXX/USD»), no una marca.
    marca_explicita = re.compile(r"\bTODO\s*[:(]|\bFIXME\b")
    # «temporal» fuera: es vocabulario del dominio («eje temporal», «evolución
    # temporal»), no un aviso de que algo esté sin terminar.
    #
    # Y «placeholder» A SECAS también fuera, desde el examen del 2026-08-23.
    # Daba 4 de 5 hallazgos, y los cuatro eran el atributo `placeholder` de un
    # input comentado en JSDoc o en una nota de UI —«input is shown empty;
    # placeholder communicates»—, no código provisional. El único real ya lo
    # cazaba `TODO(`, así que la rama no aportaba nada y sí ruido: un informe
    # con 80 % de falsos positivos se deja de leer, y entonces el 20 % bueno
    # tampoco se lee.
    provisional = re.compile(r"\bprovisional\b", re.I)
    hits = []
    for f in FRONT.rglob("*.jsx"):
        if "node_modules" in str(f) or "/ui/" in str(f):
            continue
        for i, l in enumerate(f.read_text(errors="ignore").split("\n"), 1):
            if marca_explicita.search(l) or (es_comentario(l) and provisional.search(l)):
                hits.append((f"{f.relative_to(RAIZ)}:{i}", l.strip()[:88]))
    if hits:
        anota("🟠", f"{len(hits)} marca(s) de provisional en componentes de usuario")
        for sitio, txt in hits[:10]:
            linea(f"  · {sitio}\n      {txt}")
    else:
        linea("  ✅ ninguno")


# ══════════════════════════════════════════════════════════════════════════
# E. La documentación contra el código
# ══════════════════════════════════════════════════════════════════════════
# Una afirmación sobre el PASADO no contradice el presente
#
# Las dos reglas de esta sección marcaban en rojo frases que eran ciertas:
# una tarea tachada como cerrada, y los registros de julio que decían «8
# idiomas» cuando en julio había ocho. Corregir esos últimos sería falsear el
# histórico —que es justo lo que esos ficheros existen para impedir—, así que
# una regla que empuja a hacerlo está mal planteada, no el documento.
#
# Encontrado en el examen del 2026-08-23: de 13 documentos señalados, 7 eran
# fechados o de sólo-añadir y 3 más sólo lo decían en líneas de trabajo ya
# hecho. Reales: 3.
_CERRADO = re.compile(
    r"~~|^\s*[-*]\s*\[x\]|✅|\bCerrado\b|\bhecho\]|Hecho en esta sesi[oó]n",
    re.I | re.M,
)


# ⚠️ La fecha se busca en TODO el encabezado, no sólo al principio. La versión
# anterior exigía `### 2026-07-30 — …` y se le escapaba
# `## Plan de trading versionado (2026-07-30) — backend completo`, que es el
# mismo tipo de entrada con la fecha entre paréntesis: cuarenta líneas de
# registro del 30 de julio volvían a contarse como afirmaciones de hoy. La
# regla describía una FORMA («el encabezado empieza por fecha») en vez de la
# propiedad («el encabezado data lo que cuelga de él»), y todo lo que quedaba
# fuera de esa forma se colaba.
_ENCABEZADO_FECHADO = re.compile(r"^#{1,4}[^\n]*\b\d{4}-\d{2}-\d{2}\b")
_ENCABEZADO = re.compile(r"^#{1,6}\s")


def _sin_lo_ya_cerrado(texto: str) -> str:
    """El texto sin lo que habla del pasado.

    Dos cosas: las líneas marcadas como cerradas, y **todo lo que cuelga de un
    encabezado con fecha**. `ESTADO_PROYECTO.md` conserva decenas de entradas
    `### 2026-07-04 (11) — …` que dicen «8 idiomas» porque ese día había ocho.
    Sin esta segunda parte la regla señalaba el documento entero por su propio
    histórico, y la única forma de callarla habría sido reescribir el pasado.
    """
    fuera, nivel_hist = [], 0
    for l in texto.split("\n"):
        m = _ENCABEZADO.match(l)
        if m:
            nivel = len(m.group(0).strip())
            if _ENCABEZADO_FECHADO.match(l):
                nivel_hist = nivel
            elif nivel_hist and nivel <= nivel_hist:
                # ⚠️ Sólo un encabezado del MISMO nivel o más alto cierra la
                # sección histórica. Uno más profundo cuelga de ella y sigue
                # hablando del pasado: con `#### Funcionalidad nueva` dentro de
                # `### 2026-07-29` la regla creía haber vuelto al presente y
                # volvía a marcar cuarenta líneas de registro. La jerarquía del
                # markdown es un árbol, no una lista.
                nivel_hist = 0
        if nivel_hist or _CERRADO.search(l):
            continue
        fuera.append(l)
    return "\n".join(fuera)


def contradicciones() -> None:
    """Comprueba afirmaciones concretas de la doc contra el código.

    Cada regla nació de una contradicción REAL encontrada a mano. Se añade una
    cuando se pilla otra, no antes: una regla inventada da falsos positivos y
    entonces el informe deja de leerse.
    """
    seccion("E. La documentación contra el código")
    server = (BACKEND / "server.py").read_text(errors="ignore")
    pend = (RAIZ / "docs" / "PENDIENTES.md")
    # Normalizar el markdown ANTES de buscar. Sin esto la primera regla no
    # saltaba: el documento escribe «**`trading_plans` no se borra…**» y la
    # comparación tropezaba con los backticks. OJO: NO se tocan los guiones
    # bajos — quitarlos convertía `trading_plans` en «tradingplans» y la regla
    # no casaba jamás. Una regla que no dispara es peor
    # que no tenerla, porque parece que el problema no existe.
    texto_pend = re.sub(r"[`*]", "", pend.read_text(errors="ignore")) if pend.exists() else ""
    texto_pend = _sin_lo_ya_cerrado(texto_pend)
    texto_pend = " ".join(texto_pend.split())      # une líneas partidas del markdown
    reglas = [
        ("PENDIENTES dice que `trading_plans` no se borra ni se exporta",
         "trading_plans no se borra" in texto_pend,
         '"trading_plans"' in server and "_USER_DATA_COLLECTIONS" in server,
         "está en `_USER_DATA_COLLECTIONS`, de donde derivan las tres rutas RGPD"),
        ("PENDIENTES dice que `FRONTEND_URL` cae al dominio propio",
         "tradingcalculatorpro.com` por defecto" in texto_pend,
         'DEFAULT_FRONTEND_URL = "https://abcde-rgb.github.io' in server,
         "hoy cae a github.io"),
    ]
    problemas = 0
    for afirmacion, la_doc_lo_dice, el_codigo_lo_contradice, realidad in reglas:
        if la_doc_lo_dice and el_codigo_lo_contradice:
            problemas += 1
            linea(f"  ❌ {afirmacion}\n       pero {realidad}")
    # idiomas
    n_idiomas = len([f for f in (FRONT / "lib" / "i18n").glob("*.js")
                     if not f.stem.endswith(".edu")]) if (FRONT / "lib" / "i18n").exists() else 0
    # ⚠️ Los documentos FECHADOS y los de sólo-añadir quedan fuera, y no es
    # indulgencia: cuando el registro de sesiones del 11 de julio dice «8
    # idiomas» está diciendo la verdad sobre el 11 de julio. Reescribirlo para
    # que cuadre con hoy sería falsear el histórico, que es justo lo que esos
    # ficheros existen para impedir. Marcarlos como contradicción empuja a
    # hacerlo. En el examen del 2026-08-23 eran 7 de 13.
    HISTORICOS = re.compile(r"\d{4}-\d{2}-\d{2}|REGISTRO_SESIONES|DIARIO_BUGS|DECISIONES")
    docs_8 = [f.name for f in (RAIZ / "docs").glob("*.md")
              if not HISTORICOS.search(f.name)
              and "8 idiomas" in _sin_lo_ya_cerrado(f.read_text(errors="ignore"))]
    if n_idiomas != 8 and docs_8:
        problemas += 1
        linea(f"  ❌ {len(docs_8)} documento(s) dicen «8 idiomas» y hay {n_idiomas}:"
              f" {', '.join(docs_8[:5])}")
    if problemas:
        anota("🟠", f"{problemas} contradicción(es) entre la doc y el código")
    else:
        linea("  ✅ las afirmaciones comprobables cuadran")


# ══════════════════════════════════════════════════════════════════════════
# F. Rutas sin consumidor (delegado al mapa, que ya lo mide)
# ══════════════════════════════════════════════════════════════════════════
def rutas_sin_consumidor() -> None:
    seccion("F. Backend sin interfaz")
    mapa = RAIZ / "docs" / "MAPA.md"
    if not mapa.exists():
        linea("  (falta docs/MAPA.md — genéralo con python scripts/gen-mapa.py)")
        return
    t = mapa.read_text()
    m = re.search(r"### Sospechosas \((\d+)\)", t)
    if m and int(m.group(1)):
        anota("🔴", f"{m.group(1)} rutas del backend que ningún fichero del frontend llama")
        linea(f"  {m.group(1)} rutas escritas, probadas y que ningún usuario puede alcanzar.")
        linea("  Lista completa: docs/MAPA.md § Rutas sin consumidor. Es el hueco G-14.")
    else:
        linea("  ✅ ninguna")


# ══════════════════════════════════════════════════════════════════════════
def main() -> int:
    print("═" * 74)
    print("AUDITORÍA DEL REPOSITORIO — TradingCalculator.Pro")
    print("═" * 74)
    for f in (trabajo_perdido, codigo_muerto, restos, provisionales,
              contradicciones, rutas_sin_consumidor):
        try:
            f()
        except Exception as e:                     # una sección rota no tumba el informe
            linea(f"  ⚠️  la sección {f.__name__} falló: {e}")

    print("\n" + "═" * 74)
    print("RESUMEN")
    print("═" * 74)
    if not hallazgos:
        print("  ✅ sin hallazgos")
        return 0
    orden = {"🔴": 0, "🟠": 1, "🟡": 2}
    for sev, titular in sorted(hallazgos, key=lambda h: orden.get(h[0], 9)):
        print(f"  {sev} {titular}")
    cuenta = Counter(s for s, _ in hallazgos)
    print(f"\n  {cuenta.get('🔴',0)} bloqueantes · {cuenta.get('🟠',0)} importantes · "
          f"{cuenta.get('🟡',0)} de limpieza")
    print("\n  Esto dice QUÉ MIRAR, no qué arreglar: la decisión sigue siendo tuya.")
    return 1 if (ESTRICTO and hallazgos) else 0


if __name__ == "__main__":
    raise SystemExit(main())
