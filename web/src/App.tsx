import { useState } from 'react';
import { Header } from '@/components/Header';
import { SearchSidebar } from '@/components/SearchSidebar';
import { Map } from '@/components/Map';
import { ChurchDetail } from '@/components/ChurchDetail';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useChurchStore } from '@/store/useChurchStore';

function App() {
  const { churches, selectedChurch, selectChurch, clearSelectedChurch, searchQuery, setSearchQuery } = useChurchStore();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const handleChurchSelect = (churchId: string) => {
    selectChurch(churchId);
    setMobileSheetOpen(false); // Close mobile sheet when selecting a church
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-96 border-r bg-background z-10 relative">
          <SearchSidebar onChurchSelect={handleChurchSelect} />
        </aside>

        {/* Map */}
        <main className="flex-1 relative z-0">
          <Map 
            churches={churches}
            onChurchClick={handleChurchSelect}
          />

          {/* Mobile: Floating button to open church list */}
          <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={() => setMobileSheetOpen(true)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all font-medium flex items-center gap-2"
              aria-label="Voir la liste des églises"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-5 h-5" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="8" x2="21" y1="6" y2="6" />
                <line x1="8" x2="21" y1="12" y2="12" />
                <line x1="8" x2="21" y1="18" y2="18" />
                <line x1="3" x2="3.01" y1="6" y2="6" />
                <line x1="3" x2="3.01" y1="12" y2="12" />
                <line x1="3" x2="3.01" y1="18" y2="18" />
              </svg>
              <span>Liste des églises</span>
              <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-sm">
                {churches.length}
              </span>
            </button>
          </div>
        </main>

        {/* Mobile Sheet for Church List */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <SearchSidebar onChurchSelect={handleChurchSelect} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Church Detail Modal */}
      <ChurchDetail
        church={selectedChurch}
        onClose={clearSelectedChurch}
      />
    </div>
  );
}

export default App;
