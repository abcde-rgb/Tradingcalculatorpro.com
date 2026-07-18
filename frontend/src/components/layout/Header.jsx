import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, Menu, X, Moon, Sun, Globe, LogOut, User, Crown, ChevronDown, Shield, Bell, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store';
import { useThemeStore } from '@/lib/theme';
import { useTranslation, languages } from '@/lib/i18n';
import { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, setTheme, initTheme } = useThemeStore();
  const { locale, setLocale, t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const navLinks = [
    { href: '/dashboard', label: t('dashboard'), requireAuth: true },
    { href: '/options', label: t('options'), requireAuth: false },
    { href: '/performance', label: t('performance'), requireAuth: false },
    { href: '/pricing', label: t('pricing'), requireAuth: false },
    { href: '/education', label: t('education'), requireAuth: false },
  ];

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = useCallback(async () => {
    const token = useAuthStore.getState().token;
    if (!BACKEND_URL || !token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(
          data.map(a => ({
            id: a.id,
            msg: `${a.symbol} ${a.condition === 'above' ? '↑' : '↓'} $${a.target_price?.toLocaleString()}`,
            time: a.triggered_at ? new Date(a.triggered_at).toLocaleTimeString() : '',
            read: !!a.read,
          }))
        );
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchAlerts();
  }, [isAuthenticated, fetchAlerts]);

  const unreadCount = alerts.filter(a => !a.read).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isPremium = user?.is_premium;
  // El programa de afiliados solo se activa para suscriptores de PAGO (no en la prueba de 7 días).
  const isPayingMember = !!user?.is_premium && user?.subscription_status !== 'trialing';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="font-unbounded font-bold text-lg hidden sm:block">
              Trading Calculator <span className="text-primary">PRO</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              if (link.requireAuth && !isAuthenticated) return null;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                  data-testid={`nav-${link.href.slice(1)}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex" data-testid="theme-toggle">
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="w-4 h-4 mr-2" /> {t('lightMode')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="w-4 h-4 mr-2" /> {t('darkMode')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Globe className="w-4 h-4 mr-2" /> {t('systemMode')}
                </DropdownMenuItem>
                <div className="my-1 h-px bg-border" />
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('premiumThemes')}</div>
                {[
                  { id: 'gold', label: t('goldMode'), sw: 'linear-gradient(135deg,#181614,#c9a24a 70%,#e8c46a)' },
                  { id: 'crypto', label: t('cryptoMode'), sw: 'linear-gradient(135deg,#0a0912,#f7931a 55%,#8b5cf6)' },
                  { id: 'forex', label: t('forexMode'), sw: 'linear-gradient(135deg,#060b16,#1e8f5a 60%,#3b82f6)' },
                  { id: 'nasdaq', label: t('nasdaqMode'), sw: 'linear-gradient(135deg,#05070a,#00c2ff)' },
                ].map((th) => (
                  <DropdownMenuItem key={th.id} onClick={() => setTheme(th.id)} data-testid={`theme-${th.id}`}>
                    <span className="w-4 h-4 mr-2 rounded-full border border-white/20 shrink-0" style={{ background: th.sw }} />
                    {th.label}
                    {theme === th.id && <span className="ml-auto text-primary">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex" data-testid="language-toggle">
                  <Globe className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map(lang => (
                  <DropdownMenuItem 
                    key={lang.code}
                    onClick={() => setLocale(lang.code)}
                    className={locale === lang.code ? 'bg-primary/10' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span> {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notification Bell */}
            {isAuthenticated && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex"
                  onClick={() => setAlertsOpen(!alertsOpen)}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                {alertsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                      <span className="text-sm font-semibold">{t('notifications')}</span>
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => setAlerts(a => a.map(x => ({ ...x, read: true })))}
                      >
                        {t('markAllRead')}
                      </button>
                    </div>
                    {alerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`px-4 py-3 flex gap-3 items-start cursor-pointer hover:bg-muted transition-colors ${!alert.read ? 'bg-primary/5' : ''}`}
                        onClick={() => setAlerts(a => a.map(x => x.id === alert.id ? { ...x, read: true } : x))}
                      >
                        <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${!alert.read ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-sm">{alert.msg}</p>
                          <p className="text-xs text-muted-foreground">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2 border-t border-border">
                      <Link
                        to="/dashboard?tab=alerts"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setAlertsOpen(false)}
                      >
                        {t('viewAllAlerts')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth Section */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2" data-testid="user-menu">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="hidden sm:block text-sm">{user?.name || t('userFallback')}</span>
                    {isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    {isPremium && (
                      <div className="flex items-center gap-1 mt-1">
                        <Crown className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-yellow-500">
                          {user?.subscription_plan === 'lifetime' ? 'Lifetime' : 'Premium'}
                        </span>
                      </div>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">{t('dashboard')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">{t('settings')}</Link>
                  </DropdownMenuItem>
                  {isPayingMember && (
                    <DropdownMenuItem asChild>
                      <Link to="/affiliate" className="gap-2" data-testid="user-menu-affiliate">
                        <Users className="w-4 h-4 text-primary" /> {t('affMenuLabel')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user?.is_admin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="gap-2" data-testid="user-menu-admin">
                        <Shield className="w-4 h-4 text-primary" /> {t('adminMenuLabel')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {!isPremium && (
                    <DropdownMenuItem asChild>
                      <Link to="/pricing" className="text-primary">
                        <Crown className="w-4 h-4 mr-2" /> {t('upgrade')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" data-testid="login-btn">
                    {t('login')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-primary text-primary-foreground" data-testid="register-btn">
                    {t('register')}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-2">
              {navLinks.map(link => {
                if (link.requireAuth && !isAuthenticated) return null;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="flex items-center gap-2 px-4 pt-2 border-t border-border mt-2">
                <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Globe className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {languages.map(lang => (
                      <DropdownMenuItem 
                        key={lang.code}
                        onClick={() => setLocale(lang.code)}
                      >
                        <span className="mr-2">{lang.flag}</span> {lang.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
