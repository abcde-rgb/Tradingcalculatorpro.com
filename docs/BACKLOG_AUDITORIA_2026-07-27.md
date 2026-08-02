# Backlogs y planes — derivados de la auditoría 2026-07-27

Complemento operativo de [`AUDITORIA_2026-07-27.md`](./AUDITORIA_2026-07-27.md).
Aquí no hay diagnóstico: sólo trabajo listo para coger.

**Leyenda de esfuerzo:** XS <1 h · S ~½ día · M 1-3 días · L 1-2 semanas · XL >2 semanas
**Etiquetas:** 🔴 obligatorio · 🟡 recomendado · ⚪ opcional

---

## 1. Tabla priorizada (problema → solución)

| # | Problema | Impacto | Esfuerzo | Prioridad | Solución | Estado |
|:--:|---|---|:--:|:--:|---|:--:|
| 1 | Fibonacci lanza `ReferenceError` al calcular | Calculadora principal caída para todos | XS | 🔴 P0 | `.map((item, idx) => …)` | ✅ |
| 2 | ESLint no parsea nada (283/283) y CI no lo corre | Causa raíz: dejó pasar #1 y #3 | S | 🔴 P0 | Parser espree + paso de lint en CI | ✅ |
| 3 | 11 tarjetas admin vacías tras recargar (`Bearer null`) | Panel medio inservible, en silencio | M | 🔴 P0 | Hook `useAuthedLoad` compartido | ✅ |
| 4 | Buscador de usuarios devuelve 500 con `(` | Listado de usuarios cae | S | 🔴 P0 | `_literal_regex()` + 5 tests | ✅ |
| 5 | Doc "fuente de verdad" manda configurar OxaPay (retirada) | Trabajo perdido en ruta crítica | S | 🔴 P0 | §1/§2/§6 reescritas con cifras medidas | ✅ |
| 6 | `agent-browser` 73 MB en `dependencies`, sin usar | CI y supply chain | XS | 🟡 P1 | Eliminado (624→551 MB) | ✅ |
| 7 | `axios` vulnerable y viaja al navegador | Riesgo real de cliente | XS | 🔴 P1 | `^1.18.1` | ✅ |
| 8 | `py_compile` en CI omitía 6 módulos | Sintaxis sin comprobar en pagos | XS | 🟡 P1 | `*.py` | ✅ |
| 9 | HTML de Pages sin CSP | Sin defensa en profundidad XSS/clickjacking | M | 🔴 P1 | Meta CSP + verificación en navegador | ⏳ |
| 10 | Stripe producción sin verificar | **Bloquea lanzamiento** | M | 🔴 P1 | Validar dashboard + webhook | ⏳ ops |
| 11 | Dominio propio sin decidir | Techo de SEO y de confianza | M | 🔴 P1 | Plan de 7 pasos (§9.4 auditoría) | ⏳ |
| 12 | NOWPayments nunca probado de salida | Cobros cripto sin garantía | S | 🔴 P1 | Prueba en sandbox con key real | ⏳ ops |
| 13 | Sin Dependabot/CodeQL/secret scanning | Sin vigilancia continua | XS | 🟡 P1 | Activar en ajustes del repo | ⏳ |
| 14 | Embudo GA4 sin eventos verificados | Conversión = opinión, no dato | M | 🟡 P2 | Plan de analítica (§8) | ⏳ |
| 15 | Shim de BD con poca cobertura | Pieza casera de la que todo depende | M | 🟡 P2 | Tests de operadores y agregación | ⏳ |
| 16 | 128 símbolos muertos | Ruido; impide subir el linter a `error` | M | 🟡 P2 | Limpieza + `no-unused-vars: error` | ⏳ |
| 17 | Dev local documentado no conecta (SSL) | Fricción de arranque | XS | 🟡 P2 | Documentado; `DB_SSL` opcional | ⏳ |
| 18 | Defaults `FRONTEND_URL`/CORS a dominio no servido | Latente: correos a un sitio muerto | XS | 🟡 P2 | `RuntimeError` en producción | ⏳ |
| 19 | C-08: API keys en `app_settings` en claro | Secretos fuera de Secret Manager | M | 🟡 P2 | Quitar override por BD | ⏳ |
| 20 | `server.py` 7377 líneas | Mantenibilidad | XL | ⚪ P3 | `app/routers/` **tras** #15 | ⏳ |
| 21 | Route shadowing admin (~21 muertos) | Confusión | M | ⚪ P3 | Unificar router | ⏳ |
| 22 | Restos de Emergent en la raíz | Duda sobre qué es fuente de verdad | XS | ⚪ P3 | Mover a `_archive/` | ⏳ |
| 23 | `on_event` / `class Config` obsoletos | Romperán en versiones mayores | S | ⚪ P3 | `lifespan` / `ConfigDict` | ⏳ |
| 24 | CRA sin mantenimiento | ~40 vulns de build, sin salida | XL | ⚪ P4 | Migrar a Vite | ⏳ |

