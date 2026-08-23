"""P3 refactor regression tests: options unusual scanner, market-flow scanner,
AI trade analyzer (Claude via Emergent LLM), and stock data with caching.

Helpers being verified:
- _build_unusual_row + _scan_chain_for_unusual    (get_unusual_options)
- _build_market_flow_row + _scan_chain_for_flow + _scan_ticker_flow (market_wide_flow)
- _format_legs_for_prompt + _build_ai_trade_prompt (ai_analyze_trade)
- _get_cached_stock + _normaliza_dividendo_o_nada + _build_stock_dict (get_stock_data)
"""
import os
import time
from typing import Any, Dict

import pytest
import requests

BASE_URL: str = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://missing-apis-impl.preview.emergentagent.com"
).rstrip("/")


# ============= Unusual Options Activity =============

class TestUnusualOptions:
    """get_unusual_options refactor with _build_unusual_row + _scan_chain_for_unusual."""

    EXPECTED_ROW_FIELDS = {
        "symbol", "type", "strike", "expiration", "daysToExpiry",
        "volume", "openInterest", "ratio", "iv", "premium",
        "bid", "ask", "last", "moneynessPct", "isITM", "estNotional",
    }

    def test_unusual_aapl_returns_rows_with_full_schema(self) -> None:
        r = requests.get(
            f"{BASE_URL}/api/options/unusual/AAPL",
            params={"min_ratio": 2.0, "min_volume": 100},
            timeout=45,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("symbol") == "AAPL"
        assert "totalFound" in d and "results" in d
        results = d.get("results") or []
        if d["totalFound"] == 0 or not results:
            pytest.skip(f"No unusual rows returned for AAPL — upstream/market dependent: {d}")
        assert d["totalFound"] > 0
        row = results[0]
        missing = self.EXPECTED_ROW_FIELDS - set(row.keys())
        assert not missing, f"Missing fields in row: {missing}; got keys={list(row.keys())}"
        # Field type sanity
        assert row["type"] in ("call", "put")
        assert isinstance(row["strike"], (int, float))
        assert isinstance(row["volume"], (int, float))
        assert isinstance(row["openInterest"], (int, float))
        assert isinstance(row["ratio"], (int, float))
        assert row["ratio"] >= 2.0  # min_ratio respected
        assert row["volume"] >= 100  # min_volume respected
        assert isinstance(row["isITM"], bool)


# ============= Market-Wide Options Flow =============

class TestMarketFlow:
    """market_wide_flow refactor with _build_market_flow_row + _scan_chain_for_flow + _scan_ticker_flow."""

    EXPECTED_ROW_FIELDS_MIN = {
        "symbol", "type", "strike", "expiration", "volume",
        "openInterest", "ratio", "iv", "premium",
    }

    def test_market_flow_scanned_24_tickers(self) -> None:
        r = requests.get(
            f"{BASE_URL}/api/options/market-flow",
            params={"min_ratio": 3.0, "min_volume": 300, "max_results": 10},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "scannedTickers" in d
        # MARKET_FLOW_TICKERS list contains 24 symbols
        assert d["scannedTickers"] == 24, (
            f"Expected scannedTickers=24, got {d['scannedTickers']}"
        )
        assert "totalFound" in d and "results" in d
        results = d.get("results") or []
        if d["totalFound"] == 0 or not results:
            pytest.skip(f"No flow rows — upstream/market dependent: totalFound={d['totalFound']}")
        # Honor max_results
        assert len(results) <= 10
        row = results[0]
        # Verify the row schema has the core fields (≥9 of 13)
        present = self.EXPECTED_ROW_FIELDS_MIN & set(row.keys())
        assert len(present) >= len(self.EXPECTED_ROW_FIELDS_MIN), (
            f"Schema partial: present={present}, row keys={list(row.keys())}"
        )
        assert row["ratio"] >= 3.0
        assert row["volume"] >= 300


# ============= AI Trade Analyzer (Claude via Emergent LLM) =============

class TestAIAnalyze:
    """ai_analyze_trade refactor with _format_legs_for_prompt + _build_ai_trade_prompt."""

    def test_ai_analyze_long_call_returns_markdown(self) -> None:
        body = {
            "symbol": "AAPL",
            "stockPrice": 150,
            "legs": [
                {"type": "call", "action": "buy", "quantity": 1,
                 "strike": 150, "premium": 5, "iv": 0.3}
            ],
            "stats": {
                "maxProfit": 5000, "maxLoss": -500, "pop": 50, "roi": 900,
                "rr": "10.0", "capitalRequired": 500, "isMaxLossUnlimited": False,
            },
            "daysToExpiry": 30,
        }
        # AI may take 5–15s
        r = requests.post(f"{BASE_URL}/api/options/ai-analyze",
                          json=body, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "analysis" in d, f"Missing 'analysis' key: {d}"
        assert "model" in d, f"Missing 'model' key: {d}"
        assert d["model"] == "claude-sonnet-4-5", f"Unexpected model: {d['model']}"
        analysis = d["analysis"]
        assert isinstance(analysis, str) and len(analysis) > 50, (
            f"Analysis too short: {analysis!r}"
        )
        # Should contain at least one section emoji from prompt template
        section_markers = ["✅", "⚠️", "💡", "📊"]
        found_markers = [m for m in section_markers if m in analysis]
        assert found_markers, (
            f"No section emoji found in analysis. Expected any of {section_markers}. "
            f"Got: {analysis[:300]}..."
        )


# ============= Stock Data (refactored with cache + helpers) =============

class TestStockData:
    """get_stock_data refactor with _get_cached_stock + _normaliza_dividendo_o_nada + _build_stock_dict."""

    EXPECTED_FIELDS = {
        "price", "change", "changePercent",
        "high52w", "low52w", "volume", "sector", "dividendYield",
    }

    def test_stock_aapl_full_schema(self) -> None:
        r = requests.get(f"{BASE_URL}/api/stock/AAPL", timeout=45)
        assert r.status_code == 200, r.text
        d = r.json()
        missing = self.EXPECTED_FIELDS - set(d.keys())
        assert not missing, f"Missing fields: {missing}; got keys={list(d.keys())}"
        # Type/value sanity
        assert isinstance(d["price"], (int, float)) and d["price"] > 0
        assert isinstance(d["change"], (int, float))
        assert isinstance(d["changePercent"], (int, float))
        # 52 semanas y dividendo: un número REAL o `None`, nunca un relleno.
        #
        # Estas tres afirmaciones exigían un número, y esa exigencia era justo
        # lo que empujaba al código a inventarlo: el máximo salía como el precio
        # de hoy (o `precio × 1.3`) y el dividendo como 0.0, que no es «no lo
        # sé» sino «esta acción no paga dividendo». Un test que prohíbe decir
        # «no lo sé» obliga a mentir. Lo que sí se puede exigir es que, cuando
        # haya número, tenga sentido.
        for campo in ("high52w", "low52w"):
            assert d[campo] is None or (isinstance(d[campo], (int, float)) and d[campo] > 0), (
                f"{campo} debe ser un precio real o None, no un relleno; got {d[campo]!r}"
            )
        # Volume should be a formatted string like "45.2M"
        assert isinstance(d["volume"], str) and len(d["volume"]) > 0, (
            f"volume should be string like '45.2M', got {d['volume']!r}"
        )
        # Sector → AAPL = Technology (yfinance source of truth)
        assert d["sector"] == "Technology", f"Expected sector='Technology', got {d['sector']!r}"
        # Dividend yield: decimal normalizado (0.005 = 0,5 %) o None.
        assert d["dividendYield"] is None or (
            isinstance(d["dividendYield"], (int, float)) and 0 <= d["dividendYield"] <= 1
        ), f"dividendYield debe ser decimal ≤1 o None, got {d['dividendYield']!r}"

    def test_stock_aapl_second_call_uses_cache(self) -> None:
        """Second consecutive call must hit cache — verify by faster response and identical price."""
        r1 = requests.get(f"{BASE_URL}/api/stock/AAPL", timeout=45)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()

        t0 = time.time()
        r2 = requests.get(f"{BASE_URL}/api/stock/AAPL", timeout=45)
        elapsed = time.time() - t0
        assert r2.status_code == 200, r2.text
        d2 = r2.json()

        # Same price (cache hit → identical data)
        assert d1["price"] == d2["price"], (
            f"Cache miss? price1={d1['price']} != price2={d2['price']}"
        )
        # Cached call should be fast (< 2s typically; relax to 5s for network jitter)
        assert elapsed < 5.0, f"Second call took {elapsed:.2f}s — cache may not be working"


# ============= Stripe Webhook Endpoint Exists =============

class TestStripeWebhook:
    """webhook endpoint must exist & accept POST without 5xx (sig verification will fail)."""

    def test_webhook_endpoint_does_not_5xx(self) -> None:
        r = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            json={"type": "test"},
            headers={"Stripe-Signature": "invalid"},
            timeout=20,
        )
        # Without valid sig, expect 4xx/200-with-error — but NOT 5xx crash
        assert r.status_code < 500, f"Webhook crashed with 5xx: {r.status_code} {r.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
