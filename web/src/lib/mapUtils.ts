/**
 * mapUtils.clustered.ts
 * 
 * Enhanced version of mapUtils.ts with cluster styling support.
 * 
 * To deploy:
 * 1. Backup current mapUtils.ts to mapUtils.legacy.ts
 * 2. Rename this file to mapUtils.ts
 * 3. Verify no breaking changes with existing Map.tsx usage
 */

import L from 'leaflet';

// Create custom church marker icon
export function createChurchIcon(isSelected = false): L.DivIcon {
  const className = isSelected 
    ? 'church-marker church-marker-selected'
    : 'church-marker';
  
  return L.divIcon({
    html: `
      <div class="${className}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L10 8H8V12H10V22H14V12H16V8H14L12 2Z M11 4.236L11.8 6.764H12.2L13 4.236V4.236L13 7H14V10H10V7H11V4.236Z"/>
        </svg>
      </div>
    `,
    className: 'church-marker-wrapper',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Create custom user location marker
export function createUserLocationMarker(): L.CircleMarker {
  return L.circleMarker([0, 0], {
    radius: 8,
    fillColor: 'hsl(262, 83%, 58%)',
    color: '#fff',
    weight: 3,
    opacity: 1,
    fillOpacity: 0.8,
  });
}

// Add CSS for markers AND clusters
export function injectMarkerStyles() {
  if (document.getElementById('church-marker-styles')) return;

  const style = document.createElement('style');
  style.id = 'church-marker-styles';
  style.textContent = `
    /* ═══════════════════════════════════════════════════════════════
       Church Marker Styles
       ═══════════════════════════════════════════════════════════════ */
    
    .church-marker-wrapper {
      background: transparent;
      border: none;
    }

    .church-marker {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    }

    .church-marker svg {
      width: 16px;
      height: 16px;
      transform: rotate(45deg);
    }

    .church-marker:hover {
      transform: rotate(-45deg) scale(1.15);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    }

    .church-marker-selected {
      width: 36px;
      height: 36px;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg) scale(1.15);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3), 0 0 0 4px hsla(var(--primary), 0.2);
      animation: pulse 2s ease-in-out infinite;
      z-index: 1000 !important;
    }

    .church-marker-selected svg {
      width: 18px;
      height: 18px;
      transform: rotate(45deg);
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3), 0 0 0 4px hsla(var(--primary), 0.2);
      }
      50% {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3), 0 0 0 8px hsla(var(--primary), 0.1);
      }
    }

    /* ═══════════════════════════════════════════════════════════════
       Cluster Styles (for leaflet.markercluster)
       ═══════════════════════════════════════════════════════════════ */
    
    .church-cluster-wrapper {
      background: transparent;
      border: none;
    }

    .church-cluster {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, 
        hsl(var(--primary)) 0%, 
        hsl(var(--primary) / 0.85) 100%);
      color: hsl(var(--primary-foreground));
      font-weight: 700;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      border: 3px solid hsl(var(--background));
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .church-cluster:hover {
      transform: scale(1.15);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
      border-width: 4px;
    }

    .church-cluster:active {
      transform: scale(1.05);
    }

    /* Small cluster: < 10 churches */
    .church-cluster-small {
      width: 36px;
      height: 36px;
      font-size: 12px;
      border-width: 2px;
    }

    /* Medium cluster: 10-50 churches */
    .church-cluster-medium {
      width: 44px;
      height: 44px;
      font-size: 14px;
      border-width: 3px;
    }

    /* Large cluster: 50+ churches */
    .church-cluster-large {
      width: 52px;
      height: 52px;
      font-size: 16px;
      border-width: 4px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    }

    /* Spiderfy lines (when cluster expands) */
    .marker-cluster-spider-leg {
      stroke: hsl(var(--primary));
      stroke-width: 2.5;
      stroke-opacity: 0.6;
      fill: none;
    }

    /* Override default cluster polygon styles */
    .leaflet-cluster-anim .leaflet-marker-icon, 
    .leaflet-cluster-anim .leaflet-marker-shadow {
      transition: transform 0.3s ease-out, opacity 0.3s ease-in;
    }

    /* ═══════════════════════════════════════════════════════════════
       User Location Marker
       ═══════════════════════════════════════════════════════════════ */
    
    .user-location-marker {
      animation: userPulse 2s ease-in-out infinite;
    }

    .user-pulse-ring {
      animation: userPulseRing 2s ease-in-out infinite;
    }

    @keyframes userPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.15);
        opacity: 0.85;
      }
    }

    @keyframes userPulseRing {
      0%, 100% {
        transform: scale(1);
        opacity: 0.15;
      }
      50% {
        transform: scale(1.5);
        opacity: 0.05;
      }
    }

    /* ═══════════════════════════════════════════════════════════════
       Dark Theme Adjustments
       ═══════════════════════════════════════════════════════════════ */
    
    [data-theme="dark"] .church-cluster,
    .dark .church-cluster {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      border-color: hsl(var(--background) / 0.8);
    }

    [data-theme="dark"] .church-cluster:hover,
    .dark .church-cluster:hover {
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.7);
    }

    [data-theme="dark"] .marker-cluster-spider-leg,
    .dark .marker-cluster-spider-leg {
      stroke-opacity: 0.7;
    }

    /* ═══════════════════════════════════════════════════════════════
       Accessibility & Focus States
       ═══════════════════════════════════════════════════════════════ */
    
    .church-cluster:focus,
    .church-marker:focus {
      outline: 2px solid hsl(var(--primary));
      outline-offset: 2px;
    }

    /* Reduce motion for accessibility */
    @media (prefers-reduced-motion: reduce) {
      .church-marker,
      .church-cluster,
      .user-location-marker,
      .user-pulse-ring {
        animation: none !important;
        transition: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}
