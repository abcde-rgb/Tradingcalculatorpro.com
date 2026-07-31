import { useEffect, useState } from 'react';
import { FALLBACK_RISK_FREE_RATE } from '@/utils/blackScholes';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * The risk-free rate the backend is actually pricing with, plus its provenance.
 *
 * Every option price, every Greek and every rate-sensitive structure (box
 * spread, jelly roll, conversion) depends on `r`. The frontend used to pass a
 * literal 0.05 into the pricing engine while the backend priced with the live
 * ^IRX yield, so Rho was decorative and the two halves of the app disagreed
 * about the same position.
 *
 * The value is module-level cached: the rate moves in basis points over days,
 * and every options panel wanting it must not mean one request per panel.
 * `isLive` is false when the value came from a stale cache or the hardcoded
 * fallback — the UI is expected to say so rather than present it as a quote.
 */

let cached = null;
let inFlight = null;

async function loadRiskFree() {
  if (cached) return cached;
  if (!API) return null;
  if (!inFlight) {
    inFlight = fetch(`${API}/api/market/risk-free`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.rate === 'number') cached = d;
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Test seam — lets the offline engine checks run without a network. */
export function __setRiskFreeCache(value) {
  cached = value;
}

export function useRiskFreeRate() {
  const [info, setInfo] = useState(cached);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      loadRiskFree().then((d) => {
        if (alive && d) setInfo(d);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  return {
    // Never null: the pricing functions need a number to return anything at
    // all. `isLive` is what tells the user whether to trust it.
    rate: info?.rate ?? FALLBACK_RISK_FREE_RATE,
    ratePct: info?.ratePct ?? FALLBACK_RISK_FREE_RATE * 100,
    source: info?.source ?? 'fallback',
    isLive: Boolean(info?.isLive),
    fetchedAt: info?.fetchedAt ?? null,
    resolved: Boolean(info),
  };
}

export default useRiskFreeRate;
