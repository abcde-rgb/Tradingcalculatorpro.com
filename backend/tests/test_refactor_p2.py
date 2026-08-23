"""P2 refactor regression tests: journal/stats, monte-carlo, iv-rank, plus
spec-exact math validation for payoff/greeks/assignment after helper extraction.

(Había también un bloque de `POST /backtest`; esa ruta se retiró el 2026-08-22.)

Auth: demo@btccalc.pro / 1234 (auto-seeded premium lifetime).
"""
import os
import time
from typing import Any, Dict

import pytest
import requests

BASE_URL: str = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://missing-apis-impl.preview.emergentagent.com"
).rstrip("/")
DEMO_EMAIL = os.environ.get("DEMO_USER_EMAIL", "demo@btccalc.pro")
DEMO_PASSWORD = os.environ.get("DEMO_USER_PASSWORD", "1234")  # demo fixture; not a real secret  # nosec B105


@pytest.fixture(scope="module")
def auth_token() -> str:
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, f"Demo login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"No token in login response: {data}"
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============= Math endpoints — spec-exact values =============

class TestMathSpec:
    """Helper extraction must NOT change any math output."""

    def test_payoff_long_call_exact(self) -> None:
        """Long Call strike=150 prem=5 stockPrice=150 fee=0.65
        → maxProfit=4749.35 maxLoss=-500.65 totalFees=0.65 breakEven=155."""
        body = {
            "legs": [{
                "type": "call", "action": "buy", "strike": 150, "premium": 5,
                "qty": 1, "expiration": "2026-06-20",
            }],
            "stockPrice": 150,
            "feePerContract": 0.65,
        }
        r = requests.post(f"{BASE_URL}/api/calculate/payoff", json=body, timeout=20)
        assert r.status_code == 200, r.text
        stats = r.json()["stats"]
        assert abs(stats["maxProfit"] - 4749.35) < 1e-2
        assert abs(stats["maxLoss"] - (-500.65)) < 1e-2
        assert abs(stats["totalFees"] - 0.65) < 1e-6
        assert r.json()["breakEvens"] == [155.0]

    def test_greeks_long_call_exact(self) -> None:
        """Spec: delta≈0.535, gamma≈0.0308, theta≈-0.0951, vega≈0.171, rho≈0.0617."""
        body = {
            "legs": [{
                "type": "call", "action": "buy", "strike": 150, "premium": 5,
                "qty": 1, "expiration": "2026-06-20",
            }],
            "stockPrice": 150, "iv": 0.3, "rate": 0.05,
        }
        r = requests.post(f"{BASE_URL}/api/calculate/greeks", json=body, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # Tolerant ranges — exact values depend on time-to-expiry computed from today
        assert 0.30 < d["delta"] < 0.80, f"delta={d['delta']}"
        assert d["gamma"] > 0, f"gamma={d['gamma']}"
        assert d["theta"] < 0, f"theta={d['theta']}"
        assert d["vega"] > 0, f"vega={d['vega']}"
        assert d["rho"] > 0, f"rho={d['rho']}"
        for k in ("delta", "gamma", "theta", "vega", "rho"):
            assert isinstance(d[k], (int, float))

    def test_pnl_attribution_no_crash(self) -> None:
        body = {
            "legs": [{
                "type": "call", "action": "buy", "strike": 150, "premium": 5,
                "qty": 1, "expiration": "2026-06-20",
            }],
            "stockPriceInitial": 150, "stockPriceFinal": 155,
            "ivStart": 0.3, "ivEnd": 0.32, "daysElapsed": 1,
        }
        r = requests.post(f"{BASE_URL}/api/calculate/pnl-attribution",
                          json=body, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("delta_pnl", "gamma_pnl", "theta_pnl", "vega_pnl",
                  "total_actual", "residual"):
            assert k in d
            assert isinstance(d[k], (int, float))

    def test_assignment_sell_2_puts_exact(self) -> None:
        """Sell 2 puts strike=100, expiry stockPrice=95 (ITM put, assigned).
        Expected: net_shares=200, net_cash_flow=-20000.0 (buy 200 sh @100)."""
        body = {
            "legs": [{
                "type": "put", "action": "sell", "strike": 100, "premium": 3,
                "qty": 2, "expiration": "2026-06-20",
            }],
            "stockPriceAtExpiry": 95,
        }
        r = requests.post(f"{BASE_URL}/api/calculate/assignment",
                          json=body, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["net_shares"] == 200, f"net_shares={d['net_shares']}"
        assert abs(d["net_cash_flow"] - (-20000.0)) < 1e-2, (
            f"net_cash_flow={d['net_cash_flow']}"
        )
        assert isinstance(d.get("assignments"), list)
        assert len(d["assignments"]) == 1


# ============= Journal stats — refactor with new helpers =============

class TestJournalStats:
    def test_demo_user_zero_trades_schema(self, auth_headers: Dict[str, str]) -> None:
        r = requests.get(f"{BASE_URL}/api/journal/stats",
                         headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        # Schema must remain unchanged after _aggregate_journal_trades /
        # _journal_stats_from_aggregate extraction
        expected_keys = {
            "totalTrades", "wins", "losses", "winRate", "totalPnl",
            "avgWin", "avgLoss", "profitFactor", "expectancy",
            "maxDrawdown", "consecutiveLosses",
        }
        assert expected_keys.issubset(d.keys()), (
            f"Missing keys: {expected_keys - set(d.keys())}"
        )
        # Demo has no closed trades → all zeros
        for k in expected_keys:
            assert d[k] == 0, f"{k} should be 0 for demo, got {d[k]}"


# ============= Monte Carlo — refactor with _simulate_one_mc_path / _summarize_mc_runs =============

class TestMonteCarlo:
    def test_monte_carlo_statistics(self, auth_headers: Dict[str, str]) -> None:
        body = {
            "winRate": 55, "avgWin": 100, "avgLoss": -50,
            "initialCapital": 10000, "numTrades": 100, "numSimulations": 100,
        }
        r = requests.post(f"{BASE_URL}/api/monte-carlo",
                          json=body, headers=auth_headers, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "statistics" in d
        stats = d["statistics"]
        for k in ("avgFinalBalance", "profitProbability", "percentile5",
                  "percentile50", "percentile95", "riskOfRuin", "avgMaxDrawdown"):
            assert k in stats, f"missing {k}"
            assert isinstance(stats[k], (int, float))
        # Sanity: positive EV expected (55% × 100 + 45% × −50 = +32.5/trade)
        assert stats["avgFinalBalance"] > 10000
        assert stats["profitProbability"] > 50
        assert "simulations" in d and isinstance(d["simulations"], list)


# ============= IV Rank — refactor with _compute_realized_vol_series etc =============

class TestIVRank:
    def test_iv_rank_aapl_schema(self) -> None:
        r = requests.get(f"{BASE_URL}/api/options/iv-rank/AAPL", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # If yfinance/upstream is unavailable we get available=False
        if not d.get("available"):
            pytest.skip(f"IV-rank upstream unavailable: {d}")
        assert d["symbol"] == "AAPL"
        assert d["available"] is True
        for k in ("ivRank", "ivPercentile", "recommendation"):
            assert k in d, f"missing {k}"
        assert d["recommendation"] in ("sell_premium", "buy_premium", "neutral")
        # Critical: i18n migration removed these fields — they MUST be absent
        assert "recommendationLabel" not in d, (
            "recommendationLabel should be REMOVED (i18n migration via IVRankBadge)"
        )
        assert "recommendationReason" not in d, (
            "recommendationReason should be REMOVED (i18n migration via IVRankBadge)"
        )
        assert 0 <= d["ivRank"] <= 100
        assert 0 <= d["ivPercentile"] <= 100


# ============= OHLC sanity — must still work after journal_stats refactor =============

class TestOHLCSanity:
    def test_ohlc_btc_7d_still_works(self) -> None:
        ohlc: list = []
        for _ in range(3):
            r = requests.get(f"{BASE_URL}/api/ohlc/BTC?days=7", timeout=30)
            assert r.status_code == 200, r.text
            ohlc = r.json().get("ohlc") or []
            if ohlc:
                break
            time.sleep(15)
        if not ohlc:
            pytest.skip("CoinGecko rate-limited (429) — environmental")
        assert 100 <= len(ohlc) <= 220, f"got {len(ohlc)} candles"


# ============= Optimize regression =============

class TestOptimize:
    def test_optimize_aapl_bullish(self) -> None:
        body = {
            "symbol": "AAPL", "sentiment": "bullish", "targetPrice": 160,
            "budget": 1000, "expirationIdx": 3, "mode": "max_return",
        }
        r = requests.post(f"{BASE_URL}/api/optimize", json=body, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        results = d.get("results") or d.get("strategies") or []
        assert isinstance(results, list) and len(results) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
