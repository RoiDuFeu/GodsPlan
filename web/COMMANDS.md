# GodsPlan Web - Commandes Utiles

## 🚀 Développement

```bash
# Démarrer le serveur de dev (port 3022)
npm run dev

# Build production
npm run build

# Preview build production
npm run preview

# Lint TypeScript
npm run lint
```

## 🧪 Tests & Debug

```bash
# Tester l'API backend
curl http://localhost:3001/api/v1/churches-simple | jq

# Compter les églises
curl -s http://localhost:3001/api/v1/churches-simple | jq '.data | length'

# Tester une église spécifique
curl http://localhost:3001/api/v1/churches-simple/<ID> | jq

# Tester nearby
curl "http://localhost:3001/api/v1/churches-simple/nearby?lat=48.8566&lng=2.3522&radius=5000" | jq
```

## 📦 Installation

```bash
# Installation initiale
npm install

# Ajouter une dépendance
npm install <package>

# Ajouter une dépendance dev
npm install -D <package>

# Mise à jour des dépendances
npm update
```

## 🎨 Ajouter un Composant shadcn/ui

```bash
# Exemple: ajouter Dialog
# 1. Copier depuis https://ui.shadcn.com/docs/components/dialog
# 2. Créer src/components/ui/dialog.tsx
# 3. Adapter les imports: ../../lib/utils
```

## 🔄 Backend

```bash
cd ../backend

# Démarrer le backend (port 3001)
npm run dev

# Scraper messes.info (~15 églises)
npm run scrape:messesinfo

# Scraper Google Maps (208 églises)
npm run scrape:google

# Enrichir avec Google Places
npm run enrich:google
```

## 🐛 Debugging

```bash
# Vérifier les ports occupés
lsof -ti:3022
lsof -ti:3001

# Tuer un processus sur un port
kill -9 $(lsof -ti:3022)

# Logs backend
cd ../backend
cat logs/app.log

# Vérifier la DB
cd ../backend
npm run typeorm query "SELECT COUNT(*) FROM churches"
```

## 🚢 Déploiement Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Premier déploiement
vercel

# Déploiement prod
vercel --prod

# Variables d'environnement
# Vercel dashboard → Settings → Environment Variables
# Ajouter: VITE_API_URL=https://api.godsplan.app
```

## 🧹 Maintenance

```bash
# Nettoyer node_modules
rm -rf node_modules package-lock.json
npm install

# Nettoyer build
rm -rf dist

# Vérifier la taille du build
npm run build
du -sh dist/

# Analyser le bundle
npm install -D rollup-plugin-visualizer
# Ajouter dans vite.config.ts
```

## 📊 Stats

```bash
# Compter les lignes de code
find src -name '*.tsx' -o -name '*.ts' | xargs wc -l

# Taille des dépendances
du -sh node_modules/

# Nombre de dépendances
npm list --depth=0
```
