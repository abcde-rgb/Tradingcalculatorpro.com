import React, { useState, useEffect, useCallback } from 'react';
import { Save, Trash2, Briefcase, X, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { CargaVelas } from '@/components/common/BrandLoading';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Saved Positions Panel — save/load/delete strategies.
 * Requires authentication.
 */
const SavedPositionsPanel = ({ currentLegs, currentSymbol, currentExpiration, onLoadPosition }) => {
  const { token, isAuthenticated } = useAuthStore();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPositions = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/options/positions`, { credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('fetchPositions error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const savePosition = async () => {
    if (!saveName.trim() || !currentLegs.length) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/options/positions/save`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: saveName.trim(),
          symbol: currentSymbol,
          legs: currentLegs.filter((l) => l.type !== 'stock').map((l) => ({
            type: l.type,
            action: l.action,
            quantity: l.quantity || 1,
            strike: l.strike,
            premium: l.premium || 0,
            iv: l.iv || 0.3,
            daysToExpiry: l.daysToExpiry || 30,
          })),
          expiration: currentExpiration,
        }),
      });
      if (res.ok) {
        await fetchPositions();
        setShowSaveDialog(false);
        setSaveName('');
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('savePosition error:', e);
    } finally {
      setSaving(false);
    }
  };

  const deletePosition = async (id) => {
    try {
      await fetch(`${API}/api/options/positions/${id}`, { credentials: 'include',
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setPositions((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('deletePosition error:', e);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-card/60 border border-border/60 rounded-xl p-3.5 text-center text-xs text-muted-foreground">
        Inicia sesión para guardar y gestionar tus posiciones favoritas.
      </div>
    );
  }

  return (
    <div className="bg-card/60 border border-border/60 rounded-xl p-3.5" data-testid="saved-positions-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Mis Posiciones</span>
          {positions.length > 0 && <span className="text-[10px] text-muted-foreground">({positions.length})</span>}
        </div>
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={!currentLegs?.length}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="save-position-btn"
        >
          <Save className="w-3 h-3" /> Guardar actual
        </button>
      </div>

      {showSaveDialog && (
        <div className="mb-3 p-2.5 bg-background/60 border border-primary/30 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && savePosition()}
              placeholder={`${currentSymbol} · ej: "LC AAPL ATM 12d"`}
              maxLength={60}
              className="flex-1 bg-muted border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              data-testid="save-name-input"
            />
            <button
              onClick={savePosition}
              disabled={saving || !saveName.trim()}
              className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold disabled:opacity-50"
            >
              {saving ? <CargaVelas className="w-3 h-3" /> : 'Guardar'}
            </button>
            <button onClick={() => { setShowSaveDialog(false); setSaveName(''); }} className="p-1.5 rounded-md hover:bg-muted">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-3"><CargaVelas className="w-4 h-4 text-muted-foreground" /></div>
      ) : positions.length === 0 ? (
        <div className="text-[11px] text-muted-foreground text-center py-2">
          Sin posiciones guardadas todavía.
        </div>
      ) : (
        <ul className="space-y-1.5 max-h-[220px] overflow-y-auto">
          {positions.map((p) => (
            <li key={p.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 border border-border/50 hover:border-primary/30 transition-all group">
              <button
                onClick={() => onLoadPosition && onLoadPosition(p)}
                className="flex-1 text-left min-w-0"
                data-testid={`load-position-${p.id}`}
              >
                <div className="text-xs font-semibold text-foreground truncate">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {p.symbol} · {p.legs?.length || 0} legs · {p.expiration || '—'}
                </div>
              </button>
              <button
                onClick={() => deletePosition(p.id)}
                className="p-1 rounded hover:bg-short/15 transition-colors opacity-0 group-hover:opacity-100"
                title="Eliminar"
              >
                <Trash2 className="w-3 h-3 text-short" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SavedPositionsPanel;
