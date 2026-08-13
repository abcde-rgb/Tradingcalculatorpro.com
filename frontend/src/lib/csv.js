/**
 * Minimal CSV toolkit for the Trade Journal import/export flow.
 *
 * Not a general-purpose parser — handles what brokers/spreadsheet exports
 * typically produce: comma or semicolon delimiters, optional quoted values,
 * escaped double-quotes ("" inside a quoted cell).
 */

/** Parse CSV text into an array of objects keyed by header row. */
export function parseCsv(text, { delimiter } = {}) {
  if (!text) return [];
  // Detect delimiter from the first line if not provided
  const firstLine = text.split(/\r?\n/)[0] || '';
  const sep = delimiter || (firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',');

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
      // Skip \n following \r
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

/** Serialize an array of plain objects to CSV. Columns are inferred from the first row. */
export function toCsv(rows, { columns } = {}) {
  if (!rows || !rows.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    // Neutraliza la inyección de fórmulas: una celda que empieza por = + - @,
    // tabulador o retorno de carro la evalúa Excel/LibreOffice al abrir el CSV.
    // El apóstrofo la convierte en texto literal. Va ANTES del entrecomillado,
    // porque entrecomillar no desactiva la fórmula.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}

/** Kick off a browser download of a string as a file. */
export function downloadFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
