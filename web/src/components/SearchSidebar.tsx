import { useEffect, useState } from 'react';
import { MapPin, Loader2, Church } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChurchCard } from '@/components/ChurchCard';
import { ChurchListSkeleton } from '@/components/ChurchListSkeleton';
import { useChurchStore } from '@/store/useChurchStore';

interface SearchSidebarProps {
  onChurchSelect: (churchId: string) => void;
}

export function SearchSidebar({ onChurchSelect }: SearchSidebarProps) {
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
    <div className="flex h-full flex-col bg-background border-r">
      {/* Sticky Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-6 space-y-4">
          {/* Geolocation button */}
          <Button
            onClick={handleGeolocation}
            disabled={isLocating}
            variant={userLocation ? "default" : "outline"}
            className="w-full justify-start gap-2.5 h-12 shadow-sm"
            aria-label="Trouver les églises à proximité"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">Localisation en cours...</span>
              </>
            ) : userLocation ? (
              <>
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Actualiser ma position</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Me localiser</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-semibold">Erreur</p>
              <p className="text-xs mt-1 leading-relaxed">{error}</p>
            </div>
          )}

          {isLoading && !churches.length ? (
            <ChurchListSkeleton />
          ) : filteredChurches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="rounded-full bg-muted p-6 mb-6">
                <Church className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2 leading-tight">Aucune église trouvée</h3>
              <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
                Essayez de vous localiser ou modifiez votre recherche pour découvrir des églises à proximité
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-in">
              {filteredChurches.map((church, index) => (
                <div key={church.id}>
                  <ChurchCard
                    church={church}
                    onClick={() => onChurchSelect(church.id)}
                    isSelected={selectedChurch?.id === church.id}
                  />
                  {/* Separator entre les cards (sauf après la dernière) */}
                  {index < filteredChurches.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      {!isLoading && filteredChurches.length > 0 && (
        <>
          <Separator />
          <div className="flex-shrink-0 p-4 text-center bg-muted/30">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{filteredChurches.length}</span>
              {' '}église{filteredChurches.length > 1 ? 's' : ''} affichée{filteredChurches.length > 1 ? 's' : ''}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
