/**
 * Cuándo ocurrió una operación, en la hora del trader.
 *
 * Sin esto, el diario sellaba cada operación con el instante en que se TECLEÓ,
 * en UTC y en el servidor. Dos consecuencias que se notan enseguida:
 *
 *  1. quien apunta por la noche las operaciones del día las tiene todas con la
 *     misma marca de tiempo, así que la agrupación por día, las rachas, la
 *     curva de capital y las reglas que miran ventanas temporales
 *     (sobreoperar, operación de venganza) leen una historia que no ocurrió;
 *  2. la analítica agrupa por los primeros 10 caracteres de la fecha ISO y por
 *     `weekday()`, o sea **por el día que exprese ese texto**. Con UTC, un
 *     trader en Tokio que opera el martes a las 8:00 (23:00 UTC del lunes) ve
 *     su operación contada en lunes, y «¿qué día opero mejor?» responde mal.
 *
 * La solución es que la fecha viaje CON su desfase (`2026-08-04T23:30:00+02:00`)
 * en vez de convertida a UTC. Así el backend no necesita saber nada de zonas:
 * `[:10]` y `weekday()` caen solos en el día del trader, y `_to_utc` sigue
 * normalizando para ordenar la curva de capital, que sí tiene que ser absoluta.
 */

/** Desfase local en formato ISO (`+02:00`, `-05:00`, `Z` si es UTC). */
export function offsetLocalISO(date = new Date()) {
  const min = -date.getTimezoneOffset();          // JS lo da invertido
  if (min === 0) return 'Z';
  const signo = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${signo}${hh}:${mm}`;
}

/**
 * `Date` → el valor que espera un `<input type="datetime-local">`.
 * No vale `toISOString()`: ese convierte a UTC y el campo mostraría otra hora.
 */
export function paraInput(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
    + `T${p(date.getHours())}:${p(date.getMinutes())}`;
}

/**
 * Lo que escribió el usuario (`2026-08-04T23:30`, sin zona) → ISO con desfase.
 *
 * El navegador entrega el valor sin zona a propósito: es hora de pared. Si se
 * mandara tal cual, el backend lo trataría como UTC (`_to_utc` asume UTC para
 * lo que llega sin zona) y la operación se movería de día en el sitio donde eso
 * importa. Añadir el desfase es lo que hace que signifique lo que el usuario vio.
 */
export function aISOConZona(valorInput) {
  if (!valorInput) return null;
  // Ya lleva zona (una operación importada, o un valor ya normalizado).
  if (/[Zz]$|[+-]\d{2}:\d{2}$/.test(valorInput)) return valorInput;
  const local = new Date(valorInput);
  if (Number.isNaN(local.getTime())) return null;
  const segundos = valorInput.length === 16 ? ':00' : '';
  return `${valorInput}${segundos}${offsetLocalISO(local)}`;
}

/** ISO almacenado → valor para repintar el `<input>`, en hora local. */
export function desdeISO(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : paraInput(d);
}

/** Nombre corto de la zona del navegador, para poder decir en qué hora se guarda. */
export function zonaLocal() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}
