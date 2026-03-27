# 🚀 Deployment Guide - God's Plan Admin Dashboard

## Build & Deploy

### 1. Backend

```bash
cd backend
npm install
npm run build
npm start  # ou PM2/systemd pour production
```

Le backend doit écouter sur le port configuré (par défaut 3000).

### 2. Frontend

```bash
cd web
npm install
npm run build
```

Les fichiers statiques sont dans `web/dist/`.

### 3. Nginx Configuration

Pour que `/admindashboard` fonctionne correctement, il faut configurer nginx pour servir le SPA :

```nginx
server {
    listen 443 ssl http2;
    server_name godsplan.montparnas.fr;

    root /home/ocadmin/.openclaw/workspace/GodsPlan/web/dist;
    index index.html;

    # SSL config...
    ssl_certificate /etc/letsencrypt/live/godsplan.montparnas.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/godsplan.montparnas.fr/privkey.pem;

    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Admin dashboard routing (important!)
    location /admindashboard {
        try_files $uri /index.html;
    }

    # Backend API proxy
    location /api/v1/ {
        proxy_pass http://localhost:3000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name godsplan.montparnas.fr;
    return 301 https://$server_name$request_uri;
}
```

### 4. Apply Nginx Config

```bash
sudo nginx -t                    # Test config
sudo systemctl reload nginx      # Apply
```

## Environment Variables

### Backend (.env)

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=godsplan
DB_USER=godsplan_user
DB_PASSWORD=your_secure_password

# Optional
LOG_LEVEL=info
```

### Frontend (.env.production)

```bash
VITE_API_URL=https://godsplan.montparnas.fr/api/v1
```

## Process Management (PM2)

### Backend avec PM2

```bash
cd backend
pm2 start dist/index.js --name godsplan-api
pm2 save
pm2 startup  # Pour démarrage auto
```

### Config PM2 (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'godsplan-api',
    script: './dist/index.js',
    cwd: '/home/ocadmin/.openclaw/workspace/GodsPlan/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

```bash
pm2 start ecosystem.config.js
```

## Verification

### 1. Check Backend

```bash
curl https://godsplan.montparnas.fr/health
curl https://godsplan.montparnas.fr/api/v1/admin/stats
```

### 2. Check Frontend

```bash
curl -I https://godsplan.montparnas.fr/
curl -I https://godsplan.montparnas.fr/admindashboard
```

### 3. Check Logs

```bash
# PM2 logs
pm2 logs godsplan-api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### "404 Not Found" sur /admindashboard

➡️ Vérifier la config nginx : `try_files $uri /index.html;`

### API CORS errors

➡️ Vérifier que CORS est activé dans `backend/src/index.ts` :
```typescript
app.use(cors());
```

### "Cannot GET /api/v1/admin/stats"

➡️ Vérifier que le backend tourne :
```bash
pm2 status
curl http://localhost:3000/health
```

### Leaflet map tiles not loading

➡️ Vérifier que le CDN OpenStreetMap est accessible :
```bash
curl -I https://tile.openstreetmap.org/12/2048/1362.png
```

### Chart.js not rendering

➡️ Vérifier que les dépendances sont bien installées :
```bash
cd web
npm list chart.js react-chartjs-2
```

## Monitoring

### Setup monitoring endpoint

```bash
# Ajouter à crontab
*/5 * * * * curl -s https://godsplan.montparnas.fr/health | jq '.status' || echo "API DOWN"
```

### PM2 monitoring

```bash
pm2 monit          # Real-time monitoring
pm2 status         # Status overview
pm2 logs --lines 50
```

## Update Workflow

```bash
# 1. Pull latest code
cd /home/ocadmin/.openclaw/workspace/GodsPlan
git pull

# 2. Backend update
cd backend
npm install
npm run build
pm2 restart godsplan-api

# 3. Frontend update
cd ../web
npm install
npm run build

# 4. Verify
curl https://godsplan.montparnas.fr/health
```

## Rollback

Si problème en production :

```bash
# Backend
cd backend
git checkout <previous-commit>
npm install
npm run build
pm2 restart godsplan-api

# Frontend
cd web
git checkout <previous-commit>
npm install
npm run build
```

---

**Déploiement configuré pour :** https://godsplan.montparnas.fr  
**Dashboard admin :** https://godsplan.montparnas.fr/admindashboard  
