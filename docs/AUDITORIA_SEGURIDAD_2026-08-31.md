# Auditoría de exposición — 2026-08-31

Pregunta de partida: **¿se filtra algo?** Claves de API, datos, correos, cualquier
cosa expuesta o que pueda exponerse.

Alcance: el árbol actual, **los 356 commits de historia** (6.057 objetos), lo que
se publica en GitHub Pages, y la superficie del backend en Cloud Run. Lo que no
se ha podido tocar: el servicio en vivo (el sandbox no tiene salida a la red), la
consola de GCP y los secretos reales. Todo lo de abajo sale de leer el código y
la historia, no de sondear producción.

> Ningún valor de credencial se reproduce en este documento, ni siquiera de los
> que resultaron ser marcadores de posición.

---

## Resumen

| | |
|---|---|
| Credenciales reales en el árbol | **0** |
| Credenciales reales en la historia | **0** (13 coincidencias, todas marcadores) |
| Hallazgos | **1 alto · 1 medio · 3 bajos · 1 nota** |
| Lo más urgente | **F-1**: los secretos de pago se guardan sin cifrar y nada lo dice |

---

## Hallazgos

### 🔴 F-1 — Los secretos de pago y correo se guardan en claro, y el cifrado falla en silencio

`backend/server.py:8455`

```python
def _encrypt_setting(value: str) -> str:
    if not value: return value
    f = _get_fernet()
    if f:
        return _ENC_PREFIX + f.encrypt(value.encode()).decode()
    return value          # ← sin clave: texto plano, sin aviso
```

`_get_fernet()` devuelve `None` cuando `SECRET_ENCRYPTION_KEY` no está en el
entorno. Y esa variable aparece **en un solo sitio de todo el repositorio**:

```
backend/.env.example:21:SECRET_ENCRYPTION_KEY=
```

Vacía. No está en ningún workflow, ni en `DEPLOY_CHECKLIST.md`, ni en
`GOOGLE_CLOUD_SETUP.md`. Así que el estado por defecto —y con toda probabilidad
el de producción— es que estas claves se escriben **sin cifrar** en Postgres:

`stripe_secret_key` · `stripe_webhook_secret` · `sendgrid_api_key` ·
`google_client_secret` · `paypal_client_secret` · `coinbase_api_secret` ·
`finnhub_api_key` · `alpha_vantage_api_key` · `emergent_llm_key`

**Lo que lo convierte en hallazgo y no en una limitación conocida es que no se
ve.** `GET /admin/settings` las enseña enmascaradas (`••••1234`) tanto si están
cifradas como si no, así que el administrador que las teclea no tiene ninguna
señal de en qué estado quedaron. El comentario del código dice «Without this key,
secrets fall back to plaintext» — pero ese comentario no llega a quien opera.

Es **C-08** de `DIARIO_BUGS.md`, listado como pendiente conocido. La auditoría
añade que no es un riesgo latente: es el comportamiento por defecto.

**Arreglo propuesto**, en dos mitades separables:

1. *Hacerlo visible, hoy.* Que `GET /admin/settings` devuelva
   `encryption_active: bool`, que el panel lo pinte, y que guardar un secreto sin
   clave de cifrado deje un `logging.error` en vez de un silencio. Es código, no
   toca infraestructura, y se puede fijar con un test.
2. *Hacerlo cierto.* Generar la clave, guardarla en Secret Manager, añadirla al
   `--update-secrets` del servicio, y re-guardar cada secreto para que se escriba
   ya cifrado (los valores viejos siguen en claro hasta que se reescriban).
   Esto es tuyo: requiere consola de GCP.

---

### 🟠 F-2 — La documentación interactiva de la API está abierta al público

`backend/server.py:1158`

```python
app = FastAPI(title="Trading Calculator PRO API")
```

Sin `docs_url=None`, `redoc_url=None` ni `openapi_url=None`, y nada lo desactiva
después (`grep` sobre los doce módulos del backend: cero coincidencias). Con la
configuración por defecto de FastAPI eso publica `/docs`, `/redoc` y
`/openapi.json`.

