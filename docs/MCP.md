# Conectar servidores MCP

Cómo se le enchufan herramientas externas a Claude Code en este repositorio, qué
hay conectado hoy, y dónde va la clave que no puede entrar en git.

> ⚠️ **Un MCP conecta el agente, no la aplicación.** `firecrawl-mcp` no añade
> scraping a TradingCalculator.Pro: sirve para que Claude lea páginas *mientras
> programa*. Lo que integra un proveedor en el producto son los módulos de
> `backend/`. La misma confusión está avisada en
> [`ROADMAP_IDEAS.md`](./ROADMAP_IDEAS.md) §7 para el caso de EODHD.

## Lo que hay conectado

[`.mcp.json`](../.mcp.json) en la raíz, ámbito **proyecto**: viaja en git, así que
quien clone el repo lo tiene sin configurar nada. La primera sesión interactiva
pide aprobación una vez (`claude mcp reset-project-choices` la rehace); las
sesiones en la nube no pueden preguntar y lo cargan directamente.

| Servidor | Para qué | Necesita |
|---|---|---|
| `playwright` | Conduce un navegador real: navegar, pulsar, capturar. Es la dependencia que el subagente `crawler-visual` y la skill `consistencia-diseno` ya daban por supuesta y **nadie había declarado** | nada |
| `firecrawl-mcp` | Descarga páginas y las convierte a texto (competencia, documentación de proveedores) | `FIRECRAWL_API_KEY` |

Comprobado el 2026-08-29 arrancando cada uno con un `initialize` de JSON-RPC por
stdin: responden `Playwright 1.63.0` y `firecrawl-fastmcp 3.24.0`.

## La clave nunca entra en el repo

`.mcp.json` la referencia como `${FIRECRAWL_API_KEY}` — Claude Code expande
variables de entorno en `command`, `args`, `env`, `url` y `headers`. Si la
variable no existe, avisa y pasa el texto sin expandir (Firecrawl entonces
funciona sin autenticar, con límites de uso).

Dónde ponerla, en orden de preferencia:

```bash
# 1. En el shell desde el que lanzas `claude`
export FIRECRAWL_API_KEY='fc-…'

# 2. Si abres Claude Code sin shell (escritorio/IDE), en el ajuste local,
#    que está en .gitignore precisamente para esto:
#    .claude/settings.local.json  →  { "env": { "FIRECRAWL_API_KEY": "fc-…" } }
```

Lo que **no** se hace: escribirla literal en `.mcp.json` ni en
`.claude/settings.json` — los dos están versionados. Si alguna vez se filtra una,
se revoca en el panel del proveedor; rotarla es más barato que discutirlo.

## Añadir otro servidor

Tres ámbitos, y el ámbito decide dónde acaba escrito:

| Ámbito | Alcance | Se guarda en | Compartido |
|---|---|---|---|
| `local` (por defecto) | sólo este proyecto, sólo tu máquina | `~/.claude.json` | no |
| `project` | este proyecto, para todos | `.mcp.json` | **sí, por git** |
| `user` | todos tus proyectos | `~/.claude.json` | no |

Tres transportes:

```bash
# stdio — un proceso local. El `--` separa las opciones de Claude del comando
claude mcp add --scope project playwright -- npx -y @playwright/mcp@latest
claude mcp add --scope local -e API_KEY=xxx mi-server -- npx -y mi-mcp-server

# http / sse — un servidor remoto
claude mcp add --transport http --scope project sentry https://mcp.sentry.dev/mcp
claude mcp add --transport http api https://ej.com/mcp --header "Authorization: Bearer …"
```

Un servidor con OAuth (Stripe, Notion, Sentry…) no lleva clave en la
configuración: se autentica después con `claude mcp login <nombre>` o desde `/mcp`.

Comprobar cómo ha quedado:

```bash
claude mcp list          # estado y salud de cada uno
claude mcp get playwright
claude mcp remove <nombre> [--scope project]
```

En sesión, `/mcp` muestra los servidores vivos, sus herramientas y el estado de
autenticación. **Un servidor añadido a mitad de sesión no se carga hasta
reiniciar Claude Code.**

## Qué no funciona en el sandbox remoto

Claude Code en la web corre con la red de salida restringida (ver `CLAUDE.md` §
Sandbox remoto). Medido el 2026-08-29:

- **`api.firecrawl.dev` está bloqueado** (`CONNECT tunnel failed, 403`). El
  servidor arranca —el registro de npm sí se alcanza— pero cualquier `scrape`
  falla. Firecrawl sólo sirve desde tu máquina.
- **Playwright sí funciona**: Chromium viene preinstalado en el contenedor
  (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) y no hay que descargar nada. Lo
  que no puede es visitar sitios bloqueados; contra el frontend servido en
  `localhost` va bien, que es justo lo que pide la skill `qa`.
- Los **conectores de claude.ai** (GitHub, Vercel, GoDaddy…) los inyecta el
  anfitrión en las sesiones web; no salen de `.mcp.json` y no aparecen en
  `claude mcp list`. Se gestionan en claude.ai → Conectores.
