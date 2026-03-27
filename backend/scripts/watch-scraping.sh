#!/bin/bash

# Script de monitoring du scraping en temps réel

echo "🔍 Monitoring du scraping GodsPlan..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
  clear
  echo "═══════════════════════════════════════════════════════════"
  echo "🏛️  GODSPLAN SCRAPING MONITOR - $(date '+%Y-%m-%d %H:%M:%S')"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  
  # Compter les églises en DB
  TOTAL=$(psql -U godsplan -d godsplan_db -t -c "SELECT COUNT(*) FROM churches;" 2>/dev/null | xargs)
  WITH_COORDS=$(psql -U godsplan -d godsplan_db -t -c "SELECT COUNT(*) FROM churches WHERE latitude IS NOT NULL AND longitude IS NOT NULL;" 2>/dev/null | xargs)
  WITH_SCHEDULES=$(psql -U godsplan -d godsplan_db -t -c "SELECT COUNT(*) FROM churches WHERE jsonb_array_length(\"massSchedules\") > 0;" 2>/dev/null | xargs)
  WITH_PHONE=$(psql -U godsplan -d godsplan_db -t -c "SELECT COUNT(*) FROM churches WHERE contact->>'phone' IS NOT NULL;" 2>/dev/null | xargs)
  WITH_PHOTOS=$(psql -U godsplan -d godsplan_db -t -c "SELECT COUNT(*) FROM churches WHERE jsonb_array_length(photos) > 0;" 2>/dev/null | xargs)
  
  echo "📊 Progression"
  echo "├─ Total églises       : ${TOTAL:-0}"
  echo "├─ Avec coordonnées    : ${WITH_COORDS:-0}"
  echo "├─ Avec horaires       : ${WITH_SCHEDULES:-0}"
  echo "├─ Avec téléphone      : ${WITH_PHONE:-0}"
  echo "└─ Avec photos         : ${WITH_PHOTOS:-0}"
  echo ""
  
  # Dernières églises ajoutées
  echo "🆕 Dernières églises ajoutées:"
  psql -U godsplan -d godsplan_db -t -c "SELECT '  • ' || name || ' (' || \"reliabilityScore\" || '%)' FROM churches ORDER BY \"createdAt\" DESC LIMIT 5;" 2>/dev/null
  
  echo ""
  echo "Rafraîchissement dans 5 secondes..."
  sleep 5
done
