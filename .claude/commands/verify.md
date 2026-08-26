Verifica el proyecto antes de commit/push.

**Antes que nada**: si `backend/.venv` o `frontend/node_modules` no existen, ejecuta
`bash scripts/preparar-entorno.sh`. Sin eso, los pasos 3, 5 y 6 **no se pueden
ejecutar** — y decir "no ejecutado" cuando se podía haber ejecutado es el fallo que
esta lista existe para evitar.

Ejecuta en orden y reporta cada resultado. No sigas si uno falla de forma bloqueante.

1. **Sintaxis del backend** — TODOS los módulos, no una lista a mano
   (la lista escrita a mano llegó a omitir seis):
   `cd backend && python -m py_compile *.py`

2. **Paridad i18n y motores del frontend** (10 idiomas, claves exactas):
   `cd frontend && node scripts/i18n-check.js && node scripts/engine-check.js`
   Debe decir `faltan 0 | sobran 0` en los diez —y **ninguna clave duplicada**, que no
   cambia el recuento porque el objeto las colapsa— y que pasan todas las
   comprobaciones del motor.

2.b **Que además estén traducidas, escritas en su alfabeto y PINTADAS**:
   ```
   cd frontend && node scripts/i18n-traducido.js       # no es el inglés literal
   cd frontend && node scripts/i18n-escritura.js       # cada idioma en su escritura
   cd frontend && node scripts/check-visuales-idioma.js # los diagramas no ganan castellano
   node tests/e2e/navegador/paginas-traducidas.js      # necesita build; ver paso 6
   ```
   Los tres primeros miran el DICCIONARIO. El último mira la PANTALLA, que es donde
   estuvo el fallo: `AboutPage`, `ContactPage` y `NotFoundPage` no llamaban a `t()` ni
   una vez y salían en castellano en los diez idiomas con los tres primeros en verde.

3. **Tests del backend** (los `*_unit.py` corren sin red ni BD; integración se salta):
   `backend/.venv/bin/python -m pytest backend/tests/ -q`

4. **Coherencia de la documentación** — los tres corren también en CI:
   ```
   python scripts/gen-mapa.py --check           # el mapa refleja el código
   python scripts/gen-instruments-js.py --check # catálogo backend ↔ frontend
   python scripts/check-doc-links.py            # los enlaces resuelven
   ```
   Si `gen-mapa --check` falla porque añadiste rutas o módulos, regenera con
   `python scripts/gen-mapa.py` y **mira el diff**: si aparecen rutas nuevas bajo
   «sin consumidor», acabas de escribir backend sin interfaz.

5. **Lint** (sólo si tocaste `frontend/**`):
   `cd frontend && npx eslint src scripts`
   0 errores. Los avisos de símbolos muertos son deuda conocida, no bloquean.
   Ojo con los errores de *parseo*: eslint se para en el primero y **deja de mirar el
   resto del fichero**, así que un `✖ 1 error` puede estar tapando lo que venga detrás.

5.b **Si tocaste un verificador** (`scripts/*check*`, `gen-*`, `engine-check`):
   `bash scripts/probar-verificadores.sh`
   Sabotea cada comprobación y exige que falle. Una comprobación que no puede fallar da
   confianza falsa, que es peor que no tenerla.

6. **Build de producción** (sólo si tocaste `frontend/**`):
   `cd frontend && CI=false npm run build`

7. **Capturas** (sólo si tocaste algo visual, y con el build ya hecho):
   `node scripts/capturas.js`
   Fotografía las pantallas públicas en escritorio y móvil, tema claro y oscuro, y
   **recoge los errores de consola**. Una captura bonita de una pantalla que escupe
   errores engaña.

Al terminar, da un veredicto claro: ✅ todo verde / ❌ qué falló y dónde. Di
explícitamente qué **no** ejecutaste y por qué — nunca presentes como verificado algo
que no corriste.

Recuerda: en sesiones web la red de salida está restringida, así que cualquier smoke
del escáner o de datos de mercado debe mockear la respuesta (ver CLAUDE.md).

Para el estado del repositorio más allá de esta rama (ramas sin fusionar, código
muerto, restos de lo retirado, contradicciones doc↔código): `python scripts/auditar.py`.
