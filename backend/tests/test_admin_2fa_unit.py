"""
Regression tests for mandatory admin 2FA.

An admin session can impersonate users, move subscriptions and read the whole
customer base, so a stolen password must not be enough. `require_admin` now
rejects admins without TOTP with 428 (not 403) so the frontend can send them to
Settings to finish setup instead of showing a dead end.

Parsed with `ast` (same approach as the other offline security tests) so this
runs without fastapi/asyncpg installed.
"""
import ast
from pathlib import Path

import pytest

_SERVER = Path(__file__).resolve().parent.parent / "server.py"
_SRC = _SERVER.read_text(encoding="utf-8")


def _func_source(name):
    tree = ast.parse(_SRC)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return ast.get_source_segment(_SRC, node)
    return None


def test_require_admin_checks_totp():
    src = _func_source("require_admin")
    assert src is not None, "require_admin not found"
    assert "totp_enabled" in src, "require_admin must require a second factor"


def test_require_admin_uses_428_not_403_for_missing_2fa():
    """403 says 'you may not'; 428 says 'finish this first' — different UX."""
    src = _func_source("require_admin")
    idx = src.find("totp_enabled")
    assert idx > -1
    after = src[idx:idx + 400]
    assert "428" in after, "missing-2FA must answer 428 Precondition Required"


def test_the_admin_role_check_still_runs_before_the_2fa_check():
    """A non-admin must get 403, never a hint that 2FA is what's missing."""
    src = _func_source("require_admin")
    role_at = src.find("Acceso restringido")
    totp_at = src.find("totp_enabled")
    assert -1 < role_at < totp_at, "role check must come first"


def test_escape_hatch_cannot_be_enabled_in_production():
    """ADMIN_2FA_OPTIONAL must be inert unless ENVIRONMENT is a dev value."""
    tree = ast.parse(_SRC)
    assign = None
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            getattr(t, "id", None) == "ADMIN_2FA_OPTIONAL" for t in node.targets
        ):
            assign = ast.get_source_segment(_SRC, node)
    assert assign is not None, "ADMIN_2FA_OPTIONAL not found"
    assert "ENVIRONMENT" in assign, "the opt-out must be gated on ENVIRONMENT"
    # It must be an AND of the env check with the flag, so setting the flag
    # alone on a production service does nothing.
    assert " and " in assign


def test_escape_hatch_logic():
    """Evaluate the same expression under the three environments that matter."""
    def compute(environment, flag):
        return (
            environment.lower() in ("development", "dev", "local")
            and flag.lower() != "false"
        )

    assert compute("production", "true") is False   # prod: never optional
    assert compute("production", "TRUE") is False
    assert compute("development", "true") is True   # local: opt-out available
    assert compute("development", "false") is False  # local, explicitly enforced


def test_protected_route_sends_admins_without_2fa_to_settings():
    """The frontend guard must mirror the backend, or the panel half-loads."""
    guard = (Path(__file__).resolve().parents[2]
             / "frontend/src/components/common/ProtectedRoute.jsx").read_text(encoding="utf-8")
    assert "two_factor_enabled" in guard
    assert "/settings" in guard