---

## 2. Backlog técnico (listo para desarrollo)

### T-01 🔴 Meta CSP en `index.html` — **M**
Añadir la política de §9.1 de la auditoría a `frontend/public/index.html`.
**Criterio de aceptación:** recorrer portada, login (incl. Google), dashboard con
TradingView, una calculadora, `/pricing` con Stripe y PayPal, y cambio de
idioma/tema — **cero** mensajes `Refused to …` en consola.
**Riesgo:** alto si se mergea sin verificar (el meta no admite report-only).

### T-02 🔴 `FRONTEND_URL` obligatoria en producción — **XS**
Código en §9.3 de la auditoría. Mismo criterio que ya se aplica a `JWT_SECRET`.
**Aceptación:** arrancar sin la variable y con `ENVIRONMENT=production` → `RuntimeError`.

### T-03 🟡 Tests del shim `Collection` — **M**
Cubrir `$set`, `$inc`, `$push`, `$unset`, `$or`, `$in`, `$ne`, `$gte/$lte/$gt/$lt`,
`$regex`, la agregación (`$sum:1` con push-down SQL vs agrupación en Python) y
`find_one_and_update` (atomicidad).
**Por qué importa:** es la capa casera de la que depende **todo** el backend.
**Aceptación:** correr contra PostgreSQL real, no mocks.

### T-04 🟡 Bajar los 128 avisos a 0 y subir el linter a `error` — **M**
Empezar por `npx eslint src scripts --fix` (quita los 11 auto-corregibles y los
`eslint-disable` obsoletos). Luego los 111 símbolos muertos, fichero a fichero.
**Aceptación:** `no-unused-vars` en `error` y CI verde.

### T-05 🟡 Activar Dependabot + CodeQL + secret scanning — **XS**
`codeql.yml` ya existe en el repo; falta activarlo en los ajustes.
**Aceptación:** los tres aparecen activos en *Security* del repositorio.

### T-06 🟡 Cerrar C-08 (API keys sólo en Secret Manager) — **M**
Quitar la posibilidad de guardar claves de Stripe/SendGrid en `app_settings`.
**Aceptación:** ninguna clave secreta se persiste en BD; migración documentada.

### T-07 ⚪ `DB_SSL` relajable sólo en desarrollo — **XS**
Código en §9.5 de la auditoría. **Aceptación:** en producción la opción no existe.

### T-08 ⚪ Migrar `on_event` → `lifespan` y `class Config` → `ConfigDict` — **S**
**Aceptación:** `pytest` sin avisos de deprecación.

### T-09 ⚪ Mover restos de Emergent a `_archive/` — **XS**
`test_result.md`, `test_summary.txt`, `backend_test_security.py`.
**Aceptación:** la raíz sólo contiene documentación vigente.

### T-10 ⚪ Unificar el router de admin (route shadowing) — **M**
Los ~21 endpoints muertos de `admin_routes.py` que pierden por orden de registro.
**Aceptación:** `test_route_uniqueness_unit.py` sin solapamientos.

