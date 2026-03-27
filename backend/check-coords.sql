SELECT 
  COUNT(*) as total_churches,
  COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as missing_coords,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as has_coords,
  ROUND(100.0 * COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) / COUNT(*), 2) as coverage_pct
FROM churches;