Lo que se sirve ahí es el esquema completo: **141 rutas**, las de `/admin/*`
incluidas, con sus modelos de petición y respuesta y el nombre de cada campo. No
es una brecha —las rutas siguen pidiendo autenticación— pero es el mapa de la
superficie de ataque, servido y con formulario de prueba.

**Arreglo:** desactivarlas cuando `ENVIRONMENT` no sea de desarrollo. Dos líneas.

---

### 🟡 F-3 — Una regla de autorización escrita en el código, con un correo dentro

`backend/server.py:1147`

```python
_FREE_ACCESS_EMAILS = (
    {… os.environ.get("FREE_ACCESS_EMAILS", "") …}
    | {"tradingcalculatorpro@gmail.com"}
)
```

Ese correo tiene acceso premium permanente, y está en el fuente.

Lo llamativo es que el proyecto **ya cerró este mismo problema una vez**:
`DIARIO_BUGS.md` → **M-14**, *«ADMIN_EMAILS hardcodeado en cloudbuild.yaml —
email de admin (`tradingcalculatorpro@gmail.com`) expuesto en el repositorio»*,
resuelto sacándolo de `--set-env-vars`. En `server.py` sigue.

Dos costes: el correo queda publicado (spam, phishing dirigido, y es el correo
que da acceso), y cambiar quién entra gratis exige un despliegue.

**Arreglo:** dejarlo sólo en `FREE_ACCESS_EMAILS` y ponerlo en el servicio.

---

### 🟡 F-4 — `_mask` es código muerto, y es una trampa

`backend/admin_routes.py:246` define `_mask()`, y la cabecera del módulo promete
*«ver todos los conectores/APIs (secretos enmascarados)»*. **No la llama nadie**
(`grep -n "_mask" backend/*.py`: sólo su definición). El enmascarado que de
verdad se aplica vive en `server.py:8486` (`_mask_secret`).

Hoy no filtra nada. Pero quien escriba el próximo endpoint de ajustes en
`admin_routes.py` se encontrará una función de enmascarado a mano y supondrá que
el módulo ya lo hace.

**Arreglo:** borrarla, o hacer que sea la que se usa.

---

### 🟡 F-5 — Identidad de la infraestructura de GCP en el repositorio

`trading-backend-sa@tradingcalculatorpro-502817.iam.gserviceaccount.com` aparece
en cuatro ficheros (`backend/setup-gcp.sh`, `docs/MIGRACION_NEON.md`,
`docs/REGISTRO_SESIONES.md`, `docs/setup/GOOGLE_CLOUD_SETUP.md`): nombre de la
cuenta de servicio **y** ID del proyecto.

No es una credencial y sin una clave no sirve para entrar. Pero es
reconocimiento gratis para quien prepare un ataque dirigido, y no hace falta que
esté: los scripts de instalación pueden pedirlo o leerlo de `gcloud config`.

---

### 🔵 F-6 — Nota: `CORS_ORIGINS` amplía la lista permitida desde el entorno

`backend/server.py:1196`. Es una escotilla deliberada y está documentada. Sólo
conviene tener presente que va junto a `allow_credentials=True`: un origen de más
ahí no es un permiso de lectura genérico, es acceso **con las cookies de sesión**
del usuario. Merece el mismo cuidado que un secreto.

---

## Lo que se comprobó y está limpio

**Credenciales — árbol actual.** Barrido de todos los ficheros con seguimiento
contra los patrones de Stripe, Google, GitHub, AWS, Slack, SendGrid, Twilio,
Anthropic, claves privadas PEM y cadenas `postgresql://usuario:clave@`. Diez
ficheros dan coincidencia; **los diez son marcadores, ejemplos de documentación o
fixtures de test** (`sk_live_...`, `sk_test_NEVERLEAKME`,
`wsk_test_signing_secret_ABCDEF`).

