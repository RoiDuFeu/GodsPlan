#!/bin/bash

# Script de déploiement production GodsPlan
# Tunnel Cloudflare: godsplan.montparnas.fr → localhost:3022

set -e

echo "🚀 Déploiement GodsPlan en production..."
echo ""

# 1. Build frontend
echo "📦 Build du frontend React..."
cd web
npm run build
echo "✅ Frontend buildé dans web/dist/"
echo ""

# 2. Copier le frontend dans backend/public
echo "📂 Copie du frontend vers backend/public/..."
cd ..
rm -rf backend/public
cp -r web/dist backend/public
echo "✅ Frontend copié"
echo ""

# 3. Créer .env pour port 3022
echo "⚙️  Configuration du port 3022..."
cat > backend/.env << EOF
PORT=3022
NODE_ENV=production
API_PREFIX=/api/v1

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=godsplan
POSTGRES_PASSWORD=godsplan
POSTGRES_DB=godsplan_db

# Optional
GOOGLE_MAPS_API_KEY=
SCRAPE_USER_AGENT=GodsPlan/1.0 (contact@godsplan.app)
EOF
echo "✅ .env créé avec PORT=3022"
echo ""

# 4. Build backend
echo "🔨 Build du backend TypeScript..."
cd backend
npm run build
echo "✅ Backend buildé"
echo ""

# 5. Vérifier que PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 n'est pas installé. Installation..."
    npm install -g pm2
fi

# 6. Démarrer/redémarrer avec PM2
echo "🔄 Démarrage avec PM2..."
pm2 delete godsplan-api 2>/dev/null || true
pm2 start npm --name "godsplan-api" -- run start
pm2 save
echo "✅ Backend démarré sur port 3022"
echo ""

# 7. Résumé
echo "═══════════════════════════════════════════════════════════"
echo "✅ DÉPLOIEMENT TERMINÉ"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📍 URL publique : https://godsplan.montparnas.fr"
echo "📍 Dashboard admin : https://godsplan.montparnas.fr/admindashboard"
echo "📍 API : https://godsplan.montparnas.fr/api/v1"
echo ""
echo "🔍 Commandes utiles :"
echo "  pm2 logs godsplan-api     # Voir les logs"
echo "  pm2 restart godsplan-api  # Redémarrer"
echo "  pm2 stop godsplan-api     # Arrêter"
echo "  pm2 monit                 # Monitoring"
echo ""
echo "🧪 Tester :"
echo "  curl http://localhost:3022/health"
echo "  curl http://localhost:3022/api/v1/admin/stats"
echo ""