### T-11 ⚪ Partir `server.py` en `app/routers/` — **XL** · *depende de T-03*
**No empezar sin T-03.** Refactorizar 7377 líneas sin red de tests es cambiar
deuda por riesgo.

---

## 3. Backlog UX/UI (listo para diseño)

> ⚠️ **Estas fichas salen de leer código, no de ver la web funcionando.**
> Trátalas como hipótesis a validar, no como hallazgos confirmados.

### U-01 🔴 Distinguir "vacío" de "ha fallado" — **S**
Hoy los `catch { /* ignore */ }` del panel admin pintan la misma tarjeta vacía
cuando no hay datos y cuando la petición falló. Ahora que el token se espera
bien (`useAuthedLoad`), toca el segundo escalón: estado de error con reintento.
**Entregable:** tres estados diferenciados —cargando / vacío / error con reintentar—
aplicados de forma consistente a las 11 tarjetas.

### U-02 🔴 Validar el foco del producto con datos — **M**
14 calculadoras + ~70 módulos de academia + opciones + journal + escáner. La
hipótesis es que cuesta explicar en una frase para quién es. **No rediseñes
nada antes de mirar el mapa de calor de uso que ya existe en el admin.**
**Entregable:** ranking real de uso → decidir qué se promociona en portada.

### U-03 🟡 Auditoría de accesibilidad de los 3 flujos que dan dinero — **M**
Registro, checkout y calculadora principal. Teclado completo + lector de pantalla.
**Entregable:** informe con violaciones WCAG AA y su corrección.

### U-04 🟡 Subir el diario a argumento de portada — **S**
`JournalEdgeButton` alimenta Kelly y Riesgo de Ruina con las operaciones **reales**
del usuario. Casi ninguna calculadora gratuita hace eso, y hoy está escondido.
**Entregable:** bloque de portada que lo explique con una captura real.

### U-05 ⚪ Revisar densidad visual en móvil — **M**
Inferencia: con esta cantidad de paneles y tablas, el riesgo de saturación en
móvil es alto. **Validar con dispositivos reales antes de tocar nada.**

---

## 4. Plan SEO técnico

**Estado: es el área más fuerte del proyecto.** No lo rehagas.

| Acción | Prioridad | Esfuerzo | Nota |
|---|:--:|:--:|---|
| **Decidir y activar el dominio propio** | 🔴 | M | **La palanca dominante.** Todo lo demás son decimales. `github.io` limita autoridad |
| Search Console: propiedad + envío de sitemap | 🔴 | XS | Confirmar si ya está hecho |
| Regenerar SEO al dominio nuevo | 🔴 | S | `gen-seo-pages.js` + `gen-sitemap.js`. Depende del dominio |
| Verificar indexación real de las 744 URLs | 🟡 | S | Cobertura en Search Console tras 2-4 semanas |
| Extender calculadoras a los 8 idiomas | ⚪ | M | Hoy 12 × 8 = 96; el copy comercial traducido flojo es peor que no tenerlo |
| Backlinks (`docs/CAPTAR_TRAFICO.md`) | ⚪ | L | El playbook ya está escrito |

**Ya correcto, no tocar:** hreflang ×9 + x-default · JSON-LD (Organization,
WebSite, WebApplication, Course, FAQPage, Breadcrumb) · `noindex` en páginas
privadas · `og-image.png` (no SVG) · `dir="rtl"` en árabe · robots.txt.

---

## 5. Plan de seguridad

| Acción | Prioridad | Esfuerzo |
|---|:--:|:--:|
| CSP en el HTML (T-01) | 🔴 | M |
| Dependabot + CodeQL + secret scanning (T-05) | 🔴 | XS |
| `FRONTEND_URL` obligatoria en producción (T-02) | 🟡 | XS |
| Cerrar C-08: API keys sólo en Secret Manager (T-06) | 🟡 | M |
| Revisar `react-router` cuando haya parche hacia adelante | 🟡 | XS |
| Rotación documentada de secretos | ⚪ | S |
| Pentest externo del flujo de pago antes de escalar | ⚪ | L |

