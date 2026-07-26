# 📱 Publicar TradingCalculator.Pro en las tiendas

> Guía operativa para llevar la PWA a **Google Play**, **Microsoft Store**, **App Store** y
> escritorio. Escrita para ejecutarse paso a paso, con los costes reales y —sobre todo— con las
> trampas en las que se cae la gente.
>
> **Prerrequisito, ya cumplido:** la PWA es instalable (service worker + manifest completo,
> ola 1). Las tres tiendas parten de ahí; sin PWA válida no hay ninguna de las tres rutas.

---

## 0. Antes de nada: el dominio

Hoy la web se sirve en `https://abcde-rgb.github.io/Tradingcalculatorpro.com/`.

**Esto condiciona el empaquetado**: el `packageId` de Android, el `assetlinks.json` y la identidad
de la app quedan atados a ese host. Si vas a comprar el dominio propio (sigue siendo la palanca nº1
de SEO), **hazlo ANTES de publicar en las tiendas**: cambiar el host después obliga a republicar la
app y rompe la verificación de Digital Asset Links.

👉 **Recomendación: dominio primero, tiendas después.** Todo lo de este documento sigue valiendo,
solo hay que sustituir el host.

---

## 1. Google Play — Android (TWA)

**Qué es.** Una *Trusted Web Activity*: Chrome renderiza tu PWA a pantalla completa, sin barra de
direcciones. Google la acepta como app nativa. Es la ruta más barata y rápida.

**Coste:** 25 $ una sola vez (cuenta de desarrollador). **Tiempo:** 1-2 días.

### Pasos

```bash
# 1. Generar el proyecto Android desde la config del repo
npx @bubblewrap/cli init --manifest packaging/twa-manifest.json

# 2. Construir (la primera vez crea el keystore de firma)
npx @bubblewrap/cli build
```

### ⚠️ Las dos cosas que rompen esto

1. **El keystore.** `bubblewrap build` genera `android.keystore`. **Guárdalo y haz copia de
   seguridad fuera del repo** (nunca dentro: está en `.gitignore` por algo). Si lo pierdes, no
   puedes volver a actualizar la app en Play — hay que publicar una app nueva con otro ID y perder
   las instalaciones y las reseñas.

2. **Digital Asset Links.** Al terminar el build, Bubblewrap te da un **SHA-256**. Hay que copiarlo
   en [`frontend/public/.well-known/assetlinks.json`](../frontend/public/.well-known/assetlinks.json)
   (ahora mismo contiene un marcador `REEMPLAZAR:...`) y desplegar la web. Verifica con:

   ```
   https://<tu-host>/.well-known/assetlinks.json
   ```

   Si esto falla, la app arranca **con la barra de direcciones del navegador visible** — Google
   rechaza esas apps por parecer un simple enlace web.

   > **Ojo con Play App Signing.** Si aceptas que Google firme por ti (lo habitual), el fingerprint
   > válido es el que aparece en *Play Console → Configuración → Integridad de la app*, **no** el de
   > tu keystore local. Es el error nº1 en este paso: se publica el fingerprint equivocado y la app
   > sale con barra de direcciones.

---

## 2. Microsoft Store — Windows (MSIX)

**Qué es.** PWABuilder empaqueta la misma PWA en un MSIX instalable.

**Coste:** 19 $ una sola vez. **Tiempo:** ~1 día. **Es la tienda más permisiva de las tres.**

### Pasos

