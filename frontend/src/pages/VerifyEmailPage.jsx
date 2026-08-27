import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Bitcoin, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : null;

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }
    if (!API) {
      setStatus('error');
      setMessage('Backend not configured.');
      return;
    }
    fetch(`${API}/auth/verify-email`, { credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(data.detail || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error. Please try again.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
            {status === 'verifying' && <Loader2 className="w-9 h-9 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle className="w-9 h-9 text-long" />}
            {status === 'error' && <XCircle className="w-9 h-9 text-destructive" />}
          </div>
          <CardTitle className="text-xl font-unbounded">
            {status === 'verifying' && t('verifyingEmail')}
            {status === 'success' && t('emailVerifiedSuccess')}
            {status === 'error' && t('emailVerifyErrorTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'verifying' && (
            <p className="text-sm text-muted-foreground">{t('verifyingEmail')}</p>
          )}
          {status === 'success' && (
            <>
              <p className="text-sm text-muted-foreground">{t('emailVerifiedText')}</p>
              <Button asChild className="w-full">
                <Link to="/dashboard">{t('goToDashboard')}</Link>
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" asChild>
                  <Link to="/login">{t('login')}</Link>
                </Button>
                <Button asChild>
                  <Link to="/dashboard">{t('goToDashboard')}</Link>
                </Button>
              </div>
            </>
          )}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Bitcoin className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-unbounded">Trading Calculator PRO</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
