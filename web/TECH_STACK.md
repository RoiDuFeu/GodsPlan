# 🛠️ GodsPlan Web - Stack Technique

## Core Framework

### **React 19.2.4**
- Librairie UI moderne
- Hooks API (useState, useEffect, useRef, useContext)
- StrictMode activé
- Fast Refresh (HMR)

### **TypeScript 5.9.3**
- Type safety
- Strict mode activé
- Path aliases (`@/*`)
- TSC build validation

### **Vite 8.0.0**
- Build tool ultra-rapide
- Dev server avec HMR
- Code splitting automatique
- ES modules
- Production optimizations

---

## Styling & UI

### **Tailwind CSS 3.4.19**
- Utility-first CSS
- JIT compiler
- Dark mode support (`class` strategy)
- Custom theme extensions
- Responsive design utilities

### **Shadcn/ui (Nova preset)**
Components installés:
- `Button` - Variants (default, outline, ghost, destructive)
- `Card` - Container élégant avec header/content/footer
- `Badge` - Labels/tags colorés
- `Input` - Champs de formulaire
- `Dialog` - Modals système
- `Sheet` - Drawers/sidebars
- `ScrollArea` - Scrollbars custom
- `Separator` - Dividers horizontaux/verticaux
- `Switch` - Toggle switches
- `Skeleton` - Loading placeholders

**Radix UI Primitives:**
- `@radix-ui/react-dialog` - Accessible modals
- `@radix-ui/react-scroll-area` - Custom scrollbars
- `@radix-ui/react-separator` - Semantic dividers
- `@radix-ui/react-switch` - Accessible toggles

### **Lucide React 0.577.0**
- Icon library (500+ icons)
- Tree-shakeable
- Consistent style
- Exemples: `Search`, `MapPin`, `Moon`, `Sun`, `Church`, `Calendar`, `Clock`...

---

## Mapping

### **Leaflet 1.9.4**
- Interactive maps library
- Tile layers support
- Custom markers
- Popups/tooltips
- Events API

### **React-Leaflet 5.0.0**
- React bindings pour Leaflet
- Hooks-based API
- Intégration React lifecycle

**Custom:**
- `mapUtils.ts` - Custom markers (church icon, user location)
- CSS injections pour styles dark/light
- Tile layers switcher (OSM / CartoDB Dark)

---

## State Management

### **Zustand 5.0.12**
- Lightweight state library (< 1KB)
- No boilerplate
- React hooks integration
- Devtools support

**Store: `useChurchStore`**
- `churches` - Liste églises
- `selectedChurch` - Église sélectionnée
- `searchQuery` - Terme de recherche
- `userLocation` - Coords GPS user
- `isLoading` / `error` - UI states
- Actions: `loadChurches()`, `loadNearbyChurches()`, `selectChurch()`, etc.

---

## Data & API

### **Fetch API (native)**
- HTTP requests vers API backend
- Error handling
- JSON parsing

**API Endpoint:**
```
https://godsplan-api.montparnas.fr/api/v1
```

**Endpoints utilisés:**
- `GET /churches` - Liste toutes les églises
- `GET /churches/nearby?lat={lat}&lng={lng}&radius={radius}` - Églises à proximité

### **Types TypeScript**
Fichier: `src/lib/types.ts`
- `Church` - Modèle complet église
- `ChurchListItem` - Item liste (lightweight)
- `MassSchedule` - Horaire de messe
- `Address` - Adresse structurée
- `DataSource` - Source de données
- `UserLocation` - Coords GPS

---

## Utilities

### **clsx 2.1.1**
- Conditional classNames
- Merge class strings

### **tailwind-merge 3.5.0**
- Merge Tailwind classes intelligemment
- Évite les conflits de classes

**Helper: `cn()` function**
```ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

---

## Build & Dev Tools

### **ESLint 9.39.4**
- Linting JavaScript/TypeScript
- React hooks rules
- TypeScript ESLint plugin

### **PostCSS 8.5.8**
- CSS transformations
- Autoprefixer integration

### **Autoprefixer 10.4.27**
- Vendor prefixes automatiques
- Browser compatibility

---

## Architecture & Patterns

### **Component Structure**
```
src/
├── components/
│   ├── ui/              # Shadcn primitives
│   ├── Header.tsx       # App header
│   ├── SearchSidebar.tsx
│   ├── ChurchCard.tsx
│   ├── ChurchDetail.tsx
│   ├── Map.tsx
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── utils.ts         # Helpers (cn, formatDistance...)
│   ├── api.ts           # API client
│   ├── types.ts         # TypeScript types
│   └── mapUtils.ts      # Leaflet custom
├── store/
│   └── useChurchStore.ts
├── App.tsx
├── main.tsx
└── index.css
```

### **Design Patterns**
- **Component Composition** - Petits composants réutilisables
- **Render Props** - Flexibilité via children/props
- **Custom Hooks** - `useTheme()`, `useChurchStore()`
- **Context API** - Theme provider
- **Controlled Components** - Inputs avec state sync

---

## Performance Optimizations

### **Code Splitting**
- Vite dynamic imports
- Route-based splitting (à venir)

### **CSS**
- Tailwind JIT (only used classes)
- CSS variables (theme switching sans re-render)
- GPU-accelerated transitions (transform, opacity)

### **React**
- useRef pour DOM refs (évite re-renders)
- Conditional rendering
- Lazy state initialization

### **Leaflet**
- Markers cleanup on unmount
- Debounced updates (via Zustand)
- Popup binding lazy

---

## Browser Support

**Minimum:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features utilisées:**
- ES2023 (Promise, async/await, optional chaining...)
- CSS Variables
- CSS Grid/Flexbox
- Geolocation API
- LocalStorage
- Fetch API

---

## Development

### **Scripts**
```bash
npm run dev       # Dev server (port 3022)
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### **Environment**
- Node.js 22.22.0+
- NPM 10+

### **Config Files**
- `vite.config.ts` - Vite config + path aliases
- `tailwind.config.js` - Tailwind theme + dark mode
- `tsconfig.json` - TypeScript compiler
- `components.json` - Shadcn config
- `postcss.config.js` - PostCSS plugins

---

## Deployment

### **Build Output**
```
dist/
├── index.html           # 0.69 KB
├── assets/
│   ├── index-*.css     # 43.29 KB (gzip: 12.01 KB)
│   └── index-*.js      # 449.06 KB (gzip: 136.67 KB)
```

### **Server Requirements**
- Static file server (Nginx, Apache, Caddy, Vercel, Netlify...)
- HTTPS recommended (Geolocation API)
- SPA routing: fallback to index.html

### **Environment Variables**
Aucune pour le moment (API endpoint hardcodé)

---

## Security

### **Dependencies**
- Pas de vulnérabilités connues (`npm audit`)
- Updates régulières recommandées

### **Best Practices**
- ✅ HTTPS only (production)
- ✅ No eval() usage
- ✅ XSS protection (React escape par défaut)
- ✅ CORS handled server-side
- ✅ LocalStorage (non-sensitive data only)

---

## Testing (à venir)

**Recommandations:**
- **Unit:** Vitest + React Testing Library
- **E2E:** Playwright
- **Visual:** Chromatic / Percy

---

## Monitoring (à venir)

**Recommandations:**
- Sentry (error tracking)
- Google Analytics / Plausible (analytics)
- Vercel Analytics (performance)

---

**Stack moderne, performante et maintenable ! 🚀**
