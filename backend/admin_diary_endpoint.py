"""
TradingCalculator.Pro — Endpoint del Diario de Bugs (solo admin)

Añade este router a tu backend para que el DIARIO_BUGS.md
sea accesible ÚNICAMENTE por usuarios con is_admin=True.

Integración en server.py (o app/main.py tras la refactorización):
    from admin_diary_endpoint import router as diary_router
    app.include_router(diary_router)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime
from typing import Optional
import jwt
import os

router = APIRouter()
security = HTTPBearer()

DIARY_PATH = Path(__file__).parent.parent / "DIARIO_BUGS.md"
JWT_SECRET  = os.environ.get("JWT_SECRET", "changeme")
JWT_ALGO    = "HS256"


# ─── Dependencia: verificar que el usuario es admin ───────────────────────────

def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Extrae el JWT del header Authorization, lo decodifica y comprueba
    que el campo 'is_admin' sea True.
    Lanza 401 si el token es inválido y 403 si el usuario no es admin.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

    if not payload.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: se requiere permisos de administrador"
        )
    return payload


# ─── GET /api/admin/bug-diary — Leer el diario ────────────────────────────────

@router.get(
    "/api/admin/bug-diary",
    summary="Leer el diario de bugs (solo admin)",
    tags=["Admin"]
)
def get_bug_diary(admin=Depends(require_admin)):
    """
    Devuelve el contenido completo del DIARIO_BUGS.md.
    Solo accesible con token de usuario admin (is_admin=True).
    """
    if not DIARY_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DIARIO_BUGS.md no encontrado en el repositorio"
        )
    content = DIARY_PATH.read_text(encoding="utf-8")
    return {
        "content": content,
        "last_modified": datetime.fromtimestamp(
            DIARY_PATH.stat().st_mtime
        ).isoformat(),
        "size_bytes": DIARY_PATH.stat().st_size
    }


# ─── POST /api/admin/bug-diary/entry — Añadir entrada al diario ───────────────

class DiaryEntry(BaseModel):
    bug_id:      str
    title:       str
    severity:    str  # CRITICA | IMPORTANTE | MENOR
    description: str
    cause:       str
    solution:    str
    resolved:    bool = False
    affected_file: Optional[str] = None


@router.post(
    "/api/admin/bug-diary",
    summary="Añadir entrada al diario (solo admin)",
    tags=["Admin"]
)
def add_diary_entry(entry: DiaryEntry, admin=Depends(require_admin)):
    """
    Añade una nueva entrada al DIARIO_BUGS.md.
    Solo accesible por admins.
    """
    today     = datetime.now().strftime("%Y-%m-%d")
    admin_id  = admin.get("sub", "admin")
    resolved_text = "✅ SÍ — Resuelto al 100%" if entry.resolved else "❌ NO — Pendiente"

    new_block = f"""
---

### [{today}] {entry.bug_id} — {entry.title}
**Severidad:** {'🔴' if entry.severity == 'CRITICA' else '🟠' if entry.severity == 'IMPORTANTE' else '🟡'} {entry.severity}  
**Archivo afectado:** `{entry.affected_file or 'N/A'}`  
**Añadido por:** admin `{admin_id}`  
**Estado:** {'✅ RESUELTO' if entry.resolved else '❌ SIN RESOLVER'}

**Descripción:**  
{entry.description}

**Causa raíz:**  
{entry.cause}

**Solución:**  
{entry.solution}

**Resuelto al 100%:** {resolved_text}
"""

    if not DIARY_PATH.exists():
        raise HTTPException(404, "DIARIO_BUGS.md no encontrado")

    content = DIARY_PATH.read_text(encoding="utf-8")

    # Insertar antes del bloque de resumen final
    marker = "## 📊 RESUMEN DE ESTADO"
    if marker in content:
        idx = content.index(marker)
        content = content[:idx] + new_block + "\n" + content[idx:]
    else:
        content += new_block

    DIARY_PATH.write_text(content, encoding="utf-8")

    return {
        "success": True,
        "message": f"Entrada {entry.bug_id} añadida al diario",
        "date": today,
        "added_by": admin_id
    }


# ─── PATCH /api/admin/bug-diary/{bug_id}/resolve — Marcar como resuelto ───────

@router.patch(
    "/api/admin/bug-diary/{bug_id}/resolve",
    summary="Marcar bug como resuelto (solo admin)",
    tags=["Admin"]
)
def resolve_bug(bug_id: str, admin=Depends(require_admin)):
    """
    Cambia el estado de un bug a 'RESUELTO' en el DIARIO_BUGS.md.
    Busca el bug_id y actualiza la línea de estado.
    """
    if not DIARY_PATH.exists():
        raise HTTPException(404, "DIARIO_BUGS.md no encontrado")

    content = DIARY_PATH.read_text(encoding="utf-8")

    if bug_id not in content:
        raise HTTPException(404, f"Bug {bug_id} no encontrado en el diario")

    today = datetime.now().strftime("%Y-%m-%d")
    admin_id = admin.get("sub", "admin")

    # Marcar como resuelto
    content = content.replace(
        f"**Estado:** ❌ SIN RESOLVER",
        f"**Estado:** ✅ RESUELTO el {today} por {admin_id}",
        1  # solo la primera ocurrencia del bug_id
    )
    content = content.replace(
        "**Resuelto al 100%:** ❌ NO — Pendiente",
        f"**Resuelto al 100%:** ✅ SÍ — Resuelto el {today} por admin `{admin_id}`",
        1
    )

    DIARY_PATH.write_text(content, encoding="utf-8")

    return {
        "success": True,
        "message": f"Bug {bug_id} marcado como resuelto",
        "resolved_date": today,
        "resolved_by": admin_id
    }
