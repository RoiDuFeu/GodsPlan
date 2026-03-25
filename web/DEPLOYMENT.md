# 🚀 Deployment Guide - GodsPlan Web

## Build Production

### 1. **Build local**
```bash
cd GodsPlan/web
npm run build
```

**Output:**
```
dist/
├── index.html (0.69 KB)
├── assets/
│   ├── index-*.css (43 KB, gzip: 12 KB)
│   └── index-*.js (449 KB, gzip: 136 KB)
```

### 2. **Preview build**
```bash
npm run preview
```
- Ouvrir: http://localhost:4173
- Tester en conditions production

---

## ☁️ Déploiement Vercel (Recommandé)

### **Why Vercel?**
- ✅ Zero-config pour Vite
- ✅ HTTPS automatique
- ✅ CDN global
- ✅ Preview deployments (PRs)
- ✅ Analytics intégrés
- ✅ Free tier généreux

### **Setup**

#### Via CLI
```bash
# Installer Vercel CLI
npm i -g vercel

# Deploy
cd GodsPlan/web
vercel

# Production
vercel --prod
```

#### Via Dashboard
1. Aller sur [vercel.com](https://vercel.com)
2. "New Project"
3. Import Git repo (ou upload folder)
4. Framework: **Vite**
5. Build command: `npm run build`
6. Output directory: `dist`
7. Deploy

### **Environment Variables**
Aucune pour le moment (API endpoint hardcodé).

Si besoin futur:
```
VITE_API_URL=https://godsplan-api.montparnas.fr/api/v1
```

### **Custom Domain**
1. Vercel Dashboard → Settings → Domains
2. Ajouter `godsplan.montparnas.fr`
3. Configurer DNS (A record ou CNAME)
4. HTTPS auto (Let's Encrypt)

---

## 🌐 Déploiement Netlify

### **Setup**

#### Via Netlify CLI
```bash
# Installer Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
cd GodsPlan/web
netlify deploy --prod
```

#### Via Dashboard
1. [app.netlify.com](https://app.netlify.com)
2. "Add new site" → "Deploy manually"
3. Drag & drop `dist/` folder
4. Ou connect Git repo

### **netlify.toml** (optionnel)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### **SPA Routing**
Netlify détecte automatiquement, sinon:
- Settings → Build & Deploy → Post processing
- Asset optimization: Enable

---

## ☁️ Déploiement Cloudflare Pages

### **Setup**

1. [pages.cloudflare.com](https://pages.cloudflare.com)
2. "Create a project"
3. Connect Git repo
4. Build settings:
   - Framework: Vite
   - Build command: `npm run build`
   - Output: `dist`
5. Deploy

### **Performance**
- Edge CDN ultra-rapide
- Free tier illimité (bandwidth)
- Analytics intégrés

---

## 🪣 Déploiement AWS S3 + CloudFront

### **S3 Bucket**

```bash
# Créer bucket
aws s3 mb s3://godsplan-web

# Upload build
aws s3 sync dist/ s3://godsplan-web --delete

# Config static website
aws s3 website s3://godsplan-web \
  --index-document index.html \
  --error-document index.html
```

### **CloudFront Distribution**

1. AWS Console → CloudFront
2. Create distribution
3. Origin: S3 bucket
4. Default root object: `index.html`
5. Error pages: 404 → `/index.html` (SPA routing)
6. Custom SSL certificate (ACM)

### **Invalidation cache**
```bash
aws cloudfront create-invalidation \
  --distribution-id XXXXX \
  --paths "/*"
```

---

## 🐳 Déploiement Docker + Nginx

### **Dockerfile**
```dockerfile
# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### **nginx.conf**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/css application/javascript application/json;
    gzip_min_length 1000;
}
```

### **Build & Run**
```bash
# Build image
docker build -t godsplan-web .

# Run container
docker run -d -p 3022:80 godsplan-web
```

---

## 🔐 HTTPS & Security

### **HTTPS obligatoire**
- Geolocation API nécessite HTTPS (production)
- LocalStorage plus sécurisé
- SEO boost

### **Security Headers**

#### Nginx
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

#### Vercel/Netlify
Automatique (ou via `vercel.json` / `netlify.toml`)

---

## 🎯 Performance Optimization

### **Pre-deploy checklist**
- [x] Build production (`npm run build`)
- [x] Test preview (`npm run preview`)
- [x] Vérifier bundle size (<500KB)
- [x] Lighthouse score (>90)
- [x] HTTPS activé
- [x] CDN configuré
- [x] Gzip/Brotli activé

### **Caching strategy**
```
HTML:        no-cache (toujours fetch)
CSS/JS:      1 year (hash dans nom fichier)
Images:      1 year
Fonts:       1 year
```

### **CDN**
- Vercel/Netlify: automatique (edge network)
- CloudFront: configurer TTL
- Cloudflare Pages: edge cache

---

## 🔍 Monitoring

### **Analytics (optionnel)**

#### Vercel Analytics
```bash
npm i @vercel/analytics
```

```tsx
// src/main.tsx
import { Analytics } from '@vercel/analytics/react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <Analytics />
    </ThemeProvider>
  </StrictMode>
);
```

#### Plausible (privacy-friendly)
```html
<!-- index.html -->
<script defer data-domain="godsplan.montparnas.fr" 
  src="https://plausible.io/js/script.js"></script>
```

### **Error Tracking**

#### Sentry
```bash
npm i @sentry/react
```

```tsx
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_DSN",
  environment: import.meta.env.MODE,
});
```

---

## 🧪 Post-Deployment Tests

### **Checklist**
- [ ] URL accessible (HTTPS)
- [ ] Page charge (<3s)
- [ ] Theme toggle fonctionne
- [ ] Geolocation demande permission
- [ ] Map tiles chargent
- [ ] Markers visibles
- [ ] Modal s'ouvre
- [ ] Mobile responsive OK
- [ ] Console sans erreurs

### **Outils**
- **Lighthouse:** Performance, SEO, Accessibility
- **WebPageTest:** Load times, waterfalls
- **GTmetrix:** Performance audit
- **Real device testing:** BrowserStack, LambdaTest

---

## 🔄 CI/CD (optionnel)

### **GitHub Actions**

`.github/workflows/deploy.yml`
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 📝 Environment Variables (futur)

Si besoin de gérer plusieurs environnements:

### **.env.production**
```
VITE_API_URL=https://godsplan-api.montparnas.fr/api/v1
VITE_SENTRY_DSN=...
```

### **Code**
```ts
const API_URL = import.meta.env.VITE_API_URL;
```

### **Platforms**
- **Vercel:** Dashboard → Settings → Environment Variables
- **Netlify:** Site settings → Environment variables
- **Cloudflare:** Settings → Environment variables

---

## 🎉 Quick Deploy Commands

### **Vercel (1 commande)**
```bash
npx vercel --prod
```

### **Netlify (1 commande)**
```bash
npx netlify deploy --prod --dir=dist
```

### **Docker (local)**
```bash
docker build -t godsplan-web . && docker run -p 3022:80 godsplan-web
```

---

## ✅ Deployment Complete!

**Production URL:** `https://godsplan.montparnas.fr` (ou votre domaine)

**Next steps:**
1. Configure custom domain
2. Setup analytics (optionnel)
3. Add error tracking (optionnel)
4. Monitor performance
5. Collect user feedback

---

**Ready to ship! 🚀✨**
