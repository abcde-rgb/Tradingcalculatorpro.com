"""
Pytest configuration for backend tests.

Two kinds of tests live in this folder:

1. **Integration tests** (the historical `test_*.py` files) hit a *live* HTTP
   backend over the network. They are skipped automatically unless
   ``BACKEND_URL`` (or ``REACT_APP_BACKEND_URL``) points at a running instance.
   Set it to a Cloud Run / localhost URL to enable them.

2. **Offline unit tests** — any file whose name ends in ``_unit.py`` — are pure
   and have no network/DB dependency. They **always run** (locally and in CI),
   so the deploy pipeline has a real, deterministic test signal even when no
   live backend is configured.

NOTE (fix 2026-06-25): the previous version called ``skip_integration(item)``,
which is *not* how a dynamic skip is applied — the marker was silently dropped,
so `pytest tests/` actually executed the integration suite and failed with
connection errors (53 failed / 21 errors) whenever ``BACKEND_URL`` was unset.
The correct API is ``item.add_marker(...)``.
"""
import os
import pytest


def _is_live_backend() -> bool:
    backend_url = os.environ.get("BACKEND_URL") or os.environ.get("REACT_APP_BACKEND_URL")
    # The old Emergent preview URL is dead; treat it as "not live".
    return bool(backend_url) and "preview.emergentagent.com" not in backend_url


def _is_offline_unit_test(item) -> bool:
    """Offline unit tests are exempt from the live-backend skip."""
    try:
        filename = item.path.name          # pytest >= 7 (pathlib.Path)
    except AttributeError:                  # pragma: no cover - very old pytest
        filename = os.path.basename(str(item.fspath))
    return filename.endswith("_unit.py")


def pytest_collection_modifyitems(config, items):
    """Skip integration tests when no live backend is configured."""
    if _is_live_backend():
        return

    skip_integration = pytest.mark.skip(
        reason="Integration test — set BACKEND_URL to a live backend to enable. "
               "Offline unit tests (test_*_unit.py) always run."
    )
    for item in items:
        if _is_offline_unit_test(item):
            continue
        item.add_marker(skip_integration)
