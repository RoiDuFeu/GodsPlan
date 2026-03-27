# 📊 Monitoring Dashboard GodsPlan

## 🎯 Vue d'ensemble

Dashboard de monitoring complet pour suivre l'état du scraping et de la base de données GodsPlan.

**État actuel:** ✅ Opérationnel et prêt à l'emploi

---

## ⚡ Quick Start

```bash
# Dashboard CLI (recommandé - ultra rapide)
cd backend && npm run dashboard

# Générer snapshot stats JSON
cd backend && npm run stats

# Dashboard web (bonus)
cd backend && npm run dev  # Terminal 1
cd web && npm run dev      # Terminal 2
# → http://localhost:5173/dashboard.html
```

---

## 📦 Livrables

### ✅ 1. Dashboard CLI
- **Fichier:** `backend/scripts/dashboard.js`
- **Commande:** `npm run dashboard`
- **Temps:** < 1 seconde
- **Features:**
  - Vue d'ensemble complète
  - Top/Bottom églises par score
  - Alertes automatiques
  - Recommandations intelligentes

### ✅ 2. Générateur Stats JSON
- **Fichier:** `backend/scripts/generate-stats.js`
- **Commande:** `npm run stats`
- **Output:** `data/stats-YYYY-MM-DD.json`
- **Usage:** Historique, alerting, graphiques

### ✅ 3. Dashboard Web (Bonus)
- **Fichier:** `web/public/dashboard.html`
- **Features:**
  - Stats temps réel
  - Graphiques Chart.js
  - Carte Leaflet
  - Auto-refresh 30s

### ✅ 4. API Endpoint
- **Route:** `GET /api/v1/churches/stats`
- **Usage:** Intégrations externes, dashboard web

---

## 📊 Métriques Suivies

| Catégorie | Métrique | État Actuel |
|-----------|----------|-------------|
| 📊 Base | Total églises | 10 |
| 📊 Base | Églises actives | 10 (100%) |
| 📊 Base | Score moyen | 83/100 |
| 🗺️ Géo | Coordonnées GPS | 100% ✅ |
| 📅 Horaires | Avec horaires | 70% |
| 📅 Horaires | Total horaires | 22 |
| 📞 Contacts | Téléphones | 80% |
| 📞 Contacts | Sites web | 100% ✅ |
| 📞 Contacts | Emails | 30% |
| 📸 Médias | Photos | 0% ⚠️ |
| 🔍 Sources | messes.info | 0 |
| 🔍 Sources | Google Maps | 0 |
| 🔍 Sources | Les deux | 2 |

---

## 🎨 Aperçu Dashboard CLI

```
═══════════════════════════════════════════════
🏛️  GODSPLAN MONITORING DASHBOARD
═══════════════════════════════════════════════

📊 Base de données
├─ Total églises       : 10
├─ Églises actives     : 10 (100%)
├─ Dernière mise à jour : 2026-03-17 15:23:15 UTC
└─ Score moyen fiabilité : 83/100

🗺️  Couverture géographique
├─ Avec coordonnées GPS  : 10 (100%) ✅
├─ Sans coordonnées      : 0 (0%)
└─ Coords invalides (0,0) : 0

[... sections complètes ...]

💡 Recommandations
├─ Lancer scraper Google Maps pour enrichir contacts/photos
├─ Lancer scraper API messes.info pour compléter horaires
```

---

## 📁 Structure

```
GodsPlan/
├── backend/
│   ├── scripts/
│   │   ├── dashboard.js          ← Dashboard CLI
│   │   ├── generate-stats.js     ← Générateur stats
│   │   └── README.md             ← Doc scripts
│   ├── data/
│   │   └── stats-2026-03-27.json ← Snapshot actuel
│   ├── src/routes/
│   │   └── churches.ts           ← Endpoint /stats
│   └── package.json              ← Scripts npm
├── web/
│   └── public/
│       └── dashboard.html        ← Dashboard web
└── Documentation/
    ├── MONITORING_DASHBOARD.md   ← Guide complet
    ├── TASK_COMPLETE.md          ← Résumé final
    ├── QUICKSTART_MONITORING.md  ← QuickStart
    └── README_MONITORING.md      ← Ce fichier
```

---

## 🔧 Détails Techniques

**Technologies:**
- CLI: Node.js + PostgreSQL (`pg`)
- Web: Vanilla JS + Chart.js + Leaflet
- API: TypeScript + Express + TypeORM

**Performance:**
- Dashboard CLI: < 1 seconde
- API Stats: < 200ms
- Web refresh: 30 secondes

**Optimisations SQL:**
- `jsonb_array_length()` pour comptage rapide
- `FILTER (WHERE ...)` pour agrégations conditionnelles
- Aucun JOIN superflu

---

## 💡 Cas d'Usage

### Workflow quotidien
```bash
# Morning check
npm run dashboard

# Après scraping
npm run stats && npm run dashboard

# Monitoring continu
# → Laisser dashboard web ouvert
```

### Debugging
```bash
# Églises problématiques
npm run dashboard | grep -A 10 "Bottom 5"

# Vérifier métrique spécifique
npm run stats | jq '.coverage.schedules'
```

### Historique
```bash
# Générer snapshot quotidien
npm run stats
# → data/stats-2026-03-27.json

# Comparer évolution
diff data/stats-2026-03-26.json data/stats-2026-03-27.json
```

---

## 🚀 Prochaines Étapes (Optionnel)

1. **Historisation automatique**
   - Cron job quotidien `npm run stats`
   - Graphiques d'évolution temporelle

2. **Alertes proactives**
   - Email/Telegram si score < seuil
   - Notification baisse couverture

3. **Carte interactive**
   - Charger églises depuis API
   - Clustering, filtres

4. **Export rapports**
   - PDF/Excel mensuels
   - Graphiques inclus

---

## 📖 Documentation

- **QuickStart:** `QUICKSTART_MONITORING.md` (3 min)
- **Guide complet:** `MONITORING_DASHBOARD.md` (10 min)
- **Résumé final:** `TASK_COMPLETE.md` (5 min)
- **Scripts:** `backend/scripts/README.md` (référence)

---

## ✅ Checklist Validation

- [x] Dashboard CLI fonctionnel (< 1s)
- [x] Générateur stats JSON opérationnel
- [x] Scripts npm intégrés (`dashboard`, `stats`)
- [x] Endpoint API `/churches/stats` actif
- [x] Dashboard web avec graphiques
- [x] Documentation complète
- [x] Snapshot actuel généré
- [x] Tests validés

---

## 🎉 Résultat

Le monitoring GodsPlan est maintenant **opérationnel et prêt à l'emploi** !

**Commande préférée:** `npm run dashboard` (rapide, complet, clair)

**Dashboard web:** Parfait pour monitoring continu sur écran secondaire

**Stats JSON:** Idéal pour historique et alerting automatisé

---

## 🆘 Support

En cas de problème, voir `QUICKSTART_MONITORING.md` section Troubleshooting.

---

**Happy Monitoring! 📊🚀**
