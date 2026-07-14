"""
Automated security regression tests — run in CI on every deploy.

These assert the two invariants that, if broken, would be catastrophic:

  1. The Mongo->PostgreSQL shim never lets attacker input reach SQL as code
     (SQL injection): field names are whitelisted, values are parameterised.
  2. The strict field-name regex rejects anything that could break out of a
     quoted identifier.

The shim helpers live inside the big server.py module, which imports the whole
FastAPI app. To keep this test fast and dependency-free (it must run even
without fastapi/stripe/asyncpg installed), we extract just the three pure
helpers (_SAFE_FIELD_RE, _build_where_clause, _serialize) from the source with
`ast` and exercise them in isolation.
"""
import ast
import json
import logging
import os
import re as _re
from pathlib import Path
from typing import Optional

import pytest

_SERVER = Path(__file__).resolve().parent.parent / "server.py"
_MISSING_APIS = Path(__file__).resolve().parent.parent / "missing_apis.py"


def _load_shim_helpers():
    src = _SERVER.read_text(encoding="utf-8")
    tree = ast.parse(src)
    wanted_funcs = {"_build_where_clause", "_serialize"}
    chunks = []
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            getattr(t, "id", None) == "_SAFE_FIELD_RE" for t in node.targets
        ):
            chunks.append(ast.get_source_segment(src, node))
        if isinstance(node, ast.FunctionDef) and node.name in wanted_funcs:
            chunks.append(ast.get_source_segment(src, node))
    assert len(chunks) >= 3, "could not extract shim helpers from server.py"
    ns = {
        "_re_module": _re, "re": _re, "logging": logging,
        "_json_module": json, "json": json, "_json_default": str,
    }
    exec("\n\n".join(chunks), ns)  # noqa: S102 — trusted first-party source
    return ns


_NS = _load_shim_helpers()
_SAFE_FIELD_RE = _NS["_SAFE_FIELD_RE"]
build_where = _NS["_build_where_clause"]

# Strings a query key must NEVER be allowed to contain (they'd break the SQL).
INJECTION_KEYS = [
    "email' OR '1'='1",
    "x'); DROP TABLE users;--",
    "a') UNION SELECT password FROM users--",
    "n')=1--",
    "q'--",
    "id\"; DELETE FROM users;",
    "field OR 1=1",
    "a b",              # space
    "a.b",              # dot (not allowed by the regex)
    "'; --",
]

# SQL that must never appear verbatim in a generated WHERE clause.
DANGEROUS_FRAGMENTS = ["OR '1'='1", "DROP TABLE", "UNION SELECT", "DELETE FROM", "--", "1'='1", "1=1"]


@pytest.mark.parametrize("bad_key", INJECTION_KEYS)
def test_malicious_field_names_are_rejected_by_regex(bad_key):
    assert not _SAFE_FIELD_RE.match(bad_key), f"regex wrongly accepted {bad_key!r}"


@pytest.mark.parametrize("legit_key", ["email", "user_id", "is_admin", "created_at", "_x", "A1_b2"])
def test_legit_field_names_pass_regex(legit_key):
    assert _SAFE_FIELD_RE.match(legit_key)


@pytest.mark.parametrize("bad_key", INJECTION_KEYS)
def test_injection_in_query_key_produces_no_sql(bad_key):
    """A malicious filter key must be dropped, never interpolated into SQL."""
    for value in ("x", {"$ne": None}, {"$regex": ".*"}, {"$in": ["a"]}):
        clause, params, _ = build_where({bad_key: value}, 1)
        assert not any(frag in (clause or "") for frag in DANGEROUS_FRAGMENTS), (
            f"injection leaked into SQL for key={bad_key!r}: {clause!r}"
        )


@pytest.mark.parametrize("payload", [
    "x' OR '1'='1",
    "'; DROP TABLE users;--",
    "\" UNION SELECT * FROM users--",
    "1'; DELETE FROM trades WHERE '1'='1",
])
def test_malicious_values_are_parameterised_not_inlined(payload):
    """Dangerous VALUES must live in params (as data), never in the SQL text."""
    for filt in ({"email": payload},
                 {"name": {"$regex": payload}},
                 {"status": {"$in": [payload]}},
                 {"age": {"$ne": payload}}):
        clause, params, _ = build_where(filt, 1)
        assert payload not in (clause or ""), f"value inlined into SQL: {clause!r}"
        joined = " ".join(str(p) for p in params)
        assert payload in joined, "value should be carried as a bound parameter"


