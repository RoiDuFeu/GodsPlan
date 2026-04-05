# Map Clustering Analysis & Implementation Plan
**Date:** 2026-03-28  
**Project:** GodsPlan Web Frontend  
**Author:** Artemis (Subagent: map-clustering-plan)

---

## 📊 Current Implementation Analysis

### Architecture Overview
- **Framework:** React 19 + TypeScript
- **Map Library:** Leaflet 1.9.4 (vanilla) + react-leaflet 5.0
- **State Management:** Zustand
- **Build Tool:** Vite

### Current Map Components

#### 1. **Map.tsx** (Main user-facing map)
- **Location:** `/web/src/components/Map.tsx`
- **Usage:** Primary dashboard map showing churches near user
- **Current Approach:** 
  - Vanilla Leaflet (imperative API via refs)
  - Manual marker management with `markersRef`
  - Custom church pin icons (teardrop shape)
  - User location marker with pulse animation
  - Fly-to-bounds on church list changes
  - Theme support (light/dark/satellite)

**Key Implementation Details:**
```typescript
// Manual marker lifecycle
markersRef.current = {};
churches.forEach(church => {
  const marker = L.marker([lat, lng], { icon })
    .addTo(map);
  markersRef.current[church.id] = marker;
});
```

#### 2. **ChurchesMap.tsx** (Admin dashboard map)
- **Location:** `/web/src/components/admin/ChurchesMap.tsx`
- **Usage:** Admin overview showing all churches with reliability scores
- **Current Approach:**
  - react-leaflet declarative API (`<MapContainer>`, `<Marker>`, `<Popup>`)
  - Colored markers based on reliability score (green/yellow/red)
  - Simple popups with church metadata

**Key Limitation:**
```typescript
// No pagination or clustering — renders ALL churches
{churches.map((church) => (
  <Marker key={church.id} ... />
))}
```

### Data Volume Assessment

**Current Scale:**
- Paris-focused church directory
- Estimate: 100-300 churches initially
- **Growth potential:** Could expand to Île-de-France (1,000+) or nationwide (10,000+)

**Performance Thresholds:**
- ✅ **< 50 markers:** No clustering needed, Leaflet performs well
- ⚠️ **50-500 markers:** Clustering recommended for UX (visual clarity)
- 🔴 **500+ markers:** Clustering essential for performance (DOM saturation, slow pan/zoom)

---

## 🎯 Clustering Library Recommendation

### Winner: **Leaflet.markercluster** 🏆

#### Why Leaflet.markercluster?

| Criteria | Leaflet.markercluster | supercluster | react-leaflet-cluster |
|----------|----------------------|--------------|----------------------|
| **Integration** | ✅ Native Leaflet plugin | ⚠️ Headless (manual render) | ✅ React wrapper |
| **Bundle Size** | ~13KB gzipped | ~2KB gzipped | ~15KB (includes wrapper) |
| **Feature Set** | Rich (spiderfying, animations) | Minimal (clustering only) | Medium (React-specific) |
| **Maturity** | ⭐⭐⭐⭐⭐ (10+ years, 4k★) | ⭐⭐⭐⭐ (6+ years, 7k★) | ⭐⭐⭐ (3+ years, 800★) |
| **Documentation** | Excellent | Good | Medium |
| **Hybrid Support** | ✅ Works with vanilla Leaflet | ❌ Requires manual layer | ✅ React-only |
| **Spiderfy** | ✅ Built-in | ❌ Manual | ✅ Built-in |

**Decision Matrix:**
- **Map.tsx (vanilla Leaflet):** Leaflet.markercluster is the natural fit
- **ChurchesMap.tsx (react-leaflet):** react-leaflet-cluster provides seamless integration

**Recommendation:** Use **both** strategically:
- `leaflet.markercluster` for Map.tsx (primary component)
- `react-leaflet-cluster` for ChurchesMap.tsx (admin view)

---

## 🏗️ Implementation Plan

### Phase 1: Install Dependencies

```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/web

# For Map.tsx (vanilla Leaflet)
npm install leaflet.markercluster
npm install -D @types/leaflet.markercluster

# For ChurchesMap.tsx (react-leaflet)
npm install react-leaflet-cluster

# Optional: Supercluster (if custom clustering needed later)
# npm install supercluster
```

**CSS Import:** Add to main entry point or Map.tsx:
```typescript
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
```

