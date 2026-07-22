Verifica el proyecto antes de commit/push. Ejecuta estos pasos en orden y
reporta el resultado de cada uno (no continúes al siguiente si uno falla de
forma bloqueante; resume qué falló):

1. **Sintaxis Python** (desde la raíz):
   `python -m py_compile backend/server.py backend/admin_routes.py backend/options_math.py`
   Añade cualquier otro `.py` del backend que hayas tocado en esta sesión.

2. **Paridad i18n** (8 idiomas, claves exactas):
   `cd frontend && node scripts/i18n-check.js`
   Debe decir `faltan 0 | sobran 0` en los 8 locales. Si no, arréglalo antes de seguir.

3. **Tests unitarios del backend** (los `*_unit.py` corren sin red/BD real; desde `backend/`):
   `cd backend && pytest tests/ -k "unit" -q`
   (o el archivo concreto que aplique al cambio).

4. **Build de producción del frontend** (solo si tocaste `frontend/**`):
   `cd frontend && CI=false GENERATE_SOURCEMAP=false npm run build`
   Debe compilar; los warnings preexistentes son aceptables, los errores no.

Al terminar, da un veredicto claro: ✅ todo verde / ❌ qué falló y dónde.
Recuerda: en sesiones web, Yahoo/CoinGecko están bloqueados por red, así que
cualquier smoke del escáner debe mockear la respuesta de la API (ver CLAUDE.md).
