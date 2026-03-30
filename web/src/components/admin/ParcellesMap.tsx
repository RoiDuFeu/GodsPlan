/**
 * ParcellesMap.tsx
 * 
 * Map component for displaying agricultural parcels with clustering
 * Based on ChurchesMap architecture using react-leaflet + react-leaflet-cluster
 */

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
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

// Custom marker icon for parcels
const createParcelIcon = (color: string = '#10b981') => {
  return L.divIcon({
    className: 'custom-parcel-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

interface ParcelleData {
  id: string;
  name: string;
  coordinates: number[][][]; // GeoJSON MultiPolygon format [[[[lng, lat], ...]]]
  surface?: number; // hectares
  culture?: string;
  owner?: string;
}

interface ParcellesMapProps {
  parcelles: ParcelleData[];
  showPolygons?: boolean; // Option to show full parcel shapes
}

export function ParcellesMap({ parcelles, showPolygons = false }: ParcellesMapProps) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  // France center coordinates
  const franceCenter: [number, number] = [46.603354, 1.888334];

  // Calculate center of each parcel for marker placement
  const parcelsWithCenters = parcelles.map(parcelle => {
    const coords = parcelle.coordinates?.[0]?.[0] || [];
    if (coords.length === 0) return null;

    const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
    const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;

    return {
      ...parcelle,
      center: [centerLat, centerLng] as [number, number],
      polygonCoords: coords.map(c => [c[1], c[0]] as [number, number]) // Leaflet uses [lat, lng]
    };
  }).filter(Boolean) as (ParcelleData & { center: [number, number], polygonCoords: [number, number][] })[];

  if (!mapReady || parcelsWithCenters.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">
          {parcelles.length === 0 ? 'Aucune parcelle à afficher' : 'Chargement de la carte...'}
        </p>
      </div>
    );
  }

  // Auto-center on first parcel if available
  const mapCenter = parcelsWithCenters[0]?.center || franceCenter;

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Optional: Show polygon shapes */}
        {showPolygons && parcelsWithCenters.map((parcel) => (
          <Polygon
            key={`poly-${parcel.id}`}
            positions={parcel.polygonCoords}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.2,
              weight: 2
            }}
          />
        ))}

        {/* Clustered markers */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          disableClusteringAtZoom={16}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            const size = count > 50 ? 48 : count > 10 ? 42 : 36;

            return L.divIcon({
              html: `<div style="
                background: #10b981;
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
                transition: transform 0.2s ease;
              " 
              class="parcel-cluster-icon"
              role="button"
              aria-label="${count} parcelles"
              tabindex="0">
                ${count}
              </div>`,
              className: 'parcel-cluster',
              iconSize: L.point(size, size),
            });
          }}
        >
          {parcelsWithCenters.map((parcel) => (
            <Marker
              key={parcel.id}
              position={parcel.center}
              icon={createParcelIcon()}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <h3 className="font-bold text-sm mb-2">{parcel.name}</h3>
                  <div className="text-xs space-y-1">
                    {parcel.surface && (
                      <p>
                        <span className="font-semibold">Surface:</span>{' '}
                        {parcel.surface.toFixed(2)} ha
                      </p>
                    )}
                    {parcel.culture && (
                      <p>
                        <span className="font-semibold">Culture:</span>{' '}
                        {parcel.culture}
                      </p>
                    )}
                    {parcel.owner && (
                      <p>
                        <span className="font-semibold">Propriétaire:</span>{' '}
                        {parcel.owner}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Coords: {parcel.center[0].toFixed(5)}, {parcel.center[1].toFixed(5)}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Hover effect for clusters */}
      <style>{`
        .parcel-cluster-icon:hover {
          transform: scale(1.1);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
