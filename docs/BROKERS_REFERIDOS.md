# Enlaces de referido a brókers — expediente de los seis

> Preparado el 2026-08-22 a partir de: Axi, VT Markets, Saxo, Interactive Brokers,
> Swissquote y Dukascopy.
>
> **Nada de lo que dice de terceros se da por bueno sin fuente**, y donde no he
> podido llegar a la fuente lo digo en vez de rellenarlo. Buena parte de los
> dominios de los propios brókers y de la CNMV **están bloqueados por el proxy de
> salida de este entorno**, así que hay datos que salen de buscador y no de la
> página oficial. Van marcados.

## Reanálisis del 2026-08-23: el público es INTERNACIONAL

El expediente entero se escribió contestando **una pregunta europea**: cada campo
del registro se llamaba `*_ue`, el listón era `cumple_ue` y la advertencia era la
literal de ESMA. Revisado con el marco real —**sola promoción, público
internacional**— ese modelo se equivoca en las dos direcciones.

**Es demasiado estricto.** VT Markets no tiene autorización en la UE, y bajo ASIC
(Australia), FSCA (Sudáfrica) o FSC (Mauricio) es un bróker supervisado.
Descartarlo para un lector australiano por una regla europea no protege a nadie.
El listón de la UE se conserva —es el más exigente que conocemos y sirve de vara—
pero pasa a llamarse por su nombre: **el listón de una jurisdicción**, no *el*
listón. Se publica como `cumpleUe` y no decide qué se muestra.

**Y es demasiado laxo, que es lo grave.** Una marca no tiene «una» entidad ni «un»
porcentaje de pérdidas: tiene **uno por región**. La tarjeta decía:

> El 67,24 % de las cuentas de CFD minoristas pierden dinero **con este proveedor**.

Esa cifra es de **Solaris EMEA Ltd, bajo CySEC**. A un lector de Chile, México o
Singapur —que abriría cuenta con otra entidad, con otra cifra— le está
atribuyendo a su futuro bróker una estadística que no es la de su futuro bróker.
Swissquote publica **55,05 % en la UE y 78,23 % en Reino Unido**: la misma marca,
dos números, ninguno de los dos «el suyo». Es la misma familia que BUG-059 y
BUG-063 — un número presentado como más general de lo que es.

### La regla que sale de ahí

**Cada dato va etiquetado con la jurisdicción y la entidad a la que pertenece.**
No se traduce un régimen a otro ni se generaliza el de nadie.

| Antes | Ahora |
|---|---|
| «…pierden dinero con **este proveedor**» | «…pierden dinero con **Solaris EMEA Ltd (CySEC, UE)**», y la advertencia larga añade que la entidad y su porcentaje **dependen de tu país de residencia** |
| «Solaris EMEA Ltd · CySEC · 433/23» | lo mismo **+ «entidad para la Unión Europea»**, traducido a los 10 idiomas por código (`jurisdUe`, `jurisdSvg`), no por texto del servidor |
| a quién no admite, enterrado en una nota interna | **`noAdmiteResidentes`, en la tarjeta y antes del botón** |
| el porcentaje exigía cifra + fuente | exige cifra + fuente + **de qué entidad es** (`perdida_pct_entidad`) |

### Lo que «recomendación» arrastra, y que no es neutro

La sección se titula «Herramientas que recomendamos». Recomendar una
**plataforma** no es asesoramiento en inversión —eso sería recomendar un
instrumento— pero sí es una afirmación nuestra, y el contrato de Axi lo deja por
escrito: el Partner debe confirmar al cliente que **«any advice provided by the
Partner is provided by the Partner independently, without the consultation,
knowledge or approval of Axi»**, y que Axi «acts as principal, provides an
execution-only service and does not provide any personal financial advice».

Traducido: **el bróker no respalda nuestra recomendación y no hay ningún tercero
detrás de ella.** De ahí que lo que se publique de cada uno sea comprobable
—entidad, supervisor, número de licencia, porcentaje con su origen y a quién no
acepta— y que no haya comparativas ni «el mejor».

