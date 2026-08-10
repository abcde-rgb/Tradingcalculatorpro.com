/**
 * Passkeys (WebAuthn) en el navegador.
 *
 * La API del navegador trabaja con `ArrayBuffer` y el servidor con base64url, así
 * que todo el trasiego de conversión vive aquí y no repartido por los
 * componentes: una conversión mal hecha en un solo sitio hace que la firma no
 * valide, y el error que llega («no se pudo verificar») no señala dónde está.
 */

const API = process.env.REACT_APP_BACKEND_URL;

const toBuf = (s) =>
  Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const fromBuf = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * ¿Puede este navegador usar passkeys?
 *
 * Se comprueba ANTES de pintar el botón. Ofrecer un acceso que el dispositivo no
 * soporta y que falla al pulsarlo es peor que no ofrecerlo: el usuario no sabe
 * si el problema es suyo, del sitio o de su cuenta.
 */
export function isPasskeySupported() {
  return typeof window !== 'undefined'
    && typeof window.PublicKeyCredential === 'function'
    && typeof navigator?.credentials?.create === 'function';
}

async function json(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

/** Da de alta una passkey en la cuenta ya iniciada. */
export async function registerPasskey(token, name = '') {
  const { options } = await json('POST', '/api/auth/passkey/register/begin', {}, token);
  const credential = await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: toBuf(options.challenge),
      user: { ...options.user, id: toBuf(options.user.id) },
      excludeCredentials: (options.excludeCredentials || []).map((c) => ({ ...c, id: toBuf(c.id) })),
    },
  });
  if (!credential) throw new Error('cancelled');
  return json('POST', '/api/auth/passkey/register/complete', {
    name,
    credential: {
      id: credential.id,
      rawId: fromBuf(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: fromBuf(credential.response.clientDataJSON),
        attestationObject: fromBuf(credential.response.attestationObject),
      },
      // El reto viaja de vuelta para que el servidor lo queme; es de un solo uso.
      challenge: options.challenge,
    },
  }, token);
}

/**
 * Entra con una passkey. Sin correo ni contraseña: el navegador enseña las
 * passkeys que tenga para este sitio y el usuario elige.
 */
export async function loginWithPasskey() {
  const { options } = await json('POST', '/api/auth/passkey/login/begin', {});
  const assertion = await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: toBuf(options.challenge),
      allowCredentials: (options.allowCredentials || []).map((c) => ({ ...c, id: toBuf(c.id) })),
    },
  });
  if (!assertion) throw new Error('cancelled');
  return json('POST', '/api/auth/passkey/login/complete', {
    credential: {
      id: assertion.id,
      rawId: fromBuf(assertion.rawId),
      type: assertion.type,
      response: {
        clientDataJSON: fromBuf(assertion.response.clientDataJSON),
        authenticatorData: fromBuf(assertion.response.authenticatorData),
        signature: fromBuf(assertion.response.signature),
        userHandle: assertion.response.userHandle ? fromBuf(assertion.response.userHandle) : null,
      },
      challenge: options.challenge,
    },
  });
}

export const listPasskeys = (token) => json('GET', '/api/auth/passkey/list', null, token);
export const deletePasskey = (token, id) => json('DELETE', `/api/auth/passkey/${id}`, null, token);

/** El usuario canceló el diálogo del sistema: no es un error que haya que gritar. */
export const isCancellation = (err) =>
  err?.name === 'NotAllowedError' || err?.name === 'AbortError' || err?.message === 'cancelled';
