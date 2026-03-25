# Changelog - GodsPlan Web

## [2.0.0] - 2026-03-17 - Design Upgrade PRO 🎨

### Added
- 🌓 **Dark/Light Mode** avec ThemeProvider + localStorage persistence
- 🎨 **Theme Toggle** button (Sun/Moon) dans Header
- 🗺️ **Custom Church Markers** avec animations (hover, pulse, sélection)
- 📦 **Nouveaux composants shadcn**: Dialog, Sheet, ScrollArea, Separator, Switch, Skeleton
- 🎭 **Header premium** avec logo, search bar responsive, theme toggle
- 📋 **Sidebar redesignée** avec ScrollArea, Skeleton loaders, empty states
- 🏛️ **ChurchCard premium** avec icône, hover states élégants, animations
- 💬 **ChurchDetail modal** redesignée avec Dialog, ScrollArea, tableaux horaires élégants
- 🌍 **Map dark/light tiles** (OSM standard + CartoDB Dark Matter)
- 📱 **Mobile Sheet** (bottom drawer) pour liste églises
- 🎯 **Floating button mobile** pour ouvrir la liste
- ✨ **Animations CSS**: slide-in, shimmer, pulse
- 🎨 **Variables CSS HSL** complètes pour dark/light
- 🖼️ **Empty states** avec icônes et messages sympas
- 🔄 **Loading skeletons** animés

### Changed
- 🎨 **Palette colors** modernisée:
  - Light: blanc pur + violet premium accent
  - Dark: gris anthracite + violet chaleureux
- 📐 **Layout responsive** refactorisé (mobile-first)
- 🗺️ **Map** intégrée dans Card avec shadow élégante
- 🏗️ **Architecture composants** plus modulaire
- 📝 **Typographie** hiérarchisée avec font system stack
- 🎯 **Borders, shadows, radius** cohérents
- ⚡ **Transitions** optimisées (200-300ms, GPU-accelerated)

### Fixed
- 🐛 Conflit TypeScript `Map` vs `L.Map` résolu
- 🔧 Path aliases configurés (`@/*`)
- 📦 Radix UI dependencies ajoutées

### Technical
- TypeScript strict mode
- Vite 8.0.0
- React 19.2.4
- Tailwind CSS 3.4.19 avec darkMode: ["class"]
- Shadcn UI components (Nova preset)
- Leaflet 1.9.4 avec custom styles

---

## [1.0.0] - 2026-03-17 - MVP Initial

### Added
- 🗺️ Map Leaflet avec markers églises
- 📋 Sidebar avec liste églises
- 🔍 Barre de recherche
- 📍 Géolocalisation utilisateur
- 🏛️ Modal détails église avec horaires messes
- 🎯 Sélection église (map + liste)
- 📡 API integration (godsplan-api.montparnas.fr)
- 🏪 Zustand store pour state management
- 🎨 Shadcn UI components basiques (Button, Card, Badge, Input)
- 📱 Responsive mobile/desktop basique

---

**Version actuelle: 2.0.0 - Design Premium PRO** 🚀