---

### Phase 2: Update Map.tsx (Main User Map)

**File:** `/web/src/components/Map.tsx`

#### Changes:
1. Import `leaflet.markercluster`
2. Replace manual marker management with `L.markerClusterGroup()`
3. Add cluster configuration based on zoom level
4. Preserve selection behavior (highlight selected marker)

#### Code Implementation:

```typescript
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Add ref for cluster group
const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

// Initialize cluster group (in map setup effect)
useEffect(() => {
  if (!mapRef.current || mapInstanceRef.current) return;

  const map = L.map(mapRef.current, { ... });

  // Create cluster group with custom options
  const clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 80,        // Pixels to cluster within
    spiderfyOnMaxZoom: true,     // Expand overlapping markers
    showCoverageOnHover: false,  // Don't show cluster bounds
    zoomToBoundsOnClick: true,   // Zoom into cluster on click
    disableClusteringAtZoom: 16, // Stop clustering at close zoom
    
    // Custom cluster icon
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      let size = 'small';
      if (count > 10) size = 'medium';
      if (count > 50) size = 'large';
      
      return L.divIcon({
        html: `<div class="church-cluster church-cluster-${size}">
                 <span>${count}</span>
               </div>`,
        className: 'church-cluster-wrapper',
        iconSize: L.point(40, 40),
      });
    },
  });

  clusterGroupRef.current = clusterGroup;
  map.addLayer(clusterGroup);

  // ... rest of map initialization
}, []);

// Update markers when churches list changes
useEffect(() => {
  const map = mapInstanceRef.current;
  const clusterGroup = clusterGroupRef.current;
  if (!map || !clusterGroup) return;

  // Clear existing markers
  clusterGroup.clearLayers();

  // Add new markers to cluster group
  churches.forEach(church => {
    const lat = parseFloat(church.latitude);
    const lng = parseFloat(church.longitude);
    const icon = createChurchIcon(false);

    const marker = L.marker([lat, lng], { icon });
    
    marker.on('click', () => {
      onChurchClickRef.current?.(church.id);
    });

    clusterGroup.addLayer(marker);
    markersRef.current[church.id] = marker; // Keep ref for selection updates
  });

  // Fit bounds (skip if user just located)
  if (!skipNextBoundsRef.current && churches.length > 0) {
    const bounds = clusterGroup.getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { 
        padding: [50, 50], 
        maxZoom: 15, 
        duration: 1.2 
      });
    }
  }
  skipNextBoundsRef.current = false;
}, [churches, userLocation]);

// Update marker icons when selection changes (unchanged)
useEffect(() => {
  Object.entries(markersRef.current).forEach(([churchId, marker]) => {
    const isSelected = selectedChurch?.id === churchId;
    const icon = createChurchIcon(isSelected);
    marker.setIcon(icon);
  });
}, [selectedChurch]);
```

#### CSS Additions (in mapUtils.ts):

```typescript
export function injectMarkerStyles() {
  if (document.getElementById('church-marker-styles')) return;

  const style = document.createElement('style');
  style.id = 'church-marker-styles';
  style.textContent = `
    /* ... existing marker styles ... */

    /* Cluster styles */
    .church-cluster-wrapper {
      background: transparent;
      border: none;
    }

    .church-cluster {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, 
        hsl(var(--primary)) 0%, 
        hsl(var(--primary) / 0.8) 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: hsl(var(--primary-foreground));
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 3px solid hsl(var(--background));
      transition: all 0.2s ease;
    }

    .church-cluster:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }

    .church-cluster-small {
      width: 36px;
      height: 36px;
      font-size: 12px;
    }

    .church-cluster-medium {
      width: 44px;
      height: 44px;
      font-size: 15px;
    }

    .church-cluster-large {
      width: 52px;
      height: 52px;
      font-size: 17px;
      border-width: 4px;
    }

    /* Spiderfy line customization */
    .leaflet-cluster-spider-leg {
      stroke: hsl(var(--primary));
      stroke-width: 2;
      stroke-opacity: 0.5;
    }
  `;
  document.head.appendChild(style);
}
```

---

### Phase 3: Update ChurchesMap.tsx (Admin Map)

**File:** `/web/src/components/admin/ChurchesMap.tsx`

#### Changes:
1. Import `react-leaflet-cluster`
2. Wrap markers in `<MarkerClusterGroup>`
3. Add cluster configuration (less aggressive than user map)

