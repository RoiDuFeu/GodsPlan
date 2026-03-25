# 🚀 Quick Start - Refonte UX Premium

**Version:** 2.0  
**Date:** 2026-03-17

---

## ⚡ Démarrage rapide

### 1. Dev server (local)
```bash
cd GodsPlan/web
pnpm run dev
```
*(Vite choisira automatiquement un port disponible: 3022, 3023, 3024...)*

### 2. Build production
```bash
cd GodsPlan/web
pnpm run build
```
*(Output dans `dist/`)*

### 3. Preview production
```bash
cd GodsPlan/web
pnpm run preview
```

---

## 📁 Fichiers importants

### Nouveaux
- `src/components/ScoreBar.tsx` — Composant score visuel
- `CHANGELOG_UX.md` — Détails des changements
- `REFONTE_UX_COMPLETE.md` — Récapitulatif mission
- `UX_VISUAL_GUIDE.md` — Guide visuel avec schémas

### Modifiés
- `src/components/Header.tsx` — Header premium
- `src/components/ChurchCard.tsx` — Cards avec ScoreBar
- `src/components/SearchSidebar.tsx` — Spacing + separators
- `src/components/ChurchDetail.tsx` — Modal polished
- `src/components/Map.tsx` — Map avec border + shadow

---

## ✨ Changements clés à tester

### 1. Header
- [ ] Logo avec gradient + glow effect
- [ ] Search bar centrée et grande
- [ ] Responsive (mobile: flex-col)

### 2. ChurchCard
- [ ] Badge circulaire pour icône église
- [ ] **ScoreBar** visuel (5 barres + score /100)
- [ ] Hover: lift + glow + ring
- [ ] Selected: border primary + ring

### 3. Sidebar
- [ ] Spacing généreux (p-6)
- [ ] Separators entre cards
- [ ] Empty state avec icon grande

### 4. Modal détail
- [ ] Header avec gradient badge
- [ ] Horaires: alternating rows (bg-muted/5)
- [ ] Separators entre sections

### 5. Map
- [ ] Border + shadow élégante
- [ ] Rounded corners (md:rounded-xl)

---

## 🎯 Checklist rapide

### Design
- [x] Spacing généreux (breathing room)
- [x] Hover effects fluides
- [x] Selected states clairs
- [x] Separators entre sections

### Accessibilité
- [x] aria-labels maintenues
- [x] Keyboard navigation (Enter/Space)
- [x] Contrast ratio validé

### Performance
- [x] Build successful (136.89 kB gzipped)
- [x] Dev server démarre

### Responsive
- [x] Mobile responsive
- [x] Tablet responsive
- [x] Desktop responsive

---

## 🐛 Debug

### Si le port 3022 est occupé
Vite choisira automatiquement le prochain port disponible (3023, 3024...).

### Si le build échoue
```bash
cd GodsPlan/web
rm -rf node_modules package-lock.json
pnpm install
pnpm run build
```

### Si les styles ne s'appliquent pas
Vérifier que `tailwind.config.js` inclut bien tous les paths:
```js
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
],
```

---

## 📊 Performance

### Bundle size
```
dist/assets/index-BTWuLDPh.js   449.70 kB │ gzip: 136.89 kB
```

### Build time
```
✓ built in 2.68s
```

### Dev server start
```
VITE v8.0.0 ready in 666 ms
```

---

## 🔗 Liens utiles

- **API Backend:** https://godsplan-api.montparnas.fr
- **Port dev:** 3022 (ou suivant disponible)
- **Tech Stack:** React + Vite + TypeScript + shadcn/ui + Zustand

---

## 💡 Tips

### Dark/Light mode
Le theme toggle est dans le header à droite. Les tiles de la map s'adaptent automatiquement.

### Geolocation
Cliquer sur "Me localiser" dans la sidebar pour centrer la map sur votre position.

### Selected church
Cliquer sur une card ou un marker pour sélectionner une église et afficher ses détails.

### Empty state
Si aucune église n'est trouvée, un message sympathique avec une icône s'affiche.

---

## 🚀 Prochaines étapes (optionnel)

1. **Tester sur mobile réel** (responsive validé en dev, mais test terrain recommandé)
2. **Screenshots** (prendre des captures d'écran pour doc)
3. **Feedback utilisateurs** (si tu veux des ajustements de spacing/couleurs)
4. **Migration shadcn-map** (quand l'URL registry sera fixée)

---

## 🆘 Besoin d'aide ?

- **CHANGELOG_UX.md** → Détails techniques des changements
- **UX_VISUAL_GUIDE.md** → Schémas visuels avant/après
- **REFONTE_UX_COMPLETE.md** → Récapitulatif mission

---

**Prêt à charbonner !** 🔥

**Artemis** 🌙  
Quick Start Guide • GodsPlan UX Refonte • 2026-03-17
