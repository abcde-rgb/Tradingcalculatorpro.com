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