### Lo que sigue sin poder verificarse

Un modelo internacional honesto necesitaría **la lista de entidades por región de
cada bróker**, y hoy no se puede leer: el proxy de este entorno responde 403 a los
seis dominios y a sus alternativos. Lo que hay son dos entidades europeas sin
confirmar en la fuente y una offshore **sí confirmada** (AxiTrader LLC, del PDF
oficial). El resto va como `None`, que es lo que es.

⚠️ **Deuda conocida, no arreglada aquí:** los nombres de entidad los sirve el
backend en castellano —«Solaris EMEA Ltd (HE376148, **Chipre**)»— y no se
traducen, así que en inglés la ficha mezcla idiomas. La jurisdicción sí se ha
resuelto por código; los nombres de entidad son un cambio mayor y quedan
apuntados.

## Lo primero, porque cambia el resto

Un enlace de referido a un bróker de CFDs dirigido a minoristas de la UE **no es
un banner: es una promoción financiera**. Lo que eso arrastra ya estaba escrito en
[`COMPETENCIA_Y_PASARELA_BROKERS.md`](./COMPETENCIA_Y_PASARELA_BROKERS.md) §4 y §7:

- **MiFID II art. 24** — imparcial, clara y no engañosa.
- **Intervención de producto de ESMA** — toda promoción de CFDs lleva la
  advertencia normalizada **con el porcentaje real de cuentas minoristas que
  pierden dinero de ese bróker**, que el bróker recalcula **cada trimestre** sobre
  los 12 meses anteriores. Prohibidos bonos e incentivos. La advertencia tiene que
  ser tan visible como la promoción, no una nota al pie.
- **El contenido del afiliado es responsabilidad del bróker.** Uno serio nos
  auditará los textos. Uno que no lo haga es la señal de alarma, no una ventaja.
- Promocionar ante minoristas de la UE una entidad **sin autorización en la UE** es
  el terreno donde la CNMV publica advertencias.

Por eso la parte de código que acompaña a este documento
(`backend/brokers_referidos.py`) no guarda enlaces: guarda **las condiciones bajo
las que un enlace puede publicarse**. Sin entidad legal, regulador, licencia,
porcentaje fresco y enlace configurado, `puede_mostrarse()` dice que no, y no hay
parámetro para saltárselo.

