/* eslint-disable */
/**
 * serp-ancho.js - cuanto ocupa un texto en un resultado de busqueda.
 *
 * POR QUE ES UN MODULO Y NO DOS COPIAS
 * ------------------------------------
 * Lo usan dos programas con intereses opuestos: `gen-seo-pages.js`, que DECIDE
 * cuanto texto emitir, y `auditar-visibilidad.js`, que MIDE si lo emitido cabe.
 * Con dos tablas separadas, el dia que una se toque el generador y el auditor
 * dejan de hablar del mismo milimetro y el informe empieza a mentir en la
 * direccion mas peligrosa: dando por bueno lo que no cabe. Con una sola tabla
 * eso no puede pasar por construccion.
 *
 * EL PRINCIPIO
 * ------------
 * El buscador NO corta por numero de caracteres, corta por ANCHO. «Illinois» e
 * «Wollongong» tienen casi las mismas letras y ocupan muy distinto, y un
 * ideograma ocupa el doble que una letra latina. Contar caracteres -que es lo
 * que hace media internet- da falsos negativos en aleman y falsos positivos en
 * los idiomas de palabras estrechas.
 */

// Avances de Helvetica (AFM de Adobe, unidades sobre 1000 em). Arial, que es
// la que renderiza Google, es metricamente compatible con Helvetica: ese es
// literalmente el motivo por el que Arial existe.
const AVANCE = {' ':278,'!':278,'"':355,'#':556,'$':556,'%':889,'&':667,"'":191,'(':333,')':333,'*':389,'+':584,',':278,'-':333,'.':278,'/':278,'0':556,'1':556,'2':556,'3':556,'4':556,'5':556,'6':556,'7':556,'8':556,'9':556,':':278,';':278,'<':584,'=':584,'>':584,'?':556,'@':1015,'A':667,'B':667,'C':722,'D':722,'E':667,'F':611,'G':778,'H':722,'I':278,'J':500,'K':667,'L':556,'M':833,'N':722,'O':778,'P':667,'Q':778,'R':722,'S':667,'T':611,'U':722,'V':667,'W':944,'X':667,'Y':667,'Z':611,'[':278,'\\':278,']':278,'^':469,'_':556,'`':333,'a':556,'b':556,'c':500,'d':556,'e':556,'f':278,'g':556,'h':556,'i':222,'j':222,'k':500,'l':222,'m':833,'n':556,'o':556,'p':556,'q':556,'r':333,'s':500,'t':278,'u':556,'v':500,'w':722,'x':500,'y':500,'z':500,'{':334,'|':260,'}':334,'~':584};

// Rangos de ancho COMPLETO segun UAX #11 (East Asian Width = W o F). Un
// caracter de estos ocupa 1000/1000 em exactos: no es una estimacion, es como
// esta disenada la tipografia.
function esAnchoCompleto(c) {
  return (c >= 0x1100 && c <= 0x115f)     // jamo hangul inicial
    || (c >= 0x2e80 && c <= 0xa4cf)       // radicales CJK, kana, ideogramas, bopomofo
    || (c >= 0xac00 && c <= 0xd7a3)       // silabas hangul
    || (c >= 0xf900 && c <= 0xfaff)       // ideogramas de compatibilidad
    || (c >= 0xfe30 && c <= 0xfe6f)       // formas CJK
    || (c >= 0xff00 && c <= 0xff60)       // latino de ancho completo
    || (c >= 0xffe0 && c <= 0xffe6);      // signos de ancho completo
}

/**
 * Ancho en unidades de 1000 em. Devuelve tambien si hubo que aproximar, para
 * que quien lo use pueda decirlo en vez de fingir precision.
 *
 * Fuera del latino y del CJK la tabla de Helvetica no dice nada:
 *   - Cirilico: las minusculas rusas rondan el ancho de las latinas (~560).
 *   - Arabe: escritura conectada, el avance depende de la forma contextual
 *     (inicial / media / final / aislada). 500 es una media honesta.
 * Las dos van marcadas como aproximacion. El CJK NO: ahi el 1000 es exacto.
 */
function anchoMil(texto) {
  let u = 0;
  let aprox = false;
  for (const ch of String(texto == null ? '' : texto)) {
    const c = ch.codePointAt(0);
    if (AVANCE[ch] !== undefined) { u += AVANCE[ch]; continue; }
    if (esAnchoCompleto(c)) { u += 1000; continue; }
    if (c >= 0x0400 && c <= 0x04ff) { u += 560; aprox = true; continue; }  // cirilico
    if (c >= 0x0600 && c <= 0x06ff) { u += 500; aprox = true; continue; }  // arabe
    u += 556; aprox = true;                                               // acentos y demas
  }
  return { u, aprox };
}

/** Ancho en em (1 em = el tamano de fuente). */
const anchoEm = (texto) => anchoMil(texto).u / 1000;

/** Ancho en pixeles a un tamano de fuente dado. */
const anchoPx = (texto, tamano) => anchoMil(texto).u * tamano / 1000;

// Los dos unicos numeros de presentacion del SERP, en un solo sitio.
//
// TITULO: 20 px sobre un contenedor de ~600 px en escritorio.
//
// DESCRIPCION: se DERIVA, no se copia de una guia. Por internet circulan a la
// vez «920 px» y «155-160 caracteres» como si fueran la misma cifra, y no lo
// son: a 14 px, 155 caracteres latinos ocupan ~1.085 px. Dos numeros
// incompatibles citados juntos significa que al menos uno esta desactualizado,
// asi que aqui se calcula: el mismo contenedor de 600 px que el titulo, por
// las dos lineas que Google pinta en escritorio. Salen 1.200 px, que ya SI es
// coherente con los ~160 caracteres de la guia. El movil pinta tres lineas
// pero mas estrechas; escritorio sigue siendo el caso restrictivo.
const PX_FUENTE_TITULO = 20;
const PX_FUENTE_DESC = 14;
const CORTE_TITULO = 600;
const CORTE_DESC = CORTE_TITULO * 2;

module.exports = {
  AVANCE, esAnchoCompleto, anchoMil, anchoEm, anchoPx,
  PX_FUENTE_TITULO, PX_FUENTE_DESC, CORTE_TITULO, CORTE_DESC,
};
