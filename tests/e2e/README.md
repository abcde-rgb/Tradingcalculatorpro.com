# Banco de pruebas E2E

Contra la aplicación **viva**: Postgres real, backend real y el **build de
producción** servido bajo `/Tradingcalculatorpro.com` (la misma base que GitHub
Pages), recorrido con Chromium.

```bash
tests/e2e/stack/arriba.sh    # levantar (idempotente)
tests/e2e/correr.sh          # el examen entero
tests/e2e/correr.sh temas    # una sonda suelta
tests/e2e/stack/abajo.sh     # parar
```

Para qué sirve cada sonda, cómo leer un resultado y por qué un ❌ es una
hipótesis y no un veredicto: [`.claude/skills/qa/SKILL.md`](../../.claude/skills/qa/SKILL.md).

Lo que **no** hace falta levantar para comprobar (sintaxis, lint, paridad de los
10 idiomas, catálogo de instrumentos, enlaces de la doc) está en `/verify`.

## ⚠️ El panel de admin no se puede sondear todavía

`/admin` no tiene ni una sonda, y no es por descuido: el backend exige **2FA** a
los administradores (428 en `/admin/*`) y `ProtectedRoute` manda a Ajustes al
admin que no lo tenga. `entra()` hace login con contraseña y ahí se queda, así
que una sonda de `/admin` aterriza en Ajustes y saca todo en rojo con el panel
perfectamente sano — comprobado el 2026-08-22 al intentarlo.

Para abrirlo hace falta un `entraAdmin()` que genere el TOTP en el momento
(RFC 6238: base32 + HMAC-SHA1, unas 40 líneas con `crypto`) y complete
`/auth/2fa/verify`. **No** vale activar 2FA en la cuenta `qa@example.com`: le
cambiaría el login a todas las demás sondas.

Son 3.400 líneas de `AdminPage.jsx` sin una sola comprobación de navegador.
