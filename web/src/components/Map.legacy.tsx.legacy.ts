import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ChurchListItem } from '@/lib/types';
import { useChurchStore } from '@/store/useChurchStore';
import { createChurchIcon, injectMarkerStyles } from '@/lib/mapUtils';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from 'react-i18next';

interface MapProps {
  churches: ChurchListItem[];
  onChurchClick?: (churchId: string) => void;
}

type MarkersMap = { [key: string]: L.Marker };

const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522];
const DEFAULT_ZOOM = 12;

export function Map({ churches, onChurchClick }: MapProps) {
  const { t } = useTranslation();
  const { userLocation, selectedChurch, setUserLocation, loadNearbyChurches } = useChurchStore();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(loc);
        loadNearbyChurches(loc.latitude, loc.longitude, 10000);
        setIsLocating(false);

        // Fly to user immediately, skip the fitBounds that will fire from church list update
        skipNextBoundsRef.current = true;
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo([loc.latitude, loc.longitude], 14, { duration: 1.5 });
        }
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const skipNextBoundsRef = useRef(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<MarkersMap>({});
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const darkLayerRef = useRef<L.TileLayer | null>(null);
  const lightLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const onChurchClickRef = useRef(onChurchClick);
  onChurchClickRef.current = onChurchClick;

  // Inject marker styles on mount
  useEffect(() => {
    injectMarkerStyles();
  }, []);

  // Initialize map — runs once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    });

    const lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Sources: Esri, Maxar, Earthstar Geographics',
      maxZoom: 19
    });

    darkLayerRef.current = darkLayer;
    lightLayerRef.current = lightLayer;
    satelliteLayerRef.current = satelliteLayer;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when churches list changes (not on selection)
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
      const icon = createChurchIcon(false);

      const marker = L.marker([lat, lng], { icon })
        .addTo(map);

      marker.on('click', () => {
        onChurchClickRef.current?.(church.id);
      });

      markersRef.current[church.id] = marker;
    });

    // Fit bounds — skip if user just located (flyTo already in progress)
    if (skipNextBoundsRef.current) {
      skipNextBoundsRef.current = false;
      return;
    }

    if (churches.length > 0) {
      const points: [number, number][] = churches.map(
        c => [parseFloat(c.latitude), parseFloat(c.longitude)]
      );
      if (userLocation) {
        points.push([userLocation.latitude, userLocation.longitude]);
      }
      const bounds = L.latLngBounds(points);
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1.2 });
    }
  }, [churches, userLocation]);

  // Update marker icons when selection changes
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([churchId, marker]) => {
      const isSelected = selectedChurch?.id === churchId;
      const icon = createChurchIcon(isSelected);
      marker.setIcon(icon);
    });
  }, [selectedChurch]);

  // Add/update user location marker + fly to it
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    // Remove old pulse ring if any
    map.eachLayer((layer) => {
      if ((layer as any)._isUserPulse) map.removeLayer(layer);
    });

    if (!userLocation) return;

    const latlng: [number, number] = [userLocation.latitude, userLocation.longitude];

    // Outer pulsing ring
    const pulseRing = L.circleMarker(latlng, {
      radius: 20,
      fillColor: '#a7c8ff',
      color: 'transparent',
      fillOpacity: 0.15,
      className: 'user-pulse-ring',
    }).addTo(map);
    (pulseRing as any)._isUserPulse = true;

    // Inner dot
    const userMarker = L.circleMarker(latlng, {
      radius: 8,
      fillColor: '#a7c8ff',
      color: '#fff',
      weight: 3,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(map);

    userMarkerRef.current = userMarker;
  }, [userLocation]);

  // Toggle map layer based on theme + satellite
  useEffect(() => {
    const map = mapInstanceRef.current;
    const dark = darkLayerRef.current;
    const light = lightLayerRef.current;
    const satellite = satelliteLayerRef.current;
    if (!map || !dark || !light || !satellite) return;

    // Remove all tile layers first
    if (map.hasLayer(dark)) map.removeLayer(dark);
    if (map.hasLayer(light)) map.removeLayer(light);
    if (map.hasLayer(satellite)) map.removeLayer(satellite);

    // Add the appropriate layer
    if (isSatellite) {
      satellite.addTo(map);
    } else if (isDark) {
      dark.addTo(map);
    } else {
      light.addTo(map);
    }
  }, [isSatellite, isDark]);

  // Center on selected church
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedChurch) return;

    const lat = parseFloat(selectedChurch.latitude);
    const lng = parseFloat(selectedChurch.longitude);
    map.flyTo([lat, lng], 16, { duration: 1, easeLinearity: 0.3 });
  }, [selectedChurch]);

  return (
    <Card className="h-full w-full overflow-hidden border-0 rounded-none shadow-none bg-surface-container-lowest relative">
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
        aria-label={t('map.ariaLabel')}
      />

      {/* Map controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Locate me */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg border border-border/60 shadow-lg backdrop-blur-md transition-all duration-200',
            'hover:scale-105 active:scale-95 cursor-pointer bg-card/80 text-card-foreground hover:border-primary/50',
            userLocation && 'border-primary/50 text-primary',
            isLocating && 'animate-pulse'
          )}
          title={t('map.myLocation')}
        >
          <span
            className="material-symbols-outlined text-lg"
            style={userLocation ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {isLocating ? 'hourglass_empty' : 'my_location'}
          </span>
        </button>

        {/* Layer toggle */}
        <button
          onClick={() => setIsSatellite(prev => !prev)}
          className="flex items-center justify-center w-10 h-10 rounded-lg
            border border-border/60 shadow-lg backdrop-blur-md transition-all duration-200
            hover:scale-105 active:scale-95 cursor-pointer
            bg-card/80 text-card-foreground hover:border-primary/50"
          title={isSatellite ? t('map.mapView') : t('map.satelliteView')}
        >
          <span className="material-symbols-outlined text-lg">
            {isSatellite ? 'map' : 'satellite_alt'}
          </span>
        </button>
      </div>
    </Card>
  );
}
