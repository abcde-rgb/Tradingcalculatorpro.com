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
quien clone el repo lo tiene sin configurar nada. Un `.mcp.json` de proyecto pide
aprobación la primera vez —ejecuta procesos que vienen en el repo—; ver
§ [Salir de «Pending approval»](#salir-de-pending-approval). Las sesiones en la
nube no pueden mostrar el diálogo y lo cargan directamente.

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

## Salir de «Pending approval»

`claude mcp list` puede insistir en `⏸ Pending approval (run \`claude\` to approve)`
por más ajustes que le pongas. El motivo no es la clave `enabledMcpjsonServers`,
es **la confianza de la carpeta**: en una carpeta cuyo diálogo de confianza no has
aceptado, Claude Code ignora las aprobaciones que vengan de ficheros del propio
repositorio —si no, un repo clonado se aprobaría a sí mismo—.

Medido el 2026-08-29 sobre este repo, con `claude mcp list` como juez:

| `enabledMcpjsonServers` en… | Sin confianza | Con confianza |
|---|---|---|
| `.claude/settings.json` (versionado) | ⏸ ignorado | ✅ Connected |
| `.claude/settings.local.json` (ignorado por git) | ⏸ ignorado | ✅ Connected |
| `~/.claude/settings.json` (tu usuario) | ✅ Connected | ✅ Connected |
| `~/.claude.json`, entrada del proyecto | ⏸ no es una fuente de aprobación | — |

La última fila es un callejón sin salida que costó un rato: ahí es donde Claude
Code *escribe* tu decisión cuando aceptas el diálogo, pero escribirla a mano no
aprueba nada.

Este repo ya trae `enabledMcpjsonServers` en `.claude/settings.json`, así que en
cuanto aceptes la confianza de la carpeta —el diálogo que sale la primera vez que
abres `claude` aquí— los dos servidores conectan sin un segundo diálogo. La
confianza sigue siendo tuya y explícita; lo único que se ahorra es repetirla.

## Trampas medidas al probarlo (2026-08-29)

Comprobado de verdad: Playwright MCP conduciendo el build de producción servido en
`127.0.0.1:4173`, con captura en 1440×900 y 390×844 y los errores de consola de la
portada. Lo que costó llegar ahí:

1. **Playwright MCP abre Google Chrome, no el Chromium de Playwright.** Sin flags
   falla con `Chromium distribution 'chrome' is not found at
   /opt/google/chrome/chrome`. En una máquina con Chrome instalado no se nota; en
   el sandbox y en un CI, sí.
2. **`--browser chromium` tampoco basta aquí**: espera la revisión que trae su
   propio Playwright (`chromium-1237`) y el contenedor tiene la 1194. Y la
   instalación que sugiere el propio error tampoco sale: `install-browser
   chrome-for-testing` muere con `Failed to download Chrome for Testing
   152.0.7977.8`, porque la CDN de Playwright está fuera de la red permitida. En
   el sandbox, señalar el ejecutable a mano no es una comodidad, es la única vía:

   ```bash
   npx -y @playwright/mcp@latest --headless --no-sandbox --isolated \
     --executable-path "$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1)"
   ```

   No se ha metido en `.mcp.json` a propósito: esa ruta y ese número de revisión
   son de este contenedor, y en la máquina de nadie más existen.
3. **`browser_take_screenshot` agota su límite de 5 s esperando las fuentes web**
   cuando `fonts.googleapis.com` está bloqueado. La primera captura falla con
   `TimeoutError … waiting for fonts to load`; la segunda, con las fuentes ya
   descartadas, sale bien. Si automatizas capturas aquí, cuenta con un reintento.
4. **`filename` relativo se resuelve contra el CWD del servidor, que es la raíz
   del repo** — una captura acabó en `movil.png` junto a `CLAUDE.md`. Pasa rutas
   absolutas o confía sólo en `--output-dir`.

Y lo que el MCP vio de la portada, que es el motivo de tenerlo: cuatro errores de
consola, los cuatro explicados por la red cerrada del sandbox (Google Tag Manager,
PostHog, `localhost:8080/api/brokers` sin backend y las fuentes de Google). En una
máquina con red, esos cuatro son la línea base contra la que comparar.

## Qué no funciona en el sandbox remoto

Claude Code en la web corre con la red de salida restringida (ver `CLAUDE.md` §
Sandbox remoto). Medido el 2026-08-29:

- **`api.firecrawl.dev` está bloqueado** (`CONNECT tunnel failed, 403`). El
  servidor arranca —el registro de npm sí se alcanza— pero cualquier `scrape`
  falla. Firecrawl sólo sirve desde tu máquina.
- **Playwright sí funciona, pero no con la configuración por defecto**: Chromium
  viene preinstalado (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) y no hay que
  descargar nada, aunque hay que señalarlo con `--executable-path` — ver § Trampas
  medidas, punto 2. Lo que no puede es visitar sitios bloqueados; contra el
  frontend servido en `localhost` va bien, que es justo lo que pide la skill `qa`.
- Los **conectores de claude.ai** (GitHub, Vercel, GoDaddy…) los inyecta el
  anfitrión en las sesiones web; no salen de `.mcp.json` y no aparecen en
  `claude mcp list`. Se gestionan en claude.ai → Conectores.
