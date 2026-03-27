import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useTranslation } from 'react-i18next';

interface AppHeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function AppHeader({ searchQuery, onSearchChange }: AppHeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [indicatorReady, setIndicatorReady] = useState(false);

  const NAV_ITEMS = [
    { label: t('nav.discover'), icon: 'explore', path: '/' },
    { label: t('nav.saved'), icon: 'bookmark', path: '/saved' },
    { label: t('nav.lectures'), icon: 'menu_book', path: '/lectures' },
    { label: t('nav.profile'), icon: 'person', path: '/profile' },
  ];

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );

  const updateIndicator = useCallback(() => {
    const nav = navRef.current;
    const activeLink = linkRefs.current[activeIndex];
    if (!nav || !activeLink || activeIndex < 0) {
      setIndicatorReady(false);
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    setIndicator({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
    });
    setIndicatorReady(true);
  }, [activeIndex]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  return (
    <>
      <header className="fixed top-0 w-full h-16 md:h-20 glass-panel border-b border-border/30 z-50">
        <div className="h-full w-full px-4 md:px-8 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          {/* Logo - always left */}
          <Link
            to="/"
            className="text-primary font-bold tracking-tighter text-xl md:text-2xl font-headline shrink-0 hover:opacity-80 transition-opacity duration-300"
          >
            {t('brand.name')}
          </Link>

          {/* Center nav - desktop */}
          <div className="hidden md:flex justify-center">
            <nav
              ref={navRef}
              className="relative flex items-center gap-1 bg-surface-container-low/60 backdrop-blur-sm rounded-full px-1.5 py-1.5"
            >
              {/* Sliding indicator */}
              <span
                className={cn(
                  'absolute top-1.5 bottom-1.5 rounded-full sacred-gradient shadow-lg shadow-primary/20 z-0',
                  indicatorReady
                    ? 'transition-all duration-500 cubic-bezier(0.4,0,0.2,1)'
                    : 'opacity-0'
                )}
                style={{ left: indicator.left, width: indicator.width }}
              />

              {NAV_ITEMS.map((item, i) => {
                const isActive = i === activeIndex;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    ref={(el) => { linkRefs.current[i] = el; }}
                    className={cn(
                      'relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ease-out',
                      isActive
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'material-symbols-outlined text-[18px] transition-all duration-300',
                          isActive && 'scale-110'
                        )}
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {item.icon}
                      </span>
                      <span className="hidden lg:inline">{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section - always right */}
          <div className="flex items-center gap-3 justify-end shrink-0">
            {isAuthenticated ? (
              <>
                {/* Search */}
                <div className="relative hidden md:block group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg transition-colors duration-300 group-focus-within:text-primary">
                    search
                  </span>
                  <input
                    className="bg-surface-container-low border border-outline-variant/10 rounded-full pl-10 pr-4 py-2 w-48 focus:w-64 focus:ring-1 focus:ring-primary/50 focus:border-primary/30 text-sm transition-all duration-500 ease-out text-foreground placeholder:text-muted-foreground"
                    placeholder={t('dashboard.searchPlaceholder')}
                    type="text"
                    value={searchQuery || ''}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                  />
                </div>

                {/* User avatar / logout */}
                <button
                  onClick={logout}
                  className="hidden md:flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full hover:bg-surface-bright transition-all duration-300 group"
                  title={t('common.signOut')}
                >
                  <div className="w-7 h-7 rounded-full sacred-gradient flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="material-symbols-outlined text-muted-foreground text-lg group-hover:text-destructive transition-colors duration-300">
                    logout
                  </span>
                </button>
              </>
            ) : (
              /* Login / Register buttons */
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  {t('common.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 rounded-full text-sm font-bold sacred-gradient text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                >
                  {t('common.getStarted')}
                </Link>
              </div>
            )}

            {/* Language & Theme toggles */}
            <LanguageToggle />
            <ThemeToggle />

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-bright transition-all duration-300"
            >
              <span
                className="material-symbols-outlined text-primary transition-transform duration-300"
                style={{ transform: mobileMenuOpen ? 'rotate(90deg)' : 'none' }}
              >
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden transition-all duration-500 ease-out',
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-md"
          onClick={() => setMobileMenuOpen(false)}
        />

        <div
          className={cn(
            'absolute top-16 left-0 right-0 bg-surface-container-low border-b border-border/30 shadow-2xl transition-all duration-500 ease-out',
            mobileMenuOpen
              ? 'translate-y-0 opacity-100'
              : '-translate-y-4 opacity-0'
          )}
        >
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item, index) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300',
                    isActive
                      ? 'bg-primary-container text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-bright/50'
                  )}
                  style={{
                    transitionDelay: mobileMenuOpen ? `${index * 50}ms` : '0ms',
                    transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-12px)',
                    opacity: mobileMenuOpen ? 1 : 0,
                  }}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* Auth actions in mobile menu */}
            {!isAuthenticated && (
              <div
                className="pt-3 mt-3 border-t border-border/30 flex gap-2"
                style={{
                  transitionDelay: mobileMenuOpen ? `${NAV_ITEMS.length * 50}ms` : '0ms',
                  opacity: mobileMenuOpen ? 1 : 0,
                  transition: 'opacity 300ms ease-out',
                }}
              >
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-bright/50 transition-all duration-300"
                >
                  {t('common.signIn')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center px-4 py-3 rounded-xl text-sm font-bold sacred-gradient text-primary-foreground transition-all duration-300"
                >
                  {t('common.getStarted')}
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
