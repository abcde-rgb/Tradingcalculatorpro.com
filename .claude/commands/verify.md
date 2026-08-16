Verifica el repositorio antes de commit/push. **Ejecuta exactamente lo que
ejecuta CI**, en este orden, y reporta el resultado de cada paso.

> ⚠️ Esta lista tiene que ser la MISMA que la de `.github/workflows/ci.yml`. Si
> añades una comprobación a CI, añádela aquí; si no, `/verify` vuelve a decir
> «todo verde» sobre un PR que CI va a tumbar — que es exactamente lo que hacía
> hasta el 2026-08-14: comprobaba 4 cosas de las 10 y hablaba de 8 idiomas
> cuando hay 10.

## 1 · Sin arrancar nada (~3 s en total, córrelas siempre)

```bash
cd frontend
node scripts/i18n-check.js              # 10 idiomas · debe decir «faltan 0 | sobran 0»
node scripts/engine-check.js            # motores del navegador · N/N passed
node scripts/check-edu-index.js         # índice de la Academia ↔ navegación
node scripts/check-fetch-credentials.js # todo fetch al backend con credentials
cd ..
python3 scripts/gen-mapa.py --check          # el mapa refleja el código
python3 scripts/gen-instruments-js.py --check # catálogo backend ↔ frontend
python3 scripts/check-doc-links.py            # los enlaces de la doc resuelven
```

Si `gen-mapa --check` falla, **no es un error**: has añadido rutas, módulos o
páginas. Corre `python3 scripts/gen-mapa.py` (sin `--check`) y commitea el
mapa.

## 2 · Backend (~14 s)

```bash
cd backend
python -m py_compile *.py    # TODOS los módulos — la lista a mano omitía seis
python -m pytest tests/ -q   # entero, no sólo `-k unit`
```

Si `pytest` no encuentra `fastapi`/`scipy`/`webauthn`, el contenedor está
crudo: `pip install -q --ignore-installed PyJWT -r requirements.txt` (el
`--ignore-installed` es por el PyJWT de Debian, que no se puede desinstalar).

## 3 · Frontend (~5 s + ~40 s)

```bash
cd frontend
npx eslint src scripts   # 0 ERRORES. Los avisos de símbolos muertos no bloquean
npm run build            # exit 0
```

Si `npx eslint` se queja de que no encuentra `@eslint/js`, faltan las
dependencias: `npm ci --legacy-peer-deps` (tarda varios minutos — lánzalo en
segundo plano en cuanto sepas que vas a tocar el frontend, no cuando ya has
terminado).

## 4 · Verlo funcionar (sólo si has tocado una pantalla)

`/verify` comprueba el repositorio; **no comprueba que lo que has construido se
vea bien ni haga lo que dice**. Para eso está el skill `qa`, que levanta
Postgres, el backend y el build de producción:

```bash
tests/e2e/stack/arriba.sh      # idempotente; la primera vez tarda unos minutos
tests/e2e/correr.sh            # el examen entero
```

No es opcional cuando el cambio añade o modifica una pantalla. Una captura de
la mesa de cálculo encontró en treinta segundos dos fallos que habían pasado
lint, 264 comprobaciones de motor y 782 tests: el margen de un micro E-mini
salía a 25 000 $ en vez de 1320 (la palanca se caía a 1×) y el aviso de email
tapaba el campo de capital.

## Veredicto

Al terminar, di claramente: ✅ todo verde / ❌ qué falló, dónde, y con qué
salida. No des por bueno un paso que no hayas ejecutado en esta sesión.

Recuerda: en sesiones web, **Yahoo y los proveedores de precio están
bloqueados**, así que cualquier smoke del escáner o de datos de mercado tiene
que mockear la respuesta. Una prueba que llame a la red real aquí no prueba
nada.
