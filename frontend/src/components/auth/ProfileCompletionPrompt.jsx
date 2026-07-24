import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useTranslation, languages } from '@/lib/i18n';
import { getCountryOptions } from '@/lib/countries';
import { toast } from 'sonner';

/**
 * "Complete your profile" step. Google sign-up is one click and never passes
 * through the register form, so those users can arrive without a country. This
 * modal collects country + preferred language for any Google user missing a
 * country, and saves it via the self-profile endpoint. Dismissible ("later"),
 * so it never hard-blocks the app.
 */
export default function ProfileCompletionPrompt() {
  const { t, locale, setLocale } = useTranslation();
  const { isAuthenticated, user, updateProfile } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState(locale);
  const [saving, setSaving] = useState(false);

  // Only Google users without a country need this (email users used the form).
  const needsProfile = Boolean(
    isAuthenticated && user && user.auth_provider === 'google' && !user.country,
  );

  useEffect(() => {
    if (needsProfile && !dismissed) {
      setLanguage(user?.preferred_locale || locale);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [needsProfile, dismissed, user, locale]);

  const countryOptions = useMemo(() => getCountryOptions(locale), [locale]);

  if (!needsProfile) return null;

  const handleSave = async () => {
    if (!country) { toast.error(t('registerCountryPlaceholder')); return; }
    setSaving(true);
    const res = await updateProfile({ country, preferredLocale: language });
    setSaving(false);
    if (res.success) {
      if (language && language !== locale) { try { setLocale(language); } catch (_) {} }
      toast.success(t('profileSaved'));
      setOpen(false);
    } else {
      toast.error(res.error || t('registrationError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setDismissed(true); setOpen(o); }}>
      <DialogContent className="max-w-md" data-testid="profile-completion">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> {t('completeProfileTitle')}
          </DialogTitle>
          <DialogDescription>{t('completeProfileDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="profile-country" className="text-xs uppercase tracking-wider text-muted-foreground">{t('registerCountry')}</Label>
            <select
              id="profile-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-10 rounded-md px-3 bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="profile-country"
            >
              <option value="" disabled>{t('registerCountryPlaceholder')}</option>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-language" className="text-xs uppercase tracking-wider text-muted-foreground">{t('registerLanguage')}</Label>
            <select
              id="profile-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full h-10 rounded-md px-3 bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="profile-language"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { setDismissed(true); setOpen(false); }}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving} data-testid="profile-save">
            {saving ? t('loading') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
