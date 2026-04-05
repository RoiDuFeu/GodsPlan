# Map Clustering Implementation Checklist

**Project:** GodsPlan Web Frontend  
**Date:** 2026-03-28  
**Estimated Time:** 3 hours (2h implementation + 1h testing)

---

## 📋 Pre-Implementation

- [ ] **Backup current workspace**
  ```bash
  cd /home/ocadmin/.openclaw/workspace/GodsPlan
  git status  # Ensure clean working directory
  git checkout -b feature/map-clustering
  ```

- [ ] **Review analysis document**
  - [ ] Read `MAP_CLUSTERING_ANALYSIS.md`
  - [ ] Understand clustering strategy and library choices
  - [ ] Review configuration options

- [ ] **Check current church count in production**
  ```bash
  # Query your API to understand data volume
  curl https://your-api.com/churches | jq '. | length'
  ```

---

## 🚀 Implementation (Automated)

### Option A: Automated Deployment (Recommended)

```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan

# Dry run first (preview changes)
./DEPLOY_CLUSTERING.sh --dry-run

# Deploy
./DEPLOY_CLUSTERING.sh

# If issues arise, rollback
./DEPLOY_CLUSTERING.sh --rollback
```

**What the script does:**
1. ✅ Installs dependencies (`leaflet.markercluster`, `react-leaflet-cluster`)
2. ✅ Backs up current files (`.legacy.tsx` suffix)
3. ✅ Deploys clustered implementations
4. ✅ Provides rollback capability

---

### Option B: Manual Deployment

- [ ] **Step 1: Install dependencies**
  ```bash
  cd web
  npm install leaflet.markercluster @types/leaflet.markercluster react-leaflet-cluster
  ```

- [ ] **Step 2: Backup current files**
  ```bash
  cp src/components/Map.tsx src/components/Map.legacy.tsx
  cp src/components/admin/ChurchesMap.tsx src/components/admin/ChurchesMap.legacy.tsx
  cp src/lib/mapUtils.ts src/lib/mapUtils.legacy.ts
  ```

- [ ] **Step 3: Deploy clustered versions**
  ```bash
  cp src/components/Map.clustered.tsx src/components/Map.tsx
  cp src/components/admin/ChurchesMap.clustered.tsx src/components/admin/ChurchesMap.tsx
  cp src/lib/mapUtils.clustered.ts src/lib/mapUtils.ts
  ```

- [ ] **Step 4: Verify imports**
  - Check that CSS imports are present:
    ```typescript
    import 'leaflet.markercluster/dist/MarkerCluster.css';
    import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
    ```

---

## 🧪 Testing

### Local Development Testing

- [ ] **Start dev server**
  ```bash
  cd web
  npm run dev
  ```

- [ ] **Test with varying data volumes**
  
  **Using test data generator:**
  ```typescript
  // In DashboardPage.tsx or AdminDashboard.tsx (temporarily)
  import { TEST_SCENARIOS } from '@/utils/testData';
  
  // Replace real data with test data
  const testChurches = TEST_SCENARIOS.large.churches();
  ```

  - [ ] **Small dataset (10 churches)**
    - Expected: No clustering, all markers visible
    - Action: Pan/zoom, verify smooth performance
  
  - [ ] **Medium dataset (50 churches)**
    - Expected: Clusters at low zoom, expand at high zoom
    - Action: Click clusters, verify spiderfy works
  
  - [ ] **Large dataset (200 churches)**
    - Expected: Heavy clustering, multiple levels
    - Action: Zoom in progressively, verify declustering
  
  - [ ] **Extreme dataset (1000 churches)**
    - Expected: Stress test, ensure no lag
    - Action: Pan rapidly, check for frame drops

### Feature Testing

- [ ] **User Map (Map.tsx)**
  - [ ] Clusters appear at zoom levels < 16
  - [ ] Clicking cluster zooms to bounds
  - [ ] Spiderfy works for overlapping markers
  - [ ] Selected church marker highlighted correctly
  - [ ] User location marker visible above clusters
  - [ ] "Locate me" button still works
  - [ ] Theme switching (light/dark/satellite) works
  - [ ] Smooth animations (no jank)

- [ ] **Admin Map (ChurchesMap.tsx)**
  - [ ] Clusters show average reliability score
  - [ ] Color coding correct (green/yellow/red)
  - [ ] Popups work when clicking individual markers
  - [ ] Cluster count accurate
  - [ ] Coverage on hover shows (admin only)

### Cross-Browser Testing

- [ ] **Chrome/Edge** (Chromium)
- [ ] **Firefox**
- [ ] **Safari** (if macOS available)
- [ ] **Mobile browsers** (iOS Safari, Chrome Android)

### Performance Validation

- [ ] **Open DevTools Performance tab**
- [ ] **Record while panning/zooming**
- [ ] **Check metrics:**
  - Frame rate: ≥ 50 FPS (target 60 FPS)
  - Paint times: < 16ms per frame
  - No long tasks (> 50ms)

- [ ] **Mobile performance** (throttle CPU 4x in DevTools)
  - Still usable on low-end devices
  - No crash or freeze

