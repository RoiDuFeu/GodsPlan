import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ChurchListItem } from '@/lib/types';
import { useChurchStore } from '@/store/useChurchStore';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from 'react-i18next';
import { Locate, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapProps {
  churches: ChurchListItem[];
  onChurchClick?: (churchId: string) => void;
}

const DEFAULT_CENTER: [number, number] = [40.7128, -74.0060]; // NYC center
const DEFAULT_ZOOM = 12;

// Custom church icon
const createChurchIcon = (isSelected = false) => {
  const color = isSelected ? 'hsl(262, 83%, 58%)' : 'hsl(262, 83%, 58%)';
  const size = isSelected ? 36 : 32;
  
  return L.divIcon({
    className: 'custom-church-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        ${isSelected ? 'animation: pulse 2s ease-in-out infinite;' : ''}
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" style="
          width: 16px;
          height: 16px;
          transform: rotate(45deg);
        ">
          <path d="M12 2L10 8H8V12H10V22H14V12H16V8H14L12 2Z M11 4.236L11.8 6.764H12.2L13 4.236V4.236L13 7H14V10H10V7H11V4.236Z"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Component to handle map controls and user location
function MapController({ 
  userLocation, 
  selectedChurch, 
  churches 
}: { 
  userLocation: { latitude: number; longitude: number } | null;
  selectedChurch: string | null;
  churches: ChurchListItem[];
}) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.latitude, userLocation.longitude], 14, {
        duration: 1.5
      });
    }
  }, [userLocation, map]);

  useEffect(() => {
    if (selectedChurch && churches.length > 0) {
      const church = churches.find(c => c.id === selectedChurch);
      if (church) {
        const lat = parseFloat(church.latitude);
        const lng = parseFloat(church.longitude);
        map.flyTo([lat, lng], 16, { duration: 1 });
      }
    }
  }, [selectedChurch, churches, map]);

  return null;
}

export function Map({ churches, onChurchClick }: MapProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { userLocation, selectedChurch, setUserLocation, loadNearbyChurches } = useChurchStore();
  const [isLocating, setIsLocating] = useState(false);
  const [mapStyle, setMapStyle] = useState<'light' | 'dark' | 'satellite'>('light');

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(loc);
        loadNearbyChurches(loc.latitude, loc.longitude, 10000);
        setIsLocating(false);
      },
      () => setIsLocating(false)
    );
  };

  const cycleMapStyle = () => {
    setMapStyle(prev => 
      prev === 'light' ? 'dark' : 
      prev === 'dark' ? 'satellite' : 
      'light'
    );
  };

  const getTileLayerUrl = () => {
    switch (mapStyle) {
      case 'dark':
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      default:
        return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    }
  };

  const getTileLayerAttribution = () => {
    if (mapStyle === 'satellite') {
      return '&copy; <a href="https://www.esri.com/">Esri</a>';
    }
    return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full rounded-lg"
        zoomControl={false}
      >
        <TileLayer
          attribution={getTileLayerAttribution()}
          url={getTileLayerUrl()}
          maxZoom={20}
        />

        <MapController 
          userLocation={userLocation} 
          selectedChurch={selectedChurch}
          churches={churches}
        />

        {/* User location marker */}
        {userLocation && (
          <Circle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={100}
            pathOptions={{
              fillColor: 'hsl(262, 83%, 58%)',
              fillOpacity: 0.3,
              color: 'hsl(262, 83%, 58%)',
              weight: 2,
            }}
          />
        )}

        {/* Clustered church markers */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={80}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          zoomToBoundsOnClick
          disableClusteringAtZoom={16}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            const size = count > 50 ? 52 : count > 10 ? 44 : 36;
            
            return L.divIcon({
              html: `
                <div style="
                  background: linear-gradient(135deg, hsl(262, 83%, 58%), hsl(262, 83%, 48%));
                  width: ${size}px;
                  height: ${size}px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: 700;
                  font-size: ${count > 50 ? '16px' : '14px'};
                  transition: all 0.25s ease;
                  cursor: pointer;
                ">
                  ${count}
                </div>
              `,
              className: 'custom-cluster-icon',
              iconSize: [size, size],
            });
          }}
        >
          {churches.map((church) => {
            const lat = parseFloat(church.latitude);
            const lng = parseFloat(church.longitude);
            const isSelected = selectedChurch === church.id;
            
            return (
              <Marker
                key={church.id}
                position={[lat, lng]}
                icon={createChurchIcon(isSelected)}
                eventHandlers={{
                  click: () => onChurchClick?.(church.id),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm">{church.name}</h3>
                    {church.address?.city && (
                      <p className="text-xs text-muted-foreground">{church.address.city}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Map controls */}
      <Card className="absolute top-4 right-4 z-[1000] p-2 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLocateMe}
          disabled={isLocating}
          title={t('map.locateMe')}
        >
          <Locate className={cn('h-5 w-5', isLocating && 'animate-pulse')} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleMapStyle}
          title={t('map.changeStyle')}
        >
          <Layers className="h-5 w-5" />
        </Button>
      </Card>
    </div>
  );
}
