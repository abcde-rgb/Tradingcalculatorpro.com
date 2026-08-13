---
paths:
  - "frontend/src/lib/cloudPrefs.js"
  - "frontend/src/lib/prefsMerge.js"
  - "frontend/src/lib/store.js"
  - "frontend/src/pages/SettingsPage.jsx"
---

# Ajustes del usuario — nunca `localStorage` a pelo

Tema, idioma, preferencias, favoritos, progreso de la Academia y el sistema de trading van
a **la cuenta** a través de `lib/cloudPrefs.js`. `useCloudPref('nombre')` se usa igual que
`useState` y además baja lo que haya en el servidor.

Un `localStorage.setItem` suelto vuelve a atar el ajuste a un navegador, que es justo el
bug que esto cierra (G-25).

**Para añadir un ajuste nuevo: da de alta un *slice* en `PREF_SLICES`. Nada más.** La
subida, la fusión y el reparto a los componentes montados ya están.

## Tres reglas que no se pueden romper

1. **Cada ajuste lleva su propia fecha.** Una sola fecha por documento haría que cambiar
   el tema borrase los setups escritos en otro equipo.
2. **Un ajuste sin fecha local no se sube.** Es el valor por defecto, no una elección.
3. **El `localStorage` recuerda de qué cuenta es.** Dos cuentas en el mismo navegador es
   lo que ya rompió el diario legado.

Las reglas de quién gana están en `lib/prefsMerge.js` — sin importaciones y con pruebas en
`engine-check.js`. Se guardan en un único documento de `user_states` (`preferences_v1`).

## Todo fetch lleva credenciales

Las cookies son httpOnly y cross-site (`samesite=none; secure`), así que **todo** fetch al
backend necesita `credentials: 'include'` / `withCredentials: true`. Lo verifica
`scripts/check-fetch-credentials.js` en CI.

## No se puede editar el perfil (G-26)

No existe `PUT /auth/profile` ni pantalla: nombre y foto son los del registro para
siempre. En Ajustes sólo se puede cambiar contraseña, gestionar 2FA y passkeys, exportar
los datos y borrar la cuenta.
