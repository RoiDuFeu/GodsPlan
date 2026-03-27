import { useState } from 'react';
import { Map } from '@/components/Map';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { useChurchStore } from '@/store/useChurchStore';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type MobilePanelState = 'peek' | 'half' | 'full';

export function DashboardPage() {
  const { t } = useTranslation();
  const { churches, selectChurch, selectedChurch, searchQuery, setSearchQuery } = useChurchStore();
  const [panelState, setPanelState] = useState<MobilePanelState>('peek');
  const [dragStartY, setDragStartY] = useState<number | null>(null);

  const handleChurchSelect = (id: string) => {
    selectChurch(id);
    // On mobile, expand to half when selecting from map
    if (panelState === 'peek') setPanelState('half');
  };

  // Simple touch-based drag handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartY === null) return;
    const deltaY = dragStartY - e.changedTouches[0].clientY;
    const threshold = 50;

    if (deltaY > threshold) {
      // Swiped up
      setPanelState(prev => prev === 'peek' ? 'half' : 'full');
    } else if (deltaY < -threshold) {
      // Swiped down
      setPanelState(prev => prev === 'full' ? 'half' : 'peek');
    }
    setDragStartY(null);
  };

  const panelHeight = {
    peek: 'h-[4.5rem]',
    half: 'h-[50vh]',
    full: 'h-[calc(100vh-4rem)]', // full minus header
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden relative">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[28rem] z-10 relative border-r border-border/30 shrink-0 h-full">
        <DashboardSidebar
          onChurchSelect={(id) => selectChurch(id)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </aside>

      {/* Map — full height on both mobile and desktop */}
      <div className="flex-1 relative z-0 h-full">
        <Map
          churches={churches}
          onChurchClick={handleChurchSelect}
        />
      </div>

      {/* Mobile bottom panel */}
      <div
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background rounded-t-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.3)] border-t border-border/30',
          'transition-all duration-500 ease-out',
          panelHeight[panelState],
        )}
      >
        {/* Drag handle */}
        <div
          className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setPanelState(prev => prev === 'peek' ? 'half' : prev === 'half' ? 'full' : 'half')}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />

          {/* Peek bar — visible info when collapsed */}
          {panelState === 'peek' && (
            <div className="w-full px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
                <span className="font-headline font-bold text-sm">
                  {selectedChurch ? selectedChurch.name : `${churches.length} ${t('dashboard.sanctuaries')}`}
                </span>
              </div>
              <span className="material-symbols-outlined text-muted-foreground text-lg">expand_less</span>
            </div>
          )}
        </div>

        {/* Panel content */}
        {panelState !== 'peek' && (
          <div className="h-[calc(100%-2.5rem)] overflow-hidden">
            <DashboardSidebar
              onChurchSelect={(id) => {
                selectChurch(id);
                setPanelState('half');
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}
      </div>
    </div>
  );
}
