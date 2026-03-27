import { AppHeader } from './AppHeader';
import { PageTransition } from './PageTransition';
import { useChurchStore } from '@/store/useChurchStore';

export function DashboardLayout() {
  const { searchQuery, setSearchQuery } = useChurchStore();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      <AppHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <div className="flex-1 overflow-hidden pt-16 md:pt-20">
        <PageTransition />
      </div>
    </div>
  );
}