### Accessibility Testing

- [ ] **Keyboard navigation**
  - Tab to cluster icons
  - Enter/Space to activate
  
- [ ] **Screen reader** (if available)
  - aria-label announces cluster count
  - Markers have descriptive labels

- [ ] **Reduced motion** (enable in OS settings)
  - Animations disabled when `prefers-reduced-motion` active

---

## 🐛 Known Issues & Troubleshooting

### Issue: TypeScript errors on `leaflet.markercluster`

**Solution:**
```bash
npm install --save-dev @types/leaflet.markercluster
```

If types still missing:
```typescript
// Add to vite-env.d.ts or global.d.ts
declare module 'leaflet.markercluster';
```

---

### Issue: Clusters not appearing

**Check:**
1. Is `clusterGroup` added to map? (`map.addLayer(clusterGroup)`)
2. Are markers added to cluster group? (`clusterGroup.addLayer(marker)`)
3. Is zoom level below `disableClusteringAtZoom`?

**Debug:**
```typescript
console.log('Cluster group layers:', clusterGroupRef.current?.getLayers().length);
console.log('Current zoom:', mapInstanceRef.current?.getZoom());
```

---

### Issue: Selected marker not visible in cluster

**Solution:** Already implemented in `Map.clustered.tsx`:
```typescript
// Bring selected marker to front
if (isSelected && marker.getElement()) {
  marker.getElement()?.style.setProperty('z-index', '1000');
}

// Refresh clusters to ensure visibility
clusterGroupRef.current?.refreshClusters();
```

---

### Issue: Performance degradation with 1000+ churches

**Optimizations to try:**
1. Enable `removeOutsideVisibleBounds: true`
2. Increase `maxClusterRadius` (more aggressive clustering)
3. Reduce `chunkInterval` for faster loading
4. Consider server-side clustering for > 10k markers

---

## 📊 Metrics to Monitor

### Before Deployment
- Measure baseline performance with current implementation
- Note: markers count, average FPS, initial load time

### After Deployment
- Compare same metrics with clustering enabled
- Target improvements:
  - 2x faster initial render
  - Stable 60 FPS with 500+ markers
  - No visual saturation at any zoom level

### Production Monitoring (if available)
```javascript
// Add to analytics
window.analytics?.track('map_clustering_performance', {
  markerCount: churches.length,
  clusterCount: clusterGroup.getLayers().length,
  renderTime: performance.now() - startTime,
});
```

---

## ✅ Sign-Off

- [ ] **All tests passed**
- [ ] **No console errors or warnings**
- [ ] **Performance acceptable on mobile**
- [ ] **Code reviewed** (if team workflow requires)
- [ ] **Commit changes**
  ```bash
  git add .
  git commit -m "feat: Add map clustering for improved performance and UX
  
  - Implement leaflet.markercluster for user map
  - Add react-leaflet-cluster for admin map
  - Support 1000+ markers without performance degradation
  - Maintain selection and theme-switching functionality
  - Add test data generators for QA"
  ```

- [ ] **Push to remote**
  ```bash
  git push origin feature/map-clustering
  ```

- [ ] **Create PR** (if applicable)

---

## 🔄 Rollback Procedure

If issues arise in production:

**Immediate rollback:**
```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan
./DEPLOY_CLUSTERING.sh --rollback
npm run build
# Deploy rolled-back version
```

**Or manual rollback:**
```bash
cd web/src
cp components/Map.legacy.tsx components/Map.tsx
cp components/admin/ChurchesMap.legacy.tsx components/admin/ChurchesMap.tsx
cp lib/mapUtils.legacy.ts lib/mapUtils.ts
```

**Then:**
1. Restart dev server
2. Verify original behavior restored
3. Investigate issue in dev environment

---

## 📚 Post-Deployment

- [ ] **Document in project README**
  - Add note about clustering threshold (16 zoom level)
  - Document test data utilities

- [ ] **Update team docs** (if applicable)
  - Explain new clustering behavior
  - Share performance benchmarks

- [ ] **Monitor production** (first 48 hours)
  - Watch for user-reported issues
  - Check error logs
  - Monitor page load times

- [ ] **Gather feedback**
  - User satisfaction with new UX?
  - Any confusion about cluster behavior?
  - Performance improvements observed?

---

## 🎯 Success Criteria

✅ **Implementation successful if:**
1. Map handles 500+ churches without lag
2. Clustering/declustering smooth at all zoom levels
3. Selection behavior preserved
4. No regressions in existing features
5. Positive user feedback (or no complaints)

---

## 🚀 Future Enhancements (Backlog)

- [ ] **Smart clustering by denomination/language**
- [ ] **Cluster preview tooltips** (show 3 church names)
- [ ] **Dynamic clustering radius** (adjust per zoom level)
- [ ] **Heatmap mode toggle** (for density visualization)
- [ ] **Server-side clustering** (for > 10k markers)
- [ ] **A/B test clustering settings** (optimal UX thresholds)

---

**Questions?** Reference `MAP_CLUSTERING_ANALYSIS.md` for detailed technical docs.

**Need help?** Check the troubleshooting section or rollback safely.
