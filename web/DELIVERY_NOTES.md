# GodsPlan Web Frontend - Livraison MVP

## ✅ Livré

### Stack & Setup
- ✅ Vite + React 19 + TypeScript
- ✅ Tailwind CSS v3 (stable, build OK)
- ✅ shadcn/ui composants (Button, Card, Input, Badge)
- ✅ Leaflet pour carte interactive (gratuit, performant)
- ✅ Zustand pour state management
- ✅ Lucide React pour icons
- ✅ Port 3022 configuré
- ✅ Build production réussi (390KB JS gzip: 123KB)

### Features Implémentées
- ✅ **Carte interactive Leaflet**
  - Markers pour chaque église
  - Popups avec nom/adresse/distance
  - Auto-zoom sur les églises disponibles
  - Clic sur marker pour ouvrir détail
  
- ✅ **Sidebar de recherche**
  - Barre de recherche temps réel (filtre nom/adresse)
  - Bouton géolocalisation (native browser API)
  - Liste scrollable avec ChurchCard
  - Badge de confiance (Haute/Moyenne/À vérifier)
  - Badge de distance (si géolocalisé)
  - Compteur d'églises affichées
  
- ✅ **Détail église (Modal)**
  - Nom + adresse
  - Horaires de messes (tableau par jour, trié Lun-Dim)
  - Rite et langue si disponibles
  - Notes de messe si disponibles
  - Score de confiance avec badge coloré
  - Bouton "Itinéraire" (Google Maps)
  - Liste des sources de données
  - Fermeture par bouton X ou clic extérieur (modal)
  
- ✅ **Responsive mobile-first**
  - Layout flex adaptif (sidebar + map)
  - Composants optimisés pour mobile
  
- ✅ **Accessibilité**
  - ARIA labels (carte, recherche, cartes)
  - Keyboard navigation (Enter/Space sur ChurchCard)
  - Roles (dialog, button)
  
- ✅ **Performance**
  - Zustand (store léger, pas de boilerplate)
  - Calcul distance client-side (Haversine)
  - TypeScript strict mode
  - Error handling (loading, errors API)

### Structure Projet
```
src/
├── components/
│   ├── ui/               # shadcn/ui base
│   ├── Map.tsx           # Carte Leaflet
│   ├── SearchSidebar.tsx # Sidebar + recherche + liste
│   ├── ChurchCard.tsx    # Preview église
│   └── ChurchDetail.tsx  # Modal détail
├── lib/
│   ├── api.ts            # Fetch helpers
│   ├── types.ts          # TypeScript interfaces
│   └── utils.ts          # Helpers (distance, badges, cn)
├── store/
│   └── useChurchStore.ts # Zustand store
├── App.tsx
├── main.tsx
└── index.css
```

## 🚀 Démarrage

### Backend (requis)
```bash
cd GodsPlan/backend
npm run dev  # Port 3001
```

### Frontend
```bash
cd GodsPlan/web
npm install   # (déjà fait)
npm run dev   # Port 3022
```

Ouvrir: **http://localhost:3022**

## 📊 État Actuel

- **Backend running**: ✅ Port 3001
- **Frontend running**: ✅ Port 3022
- **Églises en DB**: 2 (pour test MVP)
- **Build production**: ✅ OK (dist/)

### Note Database
L'API retourne actuellement 2 églises. Pour charger les ~15 églises Paris initiales ou les 208 disponibles via le scraper, il faudra:
1. Relancer le scraper `npm run scrape:messesinfo` (backend)
2. Ou importer des fixtures si disponibles
3. Ou utiliser le scraper Google Maps (208 églises)

Le frontend est prêt à afficher n'importe quel nombre d'églises.

## 🎨 Design System

### Couleurs (Tailwind CSS Variables)
- **Primary**: Bleu (accent CTAs)
- **Secondary**: Gris clair
- **Muted**: Texte secondaire
- **Destructive**: Rouge (erreurs)
- **Confiance badges**:
  - Haute (≥90%): Vert
  - Moyenne (≥70%): Jaune
  - À vérifier (<70%): Orange

### Composants UI
Tous les composants shadcn/ui sont customisables via Tailwind classes. Pour ajouter de nouveaux composants shadcn:
1. Copier depuis https://ui.shadcn.com/docs/components
2. Adapter les imports (`../../lib/utils`)
3. Placer dans `src/components/ui/`

## 🐛 Points d'Attention

### 1. Backend .env
Le backend a besoin d'un symlink vers le .env racine:
```bash
cd backend && ln -sf ../.env .env
```
(Déjà fait lors du setup)

### 2. Géolocalisation
- Fonctionne uniquement en **HTTPS** ou **localhost**
- L'utilisateur doit accepter les permissions navigateur
- Fallback: liste toutes les églises sans tri par distance

### 3. CORS
Si besoin d'accéder depuis un domaine différent, configurer CORS dans le backend (déjà fait normalement).

## 🔮 Améliorations Futures Recommandées

### Court Terme (1-2 semaines)
- [ ] **Clustering markers** (Leaflet.markercluster) si >50 églises
- [ ] **Filtres UI** (rites, langues) dans sidebar
- [ ] **Toast notifications** (sonner) pour feedback utilisateur
- [ ] **Skeleton loaders** pendant chargement
- [ ] **PWA manifest** (installable sur mobile)

### Moyen Terme (1 mois)
- [ ] **Mode sombre** (Tailwind dark mode)
- [ ] **Favoris** (localStorage + UI)
- [ ] **Partage d'église** (URL avec ID + social share)
- [ ] **Photos réelles** (Google Places API)
- [ ] **Temps de trajet réel** (Google Directions API)
- [ ] **Export iCal** des horaires de messe

### Long Terme (2-3 mois)
- [ ] **App mobile React Native** (Expo)
- [ ] **Notifications push** (rappel messe)
- [ ] **Avis utilisateurs** (backend + UI)
- [ ] **Affluence estimée** (crowdsourcing)
- [ ] **Accessibilité PMR** (données + filtres)
- [ ] **Service Worker** (offline-first)

## 📸 Screenshots / Tests Visuels

Pour valider l'UI finalement:
1. Ouvrir http://localhost:3022
2. Tester la recherche
3. Tester géolocalisation
4. Cliquer sur une carte/marker
5. Vérifier le modal détail
6. Tester responsive (DevTools mobile view)

## 📦 Build Production

```bash
npm run build
# Output: dist/ (prêt pour déploiement)
```

Déployer sur:
- Vercel (recommandé pour Vite)
- Netlify
- VPS avec nginx (servir dist/)

## 🎯 Critères de Qualité Atteints

- ✅ TypeScript strict mode
- ✅ Composants réutilisables
- ✅ Performance optimisée (Zustand, lazy Leaflet)
- ✅ Accessibilité (ARIA, keyboard)
- ✅ Error handling (loading states, try/catch API)
- ✅ Documentation README complète
- ✅ Mobile-first responsive
- ✅ Code clean et maintenable

## 🌙 Signature

**Subagent**: Artemis  
**Task**: godsplan-web-frontend  
**Date**: 17 mars 2026  
**Status**: ✅ MVP Complete

---

**Next steps pour Marc:**
1. Tester l'UI visuellement (localhost:3022)
2. Charger plus d'églises en DB si besoin (scraper)
3. Itérer sur les features prioritaires (filtres, favoris...)
4. Déployer en prod (Vercel)