**Ya correcto, no tocar:** clave de rate limiting derivada desde la derecha del
`X-Forwarded-For` · 2FA de admin no desactivable en producción · shim blindado
contra inyección en los 6 puntos de interpolación · cookies httpOnly +
`samesite=none` + `secure` · validación de origen contra open redirect · 500
genéricos sin traza · webhooks con firma verificada (Stripe `construct_event`,
NOWPayments HMAC-SHA512) e idempotencia por claim atómico.

**Marcado explícitamente como NO problema:** ReDoS en el buscador — medido contra
PostgreSQL real, el motor aguanta `(a+)+$`. No se actúa sobre hipótesis no
demostradas.

---

## 6. Plan de rendimiento

**Aviso: aquí hay menos que hacer de lo que un informe genérico diría.**
Verifiqué que el split de rutas, la carga lazy de los 8 locales y la exclusión de
`framer-motion`/`recharts`/`jspdf`/`html2canvas`/`lightweight-charts` del chunk de
entrada **ya están bien resueltos**. No inventes trabajo.

| Acción | Prioridad | Esfuerzo | Nota |
|---|:--:|:--:|---|
| **Lighthouse real (móvil + escritorio)** | 🔴 | XS | **Primero medir.** Todo lo de abajo depende de esto |
| Revisar importaciones de `lucide-react` | 🟡 | S | Único paquete pesado que sí está en `main.js`. Icono a icono, no barrel |
| Presupuesto de rendimiento en CI | ⚪ | S | Fallar si el chunk de entrada crece de X KB gz |
| Revisar `min-instances` de Cloud Run | ⚪ | XS | Hoy 1 (evita arranques en frío) — es coste, no rendimiento |

**Cifras medidas hoy:** entrada `main.js` **863 KB crudo / 275 KB gz** + CSS
**125 KB / 21 KB gz**. `build/` total 40 MB, de los que la mayor parte son las 744
páginas SEO estáticas (no las descarga ningún usuario).

---

## 7. Plan de accesibilidad

**Punto de partida honesto: no está auditada.** Hasta ahora era imposible, porque
el linter con `jsx-a11y` no analizaba nada. Ahora ya puede.

| Acción | Prioridad | Esfuerzo |
|---|:--:|:--:|
| Activar las reglas `jsx-a11y` en `eslint.config.mjs` y medir el recuento real | 🔴 | XS |
| Corregir lo que salga, empezando por formularios y CTAs | 🔴 | M |
| Recorrido completo con teclado de registro, checkout y calculadora | 🔴 | M |
| Prueba con lector de pantalla (NVDA o VoiceOver) | 🟡 | M |
| Contraste AA en los 6 temas (los 4 premium son oscuros: revisar los acentos) | 🟡 | S |
| Tamaño táctil ≥44 px en móvil | 🟡 | S |
| `jsx-a11y` en `error` dentro de CI | ⚪ | XS |

**Ya correcto, verificado:** `lang` y `dir` **sí** se actualizan en runtime al
cambiar idioma (`i18n.js:75-76`) · `prefers-reduced-motion` respetado en las
animaciones de la landing · ningún `<img>` sin `alt`.

---

## 8. Plan de analítica

**Problema de fondo: hay herramientas (GA4, GTM, heatmap propio) pero no puedo
confirmar que se mida el embudo.** Sin eso, toda conversación sobre conversión es
opinión.

### Eventos mínimos a definir
| Evento | Parámetros | Para qué |
|---|---|---|
| `calculadora_usada` | `nombre`, `es_premium` | Qué herramientas justifican su mantenimiento |
| `modulo_educacion_abierto` | `slug`, `idioma` | Si la academia retiene o es decorado |
| `registro_iniciado` / `registro_completado` | `metodo` (google\|email) | Fricción real del alta |
| `checkout_iniciado` | `plan`, `metodo_pago` | Dónde se cae el pago |
| `pago_completado` | `plan`, `importe`, `metodo_pago` | Conversión final |
| `error_ui` | `componente`, `mensaje` | Hoy los `catch` silenciosos son invisibles |

