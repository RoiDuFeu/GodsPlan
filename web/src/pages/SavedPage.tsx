import { useEffect, useState, useRef } from 'react';
import { useChurchStore } from '@/store/useChurchStore';
import { ChurchDetailPanel } from '@/components/ChurchDetailPanel';
import { formatDistance } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function SavedPage() {
  const { t } = useTranslation();
  const { churches, selectedChurch, selectChurch, clearSelectedChurch, loadChurches, isLoading } = useChurchStore();
  const [animClass, setAnimClass] = useState('');
  const prevView = useRef<'grid' | 'detail'>('grid');

  useEffect(() => {
    if (churches.length === 0) loadChurches();
  }, [churches.length, loadChurches]);

  const savedChurches = churches.slice(0, 6);

  const currentView = selectedChurch ? 'detail' : 'grid';

  // Trigger animation on view change
  useEffect(() => {
    if (currentView !== prevView.current) {
      setAnimClass(
        currentView === 'detail' ? 'sidebar-slide-left-enter' : 'sidebar-slide-right-enter'
      );
      prevView.current = currentView;
    }
  }, [currentView]);

  const handleSelect = (id: string) => {
    setAnimClass('sidebar-slide-left-enter');
    selectChurch(id);
  };

  const handleBack = () => {
    setAnimClass('sidebar-slide-right-enter');
    clearSelectedChurch();
  };

  if (selectedChurch) {
    return (
      <div
        key="detail"
        className={`h-full ${animClass}`}
        onAnimationEnd={() => setAnimClass('')}
      >
        <div className="max-w-3xl mx-auto h-full">
          <ChurchDetailPanel church={selectedChurch} onBack={handleBack} />
        </div>
      </div>
    );
  }

  return (
    <div
      key="grid"
      className={`p-4 md:p-8 lg:p-16 min-h-full ${animClass}`}
      onAnimationEnd={() => setAnimClass('')}
    >
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 md:mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
          <h1 className="text-3xl md:text-[3.5rem] font-headline font-extrabold text-primary tracking-tighter leading-none">
            {t('saved.title')}<br className="hidden md:block" /> {t('saved.sanctuaries')}
          </h1>
          <p className="text-on-surface-variant max-w-md font-light leading-relaxed opacity-80 md:border-l md:border-outline-variant/30 md:pl-6 text-sm md:text-base">
            {t('saved.description')}
          </p>
        </div>
      </header>

      {/* Grid */}
      <div className="max-w-7xl mx-auto">
        {isLoading && savedChurches.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-container-low rounded-xl h-80 md:h-96 animate-shimmer" />
            ))}
          </div>
        ) : savedChurches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 md:py-32 text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 mb-6 md:mb-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="material-symbols-outlined text-4xl md:text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-headline font-bold mb-4">{t('saved.noSaved')}</h2>
            <p className="text-on-surface-variant max-w-sm mb-8 md:mb-10 opacity-70 text-sm md:text-base">
              {t('saved.noSavedDescription')}
            </p>
            <button className="px-8 md:px-10 py-3 md:py-4 sacred-gradient text-primary-foreground font-bold rounded-md font-label uppercase tracking-[0.2em] text-xs hover:shadow-lg hover:shadow-primary/20 transition-all">
              {t('saved.discoverParishes')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {savedChurches.map((church) => {
              const addressString = [church.address.street, church.address.city].filter(Boolean).join(', ');
              return (
                <div
                  key={church.id}
                  className="group relative bg-surface-container-low rounded-xl overflow-hidden transition-all duration-500 hover-lift cursor-pointer"
                  onClick={() => handleSelect(church.id)}
                >
                  {/* Image placeholder */}
                  <div className="relative h-40 sm:h-48 md:h-64 overflow-hidden bg-surface-container">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-5xl md:text-6xl text-muted-foreground/20 group-hover:scale-110 transition-transform duration-700" style={{ fontVariationSettings: "'FILL' 1" }}>church</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent" />
                    <button className="absolute top-3 right-3 md:top-4 md:right-4 bg-background/40 backdrop-blur-md p-1.5 md:p-2 rounded-full text-primary border border-border/10">
                      <span className="material-symbols-outlined text-lg md:text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    </button>
                  </div>

                  <div className="p-4 md:p-6">
                    <div className="flex justify-between items-start mb-2 md:mb-4">
                      <h3 className="text-base md:text-xl font-headline font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                        {church.name}
                      </h3>
                      <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 md:py-1 rounded text-primary ml-2 shrink-0">
                        <span className="material-symbols-outlined text-[10px] md:text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        <span className="text-[10px] md:text-[0.6875rem] font-bold tracking-widest">{church.reliabilityScore}%</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-3">
                      <div className="flex items-center gap-2 text-on-surface-variant text-xs md:text-sm">
                        <span className="material-symbols-outlined text-base md:text-lg opacity-60">location_on</span>
                        <span className="line-clamp-1">{addressString}{church.distance ? ` \u2022 ${formatDistance(church.distance)}` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant text-xs md:text-sm">
                        <span className="material-symbols-outlined text-base md:text-lg opacity-60">event_repeat</span>
                        <span className="font-medium">{t('saved.nextMass')} <span className="text-foreground">Today at 18:30</span></span>
                      </div>
                    </div>

                    <div className="mt-4 md:mt-6 flex gap-2 md:gap-3">
                      <button className="flex-1 bg-surface-container-high hover:bg-surface-bright text-[10px] md:text-xs font-label uppercase tracking-widest py-2.5 md:py-3 rounded-md transition-colors border border-outline-variant/10">
                        {t('common.details')}
                      </button>
                      <button className="flex-1 sacred-gradient text-primary-foreground text-[10px] md:text-xs font-label uppercase tracking-widest py-2.5 md:py-3 rounded-md font-bold transition-opacity hover:opacity-90">
                        {t('common.directions')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
