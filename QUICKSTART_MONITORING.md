# 🚀 QuickStart - Monitoring Dashboard GodsPlan

## ⚡ Démarrage Rapide (3 commandes)

### 1. Dashboard CLI (le plus simple)
```bash
cd backend
npm run dashboard
```
→ Affiche l'état complet dans le terminal en < 1 seconde

### 2. Générer un snapshot stats
```bash
cd backend
npm run stats
```
→ Crée `data/stats-YYYY-MM-DD.json` avec les statistiques

### 3. Dashboard Web (bonus)
```bash
# Terminal 1 : Backend API
cd backend
npm run dev

# Terminal 2 : Frontend
cd web
npm run dev

# Puis ouvrir : http://localhost:5173/dashboard.html
```

---

## 📊 Ce que tu vas voir

### Dashboard CLI
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

📅 Horaires de messes
├─ Églises avec horaires : 7 (70%)
├─ Églises sans horaires : 3 (30%)
├─ Total horaires        : 22
└─ Moyenne/église        : 2.2 horaires

📞 Informations de contact
├─ Avec téléphone : 8 (80%)
├─ Avec site web  : 10 (100%)
├─ Avec email     : 3 (30%)
└─ Avec photos    : 0 (0%)

📸 Médias
├─ Total photos    : 0
└─ Moyenne/église  : 0.0 photos

🔍 Sources de données
├─ messes.info uniquement : 0
├─ Google Maps uniquement : 0
├─ Les deux sources       : 2
└─ Aucune source          : 3

🏆 Top 5 églises (meilleur score)
1. Chapelle de Picpus - Score: 100 - 4 horaires - 0 photos
2. Chapelle de l'Agneau-de-Dieu - Score: 100 - 2 horaires - 0 photos
[...]

⚠️  Alertes et actions requises
├─ 3 églises sans horaires (30%)
├─ 2 églises sans téléphone (20%)
└─ 10 églises sans photos (100%)

💡 Recommandations
├─ Lancer scraper Google Maps pour enrichir contacts/photos
├─ Lancer scraper API messes.info pour compléter horaires
```

---

## 🎯 Cas d'Usage

### Workflow quotidien
```bash
# Matin : check rapide
npm run dashboard

# Après modifications DB
npm run dashboard  # voir impact

# Fin de journée : snapshot
npm run stats
```

### Monitoring continu
- Laisser dashboard web ouvert (auto-refresh 30s)
- Vérifier alertes visuelles
- Exporter stats JSON pour historique

### Debugging
```bash
# Voir les églises avec problèmes
npm run dashboard | grep -A 10 "Bottom 5"

# Vérifier une métrique spécifique
npm run stats | jq '.coverage.schedules'
```

---

## 📁 Fichiers Importants

```
backend/
├── scripts/
│   ├── dashboard.js       ← Dashboard CLI
│   ├── generate-stats.js  ← Générateur stats
│   └── README.md          ← Doc détaillée
├── data/
│   └── stats-*.json       ← Snapshots historiques
└── package.json           ← Scripts npm

web/
└── public/
    └── dashboard.html     ← Dashboard web

Documentation/
├── MONITORING_DASHBOARD.md  ← Guide complet
├── TASK_COMPLETE.md         ← Résumé final
└── QUICKSTART_MONITORING.md ← Ce fichier
```

---

## 🔧 Troubleshooting

### Dashboard ne se lance pas
```bash
# Vérifier connexion DB
cd backend
cat .env | grep POSTGRES

# Tester connexion
psql -h localhost -U godsplan -d godsplan -c "SELECT COUNT(*) FROM churches;"
```

### Dashboard web ne charge pas
```bash
# Vérifier que l'API tourne
curl http://localhost:3001/api/v1/churches/stats

# Vérifier CORS dans src/index.ts
# (déjà configuré normalement)
```

### Stats JSON vide
```bash
# Vérifier qu'il y a des églises en DB
psql -h localhost -U godsplan -d godsplan -c "SELECT COUNT(*) FROM churches;"
```

---

## 📖 Plus d'Infos

- **Guide complet:** `MONITORING_DASHBOARD.md`
- **Documentation scripts:** `backend/scripts/README.md`
- **Résumé final:** `TASK_COMPLETE.md`

---

## 🎉 Enjoy!

Le monitoring est maintenant opérationnel. Tu peux voir l'évolution du projet en temps réel ! 📊🚀

**Commande préférée:** `npm run dashboard` (rapide et complet)
