import { useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { usePriceStore } from '@/lib/store';
import { formatNumber, formatPercentage } from '@/lib/utils';

const CRYPTO_CONFIG = [
  { id: 'bitcoin', symbol: 'BTC', color: 'bg-orange-500' },
  { id: 'ethereum', symbol: 'ETH', color: 'bg-blue-500' },
  { id: 'solana', symbol: 'SOL', color: 'bg-purple-500' },
  { id: 'binancecoin', symbol: 'BNB', color: 'bg-yellow-500' },
  { id: 'ripple', symbol: 'XRP', color: 'bg-gray-400' },
  { id: 'cardano', symbol: 'ADA', color: 'bg-blue-400' },
  { id: 'dogecoin', symbol: 'DOGE', color: 'bg-yellow-400' },
  { id: 'avalanche-2', symbol: 'AVAX', color: 'bg-red-500' },
  { id: 'polkadot', symbol: 'DOT', color: 'bg-pink-500' },
  { id: 'chainlink', symbol: 'LINK', color: 'bg-blue-300' },
  { id: 'litecoin', symbol: 'LTC', color: 'bg-gray-300' },
  { id: 'gold', symbol: 'XAU', color: 'bg-yellow-600' },
];

export const PriceTicker = () => {
  const { prices, fetchPrices, isLoading } = usePriceStore();

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const formatPrice = (price) => {
    if (!price) return '$0';
    if (price >= 1000) return `$${price.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${price.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  };

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {CRYPTO_CONFIG.map(crypto => {
          const data = prices?.[crypto.id];
          // Una moneda que el backend no ha podido leer no sale. Antes caía a
          // `|| 0` y se pintaba "$0", que no es "no lo sé": es un precio.
          if (!data || !data.usd) return null;
          const price = data.usd;
          // La variación sí puede faltar teniendo precio (el proveedor no
          // siempre la da). Sin ella no se pinta flecha ni porcentaje.
          const change = typeof data.usd_24h_change === 'number' ? data.usd_24h_change : null;

          return (
            <div 
              key={crypto.id} 
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111111] border border-[#222222] hover:border-white/20 transition-colors min-w-[160px]"
            >
              <div className={`w-8 h-8 rounded-lg ${crypto.color} flex items-center justify-center`}>
                <span className="text-xs font-bold text-black">{crypto.symbol.substring(0, 2)}</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{crypto.symbol}</span>
                  {change === null ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <span className={`flex items-center gap-0.5 text-xs ${change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPercentage(change)}
                    </span>
                  )}
                </div>
                <span className="font-mono text-lg font-semibold">{formatPrice(price)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
