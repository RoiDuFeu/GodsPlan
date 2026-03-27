import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const NAV_ITEMS = [
    { label: t('nav.explore'), icon: 'map', path: '/' },
    { label: t('nav.saved'), icon: 'favorite', path: '/saved' },
    { label: t('nav.schedule'), icon: 'event', path: '/mass-times' },
    { label: t('nav.profile'), icon: 'person_2', path: '/profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-16 px-4 glass-panel border-t border-border/30 z-50">
      {NAV_ITEMS.map((item) => {
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center transition-all duration-300',
              isActive
                ? 'text-primary scale-105'
                : 'text-muted-foreground opacity-60'
            )}
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="font-label text-[10px] font-medium uppercase tracking-tighter">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
