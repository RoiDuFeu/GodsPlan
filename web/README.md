# GodsPlan Web Frontend

Interface web moderne et épurée pour trouver des églises et consulter les horaires de messes à Paris.

## 🚀 Stack Technique

- **Framework**: Vite + React 19 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Carte**: Leaflet (gratuit, performant)
- **State Management**: Zustand
- **Icons**: Lucide React
- **Build**: Vite (HMR ultra-rapide)

## 📦 Installation

```bash
npm install
```

## 🏃 Lancement

```bash
npm run dev
```

Le frontend démarre sur **http://localhost:3022**

> ⚠️ **Important**: Le backend doit être lancé sur `http://localhost:3001` avant de démarrer le frontend.

## 🎨 Features

### ✅ Implémenté

1. **Carte Interactive**
   - Leaflet avec markers pour chaque église
   - Popups avec infos de base
   - Auto-zoom sur les églises disponibles
   - Marker utilisateur (cercle bleu) après géolocalisation

2. **Sidebar de Recherche**
   - Barre de recherche en temps réel (nom/adresse)
   - Bouton de géolocalisation
   - Liste scrollable avec preview des églises
   - Badge de distance (si géolocalisé)
   - Badge de confiance (Haute/Moyenne/À vérifier)

3. **Détail d'Église (Modal)**
   - Photos (si disponibles via `dataSources.metadata.photoReferences`)
   - Nom + adresse complète
   - Horaires de messes par jour (triés Lun-Dim)
   - Rite et langue si disponibles
   - Score de confiance avec badge coloré
   - Bouton "Itinéraire" (Google Maps)
   - Liste des sources de données

4. **Design System**
   - Composants shadcn/ui: Button, Card, Input, Badge
   - Couleurs neutres avec accent bleu
   - Mode clair uniquement (pas de dark mode)
   - Responsive mobile-first
   - Accessibilité: ARIA labels, keyboard navigation

5. **Performance**
   - Zustand pour state management léger
   - Calcul de distance client-side (Haversine)
   - Lazy rendering des markers Leaflet

## 📁 Structure du Projet

```
src/
├── components/
│   ├── ui/               # Composants shadcn/ui
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── badge.tsx
│   ├── Map.tsx           # Carte Leaflet
│   ├── SearchSidebar.tsx # Sidebar de recherche
│   ├── ChurchCard.tsx    # Card preview église
│   └── ChurchDetail.tsx  # Modal détail église
├── lib/
│   ├── api.ts            # API client (fetch helpers)
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Helpers (cn, distance, badges...)
├── store/
│   └── useChurchStore.ts # Zustand store
├── App.tsx               # Composant racine
├── main.tsx              # Entry point
└── index.css             # Tailwind + custom styles
```

## 🔌 API Backend

Le frontend consomme ces endpoints (localhost:3001):

- `GET /api/v1/churches-simple` - Liste toutes les églises
- `GET /api/v1/churches-simple/nearby?lat=X&lng=Y&radius=Z` - Églises à proximité
- `GET /api/v1/churches-simple/:id` - Détail d'une église

## 🎯 Usage

1. **Rechercher une église**: Tapez dans la barre de recherche (filtre en temps réel)
2. **Me localiser**: Cliquez sur "Me localiser" pour trouver les églises proches
3. **Voir les détails**: Cliquez sur une carte d'église ou un marker sur la carte
4. **Obtenir un itinéraire**: Cliquez sur "Itinéraire" dans le détail d'une église

## 🧪 Build Production

```bash
npm run build
```

Les fichiers optimisés sont générés dans `dist/`

## 🔮 Améliorations Futures

### Performance
- [ ] Clustering des markers (Leaflet.markercluster) si >100 églises
- [ ] Lazy loading des détails d'église
- [ ] Service Worker pour cache offline
- [ ] Virtual scrolling pour la liste (react-window)

### Features
- [ ] Filtres avancés (rites, langues) avec UI
- [ ] Mode sombre
- [ ] Favoris (localStorage)
- [ ] Partage d'une église (URL + social)
- [ ] Notifications push pour rappel de messe
- [ ] Export iCal des horaires
- [ ] Recherche par adresse/lieu (geocoding)

### UX
- [ ] Onboarding interactif (première visite)
- [ ] Animations de transition (Framer Motion)
- [ ] Skeleton loaders
- [ ] Toast notifications (sonner)
- [ ] PWA avec install prompt

### Data
- [ ] Photos réelles des églises (Google Places API)
- [ ] Avis utilisateurs
- [ ] Affluence estimée
- [ ] Temps de trajet réel (Google Directions API)
- [ ] Accessibilité PMR

### Mobile
- [ ] App React Native (expo) pour iOS/Android
- [ ] Deep links vers l'app
- [ ] Notifications natives

## 🐛 Debugging

### Le backend ne répond pas
```bash
cd ../backend
npm run dev
```

### Erreurs de géolocalisation
- Vérifiez que le site est en HTTPS ou localhost
- Accordez les permissions de localisation dans le navigateur

### Markers ne s'affichent pas
- Vérifiez que les églises ont bien des `location.coordinates` valides
- Ouvrez la console pour voir les erreurs Leaflet

## 📸 Screenshots

_(À ajouter après test visuel)_

---

**Auteur**: Subagent Artemis 🌙  
**Projet**: GodsPlan MVP  
**Date**: Mars 2026
