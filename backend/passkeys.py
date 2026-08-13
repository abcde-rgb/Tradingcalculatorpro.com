"""Passkeys (WebAuthn / FIDO2) — alta y acceso sin contraseña.

Por qué existe
--------------
Una contraseña se puede robar por phishing, por reutilización o por filtración de
otro sitio. Una passkey no: la clave privada no sale nunca del dispositivo y el
navegador **sólo** la ofrece al origen exacto que la registró, así que una página
clonada en otro dominio no puede pedirla aunque el usuario caiga. Es el único
método de esta app que resiste el phishing.

Diseño
------
El módulo es **puro**: no importa `server.py`, no toca la base de datos y no
conoce FastAPI. Recibe y devuelve diccionarios; quien persiste es `server.py`.
Así se puede probar entero sin levantar la aplicación, que es como está probado.

Tres cosas que NO se pueden relajar
-----------------------------------
1. **El reto es de un solo uso y caduca.** Si se pudiera reutilizar, capturar una
   respuesta válida bastaría para repetir el acceso indefinidamente (replay).
   `server.py` lo borra al consumirlo; aquí se fija el TTL.
2. **El `sign_count` sólo puede subir.** Un autenticador real lo incrementa en
   cada uso; si llega uno menor o igual al guardado, o la respuesta es un replay
   o el dispositivo está clonado. Se rechaza.
3. **El origen y el RP ID son los del FRONTEND, no los del backend.** La web va
   en GitHub Pages y la API en Cloud Run: son orígenes distintos. WebAuthn ata la
   credencial al origen que la creó, así que el que hay que esperar es el de la
   página. Configurarlo con el de la API haría que ninguna passkey validara.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

# El reto vive lo justo para completar la ceremonia. Cinco minutos es holgado
# para escribir un PIN o poner el dedo, y corto para que una captura sirva.
CHALLENGE_TTL_SECONDS = 300

RP_NAME = "Trading Calculator PRO"


def _default_origin() -> str:
    """Origen del FRONTEND. Configurable porque el día del cutover de dominio
    cambia, y una passkey registrada contra el origen viejo deja de validar."""
    return os.environ.get(
        "PASSKEY_ORIGIN",
        os.environ.get("FRONTEND_URL", "https://abcde-rgb.github.io"),
    ).rstrip("/")


def relying_party() -> Dict[str, str]:
    """`rp_id` es el dominio registrable del frontend; `origin` la URL completa.

    El `rp_id` NO lleva esquema ni ruta: para `https://abcde-rgb.github.io/x` es
    `abcde-rgb.github.io`. Ponerle la ruta o el esquema hace que el navegador
    rechace la ceremonia con un `SecurityError` poco explicativo.
    """
    origin = _default_origin()
    rp_id = os.environ.get("PASSKEY_RP_ID", "").strip()
    if not rp_id:
        without_scheme = origin.split("://", 1)[-1]
        rp_id = without_scheme.split("/", 1)[0].split(":", 1)[0]
    return {"rp_id": rp_id, "origin": origin}


def is_configured() -> bool:
    """Las passkeys no necesitan credenciales de terceros: basta con saber el
    origen. Se publica igual que los demás canales para que la interfaz pueda
    decir por qué no está disponible en vez de fallar en silencio."""
    return bool(relying_party()["rp_id"])


def challenge_expiry(now: Optional[datetime] = None) -> str:
    now = now or datetime.now(timezone.utc)
    return (now + timedelta(seconds=CHALLENGE_TTL_SECONDS)).isoformat()


def challenge_is_valid(stored: Optional[dict], now: Optional[datetime] = None) -> bool:
    """Un reto ausente, caducado o ya usado no vale. Se comprueba aquí para que
    las tres condiciones vivan juntas y no se olvide ninguna en la ruta."""
    if not stored or stored.get("used"):
        return False
    expires = stored.get("expires_at")
    if not expires:
        return False
    try:
        exp = datetime.fromisoformat(str(expires))
    except ValueError:
        return False
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return exp > (now or datetime.now(timezone.utc))


# ── Alta de una passkey ───────────────────────────────────────────────────────

def registration_options(
    *, user_id: str, user_name: str, display_name: str = "",
    existing_credential_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Opciones para crear una passkey. Devuelve `(options_json, challenge_b64)`.

    `exclude_credentials` evita que el mismo dispositivo registre dos veces la
    misma cuenta: sin él, el usuario acaba con passkeys duplicadas que no sabe
    distinguir al borrarlas.
    """
    rp = relying_party()
    exclude = [
        PublicKeyCredentialDescriptor(id=base64url_to_bytes(cid))
        for cid in (existing_credential_ids or [])
    ]
    options = generate_registration_options(
        rp_id=rp["rp_id"],
        rp_name=RP_NAME,
        user_id=user_id.encode("utf-8"),
        user_name=user_name,
        user_display_name=display_name or user_name,
        exclude_credentials=exclude,
        authenticator_selection=AuthenticatorSelectionCriteria(
            # `preferred` y no `required`: exigir clave residente deja fuera a
            # llaves de seguridad antiguas sin espacio, y el usuario sólo ve un
            # error del navegador que no explica nada.
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
    )
    return {
        "options": options_to_json(options),
        "challenge": bytes_to_base64url(options.challenge),
    }


def verify_registration(*, credential: Any, expected_challenge: str) -> Dict[str, Any]:
    """Valida la respuesta del navegador y devuelve lo que hay que guardar.

    Lanza si la firma, el origen o el reto no cuadran — el error se traduce a un
    400 en la ruta; nunca se guarda una credencial a medio verificar.
    """
    rp = relying_party()
    verified = verify_registration_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(expected_challenge),
        expected_rp_id=rp["rp_id"],
        expected_origin=rp["origin"],
    )
    return {
        "credential_id": bytes_to_base64url(verified.credential_id),
        "public_key": bytes_to_base64url(verified.credential_public_key),
        "sign_count": verified.sign_count,
        "transports": [],
    }


