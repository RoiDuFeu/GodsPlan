# 🙏 GodsPlan - Frontend Web

> Trouvez facilement des églises et horaires de messes à Paris

**Version:** 2.0.0 - Design Premium PRO  
**Stack:** React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Leaflet  
**Status:** ✅ Production Ready

---

## ✨ Features

- 🗺️ **Carte interactive** avec markers custom élégants
- 📋 **Liste églises** avec recherche temps réel
- 🌓 **Dark/Light mode** avec transitions smooth
- 📍 **Géolocalisation** pour trouver églises à proximité
- 🏛️ **Détails églises** avec horaires de messes
- 📱 **Responsive** mobile, tablet, desktop
- ♿ **Accessible** (WCAG AA+, keyboard nav, ARIA)
- ⚡ **Performant** (< 500KB bundle, optimisé)

---

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server (port 3022)
npm run dev

# Open http://localhost:3022
```

### Production

```bash
# Build
npm run build

# Preview build
npm run preview
```

---

## 📸 Screenshots

### Light Mode
![Light Mode Overview](screenshots/light-mode-overview.png)

### Dark Mode
![Dark Mode Overview](screenshots/dark-mode-overview.png)

### Mobile
![Mobile Sheet](screenshots/mobile-sheet.png)

*(Screenshots à créer - voir [SCREENSHOTS_GUIDE.md](SCREENSHOTS_GUIDE.md))*

---

## 🎨 Design Highlights

### **Theme Switching**
- Toggle Sun/Moon en 1 clic
- Persistence localStorage
- CSS variables (transitions instantanées)
- Support mode "system" (auto)

### **Modern Components**
- shadcn/ui (Nova preset)
- Custom church markers (pin goutte animé)
- Skeleton loaders élégants
- Empty states avec messages sympas

### **Premium UX**
- Hover states avec lift + shadow
- Micro-animations (pulse, slide-in, shimmer)
- Smooth transitions (200-300ms)
- Responsive breakpoints optimisés

---

## 🛠️ Tech Stack

### Core
- **React 19.2.4** - UI library
- **TypeScript 5.9.3** - Type safety
- **Vite 8.0.0** - Build tool
- **Tailwind CSS 3.4.19** - Styling
- **Zustand 5.0.12** - State management

### UI Components
- **shadcn/ui** - Dialog, Sheet, ScrollArea, Skeleton...
- **Radix UI** - Accessible primitives
- **Lucide React** - Icons (500+)

### Mapping
- **Leaflet 1.9.4** - Interactive maps
- **React-Leaflet 5.0.0** - React bindings

### Utilities
- **clsx** + **tailwind-merge** - Conditional classes
- **date-fns** (à ajouter si besoin) - Date formatting

---

## 📁 Project Structure

```
web/
├── public/              # Static assets
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn primitives
│   │   ├── Header.tsx
│   │   ├── SearchSidebar.tsx
│   │   ├── ChurchCard.tsx
│   │   ├── ChurchDetail.tsx
│   │   ├── Map.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── lib/
│   │   ├── utils.ts     # Helpers
│   │   ├── api.ts       # API client
│   │   ├── types.ts     # TypeScript types
│   │   └── mapUtils.ts  # Leaflet custom
│   ├── store/
│   │   └── useChurchStore.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── dist/                # Build output
├── node_modules/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── components.json      # shadcn config
```

---

## 📚 Documentation

### Guides
- [**DESIGN_UPGRADE.md**](DESIGN_UPGRADE.md) - Détails design upgrade complet
- [**TECH_STACK.md**](TECH_STACK.md) - Stack technique détaillée
- [**USER_GUIDE.md**](USER_GUIDE.md) - Guide utilisateur
- [**DEPLOYMENT.md**](DEPLOYMENT.md) - Instructions déploiement
- [**TEST_CHECKLIST.md**](TEST_CHECKLIST.md) - Tests manuels
- [**SCREENSHOTS_GUIDE.md**](SCREENSHOTS_GUIDE.md) - Comment capturer

### Changelog
- [**CHANGELOG.md**](CHANGELOG.md) - Historique versions
- [**MISSION_COMPLETE.md**](MISSION_COMPLETE.md) - Rapport mission

---

## 🎯 API Backend

**Endpoint:** `https://godsplan-api.montparnas.fr/api/v1`

