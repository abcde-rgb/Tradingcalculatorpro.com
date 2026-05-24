import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

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
          <Button onClick={() => { window.location.href = '/'; }}>
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
    // Wire up Sentry here when DSN is available:
    // Sentry.captureException(error, { extra: info });
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <ErrorDisplay
        error={this.state.error}
        onRetry={() => this.setState({ hasError: false, error: null })}
      />
    );
  }
}
