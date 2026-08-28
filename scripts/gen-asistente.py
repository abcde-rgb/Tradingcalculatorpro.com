#!/usr/bin/env python3
"""Genera `.claude/ARQUITECTURA_ASISTENTE.md` y comprueba que el cableado del
asistente no esté roto.

Por qué existe
--------------
El repo tiene 34 puntos de entrada para Claude —17 skills, 6 comandos, 4
subagentes, 7 reglas por zona— y hasta hoy nada comprobaba que encajaran. El
resultado era el previsible, y se midió el 2026-08-27:

  · `ARQUITECTURA_ASISTENTE.md`, que es *el mapa del asistente*, listaba **7 de
    las 17 skills**. Las diez que faltaban existían, funcionaban y eran
    invisibles para quien leyera el mapa para orientarse.
  · La skill `seguridad-pagos` prometía en su propia cabecera que «solo se
    dispara escribiendo `/seguridad-pagos`» — un comando que **no existía**.
  · El subagente `revisor-seguridad` dice «sigues la skill `seguridad-pagos`»
    pero no tiene herramienta para cargarla ni cita su ruta: leía lo que
    buenamente encontrara.

Ninguno de los tres fallos se habría cazado ejecutando nada: no rompen ningún
test, no dan error, sólo hacen que la IA se oriente con un mapa falso. Por eso
esto no es un test, es un verificador de coherencia.

Qué comprueba (además de regenerar el mapa)
-------------------------------------------
  1. Toda skill/agente/comando citado en `.claude/**` o `CLAUDE.md` existe.
  2. Ninguna regla de `.claude/rules/` tiene un `paths:` que no case con ningún
     fichero — una regla que no dispara nunca es peor que no tenerla, porque
     figura en la tabla y se cuenta como cobertura.
  3. El `name:` de cada skill coincide con su carpeta (si no, no se invoca).
  4. La tabla «Dónde vive cada cosa» de `CLAUDE.md` nombra todas las reglas.
  5. Un subagente que dice seguir una skill puede llegar a ella: o tiene la
     herramienta `Skill`, o cita la ruta del fichero.
  6. La skill `orientarse` —el router— enruta TODAS las skills que existen. Es la
     comprobación que impide que vuelva a pasar lo de la tabla desactualizada: una
     skill nueva no se puede añadir sin decidir cuándo se entra por ella.
  7. Ninguna pieza afirma un número de idiomas distinto del que tiene el código.
     La web pasó de 8 a 10 y tres skills se quedaron en 8: una auditoría de SEO o
     de contenido que las siguiera habría comprobado ocho idiomas y dado por
     buenos `pt` e `it` sin mirarlos. Un número desfasado en una checklist no
     avisa de nada — hace que se revise de menos, en silencio.

Uso
---
    python scripts/gen-asistente.py            # escribe .claude/ARQUITECTURA_ASISTENTE.md
    python scripts/gen-asistente.py --check    # falla (exit 1) si está atrasado o roto

Como `gen-mapa.py`, el fichero NO lleva fecha de generación: la llevaría cada
día y `--check` fallaría solo hasta que alguien dejara de leerlo.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CLAUDE = RAIZ / ".claude"
SALIDA = CLAUDE / "ARQUITECTURA_ASISTENTE.md"

# Carpetas que no son del proyecto aunque vivan dentro de él. Sin esta lista, el
# recuento de ficheros por regla deja de ser determinista: `backend/**/*.py` pasó
# de 130 a 8990 en cuanto se creó un `.venv` local, y un fichero generado que sale
# distinto según lo que tengas instalado hace que `--check` falle solo — el aviso
# se vuelve ruido y se deja de mirar.
AJENAS = {".venv", "venv", "node_modules", "build", "__pycache__", ".git",
          "_archive", ".pytest_cache", "dist", "coverage"}


def propios(patron: str):
    """Los ficheros del repo que casan con `patron`, sin dependencias ni artefactos."""
    return [p for p in RAIZ.glob(patron)
            if not AJENAS & set(p.relative_to(RAIZ).parts)]


# ─────────────────────────── lectura del cableado ───────────────────────────

def frontmatter(texto: str) -> tuple[dict[str, object], str]:
    """Frontmatter YAML plano: `clave: valor` y listas `- item`.

    A mano y no con PyYAML a propósito: es una dependencia que el runner de CI
    no tiene garantizada, y lo que hay que leer aquí son cuatro claves planas.
    """
    if not texto.startswith("---\n"):
        return {}, texto
    fin = texto.find("\n---", 3)
    if fin == -1:
        return {}, texto
    cuerpo = texto[fin + 4:].lstrip("\n")
    datos: dict[str, object] = {}
    clave = None
    for linea in texto[4:fin].split("\n"):
        if not linea.strip():
            continue
        if linea.startswith(("  - ", "- ")):          # elemento de lista
            if clave:
                # `paths:` deja la clave con valor vacío y la lista viene debajo;
                # sin esta conversión las siete reglas se leían como «sin paths».
                if not isinstance(datos.get(clave), list):
                    datos[clave] = []
                datos[clave].append(linea.split("- ", 1)[1].strip().strip('"\''))
            continue
        if linea.startswith((" ", "\t")):             # continuación de un `>-`
            if clave and isinstance(datos.get(clave), str):
                datos[clave] = f"{datos[clave]} {linea.strip()}".strip()
            continue
        if ":" in linea:
            clave, valor = linea.split(":", 1)
            clave, valor = clave.strip(), valor.strip()
            datos[clave] = "" if valor in (">-", ">", "|", "|-") else valor.strip('"\'')
    return datos, cuerpo


class Pieza:
    def __init__(self, ruta: Path, clase: str):
        self.ruta = ruta
        self.clase = clase
        texto = ruta.read_text(encoding="utf-8")
        self.meta, self.cuerpo = frontmatter(texto)
        self.lineas = texto.count("\n") + 1
        self.nombre = str(self.meta.get("name") or "").strip()
        if not self.nombre:
            # los comandos se llaman como su fichero; algunas skills no repiten el name
            self.nombre = ruta.parent.name if ruta.name == "SKILL.md" else ruta.stem
        self.descripcion = " ".join(str(self.meta.get("description") or "").split())

    @property
    def rel(self) -> str:
        return str(self.ruta.relative_to(RAIZ))


def inventario() -> dict[str, list[Pieza]]:
    return {
        "skills": sorted((Pieza(p, "skill") for p in CLAUDE.glob("skills/*/SKILL.md")),
                         key=lambda x: x.nombre),
        "comandos": sorted((Pieza(p, "comando") for p in CLAUDE.glob("commands/*.md")),
                           key=lambda x: x.nombre),
        "agentes": sorted((Pieza(p, "agente") for p in CLAUDE.glob("agents/*.md")),
                          key=lambda x: x.nombre),
        "reglas": sorted((Pieza(p, "regla") for p in CLAUDE.glob("rules/*.md")),
                         key=lambda x: x.nombre),
    }


def primera_frase(d: str, tope: int = 155) -> str:
    """Para qué se invoca, en una línea de tabla."""
    d = d.replace("|", "/")
    for corte in (". ", "; "):
        if corte in d[:tope + 60]:
            d = d.split(corte)[0]
            break
    return d if len(d) <= tope else d[:tope - 1].rsplit(" ", 1)[0] + "…"


# ──────────────────────────── comprobaciones ────────────────────────────────

# «la skill `x`», «el subagente `x`», «lanza `x`», «/comando»
CITA_NOMBRADA = re.compile(
    r"(?:skill|subagente|agente|comando)s?\s+`([a-z0-9-]+)`", re.I)
CITA_BARRA = re.compile(r"(?<![\w/`])/([a-z][a-z0-9-]{2,})\b")


def idiomas_reales() -> int:
    """Cuántos idiomas tiene la web, según el código y no según la doc.

    Fuente: el `LANGS` de `i18n-check.js`, que es el que decide si CI pasa.
    """
    f = RAIZ / "frontend" / "scripts" / "i18n-check.js"
    if not f.exists():
        return 0
    m = re.search(r"const LANGS\s*=\s*\[(.*?)\]", f.read_text(encoding="utf-8"), re.S)
    return len(re.findall(r"'[a-z]{2}'", m.group(1))) if m else 0


def revisar(inv: dict[str, list[Pieza]]) -> list[str]:
    fallos: list[str] = []
    nombres = {c: {p.nombre for p in inv[c]} for c in inv}
    universo = set().union(*nombres.values())

    # 1 · el name: de una skill tiene que ser su carpeta, o no se invoca
    for p in inv["skills"]:
        carpeta = p.ruta.parent.name
        declarado = str(p.meta.get("name") or "").strip()
        if declarado and declarado != carpeta:
            fallos.append(
                f"{p.rel}: declara `name: {declarado}` pero vive en `skills/{carpeta}/`. "
                f"Se invoca por la carpeta: uno de los dos nombres no existe para nadie.")
        if not p.descripcion:
            fallos.append(f"{p.rel}: sin `description`. Sin ella el modelo no sabe cuándo usarla.")

    # 2 · citas a piezas que no existen
    #     Se acota a .claude/ y CLAUDE.md: son los ficheros que ENRUTAN. En docs/
    #     hay prosa histórica que cita skills ya retiradas, y eso es memoria, no cableado.
    revisables = sorted(CLAUDE.rglob("*.md")) + [RAIZ / "CLAUDE.md"]
    # Nombres que se citan pero no son piezas de .claude/: herramientas de Claude Code
    # y comandos del sistema. No son un fallo de este repo.
    AJENOS = {"verify", "compact", "clear", "help", "init", "code-review", "loop",
              "api", "usr", "bin", "dev", "etc", "tmp", "var", "opt", "home", "root"}
    for f in revisables:
        if not f.exists():
            continue
        for n, linea in enumerate(f.read_text(encoding="utf-8").split("\n"), 1):
            if linea.lstrip().startswith(("> ", "```")):
                pass  # las citas en prosa/bloque también valen: se revisan igual
            for m in CITA_NOMBRADA.finditer(linea):
                nom = m.group(1)
                if nom not in universo and nom not in AJENOS:
                    fallos.append(
                        f"{f.relative_to(RAIZ)}:{n}: cita `{nom}` como pieza del asistente, "
                        f"y no existe ninguna skill, comando ni agente con ese nombre.")

    # 3 · una regla cuyo paths: no casa con nada nunca se carga
    for p in inv["reglas"]:
        patrones = p.meta.get("paths")
        if not isinstance(patrones, list) or not patrones:
            fallos.append(f"{p.rel}: sin `paths:`. Una regla sin rutas no se carga jamás.")
            continue
        for patron in patrones:
            if not propios(patron):
                fallos.append(
                    f"{p.rel}: el patrón `{patron}` no casa con ningún fichero. "
                    f"La regla figura en la tabla y se cuenta como cobertura, "
                    f"pero esa parte no se carga nunca.")

    # 4 · CLAUDE.md tiene que nombrar todas las reglas: es su índice
    claude_md = (RAIZ / "CLAUDE.md").read_text(encoding="utf-8")
    for p in inv["reglas"]:
        if f"rules/{p.ruta.name}" not in claude_md:
            fallos.append(
                f"CLAUDE.md: la tabla «Dónde vive cada cosa» no nombra "
                f"`rules/{p.ruta.name}`. Una regla que nadie sabe que existe no la "
                f"consulta nadie cuando decide dónde escribir algo.")

    # 5 · un agente que dice seguir una skill tiene que poder llegar a ella
    for p in inv["agentes"]:
        herramientas = str(p.meta.get("tools") or "")
        plano = " ".join(p.cuerpo.split())
        for m in re.finditer(r"sigues? la skill `([a-z0-9-]+)`", plano, re.I):
            skill = m.group(1)
            tiene_skill = "Skill" in [t.strip() for t in herramientas.split(",")]
            cita_ruta = f"skills/{skill}/SKILL.md" in p.cuerpo
            if not tiene_skill and not cita_ruta:
                fallos.append(
                    f"{p.rel}: dice seguir la skill `{skill}`, pero no tiene la "
                    f"herramienta `Skill` ni cita `.claude/skills/{skill}/SKILL.md`. "
                    f"El subagente no puede cargarla: seguirá lo que recuerde, no la skill.")

    # 6 · el router tiene que enrutar todas las skills
    #     Sin esto el router es otra tabla escrita a mano, y las tablas escritas a
    #     mano de este repo ya demostraron cómo acaban: listando 7 de 17.
    router = CLAUDE / "skills" / "orientarse" / "SKILL.md"
    if not router.exists():
        fallos.append(
            "falta .claude/skills/orientarse/SKILL.md, que es la puerta de entrada "
            "a la que apunta ARQUITECTURA_ASISTENTE.md.")
    else:
        texto = router.read_text(encoding="utf-8")
        for p in inv["skills"]:
            if p.nombre == "orientarse":
                continue
            if f"`{p.nombre}`" not in texto and f"`/{p.nombre}`" not in texto:
                fallos.append(
                    f"la skill `{p.nombre}` existe pero el router "
                    f"(.claude/skills/orientarse/SKILL.md) no la enruta: nadie sabrá "
                    f"cuándo se entra por ella. Añádele una fila en «1 · Enrutado».")

    # 7 · el número de idiomas que afirman las piezas, contra el del código
    #     ARQUITECTURA_ASISTENTE.md queda fuera: es generado a partir de las
    #     descripciones, así que se cura solo al regenerar. Incluirlo impediría
    #     ejecutar el generador para arreglar precisamente esto.
    n = idiomas_reales()
    if n:
        # «los 6 idiomas incompletos» es un subconjunto, no el total: si el
        # número lleva detrás un cualificador, no es una afirmación sobre cuántos
        # idiomas tiene la web. Sin esta salvedad el verificador gritaría con
        # frases correctas, y un verificador que grita de más se apaga.
        CUALIFICADO = re.compile(
            r"\d+\s+idiomas\s+(incompletos?|restantes?|pendientes?|nuevos?|"
            r"con\b|sin\b|que\b|más\b|menos\b)")
        CLAIMS = [(re.compile(r"(\d+)\s+idiomas"), "«N idiomas»"),
                  (re.compile(r"hreflang\s*x\s*(\d+)", re.I), "«hreflang xN»"),
                  (re.compile(r"(\d+)\s+locales"), "«N locales»")]
        for f in sorted(CLAUDE.rglob("*.md")):
            if f.name == "ARQUITECTURA_ASISTENTE.md":
                continue
            for num, linea in enumerate(f.read_text(encoding="utf-8").split("\n"), 1):
                if CUALIFICADO.search(linea):
                    continue
                for patron, etiqueta in CLAIMS:
                    for m in patron.finditer(linea):
                        if int(m.group(1)) != n:
                            fallos.append(
                                f"{f.relative_to(RAIZ)}:{num}: dice {etiqueta} con "
                                f"{m.group(1)}, y el código tiene {n} "
                                f"(frontend/scripts/i18n-check.js). Una checklist con el "
                                f"número viejo revisa de menos sin avisar.")
    return fallos


# ────────────────────────────── el documento ────────────────────────────────

def construir(inv: dict[str, list[Pieza]]) -> str:
    L: list[str] = []
    a = L.append

    a("# 🧠 Arquitectura del asistente — TradingCalculator.Pro")
    a("")
    a("> **Generado.** Sale de `python scripts/gen-asistente.py`, y `--check` falla en CI")
    a("> si se queda atrás. No lo edites a mano: la versión anterior se escribía así y")
    a("> llegó a listar 7 de las 17 skills que existían.")
    a("")
    a("Modelo mental: **`CLAUDE.md` es la constitución** —se carga siempre—; **una skill es")
    a("una ley** que sólo entra cuando se invoca, y no cuesta nada hasta entonces. Si no")
    a("sabes por dónde entrar a una petición, la puerta es la skill **`orientarse`**.")
    a("")
    a("## Capas")
    a("")
    a("```")
    a("CLAUDE.md ─── constitución: stack real, honestidad numérica, invariantes")
    a("   │")
    a("   ├─ docs/            conocimiento vivo (ESTADO_PROYECTO = estado · MAPA = dónde)")
    a("   ├─ .claude/rules/   se cargan SOLAS al abrir un fichero de su zona")
    a("   ├─ .claude/skills/  leyes invocables (checklists especializadas)")
    a("   ├─ .claude/agents/  subagentes con contexto propio (no contaminan el principal)")
    a("   └─ .claude/commands/ orquestadores (slash commands)")
    a("```")
    a("")

    a(f"## Skills ({len(inv['skills'])})")
    a("")
    a("| Skill | Cuándo se invoca | Líneas |")
    a("|---|---|---|")
    for p in inv["skills"]:
        solo = " ⌨️" if str(p.meta.get("disable-model-invocation", "")).lower() == "true" else ""
        a(f"| `{p.nombre}`{solo} | {primera_frase(p.descripcion)} | {p.lineas} |")
    a("")
    a("⌨️ = `disable-model-invocation`: no se activa sola, hay que escribirla.")
    a("")

    a(f"## Comandos ({len(inv['comandos'])})")
    a("")
    a("| Comando | Para qué | Líneas |")
    a("|---|---|---|")
    for p in inv["comandos"]:
        d = p.descripcion or primera_frase(p.cuerpo.strip().split("\n")[0])
        a(f"| `/{p.nombre}` | {primera_frase(d)} | {p.lineas} |")
    a("")

    a(f"## Subagentes ({len(inv['agentes'])})")
    a("")
    a("| Subagente | Devuelve | Herramientas |")
    a("|---|---|---|")
    for p in inv["agentes"]:
        a(f"| `{p.nombre}` | {primera_frase(p.descripcion, 110)} | {p.meta.get('tools', '—')} |")
    a("")

    a(f"## Reglas por zona ({len(inv['reglas'])})")
    a("")
    a("No se invocan: entran solas al abrir un fichero que case con su `paths:`.")
    a("")
    a("| Regla | Se carga al tocar | Ficheros que casan |")
    a("|---|---|---|")
    for p in inv["reglas"]:
        patrones = p.meta.get("paths") or []
        casan = sum(len(propios(pa)) for pa in patrones) if isinstance(patrones, list) else 0
        rutas = "<br>".join(f"`{x}`" for x in patrones) if isinstance(patrones, list) else "—"
        a(f"| `rules/{p.ruta.name}` | {rutas} | {casan} |")
    a("")
    a("⚠️ Tras un `/compact` **estas reglas no se reinyectan**: vuelven a entrar la próxima")
    a("vez que se lea un fichero de su zona. Por eso los invariantes viven en `CLAUDE.md`.")
    a("")

    a("## Regla de oro")
    a("")
    a("Material extenso y checklists → **skills**, nunca en `CLAUDE.md`, que se paga en")
    a("tokens en cada turno. `CLAUDE.md` sólo lleva lo que debe estar SIEMPRE presente.")
    a("")
    return "\n".join(L)


def main() -> int:
    inv = inventario()
    fallos = revisar(inv)
    contenido = construir(inv)
    comprobar = "--check" in sys.argv

    if fallos:
        print(f"✗ {len(fallos)} fallo(s) de cableado del asistente:")
        for f in fallos:
            print(f"    · {f}")
        return 1

    if comprobar:
        if not SALIDA.exists():
            print("✗ .claude/ARQUITECTURA_ASISTENTE.md no existe. "
                  "Genéralo: python scripts/gen-asistente.py")
            return 1
        actual = SALIDA.read_text(encoding="utf-8")
        if actual != contenido:
            viejas, nuevas = actual.split("\n"), contenido.split("\n")
            print("✗ .claude/ARQUITECTURA_ASISTENTE.md se ha quedado atrás.")
            for i, (v, n) in enumerate(zip(viejas, nuevas)):
                if v != n:
                    print(f"  primera diferencia, línea {i + 1}:")
                    print(f"    tiene: {v[:120]}")
                    print(f"    debe : {n[:120]}")
                    break
            else:
                print(f"  distinto número de líneas: {len(viejas)} → {len(nuevas)}")
            print("  Arréglalo con: python scripts/gen-asistente.py")
            return 1
        print(f"✓ el asistente está cableado ({len(inv['skills'])} skills, "
              f"{len(inv['comandos'])} comandos, {len(inv['agentes'])} subagentes, "
              f"{len(inv['reglas'])} reglas)")
        return 0

    SALIDA.write_text(contenido, encoding="utf-8")
    print(f"✓ .claude/ARQUITECTURA_ASISTENTE.md generado "
          f"({contenido.count(chr(10)) + 1} líneas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
