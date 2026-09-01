import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';

/** Paywall card shown when the user is not premium. */
export default function SimulatorLocked() {
  const { t } = useTranslation();
  return (
    <Card className="bg-card border-border" data-testid="simulator-pro-locked">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-info" />
          </div>
          {t('simulator')} Pro
          <Crown className="w-4 h-4 text-caution" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">{t('funcionPremium_bb683a')}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Simula operaciones en fases progresivas con configuración avanzada.
          </p>
          <Link to="/pricing">
            <Button className="gap-2">
              <Crown className="w-4 h-4" /> Desbloquear Premium
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
