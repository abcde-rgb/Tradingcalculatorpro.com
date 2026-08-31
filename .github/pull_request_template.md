<!--
Plantilla de PR de TradingCalculator.Pro. Rellena las secciones que apliquen y
borra las que no. Recuerda: solo cambios en frontend/** disparan el deploy a
GitHub Pages; solo cambios en backend/** disparan el deploy a Cloud Run.
-->

## Qué hace
<!-- Resumen en 1-3 frases de qué cambia y por qué. -->

## Cambios
<!-- Lista de archivos/áreas tocados y su propósito. -->
-

## Verificación
<!-- Marca lo que hayas comprobado. -->
- [ ] `python -m py_compile` de los `.py` del backend tocados
- [ ] `node frontend/scripts/i18n-check.js` → paridad de 10 idiomas (faltan 0 | sobran 0)
- [ ] `pytest` de los tests unitarios afectados
- [ ] `npm run build` compila (si tocaste `frontend/**`)
- [ ] Probado manualmente / smoke (indica cómo; recuerda que Yahoo/CoinGecko se mockean en el sandbox)

## i18n
<!-- Si añadiste claves de traducción: -->
- [ ] Claves añadidas en los **10** locales (`en, es, de, fr, it, pt, ar, ru, ja, zh`)
      — faltaban `it` y `pt` en esta lista, así que seguirla rompía la paridad
- [ ] Sin claves nuevas

## Notas / riesgos
<!-- Impacto en deploy, migraciones, secretos, o áreas sensibles. Cualquier cosa que el revisor deba saber. -->