# ── Acceso con una passkey ────────────────────────────────────────────────────

def authentication_options(
    *, allow_credential_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Opciones para usar una passkey.

    Sin `allow_credential_ids` la ceremonia es *usernameless*: el navegador
    enseña las passkeys que tenga para este sitio y el usuario elige. Es el flujo
    bueno —no hay que teclear el correo— y además **no filtra si una cuenta
    existe**, que es lo que pasaría si la lista se pidiera por email.
    """
    rp = relying_party()
    allow = [
        PublicKeyCredentialDescriptor(id=base64url_to_bytes(cid))
        for cid in (allow_credential_ids or [])
    ]
    options = generate_authentication_options(
        rp_id=rp["rp_id"],
        allow_credentials=allow or None,
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    return {
        "options": options_to_json(options),
        "challenge": bytes_to_base64url(options.challenge),
    }


class SignCountError(Exception):
    """El contador no avanzó: replay o autenticador clonado."""


def verify_authentication(
    *, credential: Any, expected_challenge: str,
    public_key: str, stored_sign_count: int,
) -> Dict[str, Any]:
    """Valida el acceso y devuelve el nuevo `sign_count` a persistir.

    El contador **sólo puede subir**. Un autenticador real lo incrementa en cada
    uso; si llega uno menor o igual al guardado, o se está reproduciendo una
    respuesta capturada o hay una copia del dispositivo. Se rechaza en los dos
    casos. Excepción: un autenticador que siempre reporta 0 (muchas passkeys
    sincronizadas de plataforma lo hacen) no incrementa nunca — ahí el contador
    no aporta señal y no se puede exigir avance sin romper el acceso legítimo.
    """
    rp = relying_party()
    verified = verify_authentication_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(expected_challenge),
        expected_rp_id=rp["rp_id"],
        expected_origin=rp["origin"],
        credential_public_key=base64url_to_bytes(public_key),
        credential_current_sign_count=stored_sign_count,
    )
    new_count = verified.new_sign_count
    if new_count != 0 or stored_sign_count != 0:
        if new_count <= stored_sign_count and not (new_count == 0 and stored_sign_count == 0):
            raise SignCountError(
                f"sign_count no avanzó ({stored_sign_count} → {new_count}): "
                "posible replay o autenticador clonado"
            )
    return {"sign_count": new_count}


def describe(credential_doc: dict) -> Dict[str, Any]:
    """Vista pública de una passkey. **Nunca** incluye la clave: el usuario sólo
    necesita reconocerla para poder borrarla."""
    return {
        "id": credential_doc.get("id"),
        "name": credential_doc.get("name") or "Passkey",
        "created_at": credential_doc.get("created_at"),
        "last_used_at": credential_doc.get("last_used_at"),
    }
