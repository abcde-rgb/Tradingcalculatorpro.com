"""
Pytest configuration for backend tests.

Integration tests (those that call a live HTTP backend) are automatically
skipped in CI unless BACKEND_URL is explicitly set in the environment.
Set BACKEND_URL to a running backend instance to enable them.
"""
import os
import pytest


def pytest_collection_modifyitems(config, items):
    """Skip integration tests if BACKEND_URL is not set."""
    backend_url = os.environ.get("BACKEND_URL") or os.environ.get("REACT_APP_BACKEND_URL")
    # If the URL still points to the old preview URL or is unset, skip all integration tests
    is_live = backend_url and "preview.emergentagent.com" not in backend_url

    if not is_live:
        skip_integration = pytest.mark.skip(
            reason="Integration tests require BACKEND_URL env var pointing to a live backend"
        )
        for item in items:
            # All tests in the tests/ directory are integration tests
            skip_integration(item)
