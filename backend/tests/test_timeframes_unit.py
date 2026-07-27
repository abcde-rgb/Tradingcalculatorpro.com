"""
Unit tests for the scanner's timeframe ladder (timeframes.py).

Two things are being protected here:

  1. **The table cannot describe data Yahoo will not serve.** Every
     (interval, range) pair in TIMEFRAMES is checked against the upstream
     retention caps. If someone adds "2y of 15-minute candles" because a user
     asked for it, this fails at CI instead of shipping a selector that always
     returns "no structure detected".
  2. **`resolve()` never returns an illegal pair and never lies about it.** A
     bad querystring must degrade to something legal AND report the change,
     because a scanner that silently answers a different question than the one
     asked is worse than one that errors.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import timeframes as tfm  # noqa: E402


# ---- The table itself ------------------------------------------------------
def test_every_pair_respects_the_upstream_retention_cap():
    for tf in tfm.TIMEFRAMES:
        cap = tfm.INTERVAL_MAX_DAYS.get(tf.interval, 0)
        for rng in tf.ranges:
            days = tfm.RANGE_DAYS[rng]
            if cap:
                assert days <= cap, (
                    f"{tf.interval} + {rng} = {days}d exceeds Yahoo's {cap}d cap "
                    f"for that interval — the API answers this with an error, "
                    f"which the scanner shows as 'no data'."
                )


def test_every_range_string_is_known():
    for tf in tfm.TIMEFRAMES:
        for rng in tf.ranges:
            assert rng in tfm.RANGE_DAYS


def test_default_range_is_always_offered():
    for tf in tfm.TIMEFRAMES:
        assert tf.default_range in tf.ranges


def test_ladder_is_ordered_fastest_to_slowest():
    mins = [tf.minutes for tf in tfm.TIMEFRAMES]
    assert mins == sorted(mins)


# ---- The contract the product promised -------------------------------------
def test_the_ladder_spans_five_minutes_to_monthly():
    names = [tf.interval for tf in tfm.TIMEFRAMES]
    assert names[0] == "5m"
    assert names[-1] == "1mo"
    for required in ("5m", "15m", "30m", "1h", "1d", "1wk", "1mo"):
        assert required in names


def test_two_years_is_reachable_from_an_intraday_rung():
    """'From 15 minutes to 2 years' only works if some intraday rung reaches
    two years. Sub-hourly bars cannot (60-day cap upstream) — hourly can."""
    hourly = tfm.get("1h")
    assert hourly.intraday and "2y" in hourly.ranges


def test_five_minute_bars_reach_one_month():
    assert "1mo" in tfm.get("5m").ranges


def test_fast_rungs_use_a_wider_fractal():
    """A 2-bar fractal on 5-minute candles calls every wiggle a swing high."""
    assert tfm.get("5m").strength >= 3
    assert tfm.get("15m").strength >= 3
    assert tfm.get("1d").strength == 2


def test_intraday_flag_matches_the_bar_length():
    for tf in tfm.TIMEFRAMES:
        assert tf.intraday == (tf.minutes < 1440)


# ---- Normalisation ---------------------------------------------------------
def test_known_aliases_resolve():
    assert tfm.normalize_interval("60m") == "1h"
    assert tfm.normalize_interval("Daily") == "1d"
    assert tfm.normalize_interval(" 15MIN ") == "15m"


def test_unknown_interval_is_not_invented():
    assert tfm.normalize_interval("banana") is None
    assert tfm.normalize_interval("") is None
    assert tfm.normalize_interval(None) is None


def test_four_hour_maps_to_the_nearest_real_rung():
    """Yahoo has no 4h bar. Mapping to 1h beats returning nothing."""
    assert tfm.normalize_interval("4h") == "1h"


def test_is_intraday():
    assert tfm.is_intraday("15m") is True
    assert tfm.is_intraday("1d") is False
    assert tfm.is_intraday("banana") is False


# ---- resolve() -------------------------------------------------------------
def test_a_legal_pair_passes_through_untouched():
    tf, rng, adj = tfm.resolve("15m", "5d")
    assert (tf.interval, rng) == ("15m", "5d")
    assert adj == []


def test_no_arguments_gives_the_default_rung_and_its_default_window():
    tf, rng, adj = tfm.resolve(None, None)
    assert tf.interval == tfm.DEFAULT_INTERVAL
    assert rng == tf.default_range
    assert adj == []


def test_an_unknown_interval_falls_back_and_says_so():
    tf, rng, adj = tfm.resolve("banana", "6mo")
    assert tf.interval == tfm.DEFAULT_INTERVAL
    assert any(a.startswith("interval:") for a in adj)


def test_too_much_history_for_the_rung_is_clamped_to_its_maximum():
    """15-minute candles cannot go back a year anywhere. Asking for a year
    should return the most history that rung HAS, not its default."""
    tf, rng, adj = tfm.resolve("15m", "1y")
    assert tf.interval == "15m"
    assert rng == "1mo"                      # the longest 15m window
    assert "period:1y->1mo" in adj


def test_too_little_history_for_the_rung_is_raised_to_its_minimum():
    tf, rng, adj = tfm.resolve("1wk", "1d")
    assert rng == "6mo"                      # the shortest weekly window
    assert any(a.startswith("period:") for a in adj)


def test_a_nonsense_period_falls_back_to_the_default_window():
    tf, rng, adj = tfm.resolve("1d", "banana")
    assert rng == tf.default_range
    assert any(a.startswith("period:") for a in adj)


def test_resolve_never_returns_an_illegal_pair():
    junk = [None, "", "  ", "banana", "1y", "5m", "1M", "4h", "60m", "1mo",
            "../../etc/passwd", "1d;drop", "9" * 200]
    for interval in junk:
        for period in junk:
            tf, rng, _ = tfm.resolve(interval, period)
            assert tf.interval in tfm.BY_INTERVAL
            assert rng in tf.ranges
            cap = tfm.INTERVAL_MAX_DAYS.get(tf.interval, 0)
            if cap:
                assert tfm.RANGE_DAYS[rng] <= cap


# ---- ladder() (what the frontend consumes) ---------------------------------
def test_ladder_is_json_serialisable_and_complete():
    import json
    rungs = tfm.ladder()
    json.dumps(rungs)                        # must not raise
    assert len(rungs) == len(tfm.TIMEFRAMES)
    for rung in rungs:
        for key in ("interval", "minutes", "intraday", "ranges",
                    "defaultRange", "defaultStrength"):
            assert key in rung
        assert rung["defaultRange"] in rung["ranges"]
