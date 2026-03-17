import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ChurchListItem } from '../lib/types';
import { useChurchStore } from '../store/useChurchStore';

// Fix for default marker icons in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapProps {
  churches: ChurchListItem[];
  center?: [number, number];
  zoom?: number;
  onChurchClick?: (churchId: string) => void;
}

export function Map({ churches, center = [48.8566, 2.3522], zoom = 12, onChurchClick }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { userLocation, selectedChurch } = useChurchStore();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [center, zoom]);

  // Update markers when churches change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    churches.forEach(church => {
      const lat = parseFloat(church.latitude);
      const lng = parseFloat(church.longitude);
      
      const addressString = [
        church.address.street,
        church.address.postalCode,
        church.address.city
      ].filter(Boolean).join(', ');
      
      const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-semibold text-sm">${church.name}</h3>
            <p class="text-xs text-gray-600 mt-1">${addressString}</p>
            ${church.distance ? `<p class="text-xs text-gray-500 mt-1">${(church.distance / 1000).toFixed(1)}km</p>` : ''}
          </div>
        `);

      marker.on('click', () => {
        if (onChurchClick) {
          onChurchClick(church.id);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have churches
    if (churches.length > 0) {
      const bounds = L.latLngBounds(
        churches.map(c => [parseFloat(c.latitude), parseFloat(c.longitude)] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [churches, onChurchClick]);

  // Add user location marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    const userMarker = L.circleMarker([userLocation.latitude, userLocation.longitude], {
      radius: 8,
      fillColor: '#3b82f6',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    })
      .addTo(map)
      .bindPopup('Votre position');

    return () => {
      userMarker.remove();
    };
  }, [userLocation]);

  // Center on selected church
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedChurch) return;

    const lat = parseFloat(selectedChurch.latitude);
    const lng = parseFloat(selectedChurch.longitude);
    map.setView([lat, lng], 16, { animate: true });
  }, [selectedChurch]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full"
      style={{ minHeight: '400px' }}
      aria-label="Carte interactive des églises"
    />
  );
}
