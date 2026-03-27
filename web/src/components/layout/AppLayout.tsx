import { useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { PageTransition } from './PageTransition';
import { useChurchStore } from '@/store/useChurchStore';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const location = useLocation();
  const { searchQuery, setSearchQuery } = useChurchStore();
  const isDashboard = location.pathname === '/';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      <AppHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <main
        className={cn(
          'flex-1 pt-16 md:pt-20',
          isDashboard
            ? 'overflow-hidden'
            : 'overflow-y-auto no-scrollbar'
        )}
      >
        <PageTransition />
      </main>
    </div>
  );
}