### Acciones
| Acción | Prioridad | Esfuerzo |
|---|:--:|:--:|
| Definir e implementar los 6 eventos | 🔴 | M |
| Embudo en GA4: visita → calculadora → registro → checkout → pago | 🔴 | S |
| Verificar que el consentimiento se respeta (Consent Mode) | 🔴 | S |
| Cruzar el heatmap propio del admin con GA4 | 🟡 | S |
| Alertas de caída de conversión | ⚪ | S |
| Preparación UTM para las campañas de `CAPTAR_TRAFICO.md` | ⚪ | XS |

---

## 9. Quick wins en 24 horas

Todo esto es de bajo riesgo y alto retorno.

- [x] **Arreglar Fibonacci** — herramienta principal deja de estar caída ✅
- [x] **Linter vivo + en CI** — corta la causa raíz ✅
- [x] **11 tarjetas admin** — panel usable tras recargar ✅
- [x] **Buscador admin** — se acaban los 500 ✅
- [x] **axios seguro + −73 MB** ✅
- [x] **`py_compile *.py`** ✅
- [x] **Documentación reconciliada** — deja de mandar a configurar OxaPay ✅
- [ ] **Activar Dependabot + CodeQL + secret scanning** (T-05) — 10 minutos
- [ ] **Lanzar un Lighthouse** contra el sitio desplegado — 10 minutos, y desbloquea todo §6
- [ ] **Activar las reglas `jsx-a11y`** y mirar el número — 10 minutos, y desbloquea §7
- [ ] **`npx eslint src scripts --fix`** — quita 11 avisos y los `disable` obsoletos

## 10. Mejoras de 7 días

- [ ] **CSP en el HTML, verificado en navegador** (T-01) — el mayor hueco de seguridad abierto
- [ ] **Verificar Stripe en producción** — bloqueante de lanzamiento
- [ ] **Probar NOWPayments en sandbox** con API key real
- [ ] **`FRONTEND_URL` obligatoria en producción** (T-02)
- [ ] **Definir e implementar los 6 eventos de embudo** (§8)
- [ ] **Decidir el dominio propio** — la decisión, aunque la ejecución tarde más
- [ ] **Corregir lo que saque `jsx-a11y`** en formularios y CTAs
- [ ] **Mover los restos de Emergent a `_archive/`** (T-09)

## 11. Mejoras de 30 días

- [ ] **Ejecutar la migración de dominio completa** — los 7 pasos de §9.4, sin saltarse el 4
- [ ] **Tests del shim de BD** (T-03) — protege la pieza más casera
- [ ] **128 avisos → 0** y linter en `error` (T-04)
- [ ] **Cerrar C-08** (T-06) — secretos sólo en Secret Manager
- [ ] **Auditoría de accesibilidad de los 3 flujos que dan dinero** (U-03)
- [ ] **Distinguir vacío de error** en el panel admin (U-01)
- [ ] **Health check de configuración** en el admin — cierra el hueco de operación
- [ ] **Decidir el foco del producto** con el mapa de calor en la mano (U-02)
- [ ] **Unificar el router de admin** (T-10)

---

## 12. Ideas de producto priorizadas

| Idea | Encaje | Esfuerzo | Por qué merece la pena |
|---|:--:|:--:|---|
| **Alertas de estructura** (BOS/CHoCH/FVG, no sólo precio) | alto | M | Reutiliza `price_action.py` y el poller, ambos ya hechos. Función premium natural |
| **Health check de configuración** en el admin | alto | S | La mitad de los bloqueantes son de operación e invisibles. `webhook_health` ya existe |
| **Tests de paridad para planes y precios** | alto | S | El precio vive en Stripe, backend y copy. Ya hubo un incidente ("$9.99" vs 17 € real) |
| **El diario como argumento de portada** | alto | S | La función más diferencial, hoy escondida |

