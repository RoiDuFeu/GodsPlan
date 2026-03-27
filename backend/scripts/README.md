# Scripts de Monitoring GodsPlan

Ce dossier contient des scripts utilitaires pour monitorer l'état de la base de données et du scraping.

## 📊 Dashboard CLI

**Usage:**
```bash
npm run dashboard
```

Affiche un dashboard complet dans le terminal avec :
- Vue d'ensemble de la base de données (total églises, score moyen)
- Couverture géographique (coordonnées GPS)
- Statistiques horaires de messes
- Informations de contact (téléphone, site web, email, photos)
- Sources de données (messes.info, Google Maps)
- Top 5 et Bottom 5 églises par score de fiabilité
- Alertes et recommandations

**Exemple de sortie:**
```
═══════════════════════════════════════════════
🏛️  GODSPLAN MONITORING DASHBOARD
═══════════════════════════════════════════════

📊 Base de données
├─ Total églises       : 208
├─ Églises actives     : 208 (100%)
├─ Dernière mise à jour : 2026-03-27 15:30 UTC
└─ Score moyen fiabilité : 72/100

🗺️  Couverture géographique
├─ Avec coordonnées GPS  : 208 (100%) ✅
[...]
```

## 📈 Générateur de Stats JSON

**Usage:**
```bash
npm run stats
# ou avec un chemin personnalisé
node scripts/generate-stats.js /path/to/output.json
```

Génère un fichier JSON avec les statistiques clés de la base de données.

**Fichier de sortie par défaut:** `data/stats-YYYY-MM-DD.json`

**Format:**
```json
{
  "timestamp": "2026-03-27T15:30:00Z",
  "total": 208,
  "active": 208,
  "coverage": {
    "coordinates": 1.0,
    "schedules": 0.7,
    "phone": 0.05,
    "website": 0.05,
    "photos": 0.05
  },
  "avgSchedulesPerChurch": 1.9,
  "avgPhotosPerChurch": 0.4,
  "avgReliabilityScore": 72,
  "sources": {
    "messes.info": 208,
    "google-maps": 10,
    "both": 10
  }
}
```

## 🔧 Configuration

Les scripts utilisent les variables d'environnement du fichier `.env` :
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

## 📝 Notes

- Les deux scripts sont rapides (< 2 secondes)
- Utilisation directe de `pg` (pas de TypeORM) pour éviter les problèmes de compatibilité
- Les stats JSON peuvent être utilisées pour des graphiques historiques ou des alertes

## 🚀 Prochaines étapes (bonus)

- Dashboard web avec Chart.js et Leaflet (`web/public/dashboard.html`)
- Historisation automatique des stats avec cron
- Alertes email/Telegram si certains seuils sont dépassés
