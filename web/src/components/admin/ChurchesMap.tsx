/**
 * ChurchesMap.tsx
 * 
 * Map with real clustering using leaflet.markercluster directly
 * Compatible with react-leaflet v5
 */

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

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

// Component that adds clustering to the map
function MarkerClusterLayer({ churches }: { churches: ChurchMapData[] }) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create cluster group with custom icon
    const markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 15,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        
        // Calculate average reliability score
        const markers = cluster.getAllChildMarkers() as any[];
        let totalScore = 0;
        let validScores = 0;
        
        markers.forEach((marker) => {
          if (marker.options.churchScore) {
            totalScore += marker.options.churchScore;
            validScores++;
          }
        });
        
        const avgScore = validScores > 0 ? totalScore / validScores : 50;
        const color = avgScore >= 80 ? '#22c55e' : avgScore >= 50 ? '#f59e0b' : '#ef4444';
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
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          ">
            <div>
              <div>${count}</div>
              <div style="font-size: 9px; margin-top: -2px;">⌀${avgScore.toFixed(0)}</div>
            </div>
          </div>`,
          className: 'marker-cluster-custom',
          iconSize: L.point(size, size),
        });
      }
    });

    // Add all markers to cluster group
    churches.forEach((church) => {
      const marker = L.marker([church.lat, church.lng], {
        icon: createCustomIcon(church.score),
        // @ts-ignore - store score for cluster calculation
        churchScore: church.score
      });

      marker.bindPopup(`
        <div class="p-2" style="min-width: 200px;">
          <h3 style="font-weight: bold; font-size: 0.875rem; margin-bottom: 0.5rem;">${church.name}</h3>
          <div style="font-size: 0.75rem;">
            <p style="margin-bottom: 0.25rem;">
              <span style="font-weight: 600;">Score:</span> 
              <span style="color: ${church.score >= 80 ? '#22c55e' : church.score >= 50 ? '#f59e0b' : '#ef4444'};">
                ${church.score.toFixed(1)}
              </span>
            </p>
            <p style="margin-bottom: 0.25rem;">
              <span style="font-weight: 600;">Horaires:</span> ${church.schedulesCount}
            </p>
            ${church.phone ? `<p style="margin-bottom: 0.25rem;"><span style="font-weight: 600;">Tél:</span> ${church.phone}</p>` : ''}
            <p style="font-size: 0.65rem; color: #6b7280; margin-top: 0.5rem;">
              Lat: ${church.lat.toFixed(5)}, Lng: ${church.lng.toFixed(5)}
            </p>
          </div>
        </div>
      `);

      markerClusterGroup.addLayer(marker);
    });

    // Add cluster group to map
    map.addLayer(markerClusterGroup);
    clusterGroupRef.current = markerClusterGroup;

    // Cleanup on unmount
    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [map, churches]);

  return null;
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
        
        <MarkerClusterLayer churches={churches} />
      </MapContainer>
      
      <style>{`
        .marker-cluster-custom:hover {
          transform: scale(1.1);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