#### Code Implementation:

```typescript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ... existing icon setup and createCustomIcon ...

export function ChurchesMap({ churches }: ChurchesMapProps) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

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
        
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={true}
          zoomToBoundsOnClick={true}
          disableClusteringAtZoom={15}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            // Calculate average reliability score for cluster
            const markers = cluster.getAllChildMarkers();
            const avgScore = markers.reduce((sum, m) => {
              const score = (m.options as any).score || 50;
              return sum + score;
            }, 0) / markers.length;

            const color = avgScore >= 80 ? '#22c55e' : 
                         avgScore >= 50 ? '#f59e0b' : '#ef4444';

            return L.divIcon({
              html: `<div style="
                background: ${color};
                width: 42px;
                height: 42px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 14px;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              ">${count}</div>`,
              className: 'admin-cluster',
              iconSize: L.point(42, 42),
            });
          }}
        >
          {churches.map((church) => (
            <Marker
              key={church.id}
              position={[church.lat, church.lng]}
              icon={createCustomIcon(church.score)}
              // Pass score to icon create function
              {...({ score: church.score } as any)}
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
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
```

---

### Phase 4: Configuration Options Reference

#### Leaflet.markercluster Options

```typescript
interface MarkerClusterGroupOptions {
  // Clustering behavior
  maxClusterRadius: number;           // Default: 80 (pixels)
  disableClusteringAtZoom?: number;   // Stop clustering at zoom level
  zoomToBoundsOnClick: boolean;       // Default: true
  spiderfyOnMaxZoom: boolean;         // Default: true
  
  // Visual options
  showCoverageOnHover: boolean;       // Show cluster bounds on hover
  iconCreateFunction: (cluster) => L.DivIcon;
  
  // Performance
  chunkedLoading: boolean;            // Load markers in chunks
  chunkInterval: number;              // Milliseconds between chunks (default: 200)
  chunkDelay: number;                 // Delay before starting (default: 50)
  
  // Advanced
  removeOutsideVisibleBounds: boolean; // Remove markers outside viewport
  animate: boolean;                    // Animate marker movements
  animateAddingMarkers: boolean;       // Animate when adding markers
  spiderfyDistanceMultiplier: number;  // Space between spiderfied markers
}
```

#### Recommended Configurations

**User Dashboard (Map.tsx):**
```typescript
{
  maxClusterRadius: 80,           // Moderate clustering for UX
  disableClusteringAtZoom: 16,    // Show individual at street level
  showCoverageOnHover: false,     // Clean UI
  spiderfyOnMaxZoom: true,        // Show overlapping churches
  chunkedLoading: true,           // Smooth loading
}
```

**Admin Dashboard (ChurchesMap.tsx):**
```typescript
{
  maxClusterRadius: 60,           // Less aggressive (admin needs detail)
  disableClusteringAtZoom: 15,    // Earlier unclustering
  showCoverageOnHover: true,      // Useful for admin analysis
  spiderfyOnMaxZoom: true,
  chunkedLoading: true,
}
```

---

## 🎨 Styling Recommendations

### Theme-Aware Cluster Colors

```typescript
const { theme } = useTheme();
const isDark = theme === 'dark' || 
  (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

const clusterStyle = isDark
  ? {
      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      borderColor: '#1e1b2e',
    }
  : {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      borderColor: '#ffffff',
    };
```

### Accessibility

```typescript
iconCreateFunction: (cluster) => {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div 
             class="church-cluster" 
             role="button" 
             aria-label="${count} churches in this area"
             tabindex="0"
           >
             <span aria-hidden="true">${count}</span>
           </div>`,
    className: 'church-cluster-wrapper',
    iconSize: L.point(40, 40),
  });
}
```

---

## 🚀 Step-by-Step Deployment

### 1. Pre-Implementation Checklist
- [ ] Review current church count in production DB
- [ ] Backup current map components
- [ ] Test in dev environment first

### 2. Implementation Order
1. **Install dependencies** (5 min)
2. **Update mapUtils.ts** with cluster styles (10 min)
3. **Refactor Map.tsx** to use clustering (30 min)
4. **Update ChurchesMap.tsx** with react-leaflet-cluster (20 min)
5. **Test both maps** with various data volumes (20 min)
6. **Adjust cluster thresholds** based on feel (10 min)

**Total Time:** ~2 hours

### 3. Testing Scenarios
```typescript
// Test data generators for dev
const generateTestChurches = (count: number): ChurchListItem[] => {
  const parisCenter = { lat: 48.8566, lng: 2.3522 };
  return Array.from({ length: count }, (_, i) => ({
    id: `church-${i}`,
    name: `Église Test ${i + 1}`,
    latitude: String(parisCenter.lat + (Math.random() - 0.5) * 0.1),
    longitude: String(parisCenter.lng + (Math.random() - 0.5) * 0.1),
    reliabilityScore: Math.random() * 100,
    address: {
      street: `${i + 1} Rue Example`,
      city: 'Paris',
      postalCode: '75001',
    },
  }));
};

// Test cases:
// - 10 churches (no clustering needed)
// - 50 churches (clusters at low zoom)
// - 200 churches (heavy clustering)
// - 1000 churches (stress test)
```

### 4. Performance Validation
- [ ] Zoom/pan feels smooth (60fps target)
- [ ] Cluster animations don't stutter
- [ ] Selection still works (click marker in cluster)
- [ ] Mobile performance acceptable (test on low-end device)

### 5. Rollout Strategy
1. Deploy to staging
2. Load test with production data snapshot
3. A/B test with 10% users (if traffic exists)
4. Monitor client-side performance metrics
5. Full rollout

---

## 🔮 Future Enhancements

### 1. Smart Clustering (AI-Powered)
```typescript
// Cluster based on semantic proximity, not just geographic
// Example: Group churches by denomination or language
const clusterByAttribute = (churches: Church[], attribute: keyof Church) => {
  // Custom clustering logic using supercluster + attribute weights
};
```

### 2. Cluster Previews
```typescript
// Show mini-preview of churches in cluster tooltip
iconCreateFunction: (cluster) => {
  const children = cluster.getAllChildMarkers().slice(0, 3);
  const preview = children.map(m => m.options.title).join(', ');
  return L.divIcon({
    html: `<div class="cluster-with-preview" title="${preview}">
             ${cluster.getChildCount()}
           </div>`,
  });
}
```

### 3. Dynamic Clustering Radius
```typescript
// Adjust clustering based on zoom level for optimal UX
map.on('zoomend', () => {
  const zoom = map.getZoom();
  const radius = zoom < 12 ? 100 : zoom < 14 ? 60 : 40;
  clusterGroup.options.maxClusterRadius = radius;
  clusterGroup.refreshClusters();
});
```

### 4. Heatmap Mode
```typescript
// Add toggle to show density heatmap instead of clusters
import 'leaflet.heat';

const heatmapLayer = L.heatLayer(
  churches.map(c => [parseFloat(c.latitude), parseFloat(c.longitude)]),
  { radius: 25, blur: 15, maxZoom: 13 }
);
```

---

## 📚 References

### Documentation
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)
- [react-leaflet-cluster](https://github.com/akursat/react-leaflet-cluster)
- [supercluster](https://github.com/mapbox/supercluster) (if custom impl needed)

### Examples
- [Leaflet.markercluster demo](https://leaflet.github.io/Leaflet.markercluster/example/marker-clustering-realworld.388.html)
- [react-leaflet-cluster demo](https://akursat.github.io/react-leaflet-cluster/)

### Performance Benchmarks
- Leaflet.markercluster: ~10,000 markers at 60fps (with chunked loading)
- Native Leaflet: Performance degrades at 500+ markers

---

## ✅ Summary

**Problem:** Map becomes cluttered and slow with many markers (current threshold: ~100 churches, future: 1,000+).

**Solution:** Implement clustering in two steps:
1. **Map.tsx** (primary user map) → Leaflet.markercluster (native plugin)
2. **ChurchesMap.tsx** (admin map) → react-leaflet-cluster (React wrapper)

**Benefits:**
- ✅ Clean UI at all zoom levels
- ✅ Improved performance (1,000+ markers supported)
- ✅ Enhanced UX (spiderfy for overlapping churches)
- ✅ Minimal refactoring (drop-in replacement)
- ✅ Theme-aware styling (dark/light/satellite modes)

**Effort:** 2 hours implementation + 1 hour testing = **3 hours total**

**Risk:** Low (non-breaking, can roll back to manual markers)

---

**Next Steps:** Await approval from Marc to proceed with implementation.