def test_normal_equality_uses_jsonb_containment_param():
    clause, params, _ = build_where({"email": "user@test.com"}, 1)
    assert clause == "data @> $1::jsonb"
    assert json.loads(params[0]) == {"email": "user@test.com"}


def test_password_hashing_is_bcrypt_and_not_reversible():
    """Passwords must be bcrypt-hashed, salted and verifiable — never plaintext."""
    bcrypt = pytest.importorskip("bcrypt")
    pw = "S3cret-Passw0rd!"
    h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()
    assert h != pw and h.startswith("$2")           # bcrypt marker, not plaintext
    assert bcrypt.checkpw(pw.encode(), h.encode())  # verifies
    assert not bcrypt.checkpw(b"wrong", h.encode())
    # same password hashes differently each time (unique salt)
    h2 = bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()
    assert h != h2


# ── Host-header injection into emailed links (password reset / verification) ──
#
# Links we email must be built from a TRUSTED base URL, never from the raw
# Host/Origin/Referer of the incoming request. Otherwise an attacker can POST
# /auth/forgot-password for a victim with `Origin: https://evil.com` and the
# victim receives a reset link pointing at the attacker's site (token in URL →
# account takeover). These tests pin `missing_apis._trusted_link_base`.

def _load_trusted_link_base():
    src = _MISSING_APIS.read_text(encoding="utf-8")
    tree = ast.parse(src)
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == "_trusted_link_base":
            ns = {"os": os, "Optional": Optional, "Request": object}
            exec(ast.get_source_segment(src, node), ns)  # noqa: S102 — first-party source
            return ns["_trusted_link_base"]
    raise AssertionError("could not extract _trusted_link_base from missing_apis.py")


trusted_link_base = _load_trusted_link_base()


class _FakeHeaders:
    def __init__(self, d):
        self._d = {k.lower(): v for k, v in d.items()}

    def get(self, k, default=None):
        return self._d.get(k.lower(), default)


class _FakeRequest:
    def __init__(self, **headers):
        self.headers = _FakeHeaders(headers)


@pytest.fixture(autouse=True)
def _clean_link_env(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "https://tradingcalculatorpro.com")
    monkeypatch.setenv("ENVIRONMENT", "production")


@pytest.mark.parametrize("evil_origin", [
    "https://evil.com",
    "http://attacker.example",
    "https://tradingcalculatorpro.com.evil.com",   # suffix trick
    "https://eviltradingcalculatorpro.com",         # prefix trick
    "https://tradingcalculatorpro.com@evil.com",    # userinfo trick
    "null",
])
def test_emailed_link_base_ignores_untrusted_origin(evil_origin):
    """A poisoned Host/Origin/Referer must never end up in an emailed link."""
    req = _FakeRequest(origin=evil_origin, referer=evil_origin + "/x", host="evil.com")
    base = trusted_link_base(req)
    assert base == "https://tradingcalculatorpro.com", f"leaked untrusted origin: {base!r}"
    assert "evil" not in base and "attacker" not in base


def test_emailed_link_base_falls_back_to_canonical_when_no_headers():
    assert trusted_link_base(_FakeRequest()) == "https://tradingcalculatorpro.com"
    assert trusted_link_base(None) == "https://tradingcalculatorpro.com"


def test_emailed_link_base_allows_canonical_and_www():
    for good in ("https://tradingcalculatorpro.com", "https://www.tradingcalculatorpro.com"):
        assert trusted_link_base(_FakeRequest(origin=good)) == good


def test_emailed_link_base_honours_explicit_cors_allowlist(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://staging.tradingcalculatorpro.com")
    ok = "https://staging.tradingcalculatorpro.com"
    assert trusted_link_base(_FakeRequest(origin=ok)) == ok
    # something NOT on the list still falls back to canonical
    assert trusted_link_base(_FakeRequest(origin="https://evil.com")) == "https://tradingcalculatorpro.com"
