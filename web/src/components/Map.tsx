import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ChurchListItem } from '@/lib/types';
import { useChurchStore } from '@/store/useChurchStore';
import { createChurchIcon, injectMarkerStyles } from '@/lib/mapUtils';
import { Card } from '@/components/ui/card';

interface MapProps {
  churches: ChurchListItem[];
  center?: [number, number];
  zoom?: number;
  onChurchClick?: (churchId: string) => void;
}

type MarkersMap = { [key: string]: L.Marker };

export function Map({ churches, center = [48.8566, 2.3522], zoom = 12, onChurchClick }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<MarkersMap>({});
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const { userLocation, selectedChurch } = useChurchStore();

  // Inject marker styles on mount
  useEffect(() => {
    injectMarkerStyles();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(center, zoom);

    // Use different tile layers based on theme
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
      // Dark mode: use CartoDB Dark Matter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
    } else {
      // Light mode: use default OSM
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
    }

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
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add new markers
    churches.forEach(church => {
      const lat = parseFloat(church.latitude);
      const lng = parseFloat(church.longitude);
      
      const isSelected = selectedChurch?.id === church.id;
      const icon = createChurchIcon(isSelected);
      
      const addressString = [
        church.address.street,
        church.address.postalCode,
        church.address.city
      ].filter(Boolean).join(', ');
      
      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div class="p-4 min-w-[220px]">
            <h3 class="font-semibold text-base mb-2.5 leading-tight">${church.name}</h3>
            <p class="text-xs text-muted-foreground mb-2.5 flex items-start gap-1.5 leading-relaxed">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              ${addressString}
            </p>
            ${church.distance ? `<p class="text-xs font-medium flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              ${(church.distance / 1000).toFixed(1)} km
            </p>` : ''}
          </div>
        `, {
          className: 'custom-popup'
        });

      marker.on('click', () => {
        if (onChurchClick) {
          onChurchClick(church.id);
        }
      });

      markersRef.current[church.id] = marker;
    });

    // Fit bounds if we have churches
    if (churches.length > 0) {
      const bounds = L.latLngBounds(
        churches.map(c => [parseFloat(c.latitude), parseFloat(c.longitude)] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [churches, selectedChurch, onChurchClick]);

  // Update marker icons when selection changes
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([churchId, marker]) => {
      const isSelected = selectedChurch?.id === churchId;
      const icon = createChurchIcon(isSelected);
      marker.setIcon(icon);
    });
  }, [selectedChurch]);

  // Add/update user location marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (!userLocation) return;

    // Add new marker
    const userMarker = L.circleMarker([userLocation.latitude, userLocation.longitude], {
      radius: 10,
      fillColor: 'hsl(262, 83%, 58%)',
      color: '#fff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.85,
      className: 'user-location-marker',
    })
      .addTo(map)
      .bindPopup(`
        <div class="p-3 text-center">
          <p class="font-semibold text-sm">📍 Votre position</p>
        </div>
      `);

    userMarkerRef.current = userMarker;
  }, [userLocation]);

  // Center on selected church
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedChurch) return;

    const lat = parseFloat(selectedChurch.latitude);
    const lng = parseFloat(selectedChurch.longitude);
    map.setView([lat, lng], 16, { animate: true });

    // Open popup for selected church
    const marker = markersRef.current[selectedChurch.id];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedChurch]);

  return (
    <Card className="h-full w-full overflow-hidden border-2 rounded-none md:rounded-xl md:m-4 shadow-lg">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
        aria-label="Carte interactive des églises"
      />
    </Card>
  );
}