> ⚠️ **`puede_mostrarse()` ya no es lo que decide qué sale a pantalla.** El
> 2026-08-22 el propietario decidió publicar los seis bajo régimen suizo de sola
> promoción — ver [§ Decisión del 2026-08-22](#decisión-del-2026-08-22-se-publican-los-seis).
> El listón sigue calculándose y sigue publicándose por la API (`cumpleUe`), pero
> hoy **ninguno de los seis lo pasa**. Lo que ese listón describe es el requisito
> de la UE, y sigue aquí escrito porque el día que el público objetivo sea la UE
> vuelve a ser la puerta.

## Los seis, de más a menos viable

### ✅ Axi — el más directo

| | |
|---|---|
| Entidad para la UE | **Solaris EMEA Ltd** (HE376148, Chipre) |
| Regulador | CySEC **433/23** |
| Apalancamiento minorista | 30:1, con protección de saldo negativo |
| % de pérdidas | **67,24 %** *(de buscador, no de su web; confirmar y anotar la fecha)* |
| Programa | Afiliados **y** *introducing broker*, con páginas **distintas por región** |

**Lo que hay que exigir antes de firmar:** que el contrato sea con la entidad
**CySEC** y no con la australiana. Es el error clásico: te dan de alta en el
programa internacional, tú mandas tráfico español, y el cliente acaba contratando
con una entidad que no puede atenderlo.

### ✅ Dukascopy Europe — viable, y con las condiciones más claras

| | |
|---|---|
| Entidad para la UE | **Dukascopy Europe IBS AS** (Letonia) |
| Regulador | **Latvijas Banka** (asumió la supervisión de la antigua FCMC) |
| Licencia | ⚠️ **falta el número** — pedirlo |
| % de pérdidas | **68,82 %** *(de buscador; confirmar y fechar)* |
| Protección | Ley letona de protección al inversor + Directiva 97/9/CE: 90 % hasta 20.000 € |
| Programa | *Business Introducer*, aprobación en ~7 días, hasta el 50 % de sus comisiones |

De sus propias condiciones, dos cosas que conviene leer como lo que son:

- «Dukascopy Europe **se reserva el derecho de solicitar y revisar en cualquier
  momento todos los programas de marketing** destinados a promocionarla y de
  exigir cambios a su entera discreción.» Eso **es lo correcto** —es el bróker
  asumiendo su responsabilidad sobre el contenido del afiliado— y significa que
  cada texto nuestro pasa por ellos.
- Prohibido usar dominios que contengan «dukascopy» o variantes.
- Las condiciones **no constituyen un contrato de agencia**: el introductor actúa
  en su propio nombre y por su cuenta.

### 🟡 Swissquote — probablemente viable, sin verificar

Banco suizo (FINMA) con entidad europea aparte, que **no he podido confirmar**:
`swissquote.com` está bloqueado por el proxy de este entorno.

⚠️ **Las cifras de comisión que circulan (1.000 $ por FTD, 8 $/lote, 40 % de
reparto) salen de webs que viven de afiliados, no de Swissquote.** No son
condiciones contractuales; son marketing de intermediarios. No las metas en una
hoja de cálculo como si fueran un dato.

### ⚠️ Saxo — su programa no es lo que estás pidiendo

Saxo no ofrece un enlace de afiliado de web: ofrece ***introducing broker*
institucional**, dirigido a «intermediarios financieros, bancos, brókers y otros
proveedores fintech», con reporting **MiFID II y EMIR** de las operaciones de los
clientes introducidos.

Eso no es marketing con un enlace: es **intermediación regulada**. Antes de
pedirlo hay que decidir si se quiere estar en ese negocio, que es la pregunta del
§4 del otro documento y tiene coste, no sólo papeleo.

### ⚠️ Interactive Brokers — su programa de referidos **excluye España**

El «Refer a Friend» de IBKR:

- **no admite a residentes en España**, ni en Japón, Dinamarca, Portugal, Polonia,
  China continental o Israel;
- exige ser **cliente** con al menos 2.000 $ en activos e histórico de operativa;
- paga 200 $ por cliente que mantenga 10.000 $ durante un año, con tope de 15
  referidos al año y 30 en total.

Es decir: **la vía de referidos de IBKR no sirve para un sitio español.** Existe
además un programa de afiliados distinto, del que **no he podido leer las
condiciones**: `interactivebrokers.com` está bloqueado por el proxy de este
entorno. Verificar antes de contar con él.

### 🔴 VT Markets — no enlazar a minoristas de la UE

- Su **propia entidad chipriota** (VTMarkets Ltd, Limassol) declara que **no ofrece
  productos financieros regulados ni servicios de negociación**. Es una sociedad
  de apoyo, no una empresa de inversión autorizada.
- Opera bajo **ASIC** (Australia), **FSCA** (Sudáfrica) y **FSC** (Mauricio).
- Prensa sectorial informa de que **CySEC lo incluyó en su lista negra** por prestar
  servicios sin autorización, y hay páginas que citan una advertencia del regulador
  español. **Ninguna de las dos he podido verificarla en la fuente**: cnmv.es y
  cysec.gov.cy están bloqueados aquí. Trátalas como pendientes de confirmar, no
  como hechos.

Aun descartando lo no verificado, **lo que sí está confirmado basta**: sin
autorización en la UE, enlazarlo desde un sitio español dirigido a minoristas es
exactamente el supuesto que el §4 del otro documento describe.

## 🔴 El programa de Axi NO contrata con la entidad europea

Leído del **PDF oficial** (`axidocs.s3.ap-southeast-2.amazonaws.com`, el único
dominio de los brókers que el proxy de este entorno sí deja pasar), *Axi Partner
Agreement*, efectivo **2025-12-18**:

> «This Partner Agreement sets out the terms and conditions between the Partner
> and **AxiTrader LLC, a Limited Liability Company incorporated under the laws
> of Saint Vincent and the Grenadines**.»
>
> «*Client Agreement*: means the agreement between a Client and **Axi**.»
>
> «This Agreement is governed by and construed in accordance with the laws of
> Saint Vincent and the Grenadines.»

Y «Axi», en todo el documento, es esa entidad. Es decir: **el programa que se
anuncia públicamente manda al cliente referido a la sociedad offshore, no a
Solaris EMEA Ltd (CySEC 433/23)**, que es la ficha que enseña nuestra tarjeta.
El aviso que llevaba el registro —«confirmar que el contrato es con la entidad
CySEC y no con la australiana»— se queda corto: no es australiana, es de SVG, y
SVG no supervisa forex ni CFD.

Hoy **no hay problema**, porque sin enlace de referido la tarjeta lleva a la web
pública y allí enruta el propio bróker por geografía. El problema aparecía a un
`BROKER_REF_AXI` de distancia, así que se ha cerrado en el código:

- `contrato_del_cliente()` devuelve la ficha **de donde lleva nuestro enlace**.
  Con enlace de referido y programa conocido, la entidad del programa — y sin
  regulador ni licencia, porque los de la entidad europea no la amparan.
- `enlace_con_destino_conocido()` **impide publicar** un enlace de referido cuyo
  destino no se ha leído. Saxo, IBKR, Swissquote y VT Markets están en ese caso:
  el día que se configure su enlace sin haber leído con quién contrata su
  programa, desaparecen de la lista en vez de salir con una ficha que quizá no
  les corresponde.

Cinco tests lo fijan, los dos que importan comprobados con sabotaje.

## De dónde se sacan los logos y los materiales (fuentes oficiales)

Facilitadas por el propietario. **Ninguna es accesible desde este entorno** —el
proxy responde 403 a todas menos al bucket S3 de Axi—, así que hay que abrirlas
desde una red normal.

| Bróker | Vía | Enlace |
|---|---|---|
| VT Markets | Portal de afiliados / IB | `vtaffiliates.com/marketing-materials/` · `vtmarkets.com/introducing-brokers/` |
| Axi | Partner Portal (tras aprobación) | `axi.com/int/partnerships/affiliate-program` |
| Saxo | **Media Center público** | `home.saxo/en-ch/about-us/media-center` → «Saxo logo package» (AI, EPS, SVG, PNG, CMYK/Pantone) |
| Saxo | Programa de afiliados / comercial | `home.saxo/campaigns/affiliate` · `mediadeals@saxobank.com` |
| IBKR | Influencer / CPC Publisher / White Branding | `interactivebrokers.com/en/general/about/affiliate-programs.php` · `publishers@interactivebrokers.com` |

**Saxo es el único con paquete de logo descargable sin cuenta**; los demás lo
sirven dentro del portal de partners una vez aprobado el alta.

⚠️ **No se descargan logos de Freepik, Seeklogo, Brandfetch ni similares.** Sirven
como referencia visual pero no dan permiso para promocionar al bróker. Se usan
los ficheros que entrega el propio bróker, o se pide autorización por escrito.

### Lo que eso obliga en NUESTRA tarjeta

Tanto Axi como VT Markets exigen que el material promocional sea suyo o esté
aprobado:

> Axi, cláusula de deberes del Partner: «*submit all marketing or promotional
> material to Axi for approval before use and refrain from altering approved
> materials*».

Nuestra tarjeta lleva **descripción propia y ficha de marca propia**. Eso es
material promocional propio, así que en cuanto se firme cualquiera de los dos
programas hay que **someterles el texto y la tarjeta**. No es un trámite
opcional: es la cláusula que convierte al bróker en responsable del contenido
del afiliado, que es justamente la señal de que el bróker es serio.

## Lo que hay que pedirle a cada uno, por escrito

Vale para los cinco que sigan en pie:

1. **Con qué entidad se firma** y cuál contrata al cliente final que le mandamos.
2. **Número de licencia y registro público** donde comprobarlo.
3. **El porcentaje de pérdidas vigente y con qué periodicidad lo publican**, y
   dónde leerlo sin preguntar.
4. **Quién aprueba los textos** y en cuánto tiempo. Si contestan «lo que quieras»,
   mala señal: significa que la responsabilidad recaerá entera sobre nosotros.
5. **Segmentación por territorio**: qué países acepta el programa y qué pasa si
   llega un usuario de un país no admitido.
6. **Qué se puede y qué no se puede decir** — comparativas, rentabilidades,
   «mejores condiciones», bonos.
7. **Cookie / atribución**: duración, y qué pasa si el usuario vuelve por otro canal.
8. **Cómo y cuándo se cancela**, y qué ocurre con las comisiones pendientes.

## Decisión del 2026-08-22: se publican los seis

El propietario opera bajo **regulación suiza en régimen de sola promoción** y se
dirige a **público internacional**, y decide publicarlos ya, con la web pública
de cada uno mientras no haya enlace de referido — el mismo patrón que ya seguía
Hyperliquid.

Lo que eso cambia y lo que **no**:

- `publicables()` devuelve ahora los seis. Antes devolvía los que pasaban el
  listón de la UE, que hoy son cero.
- **El listón sigue existiendo entero.** `puede_mostrarse()` no se ha tocado y
  cada bróker publica `cumpleUe` en la API. Borrar el dato en vez de decidir
  sobre él es lo que no se puede hacer: si algún día el público objetivo pasa a
  ser explícitamente la UE, está ahí para volver a aplicarlo.
- **Todos llevan aviso de riesgo.** Con cifra donde la hay —en la forma
  abreviada que la propia ESMA admite donde hay límite de espacio— y sin número
  donde no la hay.
- **Ninguna cifra se publica sin fuente.** Los porcentajes de un mismo bróker
  varían por jurisdicción (Swissquote: 55,05 % en la UE, 78,23 % en Reino
  Unido), así que elegir uno «que suene bien» sería inventarse una estadística
  sobre pérdidas ajenas. `perdida_pct_fuente` es obligatorio para que la cifra
  salga a pantalla, y los dos que hay están marcados como **pendientes de
  confirmar en la web del bróker**.
- Sólo se etiqueta «enlace de afiliado» el que de verdad paga. Los demás salen
  como «enlace directo».

## Lo que ya está montado

Cuatro piezas, de dentro afuera:

| Pieza | Qué hace |
|---|---|
| `backend/brokers_referidos.py` | El registro: los seis, con lo confirmado y lo pendiente marcado **como pendiente**, no como valor optimista. Y las condiciones — `autorizado_ue`, `esta_al_dia()`, `puede_mostrarse()`, `advertencia()`, `advertencia_corta()`. |
| `GET /api/brokers` (`server.py`) | Sirve los publicables con `entidad`, `regulador`, `licencia`, `url`, `esReferido`, `cumpleUe` y las dos formas del aviso. La cifra **sale del servidor con su fecha detrás**, nunca de una constante del frontend: caduca. |
| `components/common/RecommendedTools.jsx` | La marquesina de socios de la portada. Los ocho —Margex, Hyperliquid y los seis— en bucle continuo de derecha a izquierda, con descripción, ficha legal, aviso abreviado y «leer más». |
| `pages/BrokersPage.jsx` (`/brokers`) | La ficha completa: declaración de afiliación arriba del todo, advertencia normalizada entera y `rel="sponsored noopener noreferrer"`. Enlazada desde el pie. `noindex`. |

**El porcentaje caduca a los 100 días.** Es la pieza que casi nadie implementa:
ESMA obliga al bróker a recalcularlo cada trimestre, así que una cifra fija en el
código es falsa a los pocos meses. Pasada la ventana, `esta_al_dia()` devuelve
`False` y el bróker deja de pasar el listón europeo en vez de enseñar el dato
viejo — el mismo criterio que `stale` en los precios.

**Ninguna cifra se publica sin fuente.** `perdida_pct_fuente` es obligatorio para
que el número salga a pantalla. No prueba que la cifra sea correcta —ningún test
puede—, pero obliga a que inventarse una exija inventarse también su procedencia.
Se puso después de comprobar que la prueba anterior **no lo cazaba**: se le metió
un 55,05 % fabricado a Swissquote y la suite siguió en verde, porque comprobaba
que el número apareciera, no que fuera defendible.

Los enlaces van en el entorno (`BROKER_REF_AXI`, `BROKER_REF_DUKASCOPY`…), nunca
en el repositorio: un enlace de referido no es un secreto, pero es específico de
la cuenta de afiliado, y uno incrustado acaba apuntando a la cuenta de otro el día
que alguien copie el fichero. Hay una prueba que lo impide.

```bash
python backend/brokers_referidos.py            # qué le falta a cada uno
pytest backend/tests/test_brokers_referidos_unit.py -q   # 27 comprobaciones
node tests/e2e/navegador/brokers.js            # 22, en un navegador de verdad
```

Hoy: **6 de 6 publicados** y **0 con enlace de referido configurado** — todos
llevan a la web pública del bróker, que es lo que hay hasta que se firme el
primer programa. Lo que falta para que cada uno pase el listón europeo lo dice el
primero de esos tres comandos, y a día de hoy es: **0 de 6**.

## Lo que falta por hacer

1. **Decidir sobre VT Markets** (recomendación: fuera) y sobre Saxo (¿queremos
   estar en intermediación regulada?).
2. Solicitar el alta en Axi (entidad CySEC) y Dukascopy Europe.
3. Verificar las condiciones de IBKR y Swissquote **desde una red sin el proxy de
   este entorno**.
4. Rellenar en el registro lo que falta, con la fecha de lectura del porcentaje.
5. **Los logos oficiales.** Los sirven los propios brókers en su media kit de
   afiliados, y **desde este entorno no se pueden descargar**: el proxy de
   salida responde 403 a los seis dominios. Dibujar una imitación de un logo
   registrado es peor que no ponerlo —se parecería lo justo para confundir y no
   sería el suyo—, así que la tarjeta pinta una **ficha de marca propia**:
   monograma, nombre y supervisor, con un tono estable derivado del `id` que
   **no es el color corporativo del bróker** y no pretende serlo. En cuanto
   haya fichero en `frontend/src/assets/partners/<id>-square.png|svg`, se añade
   su `import` al mapa `LOGOS` de `RecommendedTools.jsx` —dos líneas— y la
   tarjeta lo usa sola.
6. **Los porcentajes, confirmados en la web del bróker y fechados.** Los dos que
   hay salen de buscador y están marcados como pendientes en el propio registro.
   Desde este entorno no se puede: `axi.com` y `dukascopy.com` están bloqueados
   por el proxy de salida.
7. **La tarjeta de Margex.** No es de este lote, pero está en la misma fila y
   anuncia «sin KYC, bono de bienvenida de 100 $ y cashback hasta 10.000 $» **sin
   aviso de riesgo ninguno**. Los bonos e incentivos son justamente lo que la
   intervención de producto de ESMA prohíbe promocionar a minoristas de la UE. Si
   el criterio es el suizo de sola promoción, la decisión es del propietario —
   pero conviene tomarla a la vista, no por omisión.

La pantalla ya está: `/brokers` con la advertencia tan visible como el enlace, la
relación de afiliación declarada arriba del todo —la Directiva Omnibus lo exige
para el contenido comercial— y `rel="sponsored"` en los enlaces salientes. Las
tres cosas están comprobadas en un navegador real, no sólo escritas.
