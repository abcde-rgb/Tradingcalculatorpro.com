import React from 'react';

/**
 * El periodo del plan, junto al precio, con el espacio que le corresponda.
 *
 * Iban como dos <span> pegados sin separador, aquí y en la portada. Con «/mes»
 * la barra hace de separación y se lee bien; con el plan lifetime, cuyo periodo
 * es una FRASE («pago único», «Einmalzahlung», «1回限りの支払い»), salía
 * «€500pago único» en los diez idiomas — y en el plan más caro.
 *
 * La separación no puede depender de que quien traduce se acuerde de meter un
 * espacio dentro de la cadena: un espacio al principio de un valor del
 * diccionario es invisible en la revisión y se pierde en cuanto alguien
 * reescribe la traducción. Se decide aquí, mirando el texto.
 */
export function PlanPeriod({ texto, className = 'text-muted-foreground text-sm' }) {
  const pegadoAlPrecio = /^[/⁄]/.test(texto);   // «/mes», «/year», «⁄mes»
  return <span className={`${className}${pegadoAlPrecio ? '' : ' ml-1.5'}`}>{texto}</span>;
}

export default PlanPeriod;
