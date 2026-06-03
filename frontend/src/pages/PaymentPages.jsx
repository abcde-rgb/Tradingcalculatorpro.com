import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';

const API = process.env.REACT_APP_BACKEND_URL;

export const PaymentSuccessPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, refreshUser } = useAuthStore();
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);
  const attemptsRef = useRef(0);
  const retryTimerRef = useRef(null);
  const mountedRef = useRef(true);
  
  const sessionId = searchParams.get('session_id');

  const checkStatus = useCallback(async () => {
    if (!sessionId || !token) {
      setStatus('error');
      return;
    }
    
    try {
      const response = await fetch(`${API}/api/checkout/status/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.payment_status === 'paid') {
        if (mountedRef.current) setStatus('success');
        try { window.gtag?.('event', 'purchase', { transaction_id: sessionId }); } catch (_) {}
        await refreshUser();
      } else if (attemptsRef.current < 15) {
        attemptsRef.current += 1;
        if (mountedRef.current) {
          setAttempts(attemptsRef.current);
          retryTimerRef.current = setTimeout(() => checkStatus(), 3000);
        }
      } else {
        if (mountedRef.current) setStatus('pending');
      }
    } catch (error) {
      if (mountedRef.current) setStatus('error');
    }
  }, [sessionId, token, refreshUser]);

  useEffect(() => {
    mountedRef.current = true;
    checkStatus();
    return () => {
      mountedRef.current = false;
      clearTimeout(retryTimerRef.current);
    };
  }, [checkStatus]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardContent className="p-8 text-center">
          {status === 'checking' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
              <h2 className="text-xl font-bold mb-2">Verificando pago...</h2>
              <p className="text-zinc-400">{t('porFavorEsperaMientrasConfirmamos_b1b193')}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-bold mb-2">{t('pagoCompletado_8f3808')}</h2>
              <p className="text-zinc-400 mb-6">{t('tuCuentaHaSidoActualizada_ccea28')}</p>
              <Button onClick={() => navigate('/dashboard')} className="bg-primary text-black">
                Ir al Dashboard
              </Button>
            </>
          )}
          
          {status === 'pending' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-xl font-bold mb-2">Pago en Proceso</h2>
              <p className="text-zinc-400 mb-6">{t('tuPagoEstaSiendoProcesado_e1da9e')}</p>
              <Button onClick={() => navigate('/dashboard')} variant="outline">
                Ir al Dashboard
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-bold mb-2">Error</h2>
              <p className="text-zinc-400 mb-6">{t('noPudimosVerificarTuPago_0c114f')}</p>
              <Button onClick={() => navigate('/pricing')} variant="outline">
                Volver a Intentar
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const PaymentCancelPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardContent className="p-8 text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-zinc-500" />
          <h2 className="text-xl font-bold mb-2">Pago Cancelado</h2>
          <p className="text-zinc-400 mb-6">{t('hasCanceladoElProcesoDe_c37e10')}</p>
          <div className="space-y-2">
            <Button onClick={() => navigate('/pricing')} className="w-full bg-primary text-black">
              Ver Planes
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              {t('goToDashboard') || 'Ir al Dashboard'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
