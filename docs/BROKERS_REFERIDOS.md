# Enlaces de referido a brókers — expediente de los seis

> Preparado el 2026-08-22 a partir de: Axi, VT Markets, Saxo, Interactive Brokers,
> Swissquote y Dukascopy.
>
> **Nada de lo que dice de terceros se da por bueno sin fuente**, y donde no he
> podido llegar a la fuente lo digo en vez de rellenarlo. Buena parte de los
> dominios de los propios brókers y de la CNMV **están bloqueados por el proxy de
> salida de este entorno**, así que hay datos que salen de buscador y no de la
> página oficial. Van marcados.

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

## Lo que ya está montado

`backend/brokers_referidos.py` — los seis, con lo confirmado y lo pendiente
marcado como pendiente (no como valor optimista). Un bróker sólo es publicable si
tiene **las cuatro cosas a la vez**: autorización en la UE, porcentaje **dentro de
la ventana trimestral**, enlace configurado y —si ofrece CFDs— su advertencia con
cifra.

**El porcentaje caduca a los 100 días.** Es la pieza que casi nadie implementa:
ESMA obliga al bróker a recalcularlo cada trimestre, así que una cifra fija en el
código es falsa a los pocos meses. Pasada la ventana, el bróker deja de mostrarse
en vez de enseñar el dato viejo — el mismo criterio que `stale` en los precios.

Los enlaces van en el entorno (`BROKER_REF_AXI`, `BROKER_REF_DUKASCOPY`…), nunca
en el repositorio: un enlace de referido no es un secreto, pero es específico de
la cuenta de afiliado, y uno incrustado acaba apuntando a la cuenta de otro el día
que alguien copie el fichero. Hay una prueba que lo impide.

```bash
python backend/brokers_referidos.py     # qué falta para poder publicar cada uno
```

Hoy: **0 de 6 publicables**, que es lo correcto — no hay ni un enlace todavía.

## Lo que falta por hacer

1. **Decidir sobre VT Markets** (recomendación: fuera) y sobre Saxo (¿queremos
   estar en intermediación regulada?).
2. Solicitar el alta en Axi (entidad CySEC) y Dukascopy Europe.
3. Verificar las condiciones de IBKR y Swissquote **desde una red sin el proxy de
   este entorno**.
4. Rellenar en el registro lo que falta, con la fecha de lectura del porcentaje.
5. **La pantalla, que aún no existe.** Cuando la haya: la advertencia tan visible
   como el enlace, la relación de afiliación declarada de forma clara —la
   Directiva Omnibus lo exige para el contenido comercial— y `rel="sponsored"` en
   los enlaces salientes.
