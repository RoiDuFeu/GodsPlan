import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function SideNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const NAV_ITEMS = [
    { label: t('nav.discover'), icon: 'explore', path: '/' },
    { label: t('nav.saved'), icon: 'bookmark', path: '/saved' },
    { label: t('nav.massTimes'), icon: 'schedule', path: '/mass-times' },
    { label: t('nav.todaysLectures'), icon: 'menu_book', path: '/lectures' },
  ];

  return (
    <aside className="h-full w-72 hidden md:flex flex-col p-6 space-y-8 bg-background border-r border-border/30 shrink-0">
      <div className="space-y-1 px-2">
        <h2 className="text-primary font-bold font-headline tracking-tight">{t('brand.sovereignEssence')}</h2>
        <p className="font-label uppercase tracking-[0.1em] text-[0.6875rem] text-muted-foreground">
          {t('brand.digitalSanctuary')}
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300',
                'font-label uppercase tracking-[0.1em] text-[0.6875rem]',
                isActive
                  ? 'text-primary bg-primary-container'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Link
          to="/"
          className="w-full sacred-gradient text-primary-foreground font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-xs font-label uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-lg">church</span>
          {t('nav.findParish')}
        </Link>
      </div>
    </aside>
  );
}
