import { SearchSidebar } from './components/SearchSidebar';
import { Map } from './components/Map';
import { ChurchDetail } from './components/ChurchDetail';
import { useChurchStore } from './store/useChurchStore';

function App() {
  const { churches, selectedChurch, selectChurch, clearSelectedChurch } = useChurchStore();

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <SearchSidebar onChurchSelect={selectChurch} />

      {/* Map */}
      <div className="flex-1 relative">
        <Map 
          churches={churches}
          onChurchClick={selectChurch}
        />
      </div>

      {/* Church Detail Modal */}
      {selectedChurch && (
        <ChurchDetail
          church={selectedChurch}
          onClose={clearSelectedChurch}
        />
      )}
    </div>
  );
}

export default App;
