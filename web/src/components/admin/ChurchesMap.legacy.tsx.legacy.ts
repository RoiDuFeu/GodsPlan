import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icons based on reliability score
const createCustomIcon = (score: number) => {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <div style="
          transform: rotate(45deg);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        ">${Math.round(score)}</div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
};

interface ChurchMapData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  score: number;
  schedulesCount: number;
  phone: string | null;
}

interface ChurchesMapProps {
  churches: ChurchMapData[];
}

export function ChurchesMap({ churches }: ChurchesMapProps) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  // Paris center coordinates
  const parisCenter: [number, number] = [48.8566, 2.3522];

  if (!mapReady || churches.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">Chargement de la carte...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border">
      <MapContainer
        center={parisCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {churches.map((church) => (
          <Marker
            key={church.id}
            position={[church.lat, church.lng]}
            icon={createCustomIcon(church.score)}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-sm mb-2">{church.name}</h3>
                <div className="text-xs space-y-1">
                  <p>
                    <span className="font-semibold">Score:</span> {church.score.toFixed(1)}
                  </p>
                  <p>
                    <span className="font-semibold">Horaires:</span> {church.schedulesCount}
                  </p>
                  {church.phone && (
                    <p>
                      <span className="font-semibold">Tél:</span> {church.phone}
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