**Credenciales — historia completa.** Los 6.057 objetos de los 356 commits,
mismo juego de patrones. Trece blobs coinciden, en `.env.example`,
`setup-gcp.sh/.ps1`, `GOOGLE_CLOUD_SETUP.md` y `MIGRACION_NEON.md`. Revisados uno
a uno: `${DB_USER}`, `USUARIO`, `trading_user` y contraseñas que son la palabra
«contraseña» en varias formas. La cadena de Neon de `MIGRACION_NEON.md:39` es la
que más lo parecía —usuario verosímil, clave de 9 caracteres— y resultó ser el
ejemplo que la propia Neon enseña: el anfitrión es `ep-cool-name-123456`, su
marcador de manual, y el texto que la rodea dice *«Neon te enseña la Connection
string. Tiene esta forma:»*. **Nada que rotar.**

**`.gitignore`.** Cubre `.env`, `.env.*`, `*.env` (con excepción explícita para
los `.env.example`), `*.pem`, `*.key`, `credentials.json`, `*.keystore` y
`graphify-out/`. Los únicos `.env` en disco son los dos `.example`.

**Mapas de fuente: no se publican.** El build de despliegue es
`npm run build`, y el script es `GENERATE_SOURCEMAP=false craco build`
(`package.json:58`). El build local sí tiene 64 `.map`, pero sólo porque
`probar-verificadores.sh` invoca `craco build` directamente; `frontend/build/`
está ignorado y nunca sale del disco.

**Nada secreto viaja al navegador.** Las seis variables `REACT_APP_*` que existen
—`BACKEND_URL`, `GOOGLE_CLIENT_ID`, `GA4_MEASUREMENT_ID`, `GTM_ID`,
`GSC_VERIFICATION`, `BING_VERIFICATION`— son públicas por naturaleza. Conviene
que quede escrito, porque están guardadas como *GitHub Secrets* y eso puede
sugerir lo contrario: **todo lo que entra por `REACT_APP_*` acaba en el paquete
JavaScript**, y ahí no puede ir nunca un secreto de verdad.

**La cuenta demo no regala nada.** `server.py:1124` siembra en producción una
contraseña aleatoria (`secrets.token_urlsafe(24)`). El `1234` que aparece en los
tests y el `12345678` del código sólo se activan con `ENVIRONMENT=development`.
Lo di por hallazgo en la primera lectura y no lo es.

**CORS.** Lista explícita de orígenes (sin comodín) junto a
`allow_credentials=True`, que es el emparejamiento correcto; métodos y cabeceras
enumerados.

**Errores.** Manejador global (`server.py:1306`) que registra la traza por dentro
y devuelve un 500 genérico al cliente.

**Logs.** El módulo `log_seguro.py` sanea los valores de fuera contra *log
injection*. Búsqueda específica de contraseñas o tokens interpolados en llamadas
a `logging`: **ninguna** — las dos coincidencias son mensajes de estado sin valor.

**Autenticación.** `bcrypt` con `rounds=12`. Límite de peticiones en las seis
rutas sensibles, escalonado: registro, magic link y recuperación a 3/hora; reset
a 5/hora; login a 10/minuto; refresh a 30/minuto. 29 límites en total.

**Ajustes públicos.** `GET /public/settings` (sin autenticación) devuelve
únicamente las claves de `PUBLIC_SETTING_KEYS`.

**Escritura de secretos por el panel.** `PUT /admin/settings` trata la cadena
vacía como «no cambiar» y exige el centinela `__CLEAR__` para borrar, así que la
interfaz no puede sobrescribir un secreto con su propia máscara. Es una
precaución que suele faltar.

**Falso positivo, dicho para que no vuelva.** Un barrido de rutas sin `Depends`
en la firma señaló `POST /admin/coupons` y `PATCH /admin/feature-flags/{flag_id}`.
Ambas llevan `Depends(require_admin)`; fue mi expresión regular, no las rutas.

---

## Qué haría primero

1. **F-1, mitad de código** — que el estado del cifrado sea visible y que guardar
   en claro no sea silencioso. Es lo único de esta lista donde el riesgo es que
   nadie se entere.
2. **F-2** — cerrar `/docs` fuera de desarrollo. Dos líneas.
3. **F-3** y **F-4** — sacar el correo al entorno, borrar la función muerta.
4. **F-1, mitad de infraestructura** — la clave en Secret Manager y re-guardar
   los secretos. Requiere consola.

Ninguno de los cuatro primeros toca el comportamiento de la aplicación para un
usuario.
