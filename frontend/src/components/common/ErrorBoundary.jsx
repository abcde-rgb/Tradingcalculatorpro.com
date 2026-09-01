import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { homeUrl, reloadFreshShell } from '@/lib/appShell';
import { reportarError } from '@/lib/reportarError';

function ErrorDisplay({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t('errorBoundaryTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('errorBoundaryDesc')}</p>
        </div>
        {process.env.NODE_ENV !== 'production' && error && (
          <pre className="text-left text-xs bg-muted rounded-lg p-4 overflow-auto max-h-40 text-destructive">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {t('errorBoundaryRetry')}
          </Button>
          {/* NOT '/': on GitHub Pages the app lives under a sub-path, so a
              hardcoded root is a 404 — from the error screen itself. */}
          <Button onClick={() => { window.location.href = homeUrl(); }}>
            {t('backHome')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // La consola sólo la ve quien tiene las devtools abiertas, es decir: nadie
    // de los que se comen el error. `reportarError` lo deja en el Monitor de
    // Errores del panel de admin (Sistema), agrupado por huella y con el
    // contador de veces. No se espera, no lanza y no puede tumbar esta pantalla.
    reportarError(error, { componentStack: info?.componentStack, source: 'boundary' });
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <ErrorDisplay
        error={this.state.error}
        // A missing chunk does not come back by re-rendering: the file is gone
        // from the server. Retry has to fetch a fresh shell, or the button
        // just redraws the same error.
        onRetry={() => reloadFreshShell()}
      />
    );
  }
}