### Routes utilisées
- `GET /churches` - Liste toutes les églises
- `GET /churches/nearby?lat={lat}&lng={lng}&radius={radius}` - Églises à proximité

### Response Format
```json
{
  "churches": [
    {
      "id": "uuid",
      "name": "Notre-Dame de Paris",
      "address": {
        "street": "6 Parvis Notre-Dame",
        "postalCode": "75004",
        "city": "Paris"
      },
      "latitude": "48.8530",
      "longitude": "2.3499",
      "reliabilityScore": 95,
      "massSchedules": [...],
      "dataSources": [...]
    }
  ]
}
```

---

## ⚙️ Configuration

### Port
Default: **3022** (configurable dans `vite.config.ts`)

### Theme Storage
Key: `godsplan-ui-theme` (localStorage)

### Breakpoints
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

---

## 🧪 Testing

### Manual Testing
Voir [TEST_CHECKLIST.md](TEST_CHECKLIST.md)

### Automated (à venir)
```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npm run test:e2e
```

---

## 🚀 Deployment

### Vercel (recommandé)
```bash
npx vercel --prod
```

### Netlify
```bash
npx netlify deploy --prod --dir=dist
```

### Docker
```bash
docker build -t godsplan-web .
docker run -p 3022:80 godsplan-web
```

**Guide complet:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📊 Performance

### Build Stats
- **Bundle JS:** 449 KB (gzip: 136 KB)
- **Bundle CSS:** 43 KB (gzip: 12 KB)
- **Total:** < 500 KB
- **Build time:** ~2s

### Lighthouse Scores (target)
- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 90+

---

## 🤝 Contributing

### Development Workflow
1. Fork/clone repo
2. Create feature branch
3. Make changes
4. Test locally (`npm run dev`)
5. Build (`npm run build`)
6. Submit PR

### Code Style
- TypeScript strict mode
- ESLint rules
- Prettier (recommended)
- Semantic commits

---

## 📝 Scripts

```bash
npm run dev       # Dev server (port 3022)
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

---

## 🐛 Troubleshooting

### Geolocation ne fonctionne pas
- ✅ HTTPS requis (production)
- ✅ Autoriser permission navigateur
- ✅ localhost OK (développement)

### Theme ne change pas
- ✅ Vider localStorage: `localStorage.clear()`
- ✅ Rafraîchir page

### Build errors
- ✅ `rm -rf node_modules && npm install`
- ✅ `npm run build -- --force`

---

## 📄 License

MIT (à définir)

---

## 👥 Team

- **Design & Development:** Artemis (OpenClaw)
- **Product Owner:** Marc
- **Backend API:** GodsPlan API Team

---

## 🎉 Acknowledgments

- **shadcn/ui** - Beautiful component library
- **Radix UI** - Accessible primitives
- **Leaflet** - Amazing map library
- **Tailwind CSS** - Utility-first CSS
- **Vite** - Lightning-fast build tool

---

## 📞 Support

**Questions?** Check documentation files:
- Design questions → [DESIGN_UPGRADE.md](DESIGN_UPGRADE.md)
- Technical questions → [TECH_STACK.md](TECH_STACK.md)
- Deployment help → [DEPLOYMENT.md](DEPLOYMENT.md)
- User guide → [USER_GUIDE.md](USER_GUIDE.md)

---

## 🔗 Links

- **Live Demo:** (à venir)
- **API Docs:** https://godsplan-api.montparnas.fr/docs
- **Design System:** shadcn/ui (Nova preset)

---

**Made with ❤️ and ☕ - Ready to help people find spiritual guidance! 🙏✨**