1. Reserva el nombre en el [Partner Center](https://partner.microsoft.com/dashboard) y anota
   **Identity Name**, **Publisher** y **Publisher Display Name**.
2. Ve a [pwabuilder.com](https://www.pwabuilder.com/), mete la URL de la web y elige **Windows**.
3. Rellena esos tres valores **exactamente** como aparecen en Partner Center.
4. Descarga el `.msixbundle` y súbelo.

⚠️ Si el *Publisher* no coincide carácter a carácter con el de Partner Center, la subida se rechaza
sin decir claramente por qué.

---

## 3. App Store — iOS (Capacitor)

**Coste:** 99 $/año + un Mac para firmar. **Tiempo:** 3-5 días. **La más difícil, con diferencia.**

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Trading Calculator PRO" com.tradingcalculatorpro.app --web-dir=frontend/build
npx cap add ios
npx cap open ios
```

### ⚠️ Apple rechaza envolturas web sin valor nativo (directriz 4.2, *Minimum Functionality*)

Envolver la web y subirla **se rechaza**. Hay que aportar al menos dos cosas nativas, y conviene
que sean estas dos porque además mejoran el producto:

| Añadido nativo | Plugin | Por qué encaja aquí |
|---|---|---|
| **Notificaciones push** | `@capacitor/push-notifications` | Las alertas de precio ya existen y hoy solo llegan por email; en el móvil una push es *el* caso de uso |
| **Desbloqueo biométrico** | `capacitor-native-biometric` | Face ID / Touch ID para entrar a una cuenta con datos financieros |

### 💰 La trampa cara: la comisión de Apple y Google

Si la suscripción se puede **comprar dentro de la app**, Apple y Google se llevan entre el **15% y
el 30%**. Con tu precio de 17 €/mes, eso son 2,55-5,10 € por cliente y mes.

**La salida legítima** es la de las apps *"reader"*: **la app no vende nada**. El usuario llega ya
suscrito desde la web. La app no puede mostrar precios, ni botones de compra, ni enlaces al checkout
(Apple lo revisa activamente).

> Esto hay que decidirlo **antes** de escribir la primera línea de la app iOS. Si el flujo de pago se
> mete dentro y luego hay que sacarlo, se rehace media app.

---

## 4. Escritorio fuera de tienda — Tauri

Para macOS y Linux (y Windows si no quieres pasar por la Store), **Tauri** produce un binario de
~5 MB, frente a los ~120 MB de Electron.

```bash
npm install --save-dev @tauri-apps/cli
npx tauri init      # frontendDist -> ../frontend/build
npx tauri build
```

**Coste:** 0 € fuera de tienda. En la Mac App Store, los mismos 99 $/año y las mismas reglas de
comisión que iOS.

---

## 5. Orden recomendado

1. **Dominio propio** (§0) — si no, habrá que rehacer el empaquetado.
2. **Microsoft Store** — la más barata, la más permisiva, sirve para rodar el proceso.
3. **Google Play** — 25 $, y la TWA reaprovecha la PWA tal cual.
4. **Tauri** para escritorio — sin tienda, sin comisiones, sin revisión.
5. **App Store** el último: es el que más trabajo nativo y más decisiones de negocio exige.

---

## 6. Checklist previa a cualquier envío

- [ ] Lighthouse PWA en verde en la URL de producción.
- [ ] `manifest.json` con `id`, `scope`, `display`, iconos 192/512 y `screenshots` ✅ (hecho en la ola 1).
- [ ] Service worker registrado y funcionando offline ✅ (hecho en la ola 1).
- [ ] Política de privacidad accesible **por URL pública** ✅ (`/legal`) — las tres tiendas la exigen.
- [ ] Capturas por dispositivo (Play: teléfono + 7"/10"; Store: 1366×768; App Store: 6,7" y 5,5").
- [ ] Clasificación por edades: **contenido financiero, no juego de azar**. Declara que no hay
      dinero real en juego dentro de la app, o cae en la categoría de apuestas.
- [ ] Advertencia de riesgo visible ✅ (`/legal?tab=risk`) — obligatoria para apps financieras.

---

## 7. Estado actual en el repo

| Pieza | Estado |
|---|---|
| PWA instalable (SW + manifest) | ✅ ola 1 |
| `packaging/twa-manifest.json` | ✅ listo, con 2 marcadores que rellenar |
| `frontend/public/.well-known/assetlinks.json` | ✅ creado, **falta el SHA-256 real** |
| Proyecto Capacitor iOS | ⏳ requiere Mac |
| Proyecto Tauri | ⏳ requiere decisión de alcance |
| Cuentas de desarrollador | ⏳ acción del propietario (25 $ + 19 $ + 99 $/año) |
