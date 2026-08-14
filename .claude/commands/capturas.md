Smoke visual de las pantallas públicas, sin backend.

```bash
cd frontend && npm run build          # sólo si no hay build/ o cambiaste el frontend
node scripts/capturas.js              # 36 capturas en ~70 s → .capturas/
node scripts/capturas.js --solo=/pricing --tema=dark   # una sola, al iterar
```

9 pantallas públicas × escritorio/móvil × claro/oscuro. Recoge además los
**errores de consola** de cada página.

Si falta `frontend/node_modules`, ejecuta antes
`bash scripts/preparar-entorno.sh`.

## Lo importante: MIRA las capturas

No te fies del log. Este script imprimió `✅` treinta y seis veces mientras
producía imágenes **en blanco**, y otras tantas con media página vacía porque las
animaciones de aparición no se habían disparado. Las dos veces el problema era la
captura, no el producto — y las dos se descubrieron abriendo un PNG, no leyendo la
salida.

Después de cada tanda, **abre al menos la portada** con la herramienta de lectura
de imágenes y comprueba que hay contenido bajo cada título.

## Qué NO cubre

Todo lo que está tras el muro de pago: dashboard, diario, opciones en vivo,
academia, admin. Para eso hace falta backend y base de datos → skill `qa`, que
levanta Postgres y uvicorn y recorre la app autenticada. Esto lo precede, no lo
sustituye.

## Si añades una pantalla pública

Añádela al array `PANTALLAS` de `scripts/capturas.js`. Si está tras el muro, **no
la añadas**: saldría una redirección a `/pricing`, y una captura de la pantalla
equivocada es peor que ninguna captura.
