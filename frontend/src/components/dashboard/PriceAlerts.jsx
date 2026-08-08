import { useState, useEffect, useCallback } from 'react';
import EmptyState from '@/components/common/EmptyState';
import { Bell, Plus, Trash2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { CRYPTO_LIST } from '@/lib/constants';
import { useWebSocketAlerts } from '@/hooks/useWebSocketAlerts';

const API = process.env.REACT_APP_BACKEND_URL;

export const PriceAlerts = () => {
  const { isAuthenticated, token } = useAuthStore();
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: 'BTC',
    target_price: '',
    condition: 'above'
  });

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/alerts`, { credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAlerts(data);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to fetch alerts:', error);
      }
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) fetchAlerts();
  }, [isAuthenticated, fetchAlerts]);

  // Real-time WebSocket push: mark triggered alerts and show toast
  useWebSocketAlerts(token, useCallback((data) => {
    if (data.type === 'connected') {
      setWsConnected(true);
      return;
    }
    if (data.type === 'alert_triggered' && data.alert) {
      const { symbol, condition, target_price } = data.alert;
      toast.success(`🔔 ${symbol} ${condition === 'above' ? '↑' : '↓'} $${Number(target_price).toLocaleString()}`, {
        duration: 8000,
      });
      fetchAlerts();
    }
  }, [fetchAlerts]));

  const createAlert = async () => {
    if (!newAlert.target_price) return;
    try {
      const res = await fetch(`${API}/api/alerts`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAlert)
      });
      if (res.ok) {
        fetchAlerts();
        setNewAlert({ ...newAlert, target_price: '' });
        toast.success(t('success'));
      }
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await fetch(`${API}/api/alerts/${alertId}`, { credentials: 'include',
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAlerts();
      toast.success(t('success'));
    } catch (error) {
      toast.error(t('error'));
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center text-muted-foreground">
          {t('login')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-yellow-500" />
          {t('alerts')}
          {wsConnected && (
            <span className="ml-auto flex items-center gap-1 text-xs font-normal text-green-500">
              <Zap className="w-3 h-3" /> Live
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="w-28">
            <Input
              value={newAlert.symbol}
              onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase().trim() })}
              placeholder={t('alertSymbolPh')}
              list="alert-symbol-suggestions"
              className="bg-muted border-border uppercase"
              data-testid="alert-symbol-input"
              autoComplete="off"
              spellCheck={false}
            />
            <datalist id="alert-symbol-suggestions">
              {CRYPTO_LIST.map((c) => (
                <option key={c.id} value={c.symbol}>{c.name}</option>
              ))}
              {['AAPL', 'TSLA', 'NVDA', 'SPY', 'QQQ', '^GSPC', 'EURUSD=X', 'GC=F', 'CL=F'].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <Select value={newAlert.condition} onValueChange={(v) => setNewAlert({ ...newAlert, condition: v })}>
            <SelectTrigger className="w-28 bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">{t('above')}</SelectItem>
              <SelectItem value="below">{t('below')}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder={t('priceTarget')}
            value={newAlert.target_price}
            onChange={(e) => setNewAlert({ ...newAlert, target_price: e.target.value })}
            className="flex-1 font-mono bg-muted border-border"
            data-testid="alert-price-input"
          />
          <Button onClick={createAlert} size="icon" className="bg-yellow-500 text-black hover:bg-yellow-400" data-testid="create-alert-btn" aria-label={t('createAlert')}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div>
                <span className="font-bold">{alert.symbol}</span>
                <span className="text-muted-foreground mx-2">
                  {alert.condition === 'above' ? t('above') : t('below')}
                </span>
                <span className="font-mono text-primary">{formatCurrency(alert.target_price)}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteAlert(alert.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
          {alerts.length === 0 && (
            <EmptyState
              icon={Bell}
              title={t('noAlerts')}
              hint={t('emptyAlertsHint')}
              preview={
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="text-left">
                    <div className="text-sm font-semibold">BTC</div>
                    <div className="text-xs text-muted-foreground">&gt; 100,000 $</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-500">
                    {t('alertActiveBadge')}
                  </span>
                </div>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
