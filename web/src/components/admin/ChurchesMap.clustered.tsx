/**
 * ChurchesMap.clustered.tsx
 * 
 * Clustered version of ChurchesMap.tsx using react-leaflet-cluster
 * This is for the ADMIN dashboard to handle large datasets.
 * 
 * To deploy:
 * 1. Install dependency: npm install react-leaflet-cluster
 * 2. Rename current ChurchesMap.tsx to ChurchesMap.legacy.tsx (backup)
 * 3. Rename this file to ChurchesMap.tsx
 * 4. Test with admin dashboard
 */

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
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
        
        {/* 🆕 MarkerClusterGroup wraps all markers */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}        // Less aggressive than user map (admin needs detail)
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={true}   // Show cluster bounds (useful for admin)
          zoomToBoundsOnClick={true}
          disableClusteringAtZoom={15} // Earlier unclustering for admin analysis
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            
            // Calculate average reliability score for cluster
            const markers = cluster.getAllChildMarkers();
            let totalScore = 0;
            let validScores = 0;
            
            markers.forEach((marker) => {
              const score = (marker.options as any).score;
              if (typeof score === 'number') {
                totalScore += score;
                validScores++;
              }
            });
            
            const avgScore = validScores > 0 ? totalScore / validScores : 50;
            
            // Color based on average reliability
            const color = avgScore >= 80 ? '#22c55e' : 
                         avgScore >= 50 ? '#f59e0b' : '#ef4444';
            
            // Size based on count
            const size = count > 50 ? 48 : count > 10 ? 42 : 36;
            
            return L.divIcon({
              html: `<div style="
                background: ${color};
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: ${count > 100 ? '11px' : '14px'};
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: transform 0.2s ease;
              " 
              class="admin-cluster-icon"
              role="button"
              aria-label="${count} churches, avg score ${avgScore.toFixed(0)}"
              tabindex="0">
                <div>
                  <div>${count}</div>
                  <div style="font-size: 9px; margin-top: -2px;">⌀${avgScore.toFixed(0)}</div>
                </div>
              </div>`,
              className: 'admin-cluster',
              iconSize: L.point(size, size),
            });
          }}
        >
          {churches.map((church) => (
            <Marker
              key={church.id}
              position={[church.lat, church.lng]}
              icon={createCustomIcon(church.score)}
              // Pass score to cluster icon calculation
              {...({ score: church.score } as any)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-sm mb-2">{church.name}</h3>
                  <div className="text-xs space-y-1">
                    <p>
                      <span className="font-semibold">Score:</span>{' '}
                      <span className={
                        church.score >= 80 ? 'text-green-600' :
                        church.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {church.score.toFixed(1)}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Horaires:</span> {church.schedulesCount}
                    </p>
                    {church.phone && (
                      <p>
                        <span className="font-semibold">Tél:</span> {church.phone}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Lat: {church.lat.toFixed(5)}, Lng: {church.lng.toFixed(5)}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      
      {/* Add inline style for hover effect on clusters */}
      <style>{`
        .admin-cluster-icon:hover {
          transform: scale(1.1);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
