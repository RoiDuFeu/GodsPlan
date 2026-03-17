import { useState, useEffect } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChurchCard } from './ChurchCard';
import { useChurchStore } from '../store/useChurchStore';

interface SearchSidebarProps {
  onChurchSelect: (churchId: string) => void;
}

export function SearchSidebar({ onChurchSelect }: SearchSidebarProps) {
  const {
    churches,
    isLoading,
    error,
    searchQuery,
    userLocation,
    setSearchQuery,
    setUserLocation,
    loadChurches,
    loadNearbyChurches,
    getFilteredChurches,
    selectedChurch,
  } = useChurchStore();

  const [isLocating, setIsLocating] = useState(false);
  const filteredChurches = getFilteredChurches();

  // Load churches on mount
  useEffect(() => {
    loadChurches();
  }, [loadChurches]);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

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
      (error) => {
        console.error('Geolocation error:', error);
        alert('Impossible d\'obtenir votre position. Vérifiez les permissions.');
        setIsLocating(false);
      }
    );
  };

  return (
    <div className="w-full md:w-96 h-full bg-background border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold mb-4">GodsPlan</h1>
        
        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher une église..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Rechercher une église"
          />
        </div>

        {/* Geolocation button */}
        <Button
          onClick={handleGeolocation}
          disabled={isLocating}
          variant="outline"
          className="w-full"
          aria-label="Trouver les églises à proximité"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Localisation...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              {userLocation ? 'Actualiser ma position' : 'Me localiser'}
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border-b">
            {error}
          </div>
        )}

        {isLoading && !churches.length && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !error && filteredChurches.length === 0 && searchQuery && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Aucune église trouvée pour "{searchQuery}"
          </div>
        )}

        <div className="p-4 space-y-3">
          {filteredChurches.map((church) => (
            <ChurchCard
              key={church.id}
              church={church}
              onClick={() => onChurchSelect(church.id)}
              isSelected={selectedChurch?.id === church.id}
            />
          ))}
        </div>

        {!isLoading && churches.length > 0 && (
          <div className="p-4 text-xs text-muted-foreground text-center border-t">
            {filteredChurches.length} église{filteredChurches.length > 1 ? 's' : ''} affichée{filteredChurches.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
