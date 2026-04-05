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

// Add CSS for markers
export function injectMarkerStyles() {
  if (document.getElementById('church-marker-styles')) return;

  const style = document.createElement('style');
  style.id = 'church-marker-styles';
  style.textContent = `
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

    /* User location marker pulse animation */
    .user-location-marker {
      animation: userPulse 2s ease-in-out infinite;
    }

    @keyframes userPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.8;
      }
    }
  `;
  document.head.appendChild(style);
}
