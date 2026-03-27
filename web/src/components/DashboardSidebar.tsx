import { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChurchCard } from '@/components/ChurchCard';
import { ChurchDetailPanel } from '@/components/ChurchDetailPanel';
import { ChurchListSkeleton } from '@/components/ChurchListSkeleton';
import { useChurchStore } from '@/store/useChurchStore';
import { useTranslation } from 'react-i18next';

interface DashboardSidebarProps {
  onChurchSelect: (churchId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DashboardSidebar({ onChurchSelect, searchQuery, onSearchChange }: DashboardSidebarProps) {
  const { t } = useTranslation();
  const {
    churches,
    isLoading,
    error,
    userLocation,
    setUserLocation,
    loadChurches,
    loadNearbyChurches,
    getFilteredChurches,
    selectedChurch,
    clearSelectedChurch,
  } = useChurchStore();

  const [isLocating, setIsLocating] = useState(false);
  const filteredChurches = getFilteredChurches();
  const containerRef = useRef<HTMLDivElement>(null);

  // Track transition direction
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [animClass, setAnimClass] = useState('');

  useEffect(() => {
    loadChurches();
  }, [loadChurches]);

  // Sync view with selectedChurch
  useEffect(() => {
    if (selectedChurch && view === 'list') {
      setAnimClass('sidebar-slide-left-enter');
      setView('detail');
    } else if (!selectedChurch && view === 'detail') {
      setAnimClass('sidebar-slide-right-enter');
      setView('list');
    }
  }, [selectedChurch, view]);

  const handleBack = () => {
    setAnimClass('sidebar-slide-right-enter');
    clearSelectedChurch();
  };

  const handleSelect = (churchId: string) => {
    setAnimClass('sidebar-slide-left-enter');
    onChurchSelect(churchId);
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(location);
        loadNearbyChurches(location.latitude, location.longitude, 10000);
        setIsLocating(false);
      },
      () => setIsLocating(false)
    );
  };

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-background overflow-hidden relative">
      {/* Animated content wrapper */}
      <div
        key={view}
        className={`flex-1 flex flex-col min-h-0 ${animClass}`}
        onAnimationEnd={() => setAnimClass('')}
      >
        {selectedChurch ? (
          <ChurchDetailPanel church={selectedChurch} onBack={handleBack} />
        ) : (
          /* List view */
          <>
            {/* Header */}
            <div className="flex-shrink-0 p-5 md:p-6 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl md:text-2xl font-extrabold font-headline tracking-tight">{t('dashboard.nearbySanctuaries')}</h1>
                {filteredChurches.length > 0 && (
                  <span className="bg-primary-container text-primary text-[10px] px-2 py-0.5 font-bold tracking-widest rounded-full uppercase">
                    {filteredChurches.length} {t('dashboard.found')}
                  </span>
                )}
              </div>
              <p className="text-sm text-on-surface-variant font-medium">
                {t('dashboard.discoverDescription')}
              </p>

              {/* Search */}
              <div className="relative mt-3 md:mt-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">search</span>
                <input
                  className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary transition-all text-foreground placeholder:text-muted-foreground"
                  placeholder={t('dashboard.searchPlaceholder')}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>

              {/* Geolocation */}
              <button
                onClick={handleGeolocation}
                disabled={isLocating}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 border border-border hover:bg-surface-bright text-foreground"
              >
                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isLocating ? 'hourglass_empty' : 'my_location'}
                </span>
                {isLocating ? t('dashboard.locating') : userLocation ? t('dashboard.refreshLocation') : t('dashboard.locateMe')}
              </button>
            </div>

            {/* Church List */}
            <ScrollArea className="flex-1">
              <div className="p-3 md:p-4 space-y-3 md:space-y-4">
                {error && (
                  <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                    <p className="font-semibold">{t('common.error')}</p>
                    <p className="text-xs mt-1">{error}</p>
                  </div>
                )}

                {isLoading && !churches.length ? (
                  <ChurchListSkeleton />
                ) : filteredChurches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4">church</span>
                    <h3 className="font-semibold text-lg mb-2 font-headline">{t('dashboard.noSanctuaries')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.noSanctuariesDesc')}
                    </p>
                  </div>
                ) : (
                  filteredChurches.map((church) => (
                    <ChurchCard
                      key={church.id}
                      church={church}
                      onClick={() => handleSelect(church.id)}
                      isSelected={false}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}
